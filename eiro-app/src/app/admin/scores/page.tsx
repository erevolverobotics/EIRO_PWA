'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, CategoryBadge, StatusBadge, KpiCard } from '@/components/ui';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, Flag, Loader2, RefreshCw } from 'lucide-react';
import type { CategoryCode, Scorecard as ScorecardSchema } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Scorecard = ScorecardSchema & {
  teamName?: string;
  categoryCode?: CategoryCode;
  judgeName?: string;
  type?: string;
  flagged?: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScoreVerificationPage() {
  const [cards, setCards]   = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'scorecards'));
      setCards(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Scorecard, 'id'>) })));
      setError('');
    } catch (e) {
      console.error(e);
      setError('Scorecards could not be loaded. Head Judge authorization may be required; retry after checking permissions.');
      toast.error('Failed to load scorecards. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Verify ──────────────────────────────────────────────────────────────────

  const requestScoreAction = async (scorecardIds: string[], action: 'VERIFY' | 'LOCK') => {
    if (scorecardIds.length === 0) return;
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('verifyAndLockScores', { scorecardIds, action });
      toast.success(action === 'VERIFY' ? 'Score verification submitted.' : 'Score lock submitted.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error(action === 'VERIFY' ? 'Score verification was rejected by the scoring service.' : 'Score lock was rejected by the scoring service.');
    } finally {
      setSaving(false);
    }
  };

  // ── Lock all ────────────────────────────────────────────────────────────────

  const lockAll = async () => {
    if (!confirm('Lock all verified scores? This cannot be undone.')) return;
    const verified = cards.filter(c => c.status === 'VERIFIED');
    await requestScoreAction(verified.map(c => c.id), 'LOCK');
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const pending  = cards.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status));
  const verified = cards.filter(c => c.status === 'VERIFIED');
  const locked   = cards.filter(c => c.status === 'LOCKED');
  const flagged  = cards.filter(c => c.flagged);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Score Verification"
        subtitle="Review submitted scores and lock verified scores; existing score flags are read-only."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Pending Review" value={error || loading ? '—' : pending.length}  icon={AlertCircle}  color="orange" />
        <KpiCard title="Flagged"        value={error || loading ? '—' : flagged.length}  icon={Flag}         color="red"    />
        <KpiCard title="Verified"       value={error || loading ? '—' : verified.length} icon={CheckCircle2} color="green"  />
        <KpiCard title="Locked"         value={error || loading ? '—' : locked.length}   icon={Lock}         color="purple" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">
          <p>{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card></div>
      ) : cards.length === 0 ? (
        <Card className="text-center py-16">
          <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No scorecards yet</p>
          <p className="text-gray-600 text-sm mt-1">Scorecards will appear here once judges submit their scores.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="font-semibold text-white text-sm">All Scorecards</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr>
                  <th>Team</th><th>Category</th><th>Type</th>
                  <th>Score</th><th>Judge</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(sc => (
                  <tr key={sc.id} className={sc.flagged ? 'bg-red-500/[0.03]' : ''}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {sc.flagged && <Flag className="w-3 h-3 text-red-400 flex-shrink-0" />}
                        <span className="text-sm font-medium text-white">{sc.teamName ?? sc.entryId}</span>
                      </div>
                    </td>
                    <td>{sc.categoryCode ? <CategoryBadge code={sc.categoryCode} /> : '—'}</td>
                    <td><span className="text-xs text-gray-400">{sc.type ?? 'Scorecard'}</span></td>
                    <td><span className="font-mono text-sm font-bold text-white">{sc.computedTotal}</span></td>
                    <td><span className="text-xs text-gray-400">{sc.judgeName ?? sc.judgeUid}</span></td>
                    <td><StatusBadge status={sc.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        {['SUBMITTED', 'UNDER_REVIEW'].includes(sc.status) ? (
                          <Button size="sm" icon={CheckCircle2} loading={saving} disabled={saving}
                            onClick={() => void requestScoreAction([sc.id], 'VERIFY')}>Verify</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex justify-end items-center gap-3">
        {pending.length > 0 && (
          <p className="text-xs text-yellow-400">{pending.length} scores still pending review</p>
        )}
        <Button icon={Lock} loading={saving} disabled={saving || pending.length > 0 || verified.length === 0} onClick={lockAll}>
          Lock All Verified Scores
        </Button>
      </div>
      <p className="text-xs text-gray-500">Score flags are read-only here because no flag-management callable is available; verification and locking are handled by the scoring service.</p>
    </div>
  );
}
