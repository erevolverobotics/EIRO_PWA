'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, Modal, Input } from '@/components/ui';
import { Plus, Trophy, Calendar, Archive, ChevronRight, Settings, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Season {
  id: string;
  name: string;
  year?: number;
  phase: string;
  registrationWindowStart?: unknown;
  registrationWindowEnd?: unknown;
}

function formatDate(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value &&
    typeof value.toDate === 'function') {
    return value.toDate().toLocaleDateString();
  }
  return '';
}

const PHASE_COLORS: Record<string, string> = {
  SETUP:               'text-gray-400 bg-gray-500/10 border-gray-500/30',
  REGISTRATION_OPEN:   'text-green-400 bg-green-500/10 border-green-500/30',
  REGISTRATION_CLOSED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  ACTIVE:              'text-blue-400 bg-blue-500/10 border-blue-500/30',
  COMPLETED:           'text-purple-400 bg-purple-500/10 border-purple-500/30',
  ARCHIVED:            'text-gray-500 bg-gray-600/10 border-gray-600/30',
};

const PHASES = ['SETUP', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

const EMPTY_FORM = { name: '', year: String(new Date().getFullYear() + 1), regOpen: '', regClose: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeasonsPage() {
  const [seasons, setSeasons]       = useState<Season[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [phaseTarget, setPhaseTarget] = useState<Season | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'seasons'));
      const data: Season[] = snap.docs.map(d => {
        const source = d.data();
        return {
          id: d.id,
          name: typeof source.name === 'string' ? source.name : d.id,
          year: typeof source.year === 'number' ? source.year : undefined,
          phase: typeof source.phase === 'string' ? source.phase : 'UNKNOWN',
          registrationWindowStart: source.registrationWindowStart,
          registrationWindowEnd: source.registrationWindowEnd,
        };
      });
      data.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setSeasons(data);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Season records could not be loaded. Check administrator authorization and retry.');
      toast.error('Failed to load seasons. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Create season ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Season name is required');
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1) return toast.error('Enter a valid season year.');
    if (form.regOpen && form.regClose && form.regClose < form.regOpen) {
      return toast.error('Registration close date must be on or after the open date.');
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'seasons'), {
        name: form.name.trim(),
        year,
        phase: 'SETUP',
        registrationWindowStart: form.regOpen
          ? Timestamp.fromDate(new Date(`${form.regOpen}T00:00:00.000Z`))
          : null,
        registrationWindowEnd: form.regClose
          ? Timestamp.fromDate(new Date(`${form.regClose}T23:59:59.999Z`))
          : null,
        publishedSettings: {},
        createdAt: serverTimestamp(),
      });
      toast.success('Season created!');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create season.');
    } finally {
      setSaving(false);
    }
  };

  // ── Advance phase ───────────────────────────────────────────────────────────

  const advancePhase = async (season: Season) => {
    const idx = PHASES.indexOf(season.phase);
    if (idx < 0) return toast.error('This season has an unknown phase and cannot be advanced.');
    const next = PHASES[Math.min(idx + 1, PHASES.length - 1)];
    if (next === season.phase) return toast.error('Season is already at the final phase.');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'seasons', season.id), { phase: next });
      toast.success(`Season moved to ${next.replace(/_/g, ' ')}.`);
      setPhaseTarget(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to advance phase.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete season ───────────────────────────────────────────────────────────

  const handleDelete = async (s: Season) => {
    if (!confirm(`Delete season "${s.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'seasons', s.id));
      toast.success('Season deleted.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete season.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Seasons"
        subtitle="Manage competition seasons, phases and global settings"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
            <Button icon={Plus} onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>Create Season</Button>
          </div>
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
      ) : seasons.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No seasons yet</p>
          <p className="text-gray-600 text-sm mt-1">Click <strong>Create Season</strong> to add your first season.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {seasons.map(s => (
            <Card key={s.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{s.name}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${PHASE_COLORS[s.phase] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                        {s.phase.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      {Boolean(s.registrationWindowStart || s.registrationWindowEnd) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Reg: {formatDate(s.registrationWindowStart) || '—'} → {formatDate(s.registrationWindowEnd) || '—'}
                        </span>
                      )}
                      <span className="text-indigo-400 font-medium">{s.year ?? 'Year unavailable'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PHASES.includes(s.phase) && !['COMPLETED', 'ARCHIVED'].includes(s.phase) && (
                    <>
                      <Button size="sm" variant="secondary" icon={Settings}
                        onClick={() => setPhaseTarget(s)}>Manage Phase</Button>
                    </>
                  )}
                  {s.phase === 'COMPLETED' && (
                    <Button size="sm" variant="secondary" icon={Archive}
                      onClick={() => advancePhase(s)}>Archive</Button>
                  )}
                  <Button size="sm" variant="danger" icon={Trash2}
                    onClick={() => handleDelete(s)} />
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Season"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create Season'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Season Name *" id="season-name" placeholder="e.g. EIRO 2027"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Year" id="season-year" type="number" placeholder="2027"
            value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
          <Input label="Registration Opens" id="reg-open" type="date"
            value={form.regOpen} onChange={e => setForm(f => ({ ...f, regOpen: e.target.value }))} />
          <Input label="Registration Closes" id="reg-close" type="date"
            value={form.regClose} onChange={e => setForm(f => ({ ...f, regClose: e.target.value }))} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">Season will start in SETUP phase. Configure categories, districts, venues and fee rules before opening registration.</p>
          </div>
        </div>
      </Modal>

      {/* Phase management modal */}
      {phaseTarget && (
        <Modal open={!!phaseTarget} onClose={() => setPhaseTarget(null)} title={`Manage Phase — ${phaseTarget.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPhaseTarget(null)}>Cancel</Button>
              <Button icon={ChevronRight} iconPosition="right" onClick={() => advancePhase(phaseTarget)}>
                Advance to Next Phase
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Current phase:</p>
            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${PHASE_COLORS[phaseTarget.phase] ?? ''}`}>
              {phaseTarget.phase.replace(/_/g, ' ')}
            </span>
            <div className="pt-3 space-y-2">
              <p className="text-xs text-gray-500">Phase progression:</p>
              {PHASES.map(ph => (
                <div key={ph} className={`flex items-center gap-2 text-xs ${ph === phaseTarget.phase ? 'text-white font-bold' : 'text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${ph === phaseTarget.phase ? 'bg-indigo-400' : 'bg-gray-600'}`} />
                  {ph.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
