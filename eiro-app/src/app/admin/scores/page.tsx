'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, CategoryBadge, StatusBadge, KpiCard } from '@/components/ui';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, Eye, Flag } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const SCORE_QUEUE = [
  { id: 'SC001', team: 'Robo Warriors', category: 'SUMO' as CategoryCode, judge: 'Judge Priya', type: 'Match Result', score: 'W 2-1', status: 'SUBMITTED', flagged: false },
  { id: 'SC002', team: 'Eco Innovators', category: 'ECO_CITY' as CategoryCode, judge: 'Judge Kumar', type: 'Rubric', score: '78/100', status: 'SUBMITTED', flagged: true },
  { id: 'SC003', team: 'Maze Masters', category: 'MAZE' as CategoryCode, judge: 'Judge Rao', type: 'Timed Run', score: '120.450s', status: 'UNDER_REVIEW', flagged: false },
  { id: 'SC004', team: 'Wall Runners', category: 'WALL' as CategoryCode, judge: 'Judge Singh', type: 'Timed Run', score: '95.220s', status: 'VERIFIED', flagged: false },
];

export default function ScoreVerificationPage() {
  const [selected, setSelected] = useState<typeof SCORE_QUEUE[0] | null>(null);

  const pending = SCORE_QUEUE.filter(s => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status));
  const verified = SCORE_QUEUE.filter(s => s.status === 'VERIFIED');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Score Verification" subtitle="A12 — Head judge review, flag disputes, and lock verified scores" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Pending Review" value={pending.length} icon={AlertCircle} color="orange" />
        <KpiCard title="Flagged" value={SCORE_QUEUE.filter(s => s.flagged).length} icon={Flag} color="red" />
        <KpiCard title="Verified" value={verified.length} icon={CheckCircle2} color="green" />
        <KpiCard title="Locked" value={0} icon={Lock} color="purple" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Scorecards Awaiting Review</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>ID</th><th>Team</th><th>Category</th><th>Type</th><th>Score</th><th>Judge</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_QUEUE.map(sc => (
                <tr key={sc.id} className={sc.flagged ? 'bg-red-500/[0.03]' : ''}>
                  <td><span className="font-mono text-xs text-gray-500">{sc.id}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {sc.flagged && <Flag className="w-3 h-3 text-red-400 flex-shrink-0" />}
                      <span className="text-sm font-medium text-white">{sc.team}</span>
                    </div>
                  </td>
                  <td><CategoryBadge code={sc.category} /></td>
                  <td><span className="text-xs text-gray-400">{sc.type}</span></td>
                  <td><span className="font-mono text-sm font-bold text-white">{sc.score}</span></td>
                  <td><span className="text-xs text-gray-400">{sc.judge}</span></td>
                  <td><StatusBadge status={sc.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(sc)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Review">
                        <Eye className="w-4 h-4" />
                      </button>
                      {sc.status !== 'VERIFIED' && (
                        <button className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Verify">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors" title="Flag">
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

      <div className="flex justify-end">
        <Button icon={Lock} disabled={pending.length > 0}>Lock All Verified Scores</Button>
        {pending.length > 0 && <p className="text-xs text-yellow-400 self-center ml-3">{pending.length} scores still pending review</p>}
      </div>
    </div>
  );
}
