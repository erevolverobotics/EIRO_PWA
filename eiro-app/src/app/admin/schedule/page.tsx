'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, CategoryBadge, KpiCard } from '@/components/ui';
import { Calendar, Plus, Clock, ChevronRight, MapPin, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const TIME_SLOTS = [
  { id: 'S001', time: '09:00', duration: 30, arena: 'A1', category: 'SUMO' as CategoryCode, teams: ['Robo Warriors', 'Iron Crushers'], round: 'QF1', judge: 'Judge Priya' },
  { id: 'S002', time: '09:30', duration: 30, arena: 'A2', category: 'SUMO' as CategoryCode, teams: ['Metal Beasts', 'Circuit Kings'], round: 'QF2', judge: 'Judge Kumar' },
  { id: 'S003', time: '10:00', duration: 20, arena: 'B1', category: 'MAZE' as CategoryCode, teams: ['Maze Masters'], round: 'Attempt 1', judge: 'Judge Rao' },
  { id: 'S004', time: '10:20', duration: 20, arena: 'B1', category: 'MAZE' as CategoryCode, teams: ['Speed Navigators'], round: 'Attempt 1', judge: 'Judge Rao' },
  { id: 'S005', time: '11:00', duration: 60, arena: 'Hall C', category: 'ECO_CITY' as CategoryCode, teams: ['Eco Rangers', 'Green Minds', 'Earth Savers'], round: 'Presentation', judge: 'Judge Singh' },
];

const ARENAS = ['A1', 'A2', 'B1', 'B2', 'Hall C'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export default function SchedulePage() {
  const [view, setView] = useState<'list' | 'timeline'>('list');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Schedule Builder"
        subtitle="A07 — Arrange time slots, arenas and judge assignments"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView('list')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'list' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/10 bg-white/5 text-gray-400'}`}>
              List
            </button>
            <button onClick={() => setView('timeline')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'timeline' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/10 bg-white/5 text-gray-400'}`}>
              Timeline
            </button>
            <Button size="sm" icon={Plus}>Add Slot</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Time Slots" value={TIME_SLOTS.length} icon={Calendar} color="indigo" />
        <KpiCard title="Arenas Used" value={new Set(TIME_SLOTS.map(s => s.arena)).size} icon={MapPin} color="blue" />
        <KpiCard title="Teams Scheduled" value={new Set(TIME_SLOTS.flatMap(s => s.teams)).size} icon={Users} color="green" />
        <KpiCard title="Unscheduled" value={3} icon={Clock} color="orange" />
      </div>

      {view === 'list' ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr><th>Time</th><th>Duration</th><th>Arena</th><th>Category</th><th>Round</th><th>Teams</th><th>Judge</th></tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(slot => (
                  <tr key={slot.id}>
                    <td><span className="font-mono font-bold text-white">{slot.time}</span></td>
                    <td><span className="text-xs text-gray-400">{slot.duration}min</span></td>
                    <td><span className="font-mono text-xs text-indigo-400">{slot.arena}</span></td>
                    <td><CategoryBadge code={slot.category} /></td>
                    <td><span className="text-xs text-gray-400">{slot.round}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {slot.teams.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className="text-xs text-gray-400">{slot.judge}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Arena headers */}
              <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `80px repeat(${ARENAS.length}, 1fr)` }}>
                <div className="p-3 text-xs text-gray-500 font-medium border-r border-white/5">Time</div>
                {ARENAS.map(a => (
                  <div key={a} className="p-3 text-xs text-center font-medium text-indigo-400 border-r border-white/5 last:border-0">{a}</div>
                ))}
              </div>
              {/* Hour rows */}
              {HOURS.map(hour => {
                const hourSlots = TIME_SLOTS.filter(s => s.time.startsWith(hour.slice(0, 2)));
                return (
                  <div key={hour} className="grid border-b border-white/5 min-h-[56px]" style={{ gridTemplateColumns: `80px repeat(${ARENAS.length}, 1fr)` }}>
                    <div className="p-3 text-xs font-mono text-gray-500 border-r border-white/5 flex items-start">{hour}</div>
                    {ARENAS.map(arena => {
                      const slot = hourSlots.find(s => s.arena === arena);
                      return (
                        <div key={arena} className="p-1.5 border-r border-white/5 last:border-0">
                          {slot && (
                            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 h-full">
                              <div className="text-[10px] font-bold text-indigo-300 truncate">{slot.teams[0]}</div>
                              <div className="text-[9px] text-gray-500 mt-0.5">{slot.round}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
