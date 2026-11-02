'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import {
  History,
  CheckCircle2,
  XCircle,
  Shuffle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';

interface HistoryRecord {
  id: string;
  type?: string;
  status?: string;
  outcome?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  studentIds?: string[];
  requestedBy?: string;
  reviewedBy?: string;
  reviewedAt?: unknown;
  appliedAt?: unknown;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

function showDate(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) return value.toLocaleString();

  return typeof value === 'string' ? value : '—';
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAdjustmentHistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await getAll<HistoryRecord>('teamAdjustmentHistory');
      setRecords(result);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Could not load adjustment history. Check your access and try again.'
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

  const outcome = (record: HistoryRecord) =>
    record.outcome || record.status || 'UNKNOWN';

  const approved = records.filter((record) =>
    ['APPROVED', 'APPLIED'].includes(outcome(record))
  ).length;

  const rejected = records.filter(
    (record) => outcome(record) === 'REJECTED'
  ).length;

  return (
    <div className="adjustment-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ─── Animated Background ─────────────────────────────────────── */}

      <div
        className="adjustment-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="adjustment-orb adjustment-orb-one" />
        <div className="adjustment-orb adjustment-orb-two" />
        <div className="adjustment-orb adjustment-orb-three" />
        <div className="adjustment-orb adjustment-orb-four" />

        <div className="adjustment-dot-grid absolute inset-0" />

        <div className="adjustment-ring adjustment-ring-one" />
        <div className="adjustment-ring adjustment-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`adjustment-particle ${particle}`}
          />
        ))}

        <div className="adjustment-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`adjustment-bubble ${bubble.tone}`}
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

        <div className="adjustment-center-glow" />
      </div>

      {/* ─── Page Content ────────────────────────────────────────────── */}

      <main className="adjustment-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Adjustment History"
          subtitle="Immutable audit log of team adjustment operations"
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
          <KpiCard
            title="Total Operations"
            value={records.length}
            icon={History}
            color="indigo"
          />

          <KpiCard
            title="Approved / Applied"
            value={approved}
            icon={CheckCircle2}
            color="green"
          />

          <KpiCard
            title="Rejected"
            value={rejected}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* ERROR */}

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
        ) : records.length === 0 ? (
          <Card className="!bg-white/[0.035] !backdrop-blur-none text-center text-gray-400">
            No adjustment history records found.
          </Card>
        ) : (

          /* HISTORY RECORDS */

          <div className="space-y-4">
            {records.map((record) => {
              const state = outcome(record);

              const isApproved = ['APPROVED', 'APPLIED'].includes(state);
              const isRejected = state === 'REJECTED';

              return (
                <Card
                  key={record.id}
                  className={`!bg-white/[0.035] !backdrop-blur-none ${
                    isRejected
                      ? 'border-red-500/20'
                      : isApproved
                        ? 'border-green-500/20'
                        : ''
                  }`}
                >
                  {/* RECORD HEADER */}

                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">

                      {isRejected ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : isApproved ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-indigo-400">
                            {record.id}
                          </span>

                          <Badge
                            variant={
                              record.type === 'MERGE_TEAMS'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {record.type || 'Adjustment'}
                          </Badge>

                          <Badge
                            variant={
                              isRejected
                                ? 'danger'
                                : isApproved
                                  ? 'success'
                                  : 'default'
                            }
                          >
                            {state}
                          </Badge>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          {showDate(record.appliedAt || record.reviewedAt)}
                          {' · '}
                          {record.reviewedBy || 'Reviewer unavailable'}
                        </p>
                      </div>
                    </div>

                    <Shuffle className="w-4 h-4 text-purple-400" />
                  </div>

                  {/* SOURCE AND TARGET */}

                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                      <p className="text-xs text-gray-500">
                        Source entry
                      </p>

                      <p className="text-sm text-gray-300 break-all">
                        {record.sourceEntryId || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                      <p className="text-xs text-gray-500">
                        Target entry
                      </p>

                      <p className="text-sm text-gray-300 break-all">
                        {record.targetEntryId || '—'}
                      </p>
                    </div>
                  </div>

                  {/* STUDENTS */}

                  {record.studentIds?.length ? (
                    <p className="text-xs text-gray-400 mt-3 break-words">
                      Students: {record.studentIds.join(', ')}
                    </p>
                  ) : null}

                  {/* REASON */}

                  {record.reason && (
                    <p className="text-sm text-gray-400 mt-3">
                      {record.reason}
                    </p>
                  )}

                  {/* BEFORE AND AFTER SNAPSHOTS */}

                  {(record.before || record.after) && (
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">

                      {record.before && (
                        <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            Before snapshot
                          </p>

                          <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                            {JSON.stringify(record.before, null, 2)}
                          </pre>
                        </div>
                      )}

                      {record.after && (
                        <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            After snapshot
                          </p>

                          <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                            {JSON.stringify(record.after, null, 2)}
                          </pre>
                        </div>
                      )}

                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Background Styling ─────────────────────────────────────── */}

      <style jsx global>{`

        .adjustment-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        /*
          IMPORTANT:
          The ambient background has no dark overlay.
          It does not blur or cover the page content.
        */

        .adjustment-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        .adjustment-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .adjustment-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .adjustment-orb-one {
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
          animation: adjustmentOrbOne 18s ease-in-out infinite alternate;
        }

        .adjustment-orb-two {
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
          animation: adjustmentOrbTwo 22s ease-in-out infinite alternate;
        }

        .adjustment-orb-three {
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
          animation: adjustmentOrbThree 20s ease-in-out infinite alternate;
        }

        .adjustment-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: adjustmentOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .adjustment-dot-grid {
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

        .adjustment-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .adjustment-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: adjustmentRingOne 35s linear infinite;
        }

        .adjustment-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: adjustmentRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .adjustment-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: adjustmentParticle 8s ease-in-out infinite alternate;
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

        .adjustment-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .adjustment-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: adjustmentBubbleFloat linear infinite;
        }

        .adjustment-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .adjustment-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTER GLOW */

        .adjustment-center-glow {
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

        /* ANIMATIONS */

        @keyframes adjustmentBubbleFloat {
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

        @keyframes adjustmentOrbOne {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(120px, 110px, 0) scale(1.12); }
        }

        @keyframes adjustmentOrbTwo {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-140px, 100px, 0) scale(0.92); }
        }

        @keyframes adjustmentOrbThree {
          0% { transform: translate3d(0, 0, 0) scale(0.95); }
          100% { transform: translate3d(130px, -100px, 0) scale(1.1); }
        }

        @keyframes adjustmentOrbFour {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100px, -80px, 0); }
        }

        @keyframes adjustmentRingOne {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.08); }
        }

        @keyframes adjustmentRingTwo {
          from { transform: rotate(360deg) scale(1); }
          to { transform: rotate(0deg) scale(1.1); }
        }

        @keyframes adjustmentParticle {
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
          .adjustment-orb-one {
            width: 320px;
            height: 320px;
          }

          .adjustment-orb-two {
            width: 360px;
            height: 360px;
          }

          .adjustment-orb-three {
            width: 340px;
            height: 340px;
          }

          .adjustment-ring-one {
            width: 300px;
            height: 300px;
          }

          .adjustment-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .adjustment-orb,
          .adjustment-ring,
          .adjustment-particle,
          .adjustment-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
