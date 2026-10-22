'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, KpiCard, CategoryBadge, StatusBadge, Badge } from '@/components/ui';
import { Activity, Clock, Zap, QrCode, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

const QUEUE = [
  { id: 'TE001', code: 'EIRO-2026-041', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, arena: 'A1', slot: '09:00', status: 'IN_PROGRESS', membersPresent: 2, membersTotal: 2 },
  { id: 'TE002', code: 'EIRO-2026-042', name: 'Iron Crushers', category: 'SUMO' as CategoryCode, arena: 'A1', slot: '09:00', status: 'CHECKED_IN', membersPresent: 2, membersTotal: 2 },
  { id: 'TE003', code: 'EIRO-2026-043', name: 'Metal Beasts', category: 'SUMO' as CategoryCode, arena: 'A2', slot: '09:30', status: 'CHECKED_IN', membersPresent: 1, membersTotal: 2 },
  { id: 'TE004', code: 'EIRO-2026-044', name: 'Maze Masters', category: 'MAZE' as CategoryCode, arena: 'B1', slot: '10:00', status: 'APPROVED', membersPresent: 2, membersTotal: 2 },
  { id: 'TE005', code: 'EIRO-2026-045', name: 'Speed Navigators', category: 'MAZE' as CategoryCode, arena: 'B1', slot: '10:20', status: 'APPROVED', membersPresent: 2, membersTotal: 2 },
  { id: 'TE006', code: 'EIRO-2026-046', name: 'Wall Runners', category: 'WALL' as CategoryCode, arena: 'C1', slot: '11:00', status: 'COMPLETED', membersPresent: 2, membersTotal: 2 },
];

const STATUS_ORDER = ['IN_PROGRESS', 'CHECKED_IN', 'APPROVED', 'COMPLETED'];

export default function ArenaQueuePage() {
  const [queue, setQueue] = useState(QUEUE);

  const callNext = (teamId: string) => {
    setQueue(q => q.map(t => t.id === teamId ? { ...t, status: 'IN_PROGRESS' } : t));
  };

  const complete = (teamId: string) => {
    setQueue(q => q.map(t => t.id === teamId ? { ...t, status: 'COMPLETED' } : t));
  };

  const groupByArena = queue.reduce((acc, t) => {
    if (!acc[t.arena]) acc[t.arena] = [];
    acc[t.arena].push(t);
    return acc;
  }, {} as Record<string, typeof QUEUE>);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Arena Queue
          </h2>
          <p className="text-sm text-gray-400 mt-1">V13 — Live competition queue management per arena</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Active" value={queue.filter(t => t.status === 'IN_PROGRESS').length} icon={Zap} color="green" />
        <KpiCard title="Waiting" value={queue.filter(t => t.status === 'CHECKED_IN').length} icon={Clock} color="indigo" />
        <KpiCard title="Short-staffed" value={queue.filter(t => t.membersPresent < t.membersTotal).length} icon={AlertCircle} color="orange" />
        <KpiCard title="Completed" value={queue.filter(t => t.status === 'COMPLETED').length} icon={CheckCircle2} color="blue" />
      </div>

      {/* Arena-grouped view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(groupByArena).sort().map(([arena, teams]) => {
          const active = teams.find(t => t.status === 'IN_PROGRESS');
          const cat = teams[0].category;

          return (
            <Card key={arena} padding="none" className={active ? 'border-green-500/20' : ''}>
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="font-bold text-white">Arena {arena}</span>
                  <CategoryBadge code={cat} />
                </div>
                {active && <Badge variant="success">● Active</Badge>}
              </div>

              <div className="divide-y divide-white/5">
                {teams.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)).map(team => {
                  const short = team.membersPresent < team.membersTotal;
                  return (
                    <div key={team.id} className={`flex items-center gap-3 px-5 py-3 ${team.status === 'COMPLETED' ? 'opacity-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {short && <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
                          <p className="font-medium text-white text-sm truncate">{team.name}</p>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-gray-600">{team.code}</span>
                          <span className="text-[10px] text-gray-600">{team.slot}</span>
                          {short && <span className="text-[10px] text-orange-400">{team.membersPresent}/{team.membersTotal} present</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={team.status} />
                        {team.status === 'CHECKED_IN' && (
                          <Button size="sm" icon={Zap} onClick={() => callNext(team.id)}>Call</Button>
                        )}
                        {team.status === 'IN_PROGRESS' && (
                          <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => complete(team.id)}>Done</Button>
                        )}
                        {team.status === 'APPROVED' && (
                          <Link href="/venue/checkin">
                            <Button size="sm" variant="secondary" icon={QrCode}>Check In</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
