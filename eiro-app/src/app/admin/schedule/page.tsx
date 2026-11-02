'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, CategoryBadge, KpiCard, Modal, Input, Select } from '@/components/ui';
import { Calendar, Plus, MapPin, Loader2, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeSlot {
  id: string;
  time?: string;
  duration?: number;
  arena?: string;
  category?: CategoryCode;
  round?: string;
  eventId?: string;
}

const CATEGORIES: CategoryCode[] = [
  'SUMO', 'MAZE', 'WALL', 'ECO_CITY',
  'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR',
];

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
];

const EMPTY_FORM = {
  time: '09:00',
  duration: '30',
  arena: '',
  category: 'SUMO' as CategoryCode,
  round: '',
  eventId: '',
};

// ─── Animated Background Data ─────────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Arenas ──────────────────────────────────────────────────────────────────

  const arenas = Array.from(
    new Set([...slots.map(s => s.arena), form.arena].filter(Boolean))
  );

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const snap = await getDocs(
        query(collection(db, 'timeSlots'), orderBy('time', 'asc'))
      );

      const data: TimeSlot[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Partial<TimeSlot>),
      }));

      setSlots(data);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Schedule slots could not be loaded. Check your role and Firestore permissions, then retry.'
      );
      toast.error('Failed to load schedule. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Add Slot ────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.time) {
      return toast.error('Time is required');
    }

    if (!form.arena.trim()) {
      return toast.error('Arena is required');
    }

    const duration = Number(form.duration);

    if (!Number.isInteger(duration) || duration < 1) {
      return toast.error('Enter a valid slot duration.');
    }

    setSaving(true);

    try {
      await addDoc(collection(db, 'timeSlots'), {
        time: form.time,
        duration,
        arena: form.arena.trim().toUpperCase(),
        category: form.category,
        ...(form.round.trim() ? { round: form.round.trim() } : {}),
        ...(form.eventId.trim() ? { eventId: form.eventId.trim() } : {}),
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

  // ── Delete Slot ─────────────────────────────────────────────────────────────

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

  const uniqueArenas = new Set(
    slots.map(s => s.arena).filter(Boolean)
  ).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="schedule-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ANIMATED BACKGROUND */}

      <div
        className="schedule-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="schedule-orb schedule-orb-one" />
        <div className="schedule-orb schedule-orb-two" />
        <div className="schedule-orb schedule-orb-three" />
        <div className="schedule-orb schedule-orb-four" />

        <div className="schedule-dot-grid absolute inset-0" />

        <div className="schedule-ring schedule-ring-one" />
        <div className="schedule-ring schedule-ring-two" />

        {ADMIN_PARTICLES.map(particle => (
          <div
            key={particle}
            className={`schedule-particle ${particle}`}
          />
        ))}

        <div className="schedule-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`schedule-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="schedule-center-glow" />
      </div>

      {/* PAGE CONTENT */}

      <main className="schedule-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Schedule Builder"
          subtitle="Arrange time slots, arenas and judge assignments"
          actions={
            <div className="flex flex-wrap gap-2">

              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  view === 'list'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                List
              </button>

              <button
                onClick={() => setView('timeline')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  view === 'timeline'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                Timeline
              </button>

              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={load}
                disabled={loading}
              />

              <Button
                size="sm"
                icon={Plus}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setAddOpen(true);
                }}
              >
                Add Slot
              </Button>
            </div>
          }
        />

        {/* KPI CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Time Slots"
            value={error || loading ? '—' : slots.length}
            icon={Calendar}
            color="indigo"
          />

          <KpiCard
            title="Arenas Used"
            value={error || loading ? '—' : uniqueArenas}
            icon={MapPin}
            color="blue"
          />
        </div>

        {/* ERROR */}

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <Card className="schedule-glass-card text-sm text-red-300">
            <p>{error}</p>

            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </Card>
        ) : slots.length === 0 ? (
          <Card className="schedule-glass-card text-center py-16">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />

            <p className="text-gray-300 font-medium">
              No time slots scheduled yet
            </p>

            <p className="text-gray-400 text-sm mt-1">
              Click <strong>Add Slot</strong> to build the schedule.
            </p>
          </Card>
        ) : view === 'list' ? (

          /* LIST VIEW */

          <Card className="schedule-glass-card" padding="none">
            <div className="overflow-x-auto">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Arena</th>
                    <th>Category</th>
                    <th>Round</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id}>
                      <td>
                        <span className="font-mono font-bold text-white">
                          {slot.time ?? '—'}
                        </span>
                      </td>

                      <td>
                        <span className="text-xs text-gray-300">
                          {slot.duration ? `${slot.duration}min` : '—'}
                        </span>
                      </td>

                      <td>
                        <span className="font-mono text-xs text-indigo-300">
                          {slot.arena ?? '—'}
                        </span>
                      </td>

                      <td>
                        {slot.category ? (
                          <CategoryBadge code={slot.category} />
                        ) : '—'}
                      </td>

                      <td>
                        <span className="text-xs text-gray-300">
                          {slot.round ?? '—'}
                        </span>
                      </td>

                      <td>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDelete(slot.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        ) : (

          /* TIMELINE VIEW */

          <Card className="schedule-glass-card" padding="none">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">

                <div
                  className="grid border-b border-white/10"
                  style={{
                    gridTemplateColumns: `80px repeat(${Math.max(arenas.length, 1)}, 1fr)`,
                  }}
                >
                  <div className="p-3 text-xs text-gray-300 font-medium border-r border-white/10">
                    Time
                  </div>

                  {arenas.map(arena => (
                    <div
                      key={arena}
                      className="p-3 text-xs text-center font-medium text-indigo-300 border-r border-white/10 last:border-0"
                    >
                      {arena}
                    </div>
                  ))}
                </div>

                {HOURS.map(hour => {
                  const hourSlots = slots.filter(
                    s => s.time?.startsWith(hour.slice(0, 2))
                  );

                  return (
                    <div
                      key={hour}
                      className="grid border-b border-white/10 min-h-[56px]"
                      style={{
                        gridTemplateColumns: `80px repeat(${Math.max(arenas.length, 1)}, 1fr)`,
                      }}
                    >
                      <div className="p-3 text-xs font-mono text-gray-300 border-r border-white/10 flex items-start">
                        {hour}
                      </div>

                      {arenas.map(arena => {
                        const slot = hourSlots.find(
                          s => s.arena === arena
                        );

                        return (
                          <div
                            key={arena}
                            className="p-1.5 border-r border-white/10 last:border-0"
                          >
                            {slot && (
                              <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-400/30 h-full">
                                <div className="text-[10px] font-bold text-indigo-200 truncate">
                                  {slot.round ?? slot.category ?? 'Slot'}
                                </div>
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

        {/* ADD SLOT MODAL */}

        <Modal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title="Add Time Slot"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={saving ? Loader2 : CheckCircle2}
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Add Slot'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Time *"
                id="slot-time"
                type="time"
                value={form.time}
                onChange={e =>
                  setForm(f => ({ ...f, time: e.target.value }))
                }
              />

              <Input
                label="Duration (min)"
                id="slot-dur"
                type="number"
                value={form.duration}
                onChange={e =>
                  setForm(f => ({ ...f, duration: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Arena *"
                id="slot-arena"
                placeholder="e.g. A1"
                value={form.arena}
                onChange={e =>
                  setForm(f => ({ ...f, arena: e.target.value }))
                }
              />

              <Select
                label="Category"
                id="slot-cat"
                value={form.category}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    category: e.target.value as CategoryCode,
                  }))
                }
                options={CATEGORIES.map(c => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>

            <Input
              label="Round / Type"
              id="slot-round"
              placeholder="e.g. QF1, Attempt 1"
              value={form.round}
              onChange={e =>
                setForm(f => ({ ...f, round: e.target.value }))
              }
            />

            <Input
              label="Event ID (optional)"
              id="slot-event"
              value={form.eventId}
              onChange={e =>
                setForm(f => ({ ...f, eventId: e.target.value }))
              }
            />
          </div>
        </Modal>
      </main>

      {/* ANIMATED BACKGROUND STYLES */}

      <style jsx global>{`

        .schedule-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .schedule-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* IMPORTANT:
           The background layer has no blur, no overlay
           and no dark screen-covering panel.
        */

        .schedule-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
          backdrop-filter: none !important;
        }

        /* GLOWING ORBS */

        .schedule-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.85;
        }

        .schedule-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.55),
            rgba(216, 180, 254, 0.12) 70%,
            transparent
          );
          animation: scheduleOrbOne 18s ease-in-out infinite alternate;
        }

        .schedule-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.42),
            rgba(196, 181, 253, 0.10) 65%,
            transparent
          );
          animation: scheduleOrbTwo 22s ease-in-out infinite alternate;
        }

        .schedule-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.38),
            rgba(232, 121, 249, 0.08) 68%,
            transparent
          );
          animation: scheduleOrbThree 20s ease-in-out infinite alternate;
        }

        .schedule-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.38),
            transparent 72%
          );
          animation: scheduleOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .schedule-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.14) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.65;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 85%
          );
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 85%
          );
        }

        /* ROTATING RINGS */

        .schedule-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.18);
          border-radius: 50%;
          will-change: transform;
        }

        .schedule-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: scheduleRingOne 35s linear infinite;
        }

        .schedule-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.20);
          animation: scheduleRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .schedule-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c4a0ff;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.65);
          animation: scheduleParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .schedule-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .schedule-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: none;
          animation: scheduleBubbleFloat linear infinite;
        }

        .schedule-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.38),
            rgba(168, 85, 247, 0.08) 55%,
            transparent 75%
          );
        }

        .schedule-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.34),
            rgba(221, 143, 224, 0.07) 55%,
            transparent 75%
          );
        }

        @keyframes scheduleBubbleFloat {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          12% {
            opacity: 0.75;
          }
          88% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CENTRAL GLOW */

        .schedule-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.12) 0%,
            rgba(91, 52, 130, 0.06) 38%,
            transparent 72%
          );
        }

        /* TRANSPARENT CARDS
           No backdrop blur and no opaque dark panel.
        */

        .schedule-page .schedule-glass-card {
          background: rgba(5, 3, 8, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .schedule-page .schedule-glass-card:hover {
          background: rgba(12, 7, 18, 0.18) !important;
          border-color: rgba(221, 143, 224, 0.25) !important;
        }

        /* TABLE TRANSPARENCY */

        .schedule-page .schedule-glass-card table,
        .schedule-page .schedule-glass-card thead,
        .schedule-page .schedule-glass-card tbody,
        .schedule-page .schedule-glass-card tr {
          background-color: transparent !important;
        }

        .schedule-page .schedule-glass-card th {
          background: rgba(5, 3, 8, 0.10) !important;
        }

        .schedule-page .schedule-glass-card td {
          background: transparent !important;
        }

        /* ANIMATIONS */

        @keyframes scheduleOrbOne {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(120px, 110px, 0) scale(1.12); }
        }

        @keyframes scheduleOrbTwo {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-140px, 100px, 0) scale(0.92); }
        }

        @keyframes scheduleOrbThree {
          0% { transform: translate3d(0, 0, 0) scale(0.95); }
          100% { transform: translate3d(130px, -100px, 0) scale(1.1); }
        }

        @keyframes scheduleOrbFour {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100px, -80px, 0); }
        }

        @keyframes scheduleRingOne {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.08); }
        }

        @keyframes scheduleRingTwo {
          from { transform: rotate(360deg) scale(1); }
          to { transform: rotate(0deg) scale(1.1); }
        }

        @keyframes scheduleParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }
          50% { opacity: 0.9; }
          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .schedule-orb-one {
            width: 320px;
            height: 320px;
          }

          .schedule-orb-two {
            width: 360px;
            height: 360px;
          }

          .schedule-orb-three {
            width: 340px;
            height: 340px;
          }

          .schedule-ring-one {
            width: 300px;
            height: 300px;
          }

          .schedule-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .schedule-orb,
          .schedule-ring,
          .schedule-particle,
          .schedule-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}

