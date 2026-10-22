'use client';

import { PageHeader, Card, Button, CategoryBadge, Badge, KpiCard } from '@/components/ui';
import { Calendar, MapPin, Clock, Trophy, ChevronRight } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

const SCHEDULE = [
  { time: '08:00 AM', event: 'Registration / Check-in', arena: 'Main Entrance', category: null, teams: [] },
  { time: '09:00 AM', event: 'Sumo Round 1 — QF1', arena: 'Arena A1', category: 'SUMO' as CategoryCode, teams: ['Robo Warriors', 'Iron Crushers'] },
  { time: '09:30 AM', event: 'Sumo Round 1 — QF2', arena: 'Arena A2', category: 'SUMO' as CategoryCode, teams: ['Metal Beasts', 'Circuit Kings'] },
  { time: '10:00 AM', event: 'Maze Run Attempt 1', arena: 'Arena B1', category: 'MAZE' as CategoryCode, teams: ['Maze Masters'] },
  { time: '11:00 AM', event: 'Eco City Presentation', arena: 'Hall C', category: 'ECO_CITY' as CategoryCode, teams: ['Eco Rangers'] },
  { time: '12:30 PM', event: 'Lunch Break', arena: 'Cafeteria', category: null, teams: [] },
  { time: '02:00 PM', event: 'Sumo Finals', arena: 'Arena A1', category: 'SUMO' as CategoryCode, teams: ['TBD', 'TBD'] },
  { time: '04:00 PM', event: 'Award Ceremony', arena: 'Main Hall', category: null, teams: [] },
];

const MY_SLOTS = SCHEDULE.filter(s => s.teams.some(t => ['Robo Warriors', 'Eco Rangers', 'Wall Riders', 'Smart Innovators'].includes(t)));

export default function SchedulePage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Schedule & Venue" subtitle="S10 — Your teams' schedule and venue information" />

      {/* Event card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/30 border border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Badge variant="success" className="mb-2">Registration Open</Badge>
            <h3 className="text-xl font-bold text-white mb-1">District Preliminary — Chennai</h3>
            <div className="flex gap-4 text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-400" /> October 28, 2026</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-400" /> Jawaharlal Nehru Indoor Stadium</span>
            </div>
          </div>
        </div>
      </div>

      {/* My team slots */}
      {MY_SLOTS.length > 0 && (
        <>
          <h3 className="font-semibold text-white">Your Teams&apos; Slots</h3>
          <div className="space-y-3">
            {MY_SLOTS.map((slot, i) => (
              <Card key={i} className="border-indigo-500/20 bg-indigo-600/[0.03]">
                <div className="flex items-start gap-4">
                  <div className="text-center flex-shrink-0 w-20">
                    <div className="text-lg font-bold text-indigo-400">{slot.time.split(' ')[0]}</div>
                    <div className="text-xs text-gray-600">{slot.time.split(' ')[1]}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-white text-sm">{slot.event}</h4>
                      {slot.category && <CategoryBadge code={slot.category} />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" /> {slot.arena}
                    </div>
                    {slot.teams.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {slot.teams.map((t, j) => (
                          <span key={j} className={`text-xs px-2 py-0.5 rounded-full ${
                            ['Robo Warriors', 'Eco Rangers'].includes(t)
                              ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                              : 'bg-white/5 text-gray-500'
                          }`}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Full schedule */}
      <h3 className="font-semibold text-white">Full Day Schedule</h3>
      <Card padding="none">
        <div className="divide-y divide-white/5">
          {SCHEDULE.map((slot, i) => (
            <div key={i} className={`flex items-center gap-4 px-6 py-3.5 ${
              MY_SLOTS.includes(slot) ? 'bg-indigo-600/[0.04]' : ''
            }`}>
              <div className="w-20 flex-shrink-0">
                <span className="text-sm font-mono font-medium text-white">{slot.time}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-300">{slot.event}</span>
                  {slot.category && <CategoryBadge code={slot.category} />}
                  {MY_SLOTS.includes(slot) && <Badge variant="info" size="sm">Your Team</Badge>}
                </div>
                <span className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{slot.arena}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
