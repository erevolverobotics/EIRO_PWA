'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { AlertCircle, Shuffle } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Entry = {
  id: string;
  teamId: string;
  eventId: string;
  entryStatus: string;
  mergedIntoEntryId?: string;
};

type Team = {
  id: string;
  teamName: string;
  displayTeamCode: string;
};

type Adjustment = {
  id: string;
  type?: string;
  status?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  studentIds?: string[];
  reason?: string;
  createdAt?: { toDate?: () => Date } | string;
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

export default function VenueAdjustmentsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<Adjustment[]>([]);
  const [sourceEntryId, setSourceEntryId] = useState('');
  const [targetEntryId, setTargetEntryId] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([
      getAll<Entry>('stageEntries'),
      getAll<Team>('teams'),
      getAll<Adjustment>('teamAdjustmentRequests'),
    ])
      .then(([entryRows, teamRows, requestRows]) => {
        setEntries(
          entryRows.filter(entry => !entry.mergedIntoEntryId)
        );
        setTeams(teamRows);
        setRequests(requestRows);
        setError('');
      })
      .catch(() => setError('Adjustment requests could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const teamName = (entryId: string) => {
    const entry = entries.find(item => item.id === entryId);

    return (
      teams.find(team => team.id === entry?.teamId)?.teamName ??
      entry?.teamId ??
      entryId
    );
  };

  const submit = async () => {
    if (
      !sourceEntryId ||
      !targetEntryId ||
      sourceEntryId === targetEntryId ||
      !studentIds.trim() ||
      !reason.trim()
    ) {
      toast.error(
        'Select two different entries, at least one student, and provide a reason.'
      );
      return;
    }

    setSaving(true);

    try {
      await callEiroFunction<Record<string, unknown>, unknown>(
        'requestTeamAdjustment',
        {
          type: 'TRANSFER_MEMBERS',
          sourceEntryId,
          targetEntryId,
          studentIds: studentIds
            .split(',')
            .map(id => id.trim())
            .filter(Boolean),
          reason: reason.trim(),
        }
      );

      toast.success('Adjustment request sent for review.');

      setSourceEntryId('');
      setTargetEntryId('');
      setStudentIds('');
      setReason('');

      load();
    } catch {
      toast.error('The adjustment request was not accepted.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="adjustments-page relative isolate min-h-screen w-full">
      {/* Animated background — no grid */}
      <div className="adjustments-ambient" aria-hidden="true">
        <div className="adjustments-orb adjustments-orb-one" />
        <div className="adjustments-orb adjustments-orb-two" />

        <div className="adjustments-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`adjustments-bubble ${bubble.tone}`}
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

      {/* Main page content */}
      <div className="adjustments-content relative z-10 w-full space-y-6 animate-fade-in-up">
        <PageHeader
          title="Team Adjustments"
          subtitle="Submit venue adjustment requests for authorized review"
        />

        {/* Information notice */}
        <div className="adjustments-glass-card p-4 rounded-2xl flex gap-3 text-xs text-yellow-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-yellow-400" />
          <span>
            Requests are not applied here. Approval and roster changes
            require an authorized backend workflow; this page does not
            simulate approval.
          </span>
        </div>

        {/* Request member transfer */}
        <Card className="adjustments-glass-card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-purple-400" />
            Request member transfer
          </h3>

          {entries.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active stage entries are available for a request.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm text-gray-400">
                  Source entry
                  <select
                    className="eiro-input mt-1"
                    value={sourceEntryId}
                    onChange={event =>
                      setSourceEntryId(event.target.value)
                    }
                  >
                    <option value="">Select source</option>

                    {entries.map(entry => (
                      <option key={entry.id} value={entry.id}>
                        {teamName(entry.id)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-400">
                  Target entry
                  <select
                    className="eiro-input mt-1"
                    value={targetEntryId}
                    onChange={event =>
                      setTargetEntryId(event.target.value)
                    }
                  >
                    <option value="">Select target</option>

                    {entries.map(entry => (
                      <option key={entry.id} value={entry.id}>
                        {teamName(entry.id)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-400 sm:col-span-2">
                  Student IDs (comma-separated)
                  <input
                    className="eiro-input mt-1"
                    value={studentIds}
                    onChange={event =>
                      setStudentIds(event.target.value)
                    }
                    placeholder="IDs to transfer"
                  />
                </label>

                <label className="text-sm text-gray-400 sm:col-span-2">
                  Request reason
                  <textarea
                    className="eiro-input mt-1"
                    rows={3}
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                  />
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => void submit()}
                  loading={saving}
                  disabled={loading}
                >
                  Send Request
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Existing requests */}
        {loading ? (
          <div
            role="status"
            className="text-center text-gray-400 py-8 adjustments-glass-card rounded-2xl"
          >
            Loading adjustment records…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400 adjustments-glass-card"
          >
            {error}
          </div>
        ) : (
          <Card padding="none" className="adjustments-glass-card">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white text-sm">
                Existing requests
              </h3>
            </div>

            {requests.length === 0 ? (
              <p className="p-6 text-center text-gray-400">
                No adjustment requests found.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {requests.map(request => (
                  <div key={request.id} className="p-5">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-white">
                        {teamName(request.sourceEntryId ?? '')} →{' '}
                        {teamName(request.targetEntryId ?? '')}
                      </span>

                      <Badge variant="warning">
                        {request.status ?? 'PENDING'}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {request.reason ?? 'No reason supplied'}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Students: {request.studentIds?.join(', ') ?? '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        .adjustments-page {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background: transparent;
        }

        .adjustments-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .adjustments-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.2;
          animation: adjustments-orb-pulse 12s ease-in-out infinite alternate;
        }

        .adjustments-orb-one {
          width: 380px;
          height: 380px;
          top: 5%;
          left: -120px;
          background: rgba(124, 58, 237, 0.55);
        }

        .adjustments-orb-two {
          width: 340px;
          height: 340px;
          right: -100px;
          bottom: 0;
          background: rgba(219, 39, 119, 0.35);
          animation-delay: -6s;
        }

        .adjustments-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .adjustments-bubble {
          position: absolute;
          bottom: -100px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          animation-name: adjustments-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .adjustments-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(196, 181, 253, 0.2),
            rgba(139, 92, 246, 0.045) 65%,
            transparent 100%
          );
          border: 1px solid rgba(167, 139, 250, 0.12);
          box-shadow: inset 0 0 15px rgba(167, 139, 250, 0.06);
        }

        .adjustments-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(251, 207, 232, 0.18),
            rgba(244, 63, 94, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 113, 133, 0.12);
          box-shadow: inset 0 0 15px rgba(251, 113, 133, 0.05);
        }

        @keyframes adjustments-float {
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

        @keyframes adjustments-orb-pulse {
          from {
            transform: scale(1);
            opacity: 0.14;
          }

          to {
            transform: scale(1.18);
            opacity: 0.26;
          }
        }

        .adjustments-content {
          width: 100%;
          padding: 1.5rem;
        }

        .adjustments-glass-card {
          background: rgba(17, 24, 39, 0.3) !important;
          border: 1px solid rgba(148, 163, 184, 0.12) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .adjustments-page .eiro-input {
          background: rgba(15, 23, 42, 0.35);
          border-color: rgba(148, 163, 184, 0.2);
          color: white;
        }

        .adjustments-page .eiro-input:focus {
          border-color: rgba(167, 139, 250, 0.65);
          outline: none;
        }

        .adjustments-page .eiro-input option {
          background: #111827;
          color: white;
        }

        @media (max-width: 640px) {
          .adjustments-content {
            padding: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .adjustments-bubble,
          .adjustments-orb {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
