'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Card,
  Button,
  CategoryBadge,
  StatusBadge,
  KpiCard,
} from '@/components/ui';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  CategoryCode,
  Scorecard as ScorecardSchema,
} from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Scorecard = ScorecardSchema & {
  teamName?: string;
  categoryCode?: CategoryCode;
  judgeName?: string;
  type?: string;
  flagged?: boolean;
};

// ─── Animated Background Settings ─────────────────────────────────────────────

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

export default function ScoreVerificationPage() {
  const [cards, setCards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const snap = await getDocs(collection(db, 'scorecards'));

      setCards(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Scorecard, 'id'>),
        }))
      );

      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Scorecards could not be loaded. Head Judge authorization may be required; retry after checking permissions.'
      );

      toast.error('Failed to load scorecards. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Verify ──────────────────────────────────────────────────────────────────

  const requestScoreAction = async (
    scorecardIds: string[],
    action: 'VERIFY' | 'LOCK'
  ) => {
    if (scorecardIds.length === 0) return;

    setSaving(true);

    try {
      await callEiroFunction<
        Record<string, unknown>,
        unknown
      >('verifyAndLockScores', {
        scorecardIds,
        action,
      });

      toast.success(
        action === 'VERIFY'
          ? 'Score verification submitted.'
          : 'Score lock submitted.'
      );

      await load();
    } catch (e) {
      console.error(e);

      toast.error(
        action === 'VERIFY'
          ? 'Score verification was rejected by the scoring service.'
          : 'Score lock was rejected by the scoring service.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Lock all ────────────────────────────────────────────────────────────────

  const lockAll = async () => {
    if (!confirm('Lock all verified scores? This cannot be undone.')) return;

    const verified = cards.filter((c) => c.status === 'VERIFIED');

    await requestScoreAction(
      verified.map((c) => c.id),
      'LOCK'
    );
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const pending = cards.filter((c) =>
    ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)
  );

  const verified = cards.filter((c) => c.status === 'VERIFIED');

  const locked = cards.filter((c) => c.status === 'LOCKED');

  const flagged = cards.filter((c) => c.flagged);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="score-verification-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ─────────── ANIMATED BACKGROUND ─────────── */}

      <div
        className="score-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="score-orb score-orb-one" />
        <div className="score-orb score-orb-two" />
        <div className="score-orb score-orb-three" />
        <div className="score-orb score-orb-four" />

        <div className="score-dot-grid absolute inset-0" />

        <div className="score-ring score-ring-one" />
        <div className="score-ring score-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`score-particle ${particle}`}
          />
        ))}

        <div className="score-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`score-bubble ${bubble.tone}`}
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

        <div className="score-center-glow" />
      </div>

      {/* ─────────── PAGE CONTENT ─────────── */}

      <main className="score-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Score Verification"
          subtitle="Review submitted scores and lock verified scores; existing score flags are read-only."
          actions={
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* KPI CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="score-kpi-shell">
            <KpiCard
              title="Pending Review"
              value={error || loading ? '—' : pending.length}
              icon={AlertCircle}
              color="orange"
            />
          </div>

          <div className="score-kpi-shell">
            <KpiCard
              title="Flagged"
              value={error || loading ? '—' : flagged.length}
              icon={Flag}
              color="red"
            />
          </div>

          <div className="score-kpi-shell">
            <KpiCard
              title="Verified"
              value={error || loading ? '—' : verified.length}
              icon={CheckCircle2}
              color="green"
            />
          </div>

          <div className="score-kpi-shell">
            <KpiCard
              title="Locked"
              value={error || loading ? '—' : locked.length}
              icon={Lock}
              color="purple"
            />
          </div>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div role="alert" className="score-card-shell">
            <Card className="text-sm text-red-300">
              <p>{error}</p>

              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </Card>
          </div>
        ) : cards.length === 0 ? (
          <div className="score-card-shell">
            <Card className="text-center py-16">
              <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />

              <p className="text-gray-400 font-medium">
                No scorecards yet
              </p>

              <p className="text-gray-500 text-sm mt-1">
                Scorecards will appear here once judges submit their scores.
              </p>
            </Card>
          </div>
        ) : (
          <div className="score-card-shell">
            <Card padding="none">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm">
                  All Scorecards
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="eiro-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Judge</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cards.map((sc) => (
                      <tr
                        key={sc.id}
                        className={sc.flagged ? 'bg-red-500/[0.03]' : ''}
                      >
                        <td>
                          <div className="flex items-center gap-1.5">
                            {sc.flagged && (
                              <Flag className="w-3 h-3 text-red-400 flex-shrink-0" />
                            )}

                            <span className="text-sm font-medium text-white">
                              {sc.teamName ?? sc.entryId}
                            </span>
                          </div>
                        </td>

                        <td>
                          {sc.categoryCode ? (
                            <CategoryBadge code={sc.categoryCode} />
                          ) : (
                            '—'
                          )}
                        </td>

                        <td>
                          <span className="text-xs text-gray-400">
                            {sc.type ?? 'Scorecard'}
                          </span>
                        </td>

                        <td>
                          <span className="font-mono text-sm font-bold text-white">
                            {sc.computedTotal}
                          </span>
                        </td>

                        <td>
                          <span className="text-xs text-gray-400">
                            {sc.judgeName ?? sc.judgeUid}
                          </span>
                        </td>

                        <td>
                          <StatusBadge status={sc.status} />
                        </td>

                        <td>
                          <div className="flex gap-1">
                            {['SUBMITTED', 'UNDER_REVIEW'].includes(sc.status) && (
                              <Button
                                size="sm"
                                icon={CheckCircle2}
                                loading={saving}
                                disabled={saving}
                                onClick={() =>
                                  void requestScoreAction([sc.id], 'VERIFY')
                                }
                              >
                                Verify
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* BOTTOM ACTIONS */}

        <div className="flex justify-end items-center gap-3 flex-wrap">
          {pending.length > 0 && (
            <p className="text-xs text-yellow-400">
              {pending.length} scores still pending review
            </p>
          )}

          <Button
            icon={Lock}
            loading={saving}
            disabled={
              saving ||
              pending.length > 0 ||
              verified.length === 0
            }
            onClick={lockAll}
          >
            Lock All Verified Scores
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          Score flags are read-only here because no flag-management callable
          is available; verification and locking are handled by the scoring
          service.
        </p>

      </main>

      {/* ─────────── BACKGROUND STYLES ─────────── */}

      <style jsx global>{`

        .score-verification-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .score-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* BACKGROUND LAYER */

        .score-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .score-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .score-orb-one {
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
          animation: scoreOrbOne 18s ease-in-out infinite alternate;
        }

        .score-orb-two {
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
          animation: scoreOrbTwo 22s ease-in-out infinite alternate;
        }

        .score-orb-three {
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
          animation: scoreOrbThree 20s ease-in-out infinite alternate;
        }

        .score-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: scoreOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .score-dot-grid {
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

        .score-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .score-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: scoreRingOne 35s linear infinite;
        }

        .score-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: scoreRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .score-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: scoreParticle 8s ease-in-out infinite alternate;
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

        .score-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .score-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: scoreBubbleFloat linear infinite;
        }

        .score-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .score-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .score-center-glow {
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

        /* TRANSPARENT CONTENT — NO SCREEN-WIDE OVERLAY */

        .score-content,
        .score-content > * {
          background-color: transparent;
        }

        /*
          Only the outer Card/KPI surfaces are adjusted.
          No backdrop blur, no dark full-screen layer,
          and no opaque background over the animations.
        */

        .score-card-shell > *,
        .score-kpi-shell > * {
          background-color: rgba(5, 3, 8, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        .score-card-shell > * {
          border-color: rgba(221, 143, 224, 0.18) !important;
        }

        .score-kpi-shell > * {
          border-color: rgba(221, 143, 224, 0.16) !important;
        }

        /* Keep table and content backgrounds transparent */

        .score-card-shell table {
          background: transparent !important;
        }

        .score-card-shell thead,
        .score-card-shell tbody {
          background: transparent !important;
        }

        .score-card-shell th {
          background: rgba(5, 3, 8, 0.12) !important;
        }

        .score-card-shell tr {
          background-color: transparent;
        }

        /* ANIMATIONS */

        @keyframes scoreBubbleFloat {
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

        @keyframes scoreOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes scoreOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes scoreOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes scoreOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes scoreRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes scoreRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes scoreParticle {
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
          .score-orb-one {
            width: 320px;
            height: 320px;
          }

          .score-orb-two {
            width: 360px;
            height: 360px;
          }

          .score-orb-three {
            width: 340px;
            height: 340px;
          }

          .score-ring-one {
            width: 300px;
            height: 300px;
          }

          .score-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .score-orb,
          .score-ring,
          .score-particle,
          .score-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
