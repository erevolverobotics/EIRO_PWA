'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  CategoryBadge,
  KpiCard,
} from '@/components/ui';
import {
  BarChart3,
  Trophy,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

interface ResultRecord {
  id: string;
  eventId?: string;
  entryId?: string;
  rank?: number;
  scoreSnapshot?: unknown;
  status?: string;
}

interface Qualification {
  id: string;
  eventId?: string;
  sourceEntryId?: string;
  finalsEntryId?: string;
  status?: string;
}

interface Event {
  id: string;
  categoryCode?: string;
  name?: string;
}

interface Entry {
  id: string;
  teamId?: string;
}

interface Team {
  id: string;
  teamName?: string;
  displayTeamCode?: string;
  schoolId?: string;
  categoryCode?: string;
}

interface School {
  id: string;
  name?: string;
}

// ─── Animated Background Elements ────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RankingsPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  // ── Load data ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [
        resultData,
        qualificationData,
        eventData,
        entryData,
        teamData,
        schoolData,
      ] = await Promise.all([
        getAll<ResultRecord>('results'),
        getAll<Qualification>('qualifications'),
        getAll<Event>('events'),
        getAll<Entry>('stageEntries'),
        getAll<Team>('teams'),
        getAll<School>('schools'),
      ]);

      setResults(resultData);
      setQualifications(qualificationData);
      setEvents(eventData);
      setEntries(entryData);
      setTeams(teamData);
      setSchools(schoolData);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Could not load results and qualification data. Check your access and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError('');
    void load();
  };

  // ── Find team for a result ──────────────────────────────────────────────────

  const resultTeam = useCallback(
    (result: ResultRecord) => {
      const teamId = entries.find(
        (entry) => entry.id === result.entryId
      )?.teamId;

      return teams.find((team) => team.id === teamId);
    },
    [entries, teams]
  );

  // ── Group results by category ───────────────────────────────────────────────

  const grouped = useMemo(() => {
    const groups = new Map<string, ResultRecord[]>();

    results.forEach((result) => {
      const team = resultTeam(result);
      const event = events.find((item) => item.id === result.eventId);

      const category =
        event?.categoryCode ||
        team?.categoryCode ||
        'UNASSIGNED';

      groups.set(category, [
        ...(groups.get(category) || []),
        result,
      ]);
    });

    return [...groups.entries()].map(([category, values]) => [
      category,
      values.sort(
        (a, b) =>
          (a.rank ?? Number.MAX_SAFE_INTEGER) -
          (b.rank ?? Number.MAX_SAFE_INTEGER)
      ),
    ] as const);
  }, [results, events, resultTeam]);

  const filtered =
    selectedCat === 'ALL'
      ? grouped
      : grouped.filter(([category]) => category === selectedCat);

  // ── Qualification counts ───────────────────────────────────────────────────

  const approvedQualificationCount = qualifications.filter(
    (item) =>
      item.status === 'APPROVED' ||
      Boolean(item.finalsEntryId)
  ).length;

  const pendingSourceEventIds = [
    ...new Set(
      results
        .filter(
          (result) =>
            result.eventId &&
            qualifications.some(
              (item) =>
                item.sourceEntryId === result.entryId &&
                item.status === 'PENDING'
            )
        )
        .map((result) => result.eventId as string)
    ),
  ];

  // ── Approve qualifiers ──────────────────────────────────────────────────────

  const approve = async (eventId: string) => {
    setBusyEvent(eventId);
    setError('');
    setMessage('');

    try {
      await callEiroFunction<{ eventId: string }, unknown>(
        'approveQualifiers',
        { eventId }
      );

      setMessage(
        `Qualifier approval submitted for event ${eventId}.`
      );

      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);

      setError(
        `Qualifier approval for ${eventId} was not completed. The callable may be unavailable or the event may not be eligible.`
      );
    } finally {
      setBusyEvent('');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rankings-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ANIMATED BACKGROUND — NO SCREEN-WIDE OVERLAY */}

      <div
        className="rankings-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="rankings-orb rankings-orb-one" />
        <div className="rankings-orb rankings-orb-two" />
        <div className="rankings-orb rankings-orb-three" />
        <div className="rankings-orb rankings-orb-four" />

        <div className="rankings-dot-grid absolute inset-0" />

        <div className="rankings-ring rankings-ring-one" />
        <div className="rankings-ring rankings-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`rankings-particle ${particle}`}
          />
        ))}

        <div className="rankings-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`rankings-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="rankings-center-glow" />
      </div>

      {/* PAGE CONTENT */}

      <main className="rankings-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Rankings & Qualification"
          subtitle="Stored result ranks and qualification records"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* KPI CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rankings-kpi-grid">
          <KpiCard
            title="Categories"
            value={grouped.length}
            icon={Trophy}
            color="indigo"
          />

          <KpiCard
            title="Ranked Result Records"
            value={results.length}
            icon={BarChart3}
            color="blue"
          />

          <KpiCard
            title="Approved Qualification Records"
            value={approvedQualificationCount}
            icon={CheckCircle2}
            color="green"
          />
        </div>

        {/* INFORMATION */}

        <div className="rankings-info flex items-start gap-3 p-4 rounded-2xl">
          <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />

          <p className="text-xs text-yellow-400">
            Ranks and qualification decisions are read from stored
            records. This screen does not calculate scores, reorder
            teams, lock results, or infer qualifying quotas; the
            trusted function validates qualifier approval.
          </p>
        </div>

        {/* ERROR AND SUCCESS MESSAGES */}

        {error && (
          <p
            role="alert"
            className="text-sm text-red-400"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="text-sm text-green-400"
          >
            {message}
          </p>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : results.length === 0 ? (
          <Card className="rankings-glass-card text-center text-gray-400">
            No result records found.
          </Card>
        ) : (
          <>
            {/* CATEGORY FILTERS */}

            <div className="flex gap-2 flex-wrap">
              {[
                'ALL',
                ...grouped.map(([category]) => category),
              ].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCat(category)}
                  className={`rankings-filter px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    selectedCat === category
                      ? 'rankings-filter-active'
                      : 'rankings-filter-inactive'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* CATEGORY RESULTS */}

            {filtered.map(([category, categoryRows]) => {
              const categoryEvents = new Set(
                categoryRows
                  .map((result) => result.eventId)
                  .filter(
                    (eventId): eventId is string =>
                      Boolean(eventId)
                  )
              );

              const categoryPendingEvents =
                pendingSourceEventIds.filter((eventId) =>
                  categoryEvents.has(eventId)
                );

              return (
                <Card
                  key={category}
                  padding="none"
                  className="rankings-glass-card"
                >
                  {/* CATEGORY HEADER */}

                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    {category === 'UNASSIGNED' ? (
                      <Badge>Unassigned category</Badge>
                    ) : (
                      <CategoryBadge
                        code={category as CategoryCode}
                      />
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {categoryPendingEvents.map((eventId) => (
                        <Button
                          key={eventId}
                          size="sm"
                          icon={CheckCircle2}
                          loading={busyEvent === eventId}
                          disabled={Boolean(busyEvent)}
                          onClick={() => void approve(eventId)}
                        >
                          Approve qualifiers · {eventId}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* RESULTS TABLE */}

                  <div className="overflow-x-auto">
                    <table className="eiro-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Team</th>
                          <th>Score Snapshot</th>
                          <th>Qualification</th>
                        </tr>
                      </thead>

                      <tbody>
                        {categoryRows.map((result) => {
                          const team = resultTeam(result);

                          const school = schools.find(
                            (item) =>
                              item.id === team?.schoolId
                          );

                          const qualification =
                            qualifications.find(
                              (item) =>
                                item.sourceEntryId ===
                                result.entryId
                            );

                          return (
                            <tr key={result.id}>
                              <td>
                                <span className="text-lg">
                                  {result.rank ?? '—'}
                                </span>
                              </td>

                              <td>
                                <div className="font-medium text-white text-sm">
                                  {team?.teamName ||
                                    result.entryId ||
                                    'Team details unavailable'}
                                </div>

                                <div className="text-xs text-gray-400">
                                  {school?.name ||
                                    school?.id ||
                                    '—'}
                                </div>

                                <div className="font-mono text-[10px] text-gray-500">
                                  {team?.displayTeamCode ||
                                    result.entryId ||
                                    result.id}
                                </div>
                              </td>

                              <td className="font-mono text-xs text-gray-300">
                                {result.scoreSnapshot === undefined
                                  ? '—'
                                  : JSON.stringify(
                                      result.scoreSnapshot
                                    )}
                              </td>

                              <td>
                                <Badge
                                  variant={
                                    qualification?.status ===
                                      'APPROVED' ||
                                    qualification?.finalsEntryId
                                      ? 'success'
                                      : qualification?.status ===
                                          'PENDING'
                                        ? 'warning'
                                        : 'default'
                                  }
                                >
                                  {qualification?.status ||
                                    (qualification?.finalsEntryId
                                      ? 'FINALS ENTRY CREATED'
                                      : 'No qualification record')}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </main>

      {/* BACKGROUND STYLES */}

      <style jsx global>{`

        /* ── BASE PAGE ─────────────────────────────────────── */

        .rankings-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .rankings-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* ── BACKGROUND LAYER ───────────────────────────────── */

        .rankings-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* ── GLOWING ORBS ───────────────────────────────────── */

        .rankings-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .rankings-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );
          animation: rankingsOrbOne 18s ease-in-out infinite alternate;
        }

        .rankings-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );
          animation: rankingsOrbTwo 22s ease-in-out infinite alternate;
        }

        .rankings-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );
          animation: rankingsOrbThree 20s ease-in-out infinite alternate;
        }

        .rankings-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: rankingsOrbFour 17s ease-in-out infinite alternate;
        }

        /* ── DOT GRID ───────────────────────────────────────── */

        .rankings-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.55;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ── ROTATING RINGS ─────────────────────────────────── */

        .rankings-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .rankings-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: rankingsRingOne 35s linear infinite;
        }

        .rankings-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: rankingsRingTwo 28s linear infinite;
        }

        /* ── FLOATING PARTICLES ──────────────────────────────── */

        .rankings-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: rankingsParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* ── FLOATING BUBBLES ───────────────────────────────── */

        .rankings-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .rankings-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: rankingsBubbleFloat linear infinite;
        }

        .rankings-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .rankings-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* ── CENTRAL GLOW ────────────────────────────────────── */

        .rankings-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* ── TRANSPARENT CONTENT ─────────────────────────────── */

        /*
          IMPORTANT:
          Do not add a background to the content wrapper.
          Do not add backdrop-filter blur to the cards.
          This keeps the animated background visible.
        */

        .rankings-content,
        .rankings-content > *,
        .rankings-content main {
          background-color: transparent;
        }

        /* Result cards: very light transparency only */

        .rankings-page .rankings-glass-card {
          background: rgba(18, 12, 29, 0.10) !important;
          border: 1px solid rgba(221, 143, 224, 0.18) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* KPI cards: keep their own layout, remove heavy dark layer */

        .rankings-kpi-grid > * {
          background-color: rgba(18, 12, 29, 0.10) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* Information panel */

        .rankings-info {
          background: rgba(120, 75, 20, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.16);
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        /* Category filter buttons */

        .rankings-filter {
          transition:
            color 180ms ease,
            border-color 180ms ease,
            background-color 180ms ease;
        }

        .rankings-filter-active {
          background: rgba(99, 102, 241, 0.72);
          color: white;
          border-color: rgba(129, 140, 248, 0.8);
        }

        .rankings-filter-inactive {
          background: rgba(255, 255, 255, 0.035);
          border-color: rgba(255, 255, 255, 0.12);
          color: #9ca3af;
        }

        .rankings-filter-inactive:hover {
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        /* ── ANIMATIONS ──────────────────────────────────────── */

        @keyframes rankingsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes rankingsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes rankingsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes rankingsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes rankingsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes rankingsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes rankingsParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        @keyframes rankingsBubbleFloat {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          12% {
            opacity: 0.5;
          }
          88% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* ── MOBILE ──────────────────────────────────────────── */

        @media (max-width: 640px) {
          .rankings-orb-one {
            width: 320px;
            height: 320px;
          }

          .rankings-orb-two {
            width: 360px;
            height: 360px;
          }

          .rankings-orb-three {
            width: 340px;
            height: 340px;
          }

          .rankings-ring-one {
            width: 300px;
            height: 300px;
          }

          .rankings-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* ── REDUCED MOTION ──────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
          .rankings-orb,
          .rankings-ring,
          .rankings-particle,
          .rankings-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
