'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, CategoryBadge, KpiCard, Modal, Input, Select } from '@/components/ui';
import { Calendar, Plus, Clock, MapPin, Users, Loader2, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeSlot {
  id: string;
  time: string;
  duration: number;
  arena: string;
  category: CategoryCode;
  teams: string[];
  round: string;
  judge: string;
  eventId: string;
}

const CATEGORIES: CategoryCode[] = ['SUMO', 'MAZE', 'WALL', 'ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const EMPTY_FORM = {
  time: '09:00', duration: '30', arena: '', category: 'SUMO' as CategoryCode,
  teams: '', round: '', judge: '', eventId: '',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [slots, setSlots]   = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [view, setView]     = useState<'list' | 'timeline'>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm]     = useState(EMPTY_FORM);

  // ── Arenas derived from loaded data + form ──────────────────────────────────
  const arenas = Array.from(new Set([...slots.map(s => s.arena), form.arena].filter(Boolean)));

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'timeSlots'), orderBy('time', 'asc')));
      const data: TimeSlot[] = snap.docs.map(d => ({
        id: d.id,
        time: '', duration: 30, arena: '', category: 'SUMO' as CategoryCode,
        teams: [], round: '', judge: '', eventId: '',
        ...(d.data() as Partial<TimeSlot>),
      }));
      setSlots(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load schedule. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Add slot ────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.time) return toast.error('Time is required');
    if (!form.arena.trim()) return toast.error('Arena is required');
    setSaving(true);
    try {
      await addDoc(collection(db, 'timeSlots'), {
        time: form.time,
        duration: parseInt(form.duration) || 30,
        arena: form.arena.trim().toUpperCase(),
        category: form.category,
        teams: form.teams.split(',').map(t => t.trim()).filter(Boolean),
        round: form.round.trim(),
        judge: form.judge.trim(),
        eventId: form.eventId.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success('Time slot added!');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add slot.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete slot ─────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this time slot?')) return;
    try {
      await deleteDoc(doc(db, 'timeSlots', id));
      toast.success('Slot removed.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove slot.');
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const uniqueTeams  = new Set(slots.flatMap(s => s.teams)).size;
  const uniqueArenas = new Set(slots.map(s => s.arena)).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Schedule Builder"
        subtitle="Arrange time slots, arenas and judge assignments"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView('list')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'list' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/10 bg-white/5 text-gray-400'}`}>
              List
            </button>
            <button onClick={() => setView('timeline')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'timeline' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/10 bg-white/5 text-gray-400'}`}>
              Timeline
            </button>
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading} />
            <Button size="sm" icon={Plus} onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>Add Slot</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Time Slots"      value={slots.length}  icon={Calendar} color="indigo" />
        <KpiCard title="Arenas Used"     value={uniqueArenas}  icon={MapPin}   color="blue"   />
        <KpiCard title="Teams Scheduled" value={uniqueTeams}   icon={Users}    color="green"  />
        <KpiCard title="Unscheduled"     value={0}             icon={Clock}    color="orange" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <Card className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No time slots scheduled yet</p>
          <p className="text-gray-600 text-sm mt-1">Click <strong>Add Slot</strong> to build the schedule.</p>
        </Card>
      ) : view === 'list' ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr>
                  <th>Time</th><th>Duration</th><th>Arena</th><th>Category</th>
                  <th>Round</th><th>Teams</th><th>Judge</th><th></th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id}>
                    <td><span className="font-mono font-bold text-white">{slot.time}</span></td>
                    <td><span className="text-xs text-gray-400">{slot.duration}min</span></td>
                    <td><span className="font-mono text-xs text-indigo-400">{slot.arena}</span></td>
                    <td><CategoryBadge code={slot.category} /></td>
                    <td><span className="text-xs text-gray-400">{slot.round}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {slot.teams.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className="text-xs text-gray-400">{slot.judge}</span></td>
                    <td>
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDelete(slot.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `80px repeat(${Math.max(arenas.length, 1)}, 1fr)` }}>
                <div className="p-3 text-xs text-gray-500 font-medium border-r border-white/5">Time</div>
                {arenas.map(a => (
                  <div key={a} className="p-3 text-xs text-center font-medium text-indigo-400 border-r border-white/5 last:border-0">{a}</div>
                ))}
              </div>
              {HOURS.map(hour => {
                const hourSlots = slots.filter(s => s.time.startsWith(hour.slice(0, 2)));
                return (
                  <div key={hour} className="grid border-b border-white/5 min-h-[56px]"
                    style={{ gridTemplateColumns: `80px repeat(${Math.max(arenas.length, 1)}, 1fr)` }}>
                    <div className="p-3 text-xs font-mono text-gray-500 border-r border-white/5 flex items-start">{hour}</div>
                    {arenas.map(arena => {
                      const slot = hourSlots.find(s => s.arena === arena);
                      return (
                        <div key={arena} className="p-1.5 border-r border-white/5 last:border-0">
                          {slot && (
                            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 h-full">
                              <div className="text-[10px] font-bold text-indigo-300 truncate">{slot.teams[0]}</div>
                              <div className="text-[9px] text-gray-500 mt-0.5">{slot.round}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Add slot modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Time Slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Add Slot'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Time *" id="slot-time" type="time"
              value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            <Input label="Duration (min)" id="slot-dur" type="number"
              value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Arena *" id="slot-arena" placeholder="e.g. A1"
              value={form.arena} onChange={e => setForm(f => ({ ...f, arena: e.target.value }))} />
            <Select label="Category" id="slot-cat"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as CategoryCode }))}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
          </div>
          <Input label="Round / Type" id="slot-round" placeholder="e.g. QF1, Attempt 1"
            value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} />
          <Input label="Teams (comma-separated)" id="slot-teams" placeholder="Team A, Team B"
            value={form.teams} onChange={e => setForm(f => ({ ...f, teams: e.target.value }))} />
          <Input label="Judge" id="slot-judge" placeholder="Judge name"
            value={form.judge} onChange={e => setForm(f => ({ ...f, judge: e.target.value }))} />
          <Input label="Event ID (optional)" id="slot-event"
            value={form.eventId} onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
