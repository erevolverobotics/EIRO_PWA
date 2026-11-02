'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, KpiCard, Button, Badge, CategoryBadge, Modal } from '@/components/ui';
import {
  Zap,
  Users,
  Clock,
  Activity,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Match {
  id: string;
  category?: CategoryCode;
  arena?: string;
  teamA?: string;
  teamB?: string;
  round?: string;
  status?: string;
  scoreA?: number;
  scoreB?: number;
}

interface Arena {
  id: string;
  name: string;
  category?: CategoryCode;
  status?: string;
  currentMatch?: string;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-400',
  SETUP: 'bg-yellow-400',
  IDLE: 'bg-gray-500',
};

// ─── Animated Background ──────────────────────────────────────────────────────

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

export default function LiveOperationsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [halting, setHalting] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [matchSnap, arenaSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'matches'),
            where('status', 'in', ['IN_PROGRESS', 'UPCOMING'])
          )
        ),
        getDocs(collection(db, 'arenas')),
      ]);

      setMatches(
        matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Match, 'id'>),
        }))
      );

      setArenas(
        arenaSnap.docs.map((d) => ({
          id: d.id,
          name: d.id,
          ...(d.data() as Partial<Arena>),
        }))
      );

      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Live match and arena data could not be loaded. Check your role and Firestore permissions, then retry.'
      );
      toast.error('Failed to load live data.');
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

  // ── Emergency stop ─────────────────────────────────────────────────────────

  const handleEmergencyStop = async () => {
    setHalting(true);

    try {
      const active = arenas.filter((a) => a.status === 'ACTIVE');

      if (active.length === 0) {
        toast.error('No active arenas are available to stop.');
        return;
      }

      await Promise.all(
        active.map((arena) =>
          callEiroFunction<Record<string, unknown>, unknown>(
            'stopArena',
            {
              arenaId: arena.id,
              reason: 'EMERGENCY_STOP',
            }
          )
        )
      );

      toast.success('Stop request sent to all active arenas.');
      setEmergencyOpen(false);

      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to issue emergency stop.');
    } finally {
      setHalting(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const activeArenas = arenas.filter(
    (a) => a.status === 'ACTIVE'
  ).length;

  const liveMatches = matches.filter(
    (m) => m.status === 'IN_PROGRESS'
  ).length;

  const uniqueTeams = new Set(
    matches.flatMap((m) => [m.teamA, m.teamB].filter(Boolean))
  ).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="live-operations-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND - NO FULL-SCREEN OVERLAY */}

      <div
        className="live-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="live-orb live-orb-one" />
        <div className="live-orb live-orb-two" />
        <div className="live-orb live-orb-three" />
        <div className="live-orb live-orb-four" />

        <div className="live-dot-grid absolute inset-0" />

        <div className="live-ring live-ring-one" />
        <div className="live-ring live-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`live-particle ${particle}`}
          />
        ))}

        <div className="live-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`live-bubble ${bubble.tone}`}
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

        <div className="live-center-glow" />
      </div>

      {/* PAGE CONTENT - TRANSPARENT WRAPPER */}

      <main className="live-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live Operations
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              Real-time match and arena status
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={loading ? Loader2 : RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={AlertCircle}
              onClick={() => setEmergencyOpen(true)}
              disabled={loading || halting}
            >
              Emergency Stop
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Active Arenas"
            value={error || loading ? '—' : activeArenas}
            icon={Activity}
            color="green"
          />

          <KpiCard
            title="Matches Running"
            value={error || loading ? '—' : liveMatches}
            icon={Zap}
            color="indigo"
          />

          <KpiCard
            title="Teams Today"
            value={error || loading ? '—' : uniqueTeams}
            icon={Users}
            color="blue"
          />

          <KpiCard
            title="Avg Wait Time"
            value="—"
            icon={Clock}
            color="orange"
          />
        </div>

        {/* LOADING / ERROR / DATA */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div role="alert">
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
        ) : (
          <>
            {/* LIVE MATCHES */}

            <Card padding="none">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live & Upcoming Matches
                </h3>
              </div>

              {matches.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-10">
                  No active matches right now.
                </p>
              ) : (
                <div className="divide-y divide-white/5">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <div className="flex-shrink-0 text-xs font-mono text-gray-500 w-8">
                        {m.arena ?? '—'}
                      </div>

                      {m.category && (
                        <CategoryBadge code={m.category} />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-semibold ${
                              (m.scoreA ?? 0) > (m.scoreB ?? 0)
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            {m.teamA ?? '—'}
                          </span>

                          {m.teamB && (
                            <>
                              <span className="text-gray-600 text-sm font-bold font-mono">
                                {m.scoreA ?? '—'} – {m.scoreB ?? '—'}
                              </span>

                              <span
                                className={`text-sm font-semibold ${
                                  (m.scoreB ?? 0) > (m.scoreA ?? 0)
                                    ? 'text-green-400'
                                    : 'text-white'
                                }`}
                              >
                                {m.teamB}
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {m.round ?? '—'}
                        </p>
                      </div>

                      <Badge
                        variant={
                          m.status === 'IN_PROGRESS'
                            ? 'success'
                            : 'default'
                        }
                      >
                        {m.status === 'IN_PROGRESS'
                          ? '● Live'
                          : m.status === 'UPCOMING'
                            ? 'Upcoming'
                            : m.status ?? 'Status unavailable'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ARENA STATUS */}

            <div>
              <h3 className="font-semibold text-white mb-3">
                Arena Status
              </h3>

              {arenas.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-gray-500 text-sm">
                    No arenas configured. Add arenas in Firestore under{' '}
                    <code>arenas</code> collection.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {arenas.map((arena) => (
                    <Card
                      key={arena.id}
                      className={`border ${
                        arena.status === 'ACTIVE'
                          ? 'border-green-500/20 bg-green-500/[0.03]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              STATUS_DOT[arena.status ?? ''] ??
                              'bg-gray-500'
                            }`}
                          />

                          <span className="font-semibold text-white text-sm">
                            {arena.name}
                          </span>
                        </div>

                        {arena.category && (
                          <CategoryBadge code={arena.category} />
                        )}
                      </div>

                      {arena.currentMatch ? (
                        <p className="text-xs text-gray-400">
                          {arena.currentMatch}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">
                          No match assigned
                        </p>
                      )}

                      <p
                        className={`text-xs font-medium mt-2 ${
                          arena.status === 'ACTIVE'
                            ? 'text-green-400'
                            : arena.status === 'SETUP'
                              ? 'text-yellow-400'
                              : 'text-gray-600'
                        }`}
                      >
                        {arena.status ?? 'Status unavailable'}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* EMERGENCY STOP MODAL */}

        <Modal
          open={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          title="Emergency Stop"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setEmergencyOpen(false)}
                disabled={halting}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                icon={halting ? Loader2 : AlertCircle}
                onClick={handleEmergencyStop}
                disabled={halting}
              >
                {halting ? 'Halting…' : 'HALT ALL OPERATIONS'}
              </Button>
            </>
          }
        >
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 mb-4">
            <p className="text-red-300 font-semibold mb-1">
              ⚠ This will mark all active arenas as stopped
            </p>

            <p className="text-sm text-red-500">
              Arena status will be updated by the server. Match records
              are not changed by this action.
            </p>
          </div>

          <p className="text-sm text-gray-400">
            Use only in case of emergency (fire alarm, medical incident,
            power outage, etc.).
          </p>
        </Modal>
      </main>

      {/* BACKGROUND ANIMATIONS */}

      <style jsx global>{`

        /* ROOT: NO DARK OVERLAY PANEL */

        .live-operations-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .live-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* BACKGROUND LAYER */

        .live-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .live-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .live-orb-one {
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
          animation: liveOrbOne 18s ease-in-out infinite alternate;
        }

        .live-orb-two {
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
          animation: liveOrbTwo 22s ease-in-out infinite alternate;
        }

        .live-orb-three {
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
          animation: liveOrbThree 20s ease-in-out infinite alternate;
        }

        .live-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: liveOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .live-dot-grid {
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

        .live-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .live-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: liveRingOne 35s linear infinite;
        }

        .live-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: liveRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .live-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: liveParticle 8s ease-in-out infinite alternate;
        }

        .live-ambient .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .live-ambient .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .live-ambient .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .live-ambient .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .live-ambient .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .live-ambient .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .live-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .live-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: liveBubbleFloat linear infinite;
        }

        .live-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .live-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTER GLOW */

        .live-center-glow {
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

        @keyframes liveOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes liveOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes liveOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes liveOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes liveRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes liveRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes liveParticle {
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

        @keyframes liveBubbleFloat {
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
          .live-orb-one {
            width: 320px;
            height: 320px;
          }

          .live-orb-two {
            width: 360px;
            height: 360px;
          }

          .live-orb-three {
            width: 340px;
            height: 340px;
          }

          .live-ring-one {
            width: 300px;
            height: 300px;
          }

          .live-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .live-orb,
          .live-ring,
          .live-particle,
          .live-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}

