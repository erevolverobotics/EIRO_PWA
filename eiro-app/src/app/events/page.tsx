'use client';

import Link from 'next/link';
import { Trophy, Calendar, MapPin, ChevronRight, Bot, Search } from 'lucide-react';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { Badge } from '@/components/ui';

const EVENTS = [
  {
    id: 'E001', name: 'District Preliminary — Chennai', stage: 'DISTRICT',
    date: 'October 28, 2026', venue: 'Jawaharlal Nehru Indoor Stadium, Chennai',
    status: 'ACTIVE', categories: ['SUMO', 'MAZE', 'WALL', 'ECO_CITY'] as CategoryCode[],
    teams: 48,
  },
  {
    id: 'E002', name: 'District Preliminary — Coimbatore', stage: 'DISTRICT',
    date: 'November 4, 2026', venue: 'CODISSIA Trade Fair Complex, Coimbatore',
    status: 'PUBLISHED', categories: ['SUMO', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'] as CategoryCode[],
    teams: 35,
  },
  {
    id: 'E003', name: 'District Preliminary — Madurai', stage: 'DISTRICT',
    date: 'November 8, 2026', venue: 'Madurai District Indoor Stadium',
    status: 'PUBLISHED', categories: ['MAZE', 'WALL', 'ECO_CITY', 'INNOVATOR_JUNIOR'] as CategoryCode[],
    teams: 22,
  },
  {
    id: 'E004', name: 'EIRO 2026 State Finals', stage: 'STATE_FINALS',
    date: 'December 15–16, 2026', venue: 'Chennai Trade Centre',
    status: 'DRAFT', categories: ['SUMO', 'MAZE', 'WALL', 'ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'] as CategoryCode[],
    teams: 0,
  },
];

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/30',
  PUBLISHED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DRAFT: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export default function EventsPage() {
  return (
    <div className="min-h-screen animated-bg">
      {/* Nav */}
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">EIRO 2026</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/results" className="text-sm text-gray-400 hover:text-white">Results</Link>
          <Link href="/verify" className="text-sm text-gray-400 hover:text-white">Verify</Link>
          <Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-3">Events</h1>
          <p className="text-gray-400">All EIRO 2026 competition events — district preliminaries and state finals</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search events…" className="eiro-input pl-10 text-sm" />
        </div>

        <div className="space-y-4">
          {EVENTS.map(event => (
            <div key={event.id} className="glass rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 p-6 group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[event.status]}`}>
                      {event.status === 'ACTIVE' ? '🔴 LIVE' : event.status}
                    </span>
                    <Badge variant={event.stage === 'STATE_FINALS' ? 'warning' : 'info'}>
                      {event.stage === 'STATE_FINALS' ? '🏆 State Finals' : 'District Prelim'}
                    </Badge>
                    {event.teams > 0 && <span className="text-xs text-gray-500">{event.teams} teams</span>}
                  </div>

                  <h2 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{event.name}</h2>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      {event.venue}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {event.categories.map(cat => (
                      <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10 font-mono">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/results?event=${event.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass border border-white/10 hover:border-indigo-500/30 text-gray-300 hover:text-white transition-all duration-200">
                    <Trophy className="w-4 h-4 text-indigo-400" /> Results
                  </Link>
                  {event.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400">
                      <span className="pulse-dot" /> Live
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
