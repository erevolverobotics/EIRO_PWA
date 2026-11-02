'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { ImportStatus } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportJob {
  id: string;
  uploaderUid?: string;
  sourceFilePath?: string;
  status?: ImportStatus | string;
  counts?: {
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
    teamsCreated?: number;
    studentsCreated?: number;
  };
  idempotencyKey?: string;
  createdAt?: unknown;
}

// ─── Status Configuration ────────────────────────────────────────────────────

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  PARTIAL_FAILED: AlertCircle,
  VALIDATED: CheckCircle2,
  COMMITTING: Clock,
  VALIDATING: Clock,
  UPLOADED: Upload,
  NEEDS_CORRECTION: XCircle,
};

// ─── Background Configuration ─────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showDate(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return typeof value === 'string' ? value : '—';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportsPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Load import jobs ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setJobs(await getAll<ImportJob>('importJobs'));
      setError('');
    } catch (e) {
      console.error(e);
      setError('Could not load import jobs. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // ── Refresh ─────────────────────────────────────────────────────────────────

  const refresh = () => {
    setLoading(true);
    setError('');
    void load();
  };

  // ── Statistics ─────────────────────────────────────────────────────────────

  const completed = jobs.filter((job) =>
    ['COMPLETED', 'PARTIAL_FAILED'].includes(job.status || '')
  ).length;

  const processing = jobs.filter((job) =>
    ['VALIDATING', 'COMMITTING'].includes(job.status || '')
  ).length;

  const totalRows = jobs.reduce(
    (sum, job) => sum + (job.counts?.totalRows || 0),
    0
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="imports-page relative isolate min-h-screen w-full">

      {/* ── ANIMATED BACKGROUND ────────────────────────────────────────────── */}
      {/* Separate background layer: no full-screen overlay or backdrop blur. */}

      <div
        className="imports-ambient"
        aria-hidden="true"
      >
        <div className="imports-orb imports-orb-one" />
        <div className="imports-orb imports-orb-two" />
        <div className="imports-orb imports-orb-three" />
        <div className="imports-orb imports-orb-four" />

        <div className="imports-dot-grid" />

        <div className="imports-ring imports-ring-one" />
        <div className="imports-ring imports-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`imports-particle ${particle}`}
          />
        ))}

        <div className="imports-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`imports-bubble ${bubble.tone}`}
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

        <div className="imports-center-glow" />
      </div>

      {/* ── PAGE CONTENT ───────────────────────────────────────────────────── */}

      <main className="imports-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Import Monitoring"
          subtitle="Monitor CSV bulk import jobs"
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Total Jobs"
            value={jobs.length}
            icon={Upload}
            color="indigo"
          />

          <KpiCard
            title="Completed / Partial"
            value={completed}
            icon={CheckCircle2}
            color="green"
          />

          <KpiCard
            title="Processing"
            value={processing}
            icon={Clock}
            color="yellow"
          />

          <KpiCard
            title="Total Rows"
            value={totalRows}
            icon={BarChart3}
            color="blue"
          />
        </div>

        <p className="text-xs text-gray-400">
          Commit is unavailable from this monitor: the callable requires
          the validated rows, school, season, and idempotency key, which
          are not stored in import job records.
        </p>

        {/* ERROR MESSAGE */}

        {error && (
          <p
            role="alert"
            className="text-sm text-red-400"
          >
            {error}
          </p>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : jobs.length === 0 ? (

          /* EMPTY STATE */

          <Card className="text-center text-gray-400">
            No import jobs found.
          </Card>

        ) : (

          /* IMPORT JOBS TABLE */

          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">
                All Import Jobs
              </h3>

              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={refresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>File</th>
                    <th>Uploader UID</th>
                    <th>Rows</th>
                    <th>Invalid</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.map((job) => {
                    const status = job.status || 'UNKNOWN';
                    const Icon = STATUS_ICON[status] || AlertCircle;

                    return (
                      <tr key={job.id}>

                        <td>
                          <span className="font-mono text-xs text-indigo-400">
                            {job.id}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-gray-500" />

                            <span className="text-xs text-gray-300">
                              {job.sourceFilePath || '—'}
                            </span>
                          </div>
                        </td>

                        <td className="text-xs text-gray-400">
                          {job.uploaderUid || '—'}
                        </td>

                        <td>
                          <span className="text-white">
                            {job.counts?.totalRows ?? '—'}
                          </span>

                          {job.counts?.validRows !== undefined && (
                            <span className="text-xs text-green-400 ml-1">
                              ({job.counts.validRows} valid)
                            </span>
                          )}
                        </td>

                        <td>
                          {job.counts?.invalidRows ? (
                            <Badge variant="danger">
                              {job.counts.invalidRows} invalid
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-500">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5 text-xs text-gray-300">
                            <Icon className="w-3.5 h-3.5" />
                            {status}
                          </div>
                        </td>

                        <td className="text-xs text-gray-400">
                          {showDate(job.createdAt)}
                        </td>

                        <td>
                          <span className="text-xs text-gray-500">
                            {status === 'VALIDATED'
                              ? 'Source rows unavailable'
                              : '—'}
                          </span>
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

      {/* ── BACKGROUND ANIMATIONS ──────────────────────────────────────────── */}

      <style jsx global>{`

        /* PAGE BASE */

        .imports-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .imports-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* IMPORTANT:
           The background layer has no dark fill, no backdrop filter,
           and no overlay. The animation remains visible behind content. */

        .imports-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .imports-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .imports-orb-one {
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
          animation: importsOrbOne 18s ease-in-out infinite alternate;
        }

        .imports-orb-two {
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
          animation: importsOrbTwo 22s ease-in-out infinite alternate;
        }

        .imports-orb-three {
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
          animation: importsOrbThree 20s ease-in-out infinite alternate;
        }

        .imports-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: importsOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .imports-dot-grid {
          position: absolute;
          inset: 0;
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

        .imports-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .imports-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: importsRingOne 35s linear infinite;
        }

        .imports-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: importsRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .imports-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: importsParticle 8s ease-in-out infinite alternate;
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

        .imports-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .imports-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: importsBubbleFloat linear infinite;
        }

        .imports-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .imports-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .imports-center-glow {
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

        @keyframes importsBubbleFloat {
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

        @keyframes importsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes importsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes importsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes importsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes importsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes importsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes importsParticle {
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
          .imports-orb-one {
            width: 320px;
            height: 320px;
          }

          .imports-orb-two {
            width: 360px;
            height: 360px;
          }

          .imports-orb-three {
            width: 340px;
            height: 340px;
          }

          .imports-ring-one {
            width: 300px;
            height: 300px;
          }

          .imports-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .imports-orb,
          .imports-ring,
          .imports-particle,
          .imports-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
