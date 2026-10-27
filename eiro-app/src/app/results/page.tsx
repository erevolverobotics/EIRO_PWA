'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Search, Trophy } from 'lucide-react';
import { Badge, CategoryBadge } from '@/components/ui';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type ResultRecord = {
  id: string;
  eventId?: string;
  eventName?: string;
  categoryCode?: CategoryCode;
  teamName?: string;
  schoolName?: string;
  rank?: number;
  score?: string | number;
  status?: string;
  publishedAt?: { toDate?: () => Date } | string;
  rankings?: Array<{ teamName?: string; schoolName?: string; rank?: number; score?: string | number }>;
};

function publishedDate(value?: ResultRecord['publishedAt']) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '';
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'results'), where('publishedAt', '!=', null)))
      .then(snapshot => setResults(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ResultRecord))))
      .catch(() => setError('Published results could not be loaded. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(results.map(result => result.categoryCode).filter(Boolean))) as CategoryCode[], [results]);
  const visible = results.filter(result =>
    (selectedCategory === 'ALL' || result.categoryCode === selectedCategory) &&
    `${result.teamName ?? ''} ${result.schoolName ?? ''} ${result.eventName ?? ''}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen animated-bg">
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="font-bold text-white">EIRO</span></Link>
        <div className="flex gap-4 items-center"><Link href="/events" className="text-sm text-gray-400 hover:text-white">Events</Link><Link href="/verify" className="text-sm text-gray-400 hover:text-white">Verify</Link><Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white">Sign In</Link></div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <Badge variant="success" className="mb-3">Published records only</Badge>
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3"><Trophy className="w-8 h-8 text-yellow-400" /> Results</h1>
          <p className="text-gray-400">Official results made public by the organizing committee.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search teams, schools or events…" className="eiro-input pl-9 text-sm" /></div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', ...categories] as const).map(category => <button key={category} onClick={() => setSelectedCategory(category)} className={`px-3 py-2 rounded-xl text-xs font-medium border ${selectedCategory === category ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/10 bg-white/5 text-gray-400'}`}>{category === 'ALL' ? 'All' : category}</button>)}
          </div>
        </div>
        {loading ? <p className="text-center text-gray-400 py-16" role="status">Loading published results…</p> :
          error ? <p className="text-center text-red-400 py-16" role="alert">{error}</p> :
            visible.length === 0 ? <p className="text-center text-gray-400 py-16">No published results match this search.</p> :
              <div className="space-y-4">
                {visible.map(result => {
                  const rows = result.rankings ?? (result.teamName ? [{ teamName: result.teamName, schoolName: result.schoolName, rank: result.rank, score: result.score }] : []);
                  return <section key={result.id} className="glass rounded-2xl border border-white/5 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">{result.categoryCode && <CategoryBadge code={result.categoryCode} />}<h2 className="font-bold text-white">{CATEGORY_LABELS[result.categoryCode as CategoryCode] ?? result.eventName ?? 'Published result'}</h2></div>
                      {publishedDate(result.publishedAt) && <span className="text-xs text-gray-500">Published {publishedDate(result.publishedAt)}</span>}
                    </div>
                    {rows.length ? <div className="space-y-2">{rows.filter(row => `${row.teamName ?? ''} ${row.schoolName ?? ''}`.toLowerCase().includes(search.toLowerCase())).map((row, index) =>
                      <div key={`${result.id}-${row.rank ?? index}`} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                        <span className="w-12 text-center text-sm font-bold text-gray-300">{row.rank ? `#${row.rank}` : '—'}</span>
                        <div className="flex-1"><p className="font-bold text-white">{row.teamName ?? 'Team'}</p>{row.schoolName && <p className="text-xs text-gray-500">{row.schoolName}</p>}</div>
                        {row.score !== undefined && <span className="font-mono font-bold text-white">{row.score}</span>}
                      </div>)}</div> : <p className="text-sm text-gray-400">This published result record does not expose team ranking details.</p>}
                  </section>;
                })}
              </div>}
        <p className="mt-12 text-center text-xs text-gray-600">Certificate verification is available on the <Link href="/verify" className="text-indigo-400 hover:underline">Verify</Link> page.</p>
      </main>
    </div>
  );
}
