'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, Modal, Input } from '@/components/ui';
import {
  Plus, Trophy, Calendar, Archive, ChevronRight, Settings,
  CheckCircle2, Loader2, RefreshCw, Trash2, Pencil,
} from 'lucide-react';
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
  description?: string;
  venue?: string;
  district?: string;
}

function toInputDate(value: unknown): string {
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const d = (value as any).toDate() as Date;
    return d.toISOString().slice(0, 10);
  }
  return '';
}

function formatDate(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

const EMPTY_FORM = {
  name: '', year: String(new Date().getFullYear() + 1),
  regOpen: '', regClose: '', description: '', venue: '', district: '',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeasonsPage() {
  const [seasons, setSeasons]           = useState<Season[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [saving, setSaving]             = useState(false);

  // Modal state — separate for create, edit, and phase
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Season | null>(null);
  const [phaseTarget, setPhaseTarget]   = useState<Season | null>(null);

  // Shared form state (used for both create and edit)
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'seasons'));
      const data: Season[] = snap.docs.map(d => {
        const src = d.data();
        return {
          id: d.id,
          name: typeof src.name === 'string' ? src.name : d.id,
          year: typeof src.year === 'number' ? src.year : undefined,
          phase: typeof src.phase === 'string' ? src.phase : 'UNKNOWN',
          registrationWindowStart: src.registrationWindowStart,
          registrationWindowEnd: src.registrationWindowEnd,
          description: typeof src.description === 'string' ? src.description : '',
          venue: typeof src.venue === 'string' ? src.venue : '',
          district: typeof src.district === 'string' ? src.district : '',
        };
      });
      data.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setSeasons(data);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Season records could not be loaded. Check administrator authorisation and retry.');
      toast.error('Failed to load seasons. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function buildTimestamp(dateStr: string, endOfDay = false) {
    if (!dateStr) return null;
    const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
    return Timestamp.fromDate(new Date(`${dateStr}${suffix}`));
  }

  function validateForm() {
    if (!form.name.trim()) { toast.error('Season name is required.'); return false; }
    const y = Number(form.year);
    if (!Number.isInteger(y) || y < 2000) { toast.error('Enter a valid season year.'); return false; }
    if (form.regOpen && form.regClose && form.regClose < form.regOpen) {
      toast.error('Registration close date must be on or after the open date.');
      return false;
    }
    return true;
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'seasons'), {
        name: form.name.trim(),
        year: Number(form.year),
        phase: 'SETUP',
        description: form.description.trim(),
        venue: form.venue.trim(),
        district: form.district.trim(),
        registrationWindowStart: buildTimestamp(form.regOpen),
        registrationWindowEnd: buildTimestamp(form.regClose, true),
        publishedSettings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

  // ── Edit ────────────────────────────────────────────────────────────────────

  const openEdit = (s: Season) => {
    setForm({
      name:        s.name,
      year:        String(s.year ?? ''),
      regOpen:     toInputDate(s.registrationWindowStart),
      regClose:    toInputDate(s.registrationWindowEnd),
      description: s.description ?? '',
      venue:       s.venue ?? '',
      district:    s.district ?? '',
    });
    setEditTarget(s);
  };

  const handleEdit = async () => {
    if (!editTarget || !validateForm()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'seasons', editTarget.id), {
        name: form.name.trim(),
        year: Number(form.year),
        description: form.description.trim(),
        venue: form.venue.trim(),
        district: form.district.trim(),
        registrationWindowStart: buildTimestamp(form.regOpen),
        registrationWindowEnd: buildTimestamp(form.regClose, true),
        updatedAt: serverTimestamp(),
        // NOTE: phase is NOT updated here — use Manage Phase for that
      });
      toast.success('Season updated!');
      setEditTarget(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update season.');
    } finally {
      setSaving(false);
    }
  };

  // ── Advance phase ───────────────────────────────────────────────────────────

  const advancePhase = async (season: Season) => {
    const idx = PHASES.indexOf(season.phase);
    if (idx < 0) return toast.error('Unknown phase — cannot advance.');
    const next = PHASES[Math.min(idx + 1, PHASES.length - 1)];
    if (next === season.phase) return toast.error('Season is already at the final phase.');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'seasons', season.id), {
        phase: next,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Season phase → ${next.replace(/_/g, ' ')}`);
      setPhaseTarget(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to advance phase.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

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

  // ── Shared form fields (used in Create + Edit modals) ──────────────────────

  const SeasonFormFields = () => (
    <div className="space-y-4">
      <Input label="Season Name *" id="season-name" placeholder="e.g. EIRO 2026 — District Preliminary"
        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input label="Year *" id="season-year" type="number" placeholder="2026"
        value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Registration Opens" id="reg-open" type="date"
          value={form.regOpen} onChange={e => setForm(f => ({ ...f, regOpen: e.target.value }))} />
        <Input label="Registration Closes" id="reg-close" type="date"
          value={form.regClose} onChange={e => setForm(f => ({ ...f, regClose: e.target.value }))} />
      </div>
      <Input label="Venue (optional)" id="season-venue" placeholder="e.g. Srinivasa Ramanujan Hall"
        value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
      <Input label="District (optional)" id="season-district" placeholder="e.g. Trichy"
        value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
      <Input label="Description (optional)" id="season-desc" placeholder="Any notes about this season"
        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
    </div>
  );

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
                {/* Info */}
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
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="text-indigo-400 font-medium">{s.year ?? '—'}</span>
                      {(s.registrationWindowStart || s.registrationWindowEnd) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Reg: {formatDate(s.registrationWindowStart) || '—'} → {formatDate(s.registrationWindowEnd) || '—'}
                        </span>
                      )}
                      {s.venue && <span>📍 {s.venue}</span>}
                      {s.district && <span>🏛 {s.district}</span>}
                    </div>
                    {s.description && (
                      <p className="text-xs text-gray-600 mt-1">{s.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap shrink-0">
                  {/* Edit — always available */}
                  <Button size="sm" variant="secondary" icon={Pencil}
                    onClick={() => openEdit(s)}>
                    Edit
                  </Button>

                  {/* Manage Phase — only for non-terminal phases */}
                  {PHASES.includes(s.phase) && !['ARCHIVED'].includes(s.phase) && (
                    <Button size="sm" variant="secondary" icon={Settings}
                      onClick={() => setPhaseTarget(s)}>
                      Phase
                    </Button>
                  )}

                  {/* Delete */}
                  <Button size="sm" variant="danger" icon={Trash2}
                    onClick={() => handleDelete(s)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create modal ────────────────────────────────────────────────────── */}
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
        <SeasonFormFields />
        <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">Season will start in SETUP phase. Configure categories, districts and venues before opening registration.</p>
        </div>
      </Modal>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editTarget && (
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)}
          title={`Edit Season — ${editTarget.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <SeasonFormFields />
          <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400">
              ⚠ Editing does <strong>not</strong> change the phase. Use the <strong>Phase</strong> button to advance the season state.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Phase management modal ──────────────────────────────────────────── */}
      {phaseTarget && (
        <Modal open={!!phaseTarget} onClose={() => setPhaseTarget(null)}
          title={`Manage Phase — ${phaseTarget.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPhaseTarget(null)} disabled={saving}>Cancel</Button>
              <Button icon={saving ? Loader2 : ChevronRight} iconPosition="right"
                onClick={() => advancePhase(phaseTarget)} disabled={saving}>
                {saving ? 'Advancing…' : 'Advance to Next Phase'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Current phase:</p>
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${PHASE_COLORS[phaseTarget.phase] ?? ''}`}>
                {phaseTarget.phase.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Phase progression:</p>
              {PHASES.map((ph, i) => {
                const currentIdx = PHASES.indexOf(phaseTarget.phase);
                const isPast    = i < currentIdx;
                const isCurrent = ph === phaseTarget.phase;
                const isNext    = i === currentIdx + 1;
                return (
                  <div key={ph} className={`flex items-center gap-2 text-xs ${
                    isCurrent ? 'text-white font-bold' :
                    isNext    ? 'text-indigo-300' :
                    isPast    ? 'text-gray-600 line-through' : 'text-gray-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isCurrent ? 'bg-indigo-400 ring-2 ring-indigo-400/30' :
                      isNext    ? 'bg-indigo-600' :
                      isPast    ? 'bg-gray-700' : 'bg-gray-700'
                    }`} />
                    {ph.replace(/_/g, ' ')}
                    {isNext && <span className="text-indigo-400 ml-1">← next</span>}
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs text-orange-400">Phase changes affect what actions are available across the entire platform (registration, scoring, publishing). Advance only when ready.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
