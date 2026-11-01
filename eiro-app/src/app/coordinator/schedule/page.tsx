'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Info, MapPin, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, Badge, CategoryBadge } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';


/* =========================================
   FLOATING BACKGROUND BUBBLES
   SAME THEME AS OTHER PAGES
========================================= */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];


/* =========================================
   TYPES
========================================= */

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

interface Venue {
  id: string;
  name?: string;
  address?: string;
}

interface Arena {
  id: string;
  name?: string;
  identifier?: string;
  venueId?: string;
}


/* =========================================
   DATE HELPERS
========================================= */

function asDate(value?: TimeSlot['startAt']): Date | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}


function formatTime(slot: TimeSlot): string {
  const date = asDate(slot.startAt);

  return date
    ? date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : slot.time || 'Time not set';
}


/* =========================================
   SCHEDULE PAGE
========================================= */

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  /* =========================================
     LOAD SCHEDULE DATA
     ORIGINAL FIREBASE LOGIC UNCHANGED
  ========================================= */

  const load = useCallback(async () => {
    try {
      const [slotSnap, eventSnap, venueSnap, arenaSnap] =
        await Promise.all([
          getDocs(collection(db, 'timeSlots')),

          getDocs(
            query(
              collection(db, 'events'),
              where('state', 'in', [
                'PUBLISHED',
                'ACTIVE',
                'COMPLETED',
              ])
            )
          ),

          getDocs(collection(db, 'venues')),

          getDocs(collection(db, 'arenas')),
        ]);

      const slotData = slotSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<TimeSlot, 'id'>),
      }));

      setError('');

      slotData.sort(
        (a, b) =>
          (asDate(a.startAt)?.getTime() ?? 0) -
          (asDate(b.startAt)?.getTime() ?? 0)
      );

      setSlots(slotData);

      setEvents(
        eventSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Event, 'id'>),
        }))
      );

      setVenues(
        venueSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Venue, 'id'>),
        }))
      );

      setArenas(
        arenaSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Arena, 'id'>),
        }))
      );

    } catch (loadError) {
      console.error(loadError);

      setError(
        'Published schedule information could not be loaded. Check connectivity and Firestore permissions, then retry.'
      );

    } finally {
      setLoading(false);
    }

  }, []);


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);


  /* =========================================
     DERIVED DATA
  ========================================= */

  const eventById = useMemo(
    () => new Map(events.map(event => [event.id, event])),
    [events]
  );

  const arenaById = useMemo(
    () => new Map(arenas.map(arena => [arena.id, arena])),
    [arenas]
  );

  const venueById = useMemo(
    () => new Map(venues.map(venue => [venue.id, venue])),
    [venues]
  );


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="schedule-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div className="schedule-ambient" aria-hidden="true">

        {/* GRID */}

        <div className="schedule-grid" />


        {/* GLOWING ORBS */}

        <div className="schedule-orb schedule-orb-one" />

        <div className="schedule-orb schedule-orb-two" />


        {/* FLOATING BUBBLES */}

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

      </div>


      {/* =====================================
          PAGE CONTENT
      ===================================== */}

      <div className="schedule-content relative z-10 w-full space-y-6 animate-fade-in-up">


        {/* PAGE HEADER */}

        <PageHeader
          title="Schedule & Venue"
          subtitle="Published event schedule and venue information"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />


        {/* INFORMATION MESSAGE */}

        <div className="schedule-info-panel p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">

          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />

          <p className="text-sm text-blue-300">
            Only schedule records published for authenticated users are shown. Team-specific slot assignments are not inferred when a school-to-entry mapping is unavailable.
          </p>

        </div>


        {/* ERROR */}

        {error ? (

          <div role="alert">

            <Card className="schedule-glass-card text-sm text-red-300">
              {error}
            </Card>

          </div>

        ) : loading ? (

          /* LOADING */

          <Card className="schedule-glass-card text-center text-gray-400">
            Loading published schedule…
          </Card>

        ) : slots.length === 0 ? (

          /* EMPTY STATE */

          <Card className="schedule-glass-card text-center py-14">

            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />

            <p className="font-medium text-gray-300">
              No published schedule yet
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Schedule details will appear once the event organizer publishes them.
            </p>

          </Card>

        ) : (

          /* SCHEDULE LIST */

          <Card
            padding="none"
            className="schedule-glass-card schedule-list-card"
          >

            <div className="divide-y divide-white/5">

              {slots.map(slot => {

                const event = slot.eventId
                  ? eventById.get(slot.eventId)
                  : undefined;

                const arena = slot.arenaId
                  ? arenaById.get(slot.arenaId)
                  : undefined;

                const venue = event?.venueId
                  ? venueById.get(event.venueId)
                  : undefined;

                const category = slot.categoryCode || slot.category;

                const endAt = asDate(slot.endAt);


                return (

                  <div
                    key={slot.id}
                    className="schedule-slot-row flex items-start gap-4 px-5 sm:px-6 py-4"
                  >

                    {/* TIME */}

                    <div className="w-24 flex-shrink-0">

                      <div className="text-sm font-mono font-medium text-indigo-300">
                        {formatTime(slot)}
                      </div>

                      {endAt && (

                        <div className="text-xs text-gray-600">
                          {endAt.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                      )}

                    </div>


                    {/* EVENT DETAILS */}

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="text-sm font-medium text-white">
                          {slot.title ||
                            slot.round ||
                            event?.name ||
                            event?.title ||
                            'Scheduled slot'}
                        </span>

                        {category && (
                          <CategoryBadge code={category} />
                        )}

                        {event?.stageType && (
                          <Badge variant="outline" size="sm">
                            {event.stageType.replaceAll('_', ' ')}
                          </Badge>
                        )}

                      </div>


                      {/* EVENT, ARENA AND VENUE */}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">

                        {event && (
                          <span>
                            {event.name || event.title || event.id}
                          </span>
                        )}

                        {(arena?.name ||
                          arena?.identifier ||
                          slot.arena) && (

                          <span className="flex items-center gap-1">

                            <MapPin className="w-3 h-3" />

                            {arena?.name ||
                              arena?.identifier ||
                              slot.arena}

                          </span>

                        )}

                        {venue && (
                          <span>
                            {venue.name}
                            {venue.address
                              ? ` · ${venue.address}`
                              : ''}
                          </span>
                        )}

                        {!endAt && slot.duration && (

                          <span className="flex items-center gap-1">

                            <Clock className="w-3 h-3" />

                            {slot.duration} min

                          </span>

                        )}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </Card>

        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .schedule-page {
          position: relative;
          isolation: isolate;

          width: 100%;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .schedule-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .schedule-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .schedule-grid {
          position: absolute;
          inset: 0;

          opacity: 0.08;

          background-image:
            linear-gradient(
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            );

          background-size: 58px 58px;

          mask-image:
            radial-gradient(
              ellipse 80% 65% at 50% 22%,
              #000,
              transparent
            );
        }


        /* GLOWING ORBS */

        .schedule-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .schedule-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .schedule-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .schedule-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .schedule-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: schedule-float linear infinite;
        }

        .schedule-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .schedule-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes schedule-float {

          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }

          12% {
            opacity: 0.5;
          }

          88% {
            opacity: 0.3;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }

        }


        /* PAGE CONTENT */

        .schedule-content {
          position: relative;
          z-index: 10;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* GLASS CARDS */

        .schedule-page .schedule-glass-card {
          width: 100%;

          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18) !important;

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .schedule-page .schedule-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* SCHEDULE LIST */

        .schedule-list-card {
          overflow: hidden;
        }

        .schedule-slot-row {
          position: relative;

          background: transparent;

          transition: background 0.2s ease;
        }

        .schedule-slot-row:hover {
          background: rgba(168, 85, 247, 0.045);
        }


        /* INFORMATION PANEL */

        .schedule-info-panel {
          position: relative;
          z-index: 10;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {

          .schedule-content {
            padding: 18px 14px 28px;
          }

        }

        @media (max-width: 480px) {

          .schedule-content {
            padding: 16px 10px 24px;
          }

        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {

          .schedule-bubble {
            animation: none;
          }

          .schedule-glass-card,
          .schedule-slot-row {
            transition: none;
          }

        }

      `}</style>

    </main>
  );
}
