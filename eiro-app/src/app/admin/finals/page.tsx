'use client';

import { PageHeader, Card, Button, KpiCard, CategoryBadge, Badge } from '@/components/ui';
import { Trophy, Star, Calendar, MapPin, Users, ChevronRight, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import Link from 'next/link';

const QUALIFIERS = [
  { teamId: 'T001', code: 'EIRO-2026-041', name: 'Robo Warriors', school: 'DAV Public', district: 'Chennai', category: 'SUMO' as CategoryCode, districtRank: 1 },
  { teamId: 'T002', code: 'EIRO-2026-055', name: 'Iron Crushers', school: 'St. Josephs', district: 'Chennai', category: 'SUMO' as CategoryCode, districtRank: 2 },
  { teamId: 'T003', code: 'EIRO-2026-042', name: 'Eco Rangers', school: 'DAV Public', district: 'Chennai', category: 'ECO_CITY' as CategoryCode, districtRank: 1 },
  { teamId: 'T004', code: 'EIRO-2026-061', name: 'Speed Navigators', school: 'PSBB', district: 'Coimbatore', category: 'MAZE' as CategoryCode, districtRank: 1 },
];

const categories = [...new Set(QUALIFIERS.map(q => q.category))];

export default function StateFinals() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="State Finals" subtitle="EIRO 2026 State Finals — December 15–16, 2026 · Chennai Trade Centre" />

      <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-900/30 to-orange-900/20 border border-yellow-500/20">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-7 h-7 text-yellow-400" />
          <div>
            <h3 className="font-bold text-white text-lg">EIRO 2026 State Finals</h3>
            <p className="text-sm text-yellow-400/80">Qualification from all districts · Top 2 per category per district</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center py-2 rounded-xl bg-black/20 border border-yellow-500/10">
            <div className="text-2xl font-black text-yellow-400">{QUALIFIERS.length}</div>
            <div className="text-xs text-gray-400">Qualified Teams</div>
          </div>
          <div className="text-center py-2 rounded-xl bg-black/20 border border-yellow-500/10">
            <div className="text-2xl font-black text-white">{categories.length}</div>
            <div className="text-xs text-gray-400">Categories</div>
          </div>
          <div className="text-center py-2 rounded-xl bg-black/20 border border-yellow-500/10">
            <div className="text-sm font-bold text-white">Dec 15–16</div>
            <div className="text-xs text-gray-400">Dates</div>
          </div>
          <div className="text-center py-2 rounded-xl bg-black/20 border border-yellow-500/10">
            <div className="text-sm font-bold text-white">Chennai TC</div>
            <div className="text-xs text-gray-400">Venue</div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400">
          Preliminary scores are NOT automatically carried into State Finals. State Finals is a fresh competition.
          Qualification status has been locked. Changes require Super Admin authorization.
        </p>
      </div>

      {/* Qualifiers by category */}
      {categories.map(cat => {
        const catTeams = QUALIFIERS.filter(q => q.category === cat);
        return (
          <Card key={cat} padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryBadge code={cat} />
                <h3 className="font-semibold text-white text-sm">{CATEGORY_LABELS[cat]}</h3>
              </div>
              <Badge variant="success">{catTeams.length} teams qualified</Badge>
            </div>
            <div className="divide-y divide-white/5">
              {catTeams.map(team => (
                <div key={team.teamId} className="flex items-center gap-4 px-6 py-4">
                  <div className="text-2xl w-8 text-center flex-shrink-0">
                    {team.districtRank === 1 ? '🥇' : '🥈'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{team.name}</p>
                    <p className="text-xs text-gray-500">{team.school} · {team.district}</p>
                    <p className="font-mono text-[10px] text-gray-600 mt-0.5">{team.code}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Qualified</Badge>
                    <p className="text-xs text-gray-500 mt-0.5">District Rank #{team.districtRank}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <div className="flex justify-end gap-3">
        <Button variant="secondary">Export Qualifiers List</Button>
        <Button icon={Star}>Finalise State Draw</Button>
      </div>
    </div>
  );
}
