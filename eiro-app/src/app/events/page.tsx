'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Calendar, MapPin, Search, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type EventRecord = {
  id: string;
  name?: string;
  title?: string;
  state?: string;
  stageType?: string;
  categoryCode?: CategoryCode;
  categoryCodes?: CategoryCode[];
  categories?: CategoryCode[];
  startAt?: { toDate?: () => Date } | string;
  endAt?: { toDate?: () => Date } | string;
  venueName?: string;
  venueId?: string;
  districtName?: string;
  districtId?: string;
};

function displayDate(value?: EventRecord['startAt']) {
  if (!value) return 'Date not announced';
  const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { dateStyle: 'long' })
    : 'Date not announced';
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'events'), where('state', 'in', ['PUBLISHED', 'ACTIVE', 'COMPLETED'])))
      .then(snapshot => setEvents(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as EventRecord))))
      .catch(() => setError('Events could not be loaded. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => events.filter(event =>
    `${event.name ?? event.title ?? ''} ${event.districtName ?? ''} ${event.venueName ?? ''}`
      .toLowerCase().includes(search.toLowerCase())
  ), [events, search]);

  return (
    <div className="min-h-screen animated-bg">
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-white">EIRO</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/results" className="text-sm text-gray-400 hover:text-white">Results</Link>
          <Link href="/verify" className="text-sm text-gray-400 hover:text-white">Verify</Link>
          <Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">Sign In</Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-3">Events</h1>
          <p className="text-gray-400">Published EIRO competition events</p>
        </div>
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search events…" className="eiro-input pl-10 text-sm" />
        </div>
        {loading ? <p className="text-center text-gray-400 py-16" role="status">Loading events…</p> :
          error ? <p className="text-center text-red-400 py-16" role="alert">{error}</p> :
            filtered.length === 0 ? <p className="text-center text-gray-400 py-16">No published events found.</p> :
              <div className="space-y-4">
                {filtered.map(event => {
                  const categories = event.categories ?? event.categoryCodes ?? (event.categoryCode ? [event.categoryCode] : []);
                  const label = event.name ?? event.title ?? 'Competition event';
                  return (
                    <article key={event.id} className="glass rounded-2xl border border-white/5 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge variant={event.state === 'ACTIVE' ? 'success' : 'info'}>{event.state ?? 'PUBLISHED'}</Badge>
                            {event.stageType && <Badge variant="warning">{event.stageType.replaceAll('_', ' ')}</Badge>}
                          </div>
                          <h2 className="text-xl font-bold text-white mb-3">{label}</h2>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 flex-wrap">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-400" />{displayDate(event.startAt)}</span>
                            {(event.venueName || event.venueId || event.districtName || event.districtId) &&
                              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-400" />{event.venueName ?? event.venueId ?? event.districtName ?? event.districtId}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categories.map(category => <span key={category} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">{CATEGORY_LABELS[category] ?? category}</span>)}
                          </div>
                        </div>
                        <Link href={`/results?event=${event.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm glass border border-white/10 text-gray-300">
                          <Trophy className="w-4 h-4 text-indigo-400" /> Results
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>}
      </main>
    </div>
  );
}
