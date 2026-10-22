'use client';

import { KpiCard, Card, CategoryBadge, StatusBadge, Button, PageHeader } from '@/components/ui';
import { Swords, Timer, Star, ClipboardCheck, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import type { CategoryCode } from '@/lib/types';

const ASSIGNMENTS = [
  { id: 'A1', type: 'MATCH', category: 'SUMO' as CategoryCode, arena: 'Arena A – Sumo Ring 1', round: 'Round 1', teamA: 'Robo Warriors', teamB: 'Iron Crushers', time: '09:00 AM', status: 'SCHEDULED' },
  { id: 'A2', type: 'MATCH', category: 'SUMO' as CategoryCode, arena: 'Arena A – Sumo Ring 1', round: 'Round 1', teamA: 'Metal Beasts', teamB: 'Circuit Kings', time: '09:30 AM', status: 'SCHEDULED' },
  { id: 'A3', type: 'TIMED', category: 'MAZE' as CategoryCode, arena: 'Arena B – Maze Track 2', round: 'Attempt 1', teamA: 'Maze Masters', teamB: '', time: '10:00 AM', status: 'COMPLETED' },
  { id: 'A4', type: 'RUBRIC', category: 'ECO_CITY' as CategoryCode, arena: 'Presentation Hall C', round: 'Judging', teamA: 'Eco Innovators', teamB: '', time: '11:00 AM', status: 'UNDER_REVIEW' },
];

export default function JudgeDashboard() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="My Assignments" subtitle="Today · Oct 28, 2026 · District Prelim — Chennai" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Assigned" value={ASSIGNMENTS.length} icon={ClipboardCheck} color="indigo" />
        <KpiCard title="Sumo Matches" value={ASSIGNMENTS.filter(a => a.category === 'SUMO').length} icon={Swords} color="red" />
        <KpiCard title="Timed Runs" value={ASSIGNMENTS.filter(a => a.type === 'TIMED').length} icon={Timer} color="blue" />
        <KpiCard title="Rubric Scores" value={ASSIGNMENTS.filter(a => a.type === 'RUBRIC').length} icon={Star} color="purple" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Today&apos;s Schedule</h3>
        </div>
        <div className="divide-y divide-white/5">
          {ASSIGNMENTS.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                bg-white/5">
                {a.type === 'MATCH' && <Swords className="w-5 h-5 text-red-400" />}
                {a.type === 'TIMED' && <Timer className="w-5 h-5 text-blue-400" />}
                {a.type === 'RUBRIC' && <Star className="w-5 h-5 text-purple-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CategoryBadge code={a.category} />
                  <span className="text-xs text-gray-500">{a.round}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">
                  {a.teamA}{a.teamB ? ` vs ${a.teamB}` : ''}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />{a.time} · {a.arena}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                <Link href={
                  a.type === 'MATCH' ? '/judge/matches' :
                  a.type === 'TIMED' ? '/judge/timed-runs' : '/judge/rubric'
                }>
                  <Button size="sm" variant={a.status === 'SCHEDULED' ? 'primary' : 'secondary'} icon={ChevronRight} iconPosition="right">
                    {a.status === 'SCHEDULED' ? 'Start' : 'View'}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
