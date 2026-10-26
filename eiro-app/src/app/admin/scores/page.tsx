'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, CategoryBadge, StatusBadge, KpiCard } from '@/components/ui';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, Eye, Flag, Loader2, RefreshCw } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, doc, updateDoc, serverTimestamp, query, where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scorecard {
  id: string;
  teamName: string;
  teamId: string;
  category: CategoryCode;
  judgeUid: string;
  judgeName?: string;
  type: string;
  score: string | number;
  status: string;
  flagged: boolean;
  lockedAt?: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScoreVerificationPage() {
  const [cards, setCards]   = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Scorecard | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'scorecards'));
      const data: Scorecard[] = snap.docs.map(d => ({
        id: d.id,
        teamName: '',
        teamId: '',
        category: 'SUMO' as CategoryCode,
        judgeUid: '',
        type: 'Score',
        score: '',
        status: 'SUBMITTED',
        flagged: false,
        lockedAt: null,
        ...(d.data() as Partial<Scorecard>),
      }));
      setCards(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load scorecards. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Verify ──────────────────────────────────────────────────────────────────

  const verify = async (id: string) => {
    try {
      await updateDoc(doc(db, 'scorecards', id), {
        status: 'VERIFIED',
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Scorecard verified!');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to verify scorecard.');
    }
  };

  // ── Flag / Unflag ───────────────────────────────────────────────────────────

  const toggleFlag = async (sc: Scorecard) => {
    try {
      await updateDoc(doc(db, 'scorecards', sc.id), {
        flagged: !sc.flagged,
        updatedAt: serverTimestamp(),
      });
      toast.success(sc.flagged ? 'Flag removed.' : 'Scorecard flagged for review.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update flag.');
    }
  };

  // ── Lock all ────────────────────────────────────────────────────────────────

  const lockAll = async () => {
    if (!confirm('Lock all verified scores? This cannot be undone.')) return;
    try {
      const verified = cards.filter(c => c.status === 'VERIFIED' && !c.lockedAt);
      await Promise.all(verified.map(c =>
        updateDoc(doc(db, 'scorecards', c.id), {
          lockedAt: serverTimestamp(),
          status: 'LOCKED',
          updatedAt: serverTimestamp(),
        })
      ));
      toast.success(`Locked ${verified.length} scorecards.`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to lock scores.');
    }
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
        subtitle="Head judge review, flag disputes, and lock verified scores"
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Pending Review" value={pending.length}  icon={AlertCircle}  color="orange" />
        <KpiCard title="Flagged"        value={flagged.length}  icon={Flag}         color="red"    />
        <KpiCard title="Verified"       value={verified.length} icon={CheckCircle2} color="green"  />
        <KpiCard title="Locked"         value={locked.length}   icon={Lock}         color="purple" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
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
                        <span className="text-sm font-medium text-white">{sc.teamName || sc.teamId}</span>
                      </div>
                    </td>
                    <td><CategoryBadge code={sc.category} /></td>
                    <td><span className="text-xs text-gray-400">{sc.type}</span></td>
                    <td><span className="font-mono text-sm font-bold text-white">{String(sc.score)}</span></td>
                    <td><span className="text-xs text-gray-400">{sc.judgeName || sc.judgeUid}</span></td>
                    <td><StatusBadge status={sc.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setSelected(sc)}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Review">
                          <Eye className="w-4 h-4" />
                        </button>
                        {sc.status === 'SUBMITTED' || sc.status === 'UNDER_REVIEW' ? (
                          <button onClick={() => verify(sc.id)}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Verify">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button onClick={() => toggleFlag(sc)}
                          className={`p-1.5 rounded-lg transition-colors ${sc.flagged ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'}`} title="Toggle Flag">
                          <Flag className="w-4 h-4" />
                        </button>
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
        <Button icon={Lock} disabled={pending.length > 0 || verified.length === 0} onClick={lockAll}>
          Lock All Verified Scores
        </Button>
      </div>
    </div>
  );
}
