'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { Card, CategoryBadge, KpiCard, StatusBadge } from '@/components/ui';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

type QueueMatch = {
  id: string;
  categoryCode?: CategoryCode;
  category?: CategoryCode;
  arena?: string;
  status?: string;
  teamAName?: string;
  teamBName?: string;
  teamA?: string;
  teamB?: string;
  scheduledAt?: string;
  round?: string;
};

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function ArenaQueuePage() {
  const [matches, setMatches] = useState<QueueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');

    getAll<QueueMatch>('matches')
      .then(records => setMatches(records))
      .catch(() => setError('Competition queue could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const active = matches.filter(
    match => match.status === 'IN_PROGRESS'
  ).length;

  const waiting = matches.filter(match =>
    ['SCHEDULED', 'UPCOMING', 'CHECKED_IN'].includes(match.status ?? '')
  ).length;

  const complete = matches.filter(
    match => match.status === 'COMPLETED'
  ).length;

  return (
    <main className="arena-queue-page relative isolate min-h-screen w-full">
      {/* Animated background — no grid */}
      <div className="arena-ambient" aria-hidden="true">
        <div className="arena-orb arena-orb-one" />
        <div className="arena-orb arena-orb-two" />

        <div className="arena-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`arena-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="arena-queue-content relative z-10 w-full space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Arena Queue
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Read-only queue from scheduled match records.
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Active"
            value={active}
            icon={Zap}
            color="green"
          />

          <KpiCard
            title="Waiting"
            value={waiting}
            icon={Clock}
            color="indigo"
          />

          <KpiCard
            title="Matches"
            value={matches.length}
            icon={Activity}
            color="orange"
          />

          <KpiCard
            title="Completed"
            value={complete}
            icon={CheckCircle2}
            color="blue"
          />
        </div>

        {/* Queue content */}
        {loading ? (
          <div
            role="status"
            className="text-center text-gray-400 py-12 arena-glass-card rounded-2xl"
          >
            Loading queue…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400 arena-glass-card"
          >
            {error}
          </div>
        ) : matches.length === 0 ? (
          <Card className="arena-glass-card text-center py-12 text-gray-400">
            No match records are available.
          </Card>
        ) : (
          <Card padding="none" className="arena-glass-card">
            <div className="overflow-x-auto rounded-2xl">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Category</th>
                    <th>Arena</th>
                    <th>Round</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {matches.map(match => (
                    <tr key={match.id}>
                      <td>
                        <span className="font-medium text-white">
                          {match.teamAName ?? match.teamA ?? 'Team A'} vs{' '}
                          {match.teamBName ?? match.teamB ?? 'Team B'}
                        </span>

                        <p className="font-mono text-[10px] text-gray-500">
                          {match.id}
                        </p>
                      </td>

                      <td>
                        {(match.categoryCode ?? match.category) && (
                          <CategoryBadge
                            code={
                              (match.categoryCode ??
                                match.category) as CategoryCode
                            }
                          />
                        )}
                      </td>

                      <td className="text-gray-300">
                        {match.arena ?? '—'}
                      </td>

                      <td className="text-gray-400">
                        {match.round ?? '—'}
                      </td>

                      <td>
                        <StatusBadge status={match.status ?? 'UNKNOWN'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="p-4 text-xs text-gray-500 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Queue advancement is unavailable here; no client-side match
              status writes are permitted.
            </p>
          </Card>
        )}
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        .arena-queue-page {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background: transparent;
        }

        .arena-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .arena-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.2;
          animation: arena-orb-pulse 12s ease-in-out infinite alternate;
        }

        .arena-orb-one {
          width: 380px;
          height: 380px;
          top: 5%;
          left: -120px;
          background: rgba(124, 58, 237, 0.55);
        }

        .arena-orb-two {
          width: 340px;
          height: 340px;
          right: -100px;
          bottom: 0;
          background: rgba(219, 39, 119, 0.35);
          animation-delay: -6s;
        }

        .arena-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .arena-bubble {
          position: absolute;
          bottom: -100px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          animation-name: arena-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .arena-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(196, 181, 253, 0.2),
            rgba(139, 92, 246, 0.045) 65%,
            transparent 100%
          );
          border: 1px solid rgba(167, 139, 250, 0.12);
          box-shadow: inset 0 0 15px rgba(167, 139, 250, 0.06);
        }

        .arena-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(251, 207, 232, 0.18),
            rgba(244, 63, 94, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 113, 133, 0.12);
          box-shadow: inset 0 0 15px rgba(251, 113, 133, 0.05);
        }

        @keyframes arena-float {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 0;
          }

          10% {
            opacity: 0.65;
          }

          50% {
            transform: translate3d(35px, -55vh, 0) scale(1);
            opacity: 0.45;
          }

          90% {
            opacity: 0.5;
          }

          100% {
            transform: translate3d(-20px, -115vh, 0) scale(1.15);
            opacity: 0;
          }
        }

        @keyframes arena-orb-pulse {
          from {
            transform: scale(1);
            opacity: 0.14;
          }

          to {
            transform: scale(1.18);
            opacity: 0.26;
          }
        }

        .arena-queue-content {
          width: 100%;
          padding: 1.5rem;
        }

        .arena-glass-card {
          background: rgba(17, 24, 39, 0.3) !important;
          border: 1px solid rgba(148, 163, 184, 0.12) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .arena-queue-page .eiro-table {
          width: 100%;
          border-collapse: collapse;
        }

        .arena-queue-page .eiro-table th,
        .arena-queue-page .eiro-table td {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .arena-queue-content {
            padding: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arena-bubble,
          .arena-orb {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
