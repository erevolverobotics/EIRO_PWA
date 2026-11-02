'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  Button,
  KpiCard,
  CategoryBadge,
  Badge,
  StatusBadge,
} from '@/components/ui';
import {
  Award,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

interface ResultRecord {
  id: string;
  eventId?: string;
  eventName?: string;
  categoryCode?: string;
  category?: string;
  entryId?: string;
  teamIds?: string[];
  teamCount?: number;
  scoreStatus?: string;
  status?: string;
  publishedAt?: unknown;
  qualifiedCount?: number;
}

interface Scorecard {
  id: string;
  entryId?: string;
  status?: string;
}

interface Event {
  id: string;
  name?: string;
  title?: string;
  categoryCode?: string;
}

interface Entry {
  id: string;
  teamId?: string;
}

interface Team {
  id: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: string;
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

export default function PublicationPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ─── Load data ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [
        resultData,
        scorecardData,
        eventData,
        entryData,
        teamData,
      ] = await Promise.all([
        getAll<ResultRecord>('results'),
        getAll<Scorecard>('scorecards'),
        getAll<Event>('events'),
        getAll<Entry>('stageEntries'),
        getAll<Team>('teams'),
      ]);

      setResults(resultData);
      setScorecards(scorecardData);
      setEvents(eventData);
      setEntries(entryData);
      setTeams(teamData);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Could not load publication data. Check your access and try again.'
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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const published = (result: ResultRecord) =>
    Boolean(result.publishedAt) || result.status === 'PUBLISHED';

  const scoreStatus = (result: ResultRecord) => {
    if (result.scoreStatus) return result.scoreStatus;

    const related = scorecards.filter(
      (card) => card.entryId === result.entryId
    );

    if (related.length === 0) return 'UNKNOWN';

    return related.every((card) => card.status === 'LOCKED')
      ? 'LOCKED'
      : 'NOT_ALL_LOCKED';
  };

  const resultTeam = (result: ResultRecord) => {
    const teamId = entries.find(
      (entry) => entry.id === result.entryId
    )?.teamId;

    return teams.find((team) => team.id === teamId);
  };

  // ─── Publication and certificate actions ───────────────────────────────────

  const runAction = async (
    result: ResultRecord,
    action: 'publishResults' | 'issueCertificate'
  ) => {
    setBusy(`${result.id}:${action}`);
    setError('');
    setMessage('');

    try {
      await callEiroFunction<{ resultId: string }, unknown>(
        action,
        { resultId: result.id }
      );

      setMessage(
        action === 'publishResults'
          ? `Publication submitted for ${result.id}.`
          : `Certificate issuance submitted for ${result.id}.`
      );

      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);

      setError(
        `The ${
          action === 'publishResults' ? 'publication' : 'certificate'
        } request was not completed. The callable may be unavailable or the result may no longer be eligible.`
      );
    } finally {
      setBusy('');
    }
  };

  const publishableCount = results.filter(
    (result) =>
      scoreStatus(result) === 'LOCKED' && !published(result)
  ).length;

  const publishedCount = results.filter(published).length;

  const awaitingLockCount = results.filter(
    (result) => scoreStatus(result) !== 'LOCKED'
  ).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="publication-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ─── SAME ADMIN ANIMATED BACKGROUND ─── */}

      <div
        className="publication-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="publication-orb publication-orb-one" />
        <div className="publication-orb publication-orb-two" />
        <div className="publication-orb publication-orb-three" />
        <div className="publication-orb publication-orb-four" />

        <div className="publication-dot-grid absolute inset-0" />

        <div className="publication-ring publication-ring-one" />
        <div className="publication-ring publication-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`publication-particle ${particle}`}
          />
        ))}

        <div className="publication-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`publication-bubble ${bubble.tone}`}
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

        <div className="publication-center-glow" />
      </div>

      {/* ─── PAGE CONTENT ─── */}

      <main className="publication-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Publication & Certificates"
          subtitle="Publish results and request certificate issuance"
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

        <div className="publication-kpi-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Ready to Publish"
            value={publishableCount}
            icon={Globe}
            color="green"
          />

          <KpiCard
            title="Published Results"
            value={publishedCount}
            icon={CheckCircle2}
            color="blue"
          />

          <KpiCard
            title="Awaiting Score Lock"
            value={awaitingLockCount}
            icon={Lock}
            color="orange"
          />
        </div>

        {/* INFORMATION PANEL */}

        <div className="publication-info-panel p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />

          <p className="text-sm text-blue-300">
            Result publication and certificate issuance are performed by
            trusted Cloud Functions. The server validates eligibility and
            applies the operation.
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

        {/* LOADING AND RESULTS */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : results.length === 0 ? (
          <Card className="publication-transparent-card text-center text-gray-400">
            No result records found.
          </Card>
        ) : (
          <Card
            padding="none"
            className="publication-transparent-card"
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="font-semibold text-white text-sm">
                Results Publication Queue
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Team / Entry</th>
                    <th>Score Status</th>
                    <th>Publication</th>
                    <th>Qualifiers</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((result) => {
                    const isPublished = published(result);
                    const team = resultTeam(result);

                    const event = events.find(
                      (item) => item.id === result.eventId
                    );

                    const cat =
                      result.categoryCode ||
                      result.category ||
                      event?.categoryCode ||
                      team?.categoryCode;

                    return (
                      <tr key={result.id}>
                        <td>
                          <span className="text-xs text-gray-300">
                            {result.eventName ||
                              event?.name ||
                              event?.title ||
                              result.eventId ||
                              result.id}
                          </span>
                        </td>

                        <td>
                          {cat ? (
                            <CategoryBadge
                              code={cat as CategoryCode}
                            />
                          ) : (
                            <span className="text-xs text-gray-500">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="text-white">
                            {team?.teamName ||
                              team?.displayTeamCode ||
                              result.entryId ||
                              '—'}
                          </span>
                        </td>

                        <td>
                          <StatusBadge status={scoreStatus(result)} />
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={isPublished ? 'PUBLISHED' : 'DRAFT'}
                            />

                            {isPublished && (
                              <Globe className="w-3 h-3 text-green-400" />
                            )}
                          </div>
                        </td>

                        <td>
                          {result.qualifiedCount !== undefined ? (
                            <Badge variant="success">
                              {result.qualifiedCount} teams
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-600">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="flex gap-2">
                            {scoreStatus(result) === 'LOCKED' &&
                              !isPublished && (
                                <Button
                                  size="sm"
                                  icon={Globe}
                                  loading={
                                    busy === `${result.id}:publishResults`
                                  }
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    void runAction(result, 'publishResults')
                                  }
                                >
                                  Publish
                                </Button>
                              )}

                            {isPublished && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={Award}
                                loading={
                                  busy === `${result.id}:issueCertificate`
                                }
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  void runAction(result, 'issueCertificate')
                                }
                              >
                                Issue Certificates
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* ─── BACKGROUND STYLES ─── */}

      <style jsx global>{`

        /* PAGE BASE */

        .publication-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .publication-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* IMPORTANT:
           The ambient background must never be covered by a full-screen layer.
        */

        .publication-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .publication-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .publication-orb-one {
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
          animation: publicationOrbOne 18s ease-in-out infinite alternate;
        }

        .publication-orb-two {
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
          animation: publicationOrbTwo 22s ease-in-out infinite alternate;
        }

        .publication-orb-three {
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
          animation: publicationOrbThree 20s ease-in-out infinite alternate;
        }

        .publication-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: publicationOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .publication-dot-grid {
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

        .publication-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .publication-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: publicationRingOne 35s linear infinite;
        }

        .publication-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: publicationRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .publication-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: publicationParticle 8s ease-in-out infinite alternate;
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

        .publication-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .publication-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: publicationBubbleFloat linear infinite;
        }

        .publication-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .publication-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .publication-center-glow {
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

        /* REMOVE DARK CARD OVERLAYS */

        .publication-page .publication-content,
        .publication-page .publication-content > *,
        .publication-page .publication-kpi-grid {
          background-color: transparent;
        }

        /*
          KPI cards: transparent backgrounds, no blur or heavy shadow.
          The card content and icons remain unchanged.
        */

        .publication-page .publication-kpi-grid > * {
          background: rgba(5, 3, 8, 0.10) !important;
          background-color: rgba(5, 3, 8, 0.10) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
          border-color: rgba(221, 143, 224, 0.20) !important;
        }

        /*
          Main information panel: keep only a light border.
          No dark blue filled box.
        */

        .publication-info-panel {
          background: rgba(5, 3, 8, 0.08) !important;
          background-color: rgba(5, 3, 8, 0.08) !important;
          border: 1px solid rgba(129, 140, 248, 0.22);
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        /*
          Results table Card: nearly transparent.
          No opaque dark rectangle hiding the animation.
        */

        .publication-page .publication-transparent-card {
          background: rgba(5, 3, 8, 0.10) !important;
          background-color: rgba(5, 3, 8, 0.10) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
          border: 1px solid rgba(221, 143, 224, 0.18) !important;
        }

        /*
          Make sure the table container itself stays transparent.
        */

        .publication-page .publication-transparent-card > div {
          background-color: transparent !important;
        }

        .publication-page .publication-transparent-card table {
          background: transparent !important;
        }

        .publication-page .publication-transparent-card thead,
        .publication-page .publication-transparent-card tbody,
        .publication-page .publication-transparent-card tr {
          background-color: transparent !important;
        }

        /* ANIMATIONS */

        @keyframes publicationOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes publicationOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes publicationOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes publicationOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes publicationRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes publicationRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes publicationParticle {
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

        @keyframes publicationBubbleFloat {
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

        /* MOBILE */

        @media (max-width: 640px) {
          .publication-orb-one {
            width: 320px;
            height: 320px;
          }

          .publication-orb-two {
            width: 360px;
            height: 360px;
          }

          .publication-orb-three {
            width: 340px;
            height: 340px;
          }

          .publication-ring-one {
            width: 300px;
            height: 300px;
          }

          .publication-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .publication-orb,
          .publication-ring,
          .publication-particle,
          .publication-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}