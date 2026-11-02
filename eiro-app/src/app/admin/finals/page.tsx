'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  Card,
  CategoryBadge,
  Badge,
  KpiCard,
  Button,
} from '@/components/ui';
import { Trophy, Users, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

interface Qualification {
  id: string;
  teamId?: string;
  schoolId?: string;
  districtId?: string;
  eventId?: string;
  categoryCode?: string;
  category?: string;
  sourceEntryId?: string;
  finalsEntryId?: string;
  districtRank?: number;
  rank?: number;
  status?: string;
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
  districtId?: string;
}

interface District {
  id: string;
  name?: string;
}

interface Entry {
  id: string;
  teamId?: string;
}

// ─── Animated background elements ────────────────────────────────────────────

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

export default function StateFinals() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [
        qualificationData,
        teamData,
        schoolData,
        districtData,
        entryData,
      ] = await Promise.all([
        getAll<Qualification>('qualifications'),
        getAll<Team>('teams'),
        getAll<School>('schools'),
        getAll<District>('districts'),
        getAll<Entry>('stageEntries'),
      ]);

      setQualifications(qualificationData);
      setTeams(teamData);
      setSchools(schoolData);
      setDistricts(districtData);
      setEntries(entryData);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Could not load qualification records. Check your access and try again.'
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

  const grouped = useMemo(() => {
    const groups = new Map<string, Qualification[]>();

    qualifications.forEach((qualification) => {
      const sourceEntry = entries.find(
        (item) => item.id === qualification.sourceEntryId
      );

      const team = teams.find(
        (item) =>
          item.id === (qualification.teamId || sourceEntry?.teamId)
      );

      const category =
        qualification.categoryCode ||
        qualification.category ||
        team?.categoryCode ||
        'UNASSIGNED';

      groups.set(category, [
        ...(groups.get(category) || []),
        qualification,
      ]);
    });

    return [...groups.entries()];
  }, [qualifications, teams, entries]);

  return (
    <div className="state-finals-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ─────────────── ANIMATED BACKGROUND ─────────────── */}

      <div
        className="state-finals-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="state-finals-orb state-finals-orb-one" />
        <div className="state-finals-orb state-finals-orb-two" />
        <div className="state-finals-orb state-finals-orb-three" />
        <div className="state-finals-orb state-finals-orb-four" />

        <div className="state-finals-dot-grid absolute inset-0" />

        <div className="state-finals-ring state-finals-ring-one" />
        <div className="state-finals-ring state-finals-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`state-finals-particle ${particle}`}
          />
        ))}

        <div className="state-finals-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`state-finals-bubble ${bubble.tone}`}
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

        <div className="state-finals-center-glow" />
      </div>

      {/* ─────────────── PAGE CONTENT ─────────────── */}

      <main className="state-finals-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="State Finals"
          subtitle="Qualification records currently stored in Firestore"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="state-kpi-shell">
            <KpiCard
              title="Qualification Records"
              value={qualifications.length}
              icon={Trophy}
              color="yellow"
            />
          </div>

          <div className="state-kpi-shell">
            <KpiCard
              title="Categories"
              value={grouped.length}
              icon={Users}
              color="indigo"
            />
          </div>

          <div className="state-kpi-shell">
            <KpiCard
              title="Events"
              value={
                new Set(
                  qualifications
                    .map((item) => item.eventId)
                    .filter(Boolean)
                ).size
              }
              icon={Trophy}
              color="blue"
            />
          </div>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : qualifications.length === 0 ? (
          <Card className="state-transparent-card text-center text-gray-400">
            No qualification records found.
          </Card>
        ) : (
          <div className="space-y-5">

            {grouped.map(([category, rows]) => (
              <Card
                key={category}
                padding="none"
                className="state-transparent-card"
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

                  <Badge variant="info">
                    {rows.length} records
                  </Badge>
                </div>

                {/* QUALIFICATION TABLE */}

                <div className="overflow-x-auto">
                  <table className="eiro-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>School</th>
                        <th>District</th>
                        <th>Event</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row) => {
                        const sourceEntry = entries.find(
                          (item) => item.id === row.sourceEntryId
                        );

                        const team = teams.find(
                          (item) =>
                            item.id ===
                            (row.teamId || sourceEntry?.teamId)
                        );

                        const school = schools.find(
                          (item) =>
                            item.id === (row.schoolId || team?.schoolId)
                        );

                        const districtId =
                          row.districtId || school?.districtId;

                        const district = districts.find(
                          (item) => item.id === districtId
                        );

                        const rank = row.districtRank ?? row.rank;

                        return (
                          <tr key={row.id}>
                            <td className="text-sm text-white">
                              {rank ?? '—'}
                            </td>

                            <td>
                              <span className="text-sm text-white">
                                {team?.teamName ||
                                  'Team details unavailable'}
                              </span>

                              <br />

                              <span className="font-mono text-[10px] text-gray-400">
                                {team?.displayTeamCode ||
                                  team?.id ||
                                  row.sourceEntryId ||
                                  row.teamId ||
                                  '—'}
                              </span>
                            </td>

                            <td className="text-xs text-gray-300">
                              {school?.name || school?.id || '—'}
                            </td>

                            <td className="text-xs text-gray-300">
                              {district?.name || districtId || '—'}
                            </td>

                            <td className="text-xs text-gray-300">
                              {row.eventId || '—'}
                              {row.finalsEntryId
                                ? ` · finals entry ${row.finalsEntryId}`
                                : ''}
                            </td>

                            <td>
                              <Badge
                                variant={
                                  row.status === 'APPROVED'
                                    ? 'success'
                                    : 'info'
                                }
                              >
                                {row.status || 'Recorded'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ─────────────── BACKGROUND STYLES ─────────────── */}

      <style jsx global>{`

        .state-finals-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .state-finals-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* Keep the animated background independent of page content */

        .state-finals-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .state-finals-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .state-finals-orb-one {
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
          animation: stateOrbOne 18s ease-in-out infinite alternate;
        }

        .state-finals-orb-two {
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
          animation: stateOrbTwo 22s ease-in-out infinite alternate;
        }

        .state-finals-orb-three {
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
          animation: stateOrbThree 20s ease-in-out infinite alternate;
        }

        .state-finals-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: stateOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .state-finals-dot-grid {
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

        /* ROTATING RINGS */

        .state-finals-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .state-finals-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: stateRingOne 35s linear infinite;
        }

        .state-finals-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: stateRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .state-finals-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: stateParticle 8s ease-in-out infinite alternate;
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

        /* FLOATING BUBBLES */

        .state-finals-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .state-finals-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: stateBubbleFloat linear infinite;
        }

        .state-finals-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .state-finals-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .state-finals-center-glow {
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

        /*
          TRANSPARENT CARDS

          No dark full-screen layer.
          No backdrop blur.
          Cards use only a very light transparent surface.
        */

        .state-finals-page .state-transparent-card {
          background: rgba(5, 3, 8, 0.12) !important;
          background-color: rgba(5, 3, 8, 0.12) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
          border-color: rgba(221, 143, 224, 0.18) !important;
        }

        /* Keep KPI cards from creating opaque panels */

        .state-finals-page .state-kpi-shell {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .state-finals-page .state-kpi-shell > div {
          background-color: rgba(5, 3, 8, 0.12) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
          border-color: rgba(221, 143, 224, 0.18) !important;
        }

        /* TABLE */

        .state-finals-page .eiro-table {
          background: transparent !important;
        }

        .state-finals-page .eiro-table th {
          background: rgba(5, 3, 8, 0.12) !important;
        }

        .state-finals-page .eiro-table td {
          background: transparent !important;
        }

        .state-finals-page .eiro-table tbody tr:hover td {
          background: rgba(168, 85, 247, 0.06) !important;
        }

        /* ANIMATIONS */

        @keyframes stateBubbleFloat {
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

        @keyframes stateOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes stateOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes stateOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes stateOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes stateRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes stateRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes stateParticle {
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

        /* MOBILE */

        @media (max-width: 640px) {
          .state-finals-orb-one {
            width: 320px;
            height: 320px;
          }

          .state-finals-orb-two {
            width: 360px;
            height: 360px;
          }

          .state-finals-orb-three {
            width: 340px;
            height: 340px;
          }

          .state-finals-ring-one {
            width: 300px;
            height: 300px;
          }

          .state-finals-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .state-finals-orb,
          .state-finals-ring,
          .state-finals-particle,
          .state-finals-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}

