'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, Badge, Modal, Input } from '@/components/ui';
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

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

type CatConfig = { minTeam: number; maxTeam: number; feeAmount: number; hasFee: boolean; rounds: number };
type CatConfigForm = { minTeam: string; maxTeam: string; feeAmount: string; rounds: string };
const EMPTY_FORM: CatConfigForm = { minTeam: '', maxTeam: '', feeAmount: '', rounds: '' };

function isCatConfig(value: unknown): value is CatConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<CatConfig>;
  return Number.isInteger(config.minTeam) && Number.isInteger(config.maxTeam) &&
    Number.isFinite(config.feeAmount) && typeof config.hasFee === 'boolean' &&
    Number.isInteger(config.rounds) && (config.minTeam ?? 0) >= 1 &&
    (config.maxTeam ?? 0) >= (config.minTeam ?? 1) && config.feeAmount! >= 0 &&
    (config.rounds ?? 0) >= 1 && config.hasFee === (config.feeAmount! > 0);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [config, setConfig] = useState<Partial<Record<CategoryCode, CatConfig>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving]   = useState(false);
  const [editCat, setEditCat] = useState<CategoryCode | null>(null);
  const [editForm, setEditForm] = useState<CatConfigForm>(EMPTY_FORM);

  // ── Load category config from Firestore /config/categories ─────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'config', 'categories'));
      const data = snap.exists() ? snap.data() : {};
      const loaded: Partial<Record<CategoryCode, CatConfig>> = {};
      for (const cat of ALL_CATEGORIES) {
        if (isCatConfig(data[cat])) loaded[cat] = data[cat];
      }
      setConfig(loaded);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Category configuration could not be loaded. Check administrator authorization and retry.');
      toast.error('Failed to load category config.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Open edit modal ─────────────────────────────────────────────────────────

  const openEdit = (cat: CategoryCode) => {
    setEditCat(cat);
    const current = config[cat];
    setEditForm(current ? {
      minTeam: String(current.minTeam),
      maxTeam: String(current.maxTeam),
      feeAmount: String(current.feeAmount),
      rounds: String(current.rounds),
    } : { ...EMPTY_FORM });
  };

  // ── Save category config ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editCat) return;
    const minTeam = Number(editForm.minTeam);
    const maxTeam = Number(editForm.maxTeam);
    const feeAmount = Number(editForm.feeAmount);
    const rounds = Number(editForm.rounds);
    if (!editForm.minTeam.trim() || !editForm.maxTeam.trim() || !editForm.feeAmount.trim() || !editForm.rounds.trim() ||
      !Number.isInteger(minTeam) || !Number.isInteger(maxTeam) || !Number.isInteger(rounds) ||
      minTeam < 1 || maxTeam < minTeam || !Number.isFinite(feeAmount) || feeAmount < 0 || rounds < 1) {
      return toast.error('Enter valid team sizes, a non-negative fee, and at least one round.');
    }
    setSaving(true);
    try {
      const savedConfig: CatConfig = { minTeam, maxTeam, feeAmount, hasFee: feeAmount > 0, rounds };
      const updated = { ...config, [editCat]: savedConfig };

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
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">
          <p>{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card></div>
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
                  <Button size="sm" variant="secondary" icon={Edit3} onClick={() => openEdit(cat)}>
                    {cfg ? 'Edit' : 'Configure'}
                  </Button>
                </div>

                {cfg ? (
                  <>
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
                        <p className="text-xs text-gray-500 mb-1">Fee per student</p>
                        {cfg.hasFee
                          ? <p className="text-sm font-bold text-yellow-400">₹{cfg.feeAmount} / student</p>
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
                  </>
                ) : (
                  <p className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                    Not configured. Team size, fee, and rounds are unavailable until saved.
                  </p>
                )}
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
              <Input label="Min Team Size" id="min-team" type="number" placeholder="Required"
                value={editForm.minTeam}
                onChange={e => setEditForm(f => ({ ...f, minTeam: e.target.value }))} />
              <Input label="Max Team Size" id="max-team" type="number" placeholder="Required"
                value={editForm.maxTeam}
                onChange={e => setEditForm(f => ({ ...f, maxTeam: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fee per student (₹, 0 = free)" id="fee-amount" type="number" placeholder="Required"
                value={editForm.feeAmount}
                onChange={e => setEditForm(f => ({ ...f, feeAmount: e.target.value }))} />
              <Input label="Rounds / Attempts" id="rounds" type="number" placeholder="Required"
                value={editForm.rounds}
                onChange={e => setEditForm(f => ({ ...f, rounds: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
