'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge, KpiCard, Badge, Modal } from '@/components/ui';
import { ShieldCheck, CheckCircle2, Flag, Eye, Lock, AlertCircle, XCircle } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import toast from 'react-hot-toast';

const QUEUE = [
  { id: 'SC001', team: 'Robo Warriors', category: 'SUMO' as CategoryCode, judge: 'Judge Priya', type: 'Match Result', score: 'W 2-1', status: 'SUBMITTED', flagged: false, submittedAt: '09:45 AM', notes: '' },
  { id: 'SC002', team: 'Eco Innovators', category: 'ECO_CITY' as CategoryCode, judge: 'Judge Kumar', type: 'Rubric', score: '78/100', status: 'SUBMITTED', flagged: true, submittedAt: '10:20 AM', notes: 'Score appears unusually low — presentation was strong. Recommend review.' },
  { id: 'SC003', team: 'Maze Masters', category: 'MAZE' as CategoryCode, judge: 'Judge Rao', type: 'Timed Run', score: '120.450s', status: 'UNDER_REVIEW', flagged: false, submittedAt: '10:55 AM', notes: '' },
  { id: 'SC004', team: 'Wall Runners', category: 'WALL' as CategoryCode, judge: 'Judge Singh', type: 'Timed Run', score: '95.220s', status: 'VERIFIED', flagged: false, submittedAt: '11:30 AM', notes: '' },
];

export default function JudgeVerifyPage() {
  const [selected, setSelected] = useState<typeof QUEUE[0] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const getStatus = (sc: typeof QUEUE[0]) => statuses[sc.id] ?? sc.status;

  const verify = (id: string) => {
    setStatuses(s => ({ ...s, [id]: 'VERIFIED' }));
    toast.success('Score verified');
    setSelected(null);
  };

  const flag = (id: string) => {
    setStatuses(s => ({ ...s, [id]: 'UNDER_REVIEW' }));
    toast('Score flagged for review', { icon: '🚩' });
    setSelected(null);
  };

  const pending = QUEUE.filter(s => !['VERIFIED', 'LOCKED'].includes(getStatus(s)));
  const verified = QUEUE.filter(s => getStatus(s) === 'VERIFIED');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Score Verification"
        subtitle="Head Judge — review, verify, flag and lock submitted scorecards"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Pending" value={pending.length} icon={AlertCircle} color="orange" />
        <KpiCard title="Flagged" value={QUEUE.filter(s => s.flagged).length} icon={Flag} color="red" />
        <KpiCard title="Verified" value={verified.length} icon={CheckCircle2} color="green" />
        <KpiCard title="Total" value={QUEUE.length} icon={ShieldCheck} color="indigo" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Scorecard Queue</h3>
          <Button
            size="sm" icon={Lock}
            disabled={pending.length > 0}
            onClick={() => toast.success('All scores locked!')}
          >
            Lock All Verified
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>ID</th><th>Team</th><th>Category</th><th>Type</th><th>Score</th><th>Judge</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {QUEUE.map(sc => (
                <tr key={sc.id} className={sc.flagged ? 'bg-red-500/[0.03]' : ''}>
                  <td><span className="font-mono text-xs text-gray-500">{sc.id}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {sc.flagged && <Flag className="w-3 h-3 text-red-400 flex-shrink-0" />}
                      <span className="font-medium text-white text-sm">{sc.team}</span>
                    </div>
                  </td>
                  <td><CategoryBadge code={sc.category} /></td>
                  <td><span className="text-xs text-gray-400">{sc.type}</span></td>
                  <td><span className="font-mono text-sm font-bold text-white">{sc.score}</span></td>
                  <td><span className="text-xs text-gray-400">{sc.judge}</span></td>
                  <td><StatusBadge status={getStatus(sc)} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(sc)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Review">
                        <Eye className="w-4 h-4" />
                      </button>
                      {getStatus(sc) !== 'VERIFIED' && (
                        <button onClick={() => verify(sc.id)}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Verify">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => flag(sc.id)}
                        className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors" title="Flag">
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {pending.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-yellow-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {pending.length} scorecard(s) still need verification before scores can be locked.
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Scorecard ${selected?.id ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            {selected && getStatus(selected) !== 'VERIFIED' && (
              <>
                <Button variant="secondary" icon={Flag} onClick={() => flag(selected.id)}>Flag</Button>
                <Button icon={CheckCircle2} onClick={() => verify(selected.id)}>Verify Score</Button>
              </>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-3">
            {[
              { label: 'Team', value: selected.team },
              { label: 'Category', value: selected.category },
              { label: 'Type', value: selected.type },
              { label: 'Score', value: selected.score },
              { label: 'Judge', value: selected.judge },
              { label: 'Submitted', value: selected.submittedAt },
              { label: 'Status', value: getStatus(selected) },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2 border-b border-white/5 text-sm last:border-0">
                <span className="text-gray-500">{row.label}</span>
                <span className="text-white font-medium">{row.value}</span>
              </div>
            ))}
            {selected.flagged && selected.notes && (
              <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-400 mb-1">🚩 Flag Note</p>
                <p className="text-xs text-red-300">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
