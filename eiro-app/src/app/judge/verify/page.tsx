'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Button, StatusBadge, KpiCard } from '@/components/ui';
import { ShieldCheck, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import type { Scorecard as ScorecardSchema } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Scorecard = ScorecardSchema & { teamName?: string; categoryCode?: string; type?: string; flagged?: boolean };
export default function JudgeVerifyPage() {
  const [cards, setCards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = () => {
    getAll<Scorecard>('scorecards').then(setCards)
      .catch(() => setError('Scorecards could not be loaded. Head Judge authorization may be required.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const pending = cards.filter(card => ['SUBMITTED', 'UNDER_REVIEW'].includes(card.status));
  const verified = cards.filter(card => card.status === 'VERIFIED');
  const flagged = cards.filter(card => card.flagged).length;
  const verify = async (ids: string[], action: 'VERIFY' | 'LOCK') => {
    if (!ids.length) return;
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('verifyAndLockScores', { scorecardIds: ids, action });
      toast.success(action === 'VERIFY' ? 'Score verification submitted.' : 'Score lock submitted.');
      load();
    } catch { toast.error('Score verification/locking was rejected by the scoring service.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Score Verification" subtitle="Review persisted judge scorecards and request authorized verification or lock" actions={<Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>} />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Pending" value={pending.length} icon={AlertCircle} color="orange" /><KpiCard title="Flagged" value={flagged} icon={AlertCircle} color="red" /><KpiCard title="Verified" value={verified.length} icon={CheckCircle2} color="green" /><KpiCard title="Total" value={cards.length} icon={ShieldCheck} color="indigo" /></div>
    <div className="flex justify-end"><Button icon={Lock} loading={saving} disabled={saving || verified.length === 0} onClick={() => void verify(verified.map(card => card.id), 'LOCK')}>Lock Verified Scores</Button></div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading scorecards…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : cards.length === 0 ? <Card className="text-center py-16 text-gray-400">No scorecards are available for review.</Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Scorecard</th><th>Entry</th><th>Category</th><th>Score</th><th>Judge</th><th>Status</th><th>Action</th></tr></thead><tbody>{cards.map(card => <tr key={card.id}><td className="font-mono text-xs">{card.id}</td><td>{card.teamName ?? card.entryId}</td><td>{card.categoryCode ?? '—'}</td><td>{card.computedTotal}</td><td>{card.judgeUid}</td><td><StatusBadge status={card.status} /></td><td>{['SUBMITTED', 'UNDER_REVIEW'].includes(card.status) && <Button size="sm" icon={CheckCircle2} loading={saving} disabled={saving} onClick={() => void verify([card.id], 'VERIFY')}>Verify</Button>}</td></tr>)}</tbody></table></div><p className="p-4 text-xs text-gray-500">Flag changes are unavailable because no supported callable for flagging is specified. Verify/lock requests are server-authoritative.</p></Card>}
  </div>;
}
