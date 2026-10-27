'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { Card, CategoryBadge, KpiCard, StatusBadge } from '@/components/ui';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

type QueueMatch = { id: string; categoryCode?: CategoryCode; category?: CategoryCode; arena?: string; status?: string; teamAName?: string; teamBName?: string; teamA?: string; teamB?: string; scheduledAt?: string; round?: string };

export default function ArenaQueuePage() {
  const [matches, setMatches] = useState<QueueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    getAll<QueueMatch>('matches')
      .then(records => setMatches(records))
      .catch(() => setError('Competition queue could not be loaded.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const active = matches.filter(match => match.status === 'IN_PROGRESS').length;
  const waiting = matches.filter(match => ['SCHEDULED', 'UPCOMING', 'CHECKED_IN'].includes(match.status ?? '')).length;
  const complete = matches.filter(match => match.status === 'COMPLETED').length;
  return <div className="space-y-6 animate-fade-in-up">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h2 className="text-2xl font-bold text-white">Arena Queue</h2><p className="text-sm text-gray-400 mt-1">Read-only queue from scheduled match records.</p></div><button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl bg-white/5 text-sm text-gray-300">Refresh</button></div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Active" value={active} icon={Zap} color="green" /><KpiCard title="Waiting" value={waiting} icon={Clock} color="indigo" /><KpiCard title="Matches" value={matches.length} icon={Activity} color="orange" /><KpiCard title="Completed" value={complete} icon={CheckCircle2} color="blue" /></div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading queue…</p> : error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> : matches.length === 0 ? <Card className="text-center py-12 text-gray-400">No match records are available.</Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Match</th><th>Category</th><th>Arena</th><th>Round</th><th>Status</th></tr></thead><tbody>{matches.map(match => <tr key={match.id}>
        <td><span className="font-medium text-white">{match.teamAName ?? match.teamA ?? 'Team A'} vs {match.teamBName ?? match.teamB ?? 'Team B'}</span><p className="font-mono text-[10px] text-gray-500">{match.id}</p></td>
        <td>{(match.categoryCode ?? match.category) && <CategoryBadge code={(match.categoryCode ?? match.category) as CategoryCode} />}</td>
        <td className="text-gray-300">{match.arena ?? '—'}</td><td className="text-gray-400">{match.round ?? '—'}</td>
        <td><StatusBadge status={match.status ?? 'UNKNOWN'} /></td>
      </tr>)}</tbody></table></div><p className="p-4 text-xs text-gray-500 flex gap-2"><AlertCircle className="w-4 h-4" />Queue advancement is unavailable here; no client-side match status writes are permitted.</p></Card>}
  </div>;
}
