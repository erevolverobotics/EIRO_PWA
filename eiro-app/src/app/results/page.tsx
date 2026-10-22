'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Trophy, Search } from 'lucide-react';
import { CategoryBadge, Badge } from '@/components/ui';
import type { CategoryCode } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

// Separate metadata from results to avoid type confusion
const EVENT_META = {
  event: 'District Preliminary — Chennai 2026',
  publishedAt: 'November 1, 2026',
};

type ResultRow = { rank: number; team: string; school: string; score: string; qualified: boolean };

const RESULTS_BY_CATEGORY: Partial<Record<CategoryCode, ResultRow[]>> = {
  SUMO: [
    { rank: 1, team: 'Robo Warriors', school: 'DAV Public School', score: '3W 0L', qualified: true },
    { rank: 2, team: 'Iron Crushers', school: 'St. Josephs HS', score: '2W 1L', qualified: true },
    { rank: 3, team: 'Metal Beasts', school: 'KV No.1', score: '1W 2L', qualified: false },
    { rank: 4, team: 'Circuit Kings', school: 'PSBB School', score: '0W 3L', qualified: false },
  ],
  MAZE: [
    { rank: 1, team: 'Speed Navigators', school: 'PSBB School', score: '112.340s', qualified: true },
    { rank: 2, team: 'Maze Masters', school: 'Asan Memorial', score: '120.450s', qualified: true },
    { rank: 3, team: 'Path Finders', school: 'Hindustan Matric', score: '145.200s', qualified: false },
  ],
  ECO_CITY: [
    { rank: 1, team: 'Eco Rangers', school: 'DAV Public School', score: '88/100', qualified: true },
    { rank: 2, team: 'Green Minds', school: 'Hindustan Matric', score: '82/100', qualified: false },
    { rank: 3, team: 'Earth Savers', school: 'KV No.1', score: '79/100', qualified: false },
  ],
};

const RANK_EMOJI = (r: number) => ['🥇', '🥈', '🥉'][r - 1] ?? `#${r}`;

export default function ResultsPage() {
  const [selectedCat, setSelectedCat] = useState<CategoryCode | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const categories = Object.keys(RESULTS_BY_CATEGORY) as CategoryCode[];

  return (
    <div className="min-h-screen animated-bg">
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">EIRO 2026</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/events" className="text-sm text-gray-400 hover:text-white">Events</Link>
          <Link href="/verify" className="text-sm text-gray-400 hover:text-white">Verify</Link>
          <Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <Badge variant="success" className="mb-3">Published</Badge>
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" /> Results
          </h1>
          <p className="text-gray-400">{EVENT_META.event} · Published {EVENT_META.publishedAt}</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search teams or schools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="eiro-input pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                selectedCat === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  selectedCat === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results tables */}
        <div className="space-y-8">
          {categories
            .filter(cat => selectedCat === 'ALL' || selectedCat === cat)
            .map(cat => {
              const rows = RESULTS_BY_CATEGORY[cat] ?? [];
              const catResults = rows.filter(r =>
                search === '' ||
                r.team.toLowerCase().includes(search.toLowerCase()) ||
                r.school.toLowerCase().includes(search.toLowerCase())
              );

              if (catResults.length === 0) return null;

              return (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-4">
                    <CategoryBadge code={cat} />
                    <h2 className="font-bold text-white text-lg">{CATEGORY_LABELS[cat]}</h2>
                  </div>

                  <div className="space-y-2">
                    {catResults.map(r => (
                      <div
                        key={r.rank}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                          r.qualified
                            ? 'border-yellow-500/20 bg-yellow-500/[0.03]'
                            : 'border-white/5 bg-white/[0.02]'
                        }`}
                      >
                        <div className="w-10 text-2xl text-center flex-shrink-0">{RANK_EMOJI(r.rank)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white">{r.team}</span>
                            {r.qualified && <Badge variant="warning" size="sm">🏆 Qualified</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{r.school}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-white font-mono text-sm">{r.score}</div>
                          <div className="text-xs text-gray-600">Rank #{r.rank}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600">
            Results are official and verified by EIRO organizing committee. For certificate verification, use the{' '}
            <Link href="/verify" className="text-indigo-400 hover:underline">Verify</Link> page.
          </p>
        </div>
      </div>
    </div>
  );
}
