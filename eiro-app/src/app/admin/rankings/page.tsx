'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, KpiCard } from '@/components/ui';
import { BarChart3, Trophy, ChevronUp, ChevronDown, Lock, CheckCircle2, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const RANKINGS: { category: CategoryCode; teams: { rank: number; code: string; name: string; school: string; score: number; qualified: boolean }[] }[] = [
  {
    category: 'SUMO',
    teams: [
      { rank: 1, code: 'EIRO-2026-041', name: 'Robo Warriors', school: 'DAV Public', score: 98, qualified: true },
      { rank: 2, code: 'EIRO-2026-055', name: 'Iron Crushers', school: 'St. Josephs', score: 95, qualified: true },
      { rank: 3, code: 'EIRO-2026-062', name: 'Metal Beasts', school: 'KV No.1', score: 87, qualified: false },
    ],
  },
  {
    category: 'MAZE',
    teams: [
      { rank: 1, code: 'EIRO-2026-043', name: 'Maze Masters', school: 'Asan Memorial', score: 120450, qualified: true },
      { rank: 2, code: 'EIRO-2026-071', name: 'Speed Navigators', school: 'PSBB', score: 134200, qualified: true },
    ],
  },
  {
    category: 'ECO_CITY',
    teams: [
      { rank: 1, code: 'EIRO-2026-042', name: 'Eco Rangers', school: 'DAV Public', score: 88, qualified: true },
      { rank: 2, code: 'EIRO-2026-077', name: 'Green Minds', school: 'Hindustan Matric', score: 82, qualified: false },
    ],
  },
];

const RANK_ICON = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export default function RankingsPage() {
  const [selectedCat, setSelectedCat] = useState<CategoryCode | 'ALL'>('ALL');
  const [approveOpen, setApproveOpen] = useState(false);

  const filtered = selectedCat === 'ALL' ? RANKINGS : RANKINGS.filter(r => r.category === selectedCat);
  const totalQualified = RANKINGS.flatMap(r => r.teams).filter(t => t.qualified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rankings & Qualification"
        subtitle="A11 — District results, tie-breakers and finals qualification"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={BarChart3}>Compute Rankings</Button>
            <Button size="sm" icon={CheckCircle2} onClick={() => setApproveOpen(true)}>
              Approve Qualifiers ({totalQualified})
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Categories Scored" value={RANKINGS.length} icon={Trophy} color="indigo" />
        <KpiCard title="Total Teams Ranked" value={RANKINGS.flatMap(r => r.teams).length} icon={BarChart3} color="blue" />
        <KpiCard title="Qualified for Finals" value={totalQualified} icon={CheckCircle2} color="green" />
        <KpiCard title="Pending Lock" value={1} icon={Lock} color="orange" />
      </div>

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-400">
          Rankings are computed from locked and verified scores using the published rule version for each category.
          Qualifying quotas per district/category must be configured before approval.
          Preliminary scores are NOT automatically carried into State Finals.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', ...RANKINGS.map(r => r.category)].map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat as CategoryCode | 'ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
              selectedCat === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 border-white/10 text-gray-400 hover:border-indigo-500/40 hover:text-white'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Rankings per category */}
      {filtered.map(catRankings => (
        <Card key={catRankings.category} padding="none">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <CategoryBadge code={catRankings.category} />
            <div className="flex items-center gap-2">
              <StatusBadge status="LOCKED" />
              <Button size="sm" variant="secondary" icon={Lock} className="hidden sm:flex">Lock Results</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Score</th>
                  <th>Qualified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {catRankings.teams.map(team => (
                  <tr key={team.code} className={team.qualified ? 'bg-green-500/[0.03]' : ''}>
                    <td>
                      <span className="text-lg">{RANK_ICON(team.rank)}</span>
                    </td>
                    <td>
                      <div className="font-medium text-white text-sm">{team.name}</div>
                      <div className="text-xs text-gray-500">{team.school}</div>
                      <div className="font-mono text-[10px] text-gray-600">{team.code}</div>
                    </td>
                    <td>
                      <span className="font-bold text-white font-mono">
                        {catRankings.category === 'MAZE' ? `${(team.score / 1000).toFixed(3)}s` : `${team.score}/100`}
                      </span>
                    </td>
                    <td>
                      {team.qualified ? (
                        <Badge variant="success">✓ Qualified</Badge>
                      ) : (
                        <Badge variant="default">Not Qualified</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Move up">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Move down">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
