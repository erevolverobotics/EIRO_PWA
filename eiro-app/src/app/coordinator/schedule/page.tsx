'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Info, MapPin, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, Badge, CategoryBadge } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

interface TimeSlot {
  id: string;
  eventId?: string;
  arenaId?: string;
  startAt?: { toDate?: () => Date } | string;
  endAt?: { toDate?: () => Date } | string;
  time?: string;
  duration?: number;
  arena?: string;
  categoryCode?: CategoryCode;
  category?: CategoryCode;
  round?: string;
  title?: string;
}

interface Event {
  id: string;
  name?: string;
  title?: string;
  venueId?: string;
  stageType?: string;
  state?: string;
  startAt?: { toDate?: () => Date } | string;
}

interface Venue { id: string; name?: string; address?: string; }
interface Arena { id: string; name?: string; identifier?: string; venueId?: string; }

function asDate(value?: TimeSlot['startAt']): Date | null {
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatTime(slot: TimeSlot): string {
  const date = asDate(slot.startAt);
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : slot.time || 'Time not set';
}

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [slotSnap, eventSnap, venueSnap, arenaSnap] = await Promise.all([
        getDocs(collection(db, 'timeSlots')),
        getDocs(query(collection(db, 'events'), where('state', 'in', ['PUBLISHED', 'ACTIVE', 'COMPLETED']))),
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'arenas')),
      ]);
      const slotData = slotSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<TimeSlot, 'id'>) }));
      setError('');
      slotData.sort((a, b) => (asDate(a.startAt)?.getTime() ?? 0) - (asDate(b.startAt)?.getTime() ?? 0));
      setSlots(slotData);
      setEvents(eventSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Event, 'id'>) })));
      setVenues(venueSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Venue, 'id'>) })));
      setArenas(arenaSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Arena, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Published schedule information could not be loaded. Check connectivity and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const eventById = useMemo(() => new Map(events.map(event => [event.id, event])), [events]);
  const arenaById = useMemo(() => new Map(arenas.map(arena => [arena.id, arena])), [arenas]);
  const venueById = useMemo(() => new Map(venues.map(venue => [venue.id, venue])), [venues]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Schedule & Venue" subtitle="Published event schedule and venue information" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">Only schedule records published for authenticated users are shown. Team-specific slot assignments are not inferred when a school-to-entry mapping is unavailable.</p>
      </div>

      {error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading published schedule…</Card>
      ) : slots.length === 0 ? (
        <Card className="text-center py-14">
          <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-300">No published schedule yet</p>
          <p className="text-sm text-gray-500 mt-2">Schedule details will appear once the event organizer publishes them.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-white/5">
            {slots.map(slot => {
              const event = slot.eventId ? eventById.get(slot.eventId) : undefined;
              const arena = slot.arenaId ? arenaById.get(slot.arenaId) : undefined;
              const venue = event?.venueId ? venueById.get(event.venueId) : undefined;
              const category = slot.categoryCode || slot.category;
              const endAt = asDate(slot.endAt);
              return (
                <div key={slot.id} className="flex items-start gap-4 px-5 sm:px-6 py-4">
                  <div className="w-24 flex-shrink-0">
                    <div className="text-sm font-mono font-medium text-indigo-300">{formatTime(slot)}</div>
                    {endAt && <div className="text-xs text-gray-600">{endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{slot.title || slot.round || event?.name || event?.title || 'Scheduled slot'}</span>
                      {category && <CategoryBadge code={category} />}
                      {event?.stageType && <Badge variant="outline" size="sm">{event.stageType.replaceAll('_', ' ')}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      {event && <span>{event.name || event.title || event.id}</span>}
                      {(arena?.name || arena?.identifier || slot.arena) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{arena?.name || arena?.identifier || slot.arena}</span>}
                      {venue && <span>{venue.name}{venue.address ? ` · ${venue.address}` : ''}</span>}
                      {!endAt && slot.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slot.duration} min</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
