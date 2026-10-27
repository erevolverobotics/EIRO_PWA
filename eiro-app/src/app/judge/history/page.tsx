'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, CategoryBadge, StatusBadge } from '@/components/ui';
import { History } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { useAuth } from '@/lib/firebase/auth-context';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type Scorecard = { id: string; judgeUid: string; categoryCode?: CategoryCode; type?: string; teamName?: string; teamId?: string; computedTotal?: number; status: string; submittedAt?: { toDate?: () => Date } | string };
export default function JudgeHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<Scorecard[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'scorecards'), where('judgeUid', '==', user.uid)))
      .then(snapshot => setHistory(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Scorecard))))
      .catch(() => setError('Your scorecards could not be loaded.'))
      .finally(() => setFetching(false));
  }, [user]);
  const loading = authLoading || (Boolean(user) && fetching);
  return <div className="space-y-6 animate-fade-in-up"><PageHeader title="Scorecard History" subtitle="Persisted scorecards submitted by your account" />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading scorecards…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : history.length === 0 ? <Card className="text-center py-16"><History className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No scorecards submitted yet.</p></Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>ID</th><th>Type</th><th>Team/Entry</th><th>Category</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{history.map(item => <tr key={item.id}><td className="font-mono text-xs text-gray-500">{item.id}</td><td>{item.type ?? 'Scorecard'}</td><td>{item.teamName ?? item.teamId ?? '—'}</td><td>{item.categoryCode && <CategoryBadge code={item.categoryCode} />}</td><td className="font-mono">{item.computedTotal ?? '—'}</td><td><StatusBadge status={item.status} /></td><td>{item.submittedAt ? (typeof item.submittedAt === 'string' ? new Date(item.submittedAt) : item.submittedAt.toDate?.())?.toLocaleString() : '—'}</td></tr>)}</tbody></table></div></Card>}
  </div>;
}
