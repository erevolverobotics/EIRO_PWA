'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, CategoryBadge, Button, Badge, Modal, Input } from '@/components/ui';
import { Settings, Edit3, Zap, Timer, Star, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { CategoryCode, ScoringEngine } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ENGINE } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import React from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_ICON: Record<ScoringEngine, React.ElementType> = {
  MATCH_TOURNAMENT: Zap,
  TIMED_TECHNICAL:  Timer,
  JUDGED_RUBRIC:    Star,
  HYBRID:           Settings,
};

const ENGINE_LABEL: Record<ScoringEngine, string> = {
  MATCH_TOURNAMENT: 'Match Tournament',
  TIMED_TECHNICAL:  'Timed Technical',
  JUDGED_RUBRIC:    'Judged Rubric',
  HYBRID:           'Hybrid',
};

const DEFAULT_CONFIG: Record<CategoryCode, { minTeam: number; maxTeam: number; feeAmount: number; hasFee: boolean; rounds: number }> = {
  SUMO:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true,  rounds: 3 },
  MAZE:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true,  rounds: 2 },
  WALL:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true,  rounds: 2 },
  ECO_CITY:         { minTeam: 2, maxTeam: 5, feeAmount: 0,   hasFee: false, rounds: 1 },
  NEXTGEN_FACTORY:  { minTeam: 2, maxTeam: 5, feeAmount: 0,   hasFee: false, rounds: 1 },
  INNOVATOR_JUNIOR: { minTeam: 2, maxTeam: 6, feeAmount: 0,   hasFee: false, rounds: 1 },
  INNOVATOR_SENIOR: { minTeam: 2, maxTeam: 6, feeAmount: 0,   hasFee: false, rounds: 1 },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

type CatConfig = { minTeam: number; maxTeam: number; feeAmount: number; hasFee: boolean; rounds: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [config, setConfig] = useState<Record<CategoryCode, CatConfig>>({ ...DEFAULT_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editCat, setEditCat] = useState<CategoryCode | null>(null);
  const [editForm, setEditForm] = useState<CatConfig>(DEFAULT_CONFIG.SUMO);

  // ── Load category config from Firestore /config/categories ─────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'config', 'categories'));
      if (snap.exists()) {
        const data = snap.data() as Partial<Record<CategoryCode, CatConfig>>;
        setConfig(prev => ({ ...prev, ...data }));
      }
      // If the doc doesn't exist yet we just use the defaults
    } catch (e) {
      console.error(e);
      toast.error('Failed to load category config.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open edit modal ─────────────────────────────────────────────────────────

  const openEdit = (cat: CategoryCode) => {
    setEditCat(cat);
    setEditForm({ ...config[cat] });
  };

  // ── Save category config ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editCat) return;
    setSaving(true);
    try {
      const updated = { ...config, [editCat]: editForm };

      // Persist to /config/categories as a single merged document
      await setDoc(doc(db, 'config', 'categories'), {
        ...updated,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setConfig(updated);
      toast.success(`${CATEGORY_LABELS[editCat]} config saved!`);
      setEditCat(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save category config.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Categories & Rules"
        subtitle="Configure competition categories, scoring engines, team sizes and fees"
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ALL_CATEGORIES.map(cat => {
            const engine = CATEGORY_ENGINE[cat];
            const cfg    = config[cat];
            const Icon   = ENGINE_ICON[engine];

            return (
              <Card key={cat} hover>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{CATEGORY_LABELS[cat]}</h3>
                      <p className="font-mono text-xs text-gray-500 mt-0.5">{cat}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" icon={Edit3} onClick={() => openEdit(cat)}>Edit</Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Scoring Engine</p>
                    <p className="text-sm font-medium text-white">{ENGINE_LABEL[engine]}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Team Size</p>
                    <p className="text-sm font-medium text-white">{cfg.minTeam}–{cfg.maxTeam} members</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Participation Fee</p>
                    {cfg.hasFee
                      ? <p className="text-sm font-bold text-yellow-400">₹{cfg.feeAmount}</p>
                      : <p className="text-sm text-green-400">Free</p>
                    }
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Rounds / Attempts</p>
                    <p className="text-sm font-medium text-white">{cfg.rounds}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Badge variant="info" size="sm">{engine}</Badge>
                  {cfg.hasFee && <Badge variant="warning" size="sm">Fee Required</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title={`Edit — ${editCat ? CATEGORY_LABELS[editCat] : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditCat(null)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Config'}
            </Button>
          </>
        }
      >
        {editCat && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-400">Changes apply to future registrations. Existing scored entries retain their original version for audit integrity.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min Team Size" id="min-team" type="number"
                value={String(editForm.minTeam)}
                onChange={e => setEditForm(f => ({ ...f, minTeam: parseInt(e.target.value) || 1 }))} />
              <Input label="Max Team Size" id="max-team" type="number"
                value={String(editForm.maxTeam)}
                onChange={e => setEditForm(f => ({ ...f, maxTeam: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fee (₹, 0 = free)" id="fee-amount" type="number"
                value={String(editForm.feeAmount)}
                onChange={e => setEditForm(f => ({
                  ...f,
                  feeAmount: parseInt(e.target.value) || 0,
                  hasFee: (parseInt(e.target.value) || 0) > 0,
                }))} />
              <Input label="Rounds / Attempts" id="rounds" type="number"
                value={String(editForm.rounds)}
                onChange={e => setEditForm(f => ({ ...f, rounds: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
