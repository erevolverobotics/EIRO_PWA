'use client';

import { PageHeader, Card, Button, CategoryBadge, StatusBadge, Badge } from '@/components/ui';
import { History, Download, Eye } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const HISTORY = [
  { id: 'SC001', type: 'Match', team: 'Robo Warriors vs Iron Crushers', category: 'SUMO' as CategoryCode, score: 'W 2-1', status: 'LOCKED', at: 'Oct 28 · 09:45' },
  { id: 'SC002', type: 'Timed Run', team: 'Maze Masters', category: 'MAZE' as CategoryCode, score: '120.450s', status: 'VERIFIED', at: 'Oct 28 · 10:32' },
  { id: 'SC003', type: 'Rubric', team: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, score: '78/100', status: 'SUBMITTED', at: 'Oct 28 · 11:15' },
  { id: 'SC004', type: 'Eligibility', team: 'Metal Beasts', category: 'SUMO' as CategoryCode, score: 'FAIL — Weight', status: 'SUBMITTED', at: 'Oct 28 · 08:30' },
];

export default function JudgeHistoryPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Scorecard History"
        subtitle="All scorecards you have submitted in this session"
        actions={<Button variant="secondary" size="sm" icon={Download}>Export</Button>}
      />

      {HISTORY.length === 0 ? (
        <Card className="text-center py-16">
          <History className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No scorecards submitted yet</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr><th>ID</th><th>Type</th><th>Team</th><th>Category</th><th>Score</th><th>Status</th><th>Time</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {HISTORY.map(h => (
                  <tr key={h.id}>
                    <td><span className="font-mono text-xs text-gray-500">{h.id}</span></td>
                    <td>
                      <Badge variant={h.type === 'Match' ? 'danger' : h.type === 'Rubric' ? 'purple' : h.type === 'Timed Run' ? 'info' : 'warning'}>
                        {h.type}
                      </Badge>
                    </td>
                    <td><span className="text-sm text-white">{h.team}</span></td>
                    <td><CategoryBadge code={h.category} /></td>
                    <td><span className="font-mono text-sm font-bold text-white">{h.score}</span></td>
                    <td><StatusBadge status={h.status} /></td>
                    <td><span className="text-xs text-gray-500">{h.at}</span></td>
                    <td>
                      <Button size="sm" variant="secondary" icon={Eye}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
