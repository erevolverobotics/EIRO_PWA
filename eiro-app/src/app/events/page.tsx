'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Search, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type EventRecord = {
  id: string;
  name?: string;
  title?: string;
  state?: string;
  stageType?: string;
  categoryCode?: CategoryCode;
  categoryCodes?: CategoryCode[];
  categories?: CategoryCode[];
  startAt?: { toDate?: () => Date } | string;
  endAt?: { toDate?: () => Date } | string;
  venueName?: string;
  venueId?: string;
  districtName?: string;
  districtId?: string;
};

const EVENTS_AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

function displayDate(value?: EventRecord['startAt']) {
  if (!value) return 'Date not announced';

  const date = typeof value === 'string' ? new Date(value) : value.toDate?.();

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { dateStyle: 'long' })
    : 'Date not announced';
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'events'),
        where('state', 'in', ['PUBLISHED', 'ACTIVE', 'COMPLETED'])
      )
    )
      .then(snapshot =>
        setEvents(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data(),
          } as EventRecord))
        )
      )
      .catch(() =>
        setError('Events could not be loaded. Please try again later.')
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      events.filter(event =>
        `${event.name ?? event.title ?? ''} ${event.districtName ?? ''} ${event.venueName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [events, search]
  );

  return (
    <div className="events-page relative isolate min-h-screen w-full">

      {/* Animated background */}
      <div className="events-background" aria-hidden="true">
        <div className="events-orb events-orb-one" />
        <div className="events-orb events-orb-two" />
        <div className="events-orb events-orb-three" />

        {EVENTS_AMBIENT_BUBBLES.map((bubble, index) => (
          <span
            key={index}
            className={`events-bubble events-bubble-${bubble.tone}`}
            style={{
              left: bubble.left,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              animationDuration: `${bubble.duration}s`,
              animationDelay: `${bubble.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="events-nav relative z-10">
        <div className="events-nav-inner">

          {/* Logo */}
          <Link href="/" className="events-brand" aria-label="EIRO Home">
            <Image
              src="/IMAGES/image-removebg-preview%20(8).png"
              alt="EIRO Logo"
              width={180}
              height={70}
              priority
              className="events-logo"
            />
          </Link>

          {/* Navigation links */}
          <div className="events-nav-links">
            <Link href="/results" className="events-nav-link">
              Results
            </Link>

            <Link href="/verify" className="events-nav-link">
              Verify
            </Link>

            <Link href="/login" className="events-signin">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="events-content relative z-10">

        {/* Page heading */}
        <section className="events-heading">
          <div>
            <p className="events-eyebrow">EIRO COMPETITIONS</p>

            <h1 className="events-title">
              Events
            </h1>

            <p className="events-subtitle">
              Explore published EIRO competition events.
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="events-search-section">
          <div className="events-search-box">
            <Search className="events-search-icon" />

            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search events by name, district or venue..."
              className="events-search-input"
              aria-label="Search events"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="events-clear-search"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {!loading && !error && (
            <p className="events-result-count">
              {filtered.length} {filtered.length === 1 ? 'event' : 'events'} found
            </p>
          )}
        </section>

        {/* Event listing */}
        <section className="events-list-section">

          {loading ? (
            <div className="events-state-card" role="status">
              <div className="events-loader" />
              <p>Loading events...</p>
            </div>
          ) : error ? (
            <div className="events-state-card" role="alert">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="events-state-card">
              <div className="events-empty-icon">
                <Calendar className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-semibold text-white">
                No events found
              </h2>

              <p className="text-sm text-gray-400">
                {search
                  ? 'Try searching with a different event name, district or venue.'
                  : 'There are currently no published events available.'}
              </p>
            </div>
          ) : (
            <div className="events-list">
              {filtered.map(event => {
                const categories =
                  event.categories ??
                  event.categoryCodes ??
                  (event.categoryCode ? [event.categoryCode] : []);

                const label =
                  event.name ?? event.title ?? 'Competition event';

                return (
                  <article
                    key={event.id}
                    className="events-glass-card"
                  >
                    <div className="events-card-main">

                      {/* Event details */}
                      <div className="events-card-details">

                        <div className="events-badges">
                          <Badge
                            variant={event.state === 'ACTIVE' ? 'success' : 'info'}
                          >
                            {event.state ?? 'PUBLISHED'}
                          </Badge>

                          {event.stageType && (
                            <Badge variant="warning">
                              {event.stageType.replaceAll('_', ' ')}
                            </Badge>
                          )}
                        </div>

                        <h2 className="events-card-title">
                          {label}
                        </h2>

                        <div className="events-meta">

                          <span className="events-meta-item">
                            <Calendar />
                            <span>{displayDate(event.startAt)}</span>
                          </span>

                          {(event.venueName ||
                            event.venueId ||
                            event.districtName ||
                            event.districtId) && (
                            <span className="events-meta-item">
                              <MapPin />
                              <span>
                                {event.venueName ??
                                  event.venueId ??
                                  event.districtName ??
                                  event.districtId}
                              </span>
                            </span>
                          )}

                        </div>

                        {/* Categories */}
                        {categories.length > 0 && (
                          <div className="events-categories">
                            {categories.map(category => (
                              <span
                                key={category}
                                className="events-category-tag"
                              >
                                {CATEGORY_LABELS[category] ?? category}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Results action */}
                      <div className="events-card-action">
                        <Link
                          href={`/results?event=${event.id}`}
                          className="events-results-button"
                        >
                          <Trophy />
                          <span>View Results</span>
                        </Link>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Page styles */}
      <style jsx global>{`

        /* Main page */

        .events-page {
          width: 100%;
          min-height: 100vh;
          isolation: isolate;
          background: transparent;
          color: white;
        }

        /* Animated background */

        .events-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .events-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .events-orb-one {
          top: -220px;
          left: -180px;
          background: #7c3aed;
        }

        .events-orb-two {
          top: 25%;
          right: -260px;
          background: #b24bb2;
        }

        .events-orb-three {
          bottom: -300px;
          left: 35%;
          background: #7c3aed;
          opacity: 0.08;
        }

        .events-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation-name: events-float-up;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .events-bubble-violet {
          background: radial-gradient(
            circle at 35% 35%,
            rgba(168, 85, 247, 0.2),
            rgba(168, 85, 247, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(168, 85, 247, 0.12);
        }

        .events-bubble-rose {
          background: radial-gradient(
            circle at 35% 35%,
            rgba(221, 143, 224, 0.16),
            rgba(221, 143, 224, 0.03) 65%,
            transparent 100%
          );
          border: 1px solid rgba(221, 143, 224, 0.12);
        }

        @keyframes events-float-up {
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

        /* Navigation */

        .events-nav {
          position: relative;
          z-index: 10;
          width: 100%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(17, 24, 39, 0.24);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .events-nav-inner {
          width: 100%;
          min-height: 82px;
          padding: 10px 4%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .events-brand {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          text-decoration: none;
        }

        .events-logo {
          display: block;
          width: 150px;
          height: 62px;
          object-fit: contain;
          object-position: left center;
        }

        .events-nav-links {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 30px;
        }

        .events-nav-link {
          color: #a1a1aa;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .events-nav-link:hover {
          color: white;
        }

        .events-signin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 22px;
          border-radius: 11px;
          background: #4f46e5;
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .events-signin:hover {
          background: #6366f1;
          transform: translateY(-1px);
        }

        /* Main content */

        .events-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: none !important;
          margin: 0;
          padding: 54px 4% 80px;
        }

        .events-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .events-eyebrow {
          margin-bottom: 9px;
          color: #a78bfa;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .events-title {
          margin: 0;
          color: white;
          font-size: clamp(32px, 4vw, 44px);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -1.5px;
        }

        .events-subtitle {
          margin-top: 10px;
          color: #9ca3af;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Search */

        .events-search-section {
          width: 100%;
          margin-bottom: 28px;
        }

        .events-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 54px;
          padding: 0 17px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: rgba(17, 24, 39, 0.34);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .events-search-box:focus-within {
          border-color: rgba(167, 139, 250, 0.65);
          background: rgba(30, 41, 59, 0.45);
        }

        .events-search-icon {
          width: 19px;
          height: 19px;
          flex-shrink: 0;
          color: #818cf8;
        }

        .events-search-input {
          width: 100%;
          min-width: 0;
          height: 52px;
          padding: 0 14px;
          outline: none;
          border: none;
          background: transparent;
          color: white;
          font-size: 14px;
        }

        .events-search-input::placeholder {
          color: #71717a;
        }

        .events-clear-search {
          flex-shrink: 0;
          padding: 6px 10px;
          color: #a78bfa;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .events-clear-search:hover {
          color: white;
        }

        .events-result-count {
          margin-top: 12px;
          color: #71717a;
          font-size: 12px;
        }

        /* Event cards */

        .events-list-section {
          width: 100%;
        }

        .events-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          width: 100%;
        }

        .events-glass-card {
          min-width: 0;
          padding: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 17px;
          background: rgba(17, 24, 39, 0.30);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none;
          transition:
            background 0.25s ease,
            border-color 0.25s ease,
            transform 0.25s ease;
        }

        .events-glass-card:hover {
          background: rgba(30, 41, 59, 0.38);
          border-color: rgba(168, 85, 247, 0.45);
          transform: translateY(-2px);
        }

        .events-card-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 22px;
          min-width: 0;
        }

        .events-card-details {
          flex: 1;
          min-width: 0;
        }

        .events-badges {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          margin-bottom: 15px;
        }

        .events-card-title {
          margin: 0 0 15px;
          color: white;
          font-size: 19px;
          line-height: 1.4;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .events-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 22px;
          margin-bottom: 17px;
        }

        .events-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.5;
        }

        .events-meta-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: #a78bfa;
        }

        .events-meta-item span {
          overflow-wrap: anywhere;
        }

        .events-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .events-category-tag {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.05);
          color: #c4b5fd;
          font-size: 10px;
          font-weight: 500;
        }

        /* Results button */

        .events-card-action {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
        }

        .events-results-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-radius: 11px;
          background: rgba(99, 102, 241, 0.1);
          color: #ddd6fe;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .events-results-button svg {
          width: 16px;
          height: 16px;
          color: #a78bfa;
        }

        .events-results-button:hover {
          background: rgba(99, 102, 241, 0.24);
          border-color: rgba(167, 139, 250, 0.55);
          color: white;
        }

        /* Loading and empty states */

        .events-state-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 13px;
          width: 100%;
          min-height: 250px;
          padding: 35px 20px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 17px;
          background: rgba(17, 24, 39, 0.3);
          backdrop-filter: blur(8px);
          text-align: center;
        }

        .events-state-card p {
          color: #9ca3af;
          font-size: 14px;
        }

        .events-loader {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(167, 139, 250, 0.2);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: events-spin 0.8s linear infinite;
        }

        @keyframes events-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .events-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 55px;
          height: 55px;
          margin-bottom: 5px;
          border: 1px solid rgba(167, 139, 250, 0.2);
          border-radius: 16px;
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }

        /* Responsive layout */

        @media (max-width: 900px) {
          .events-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .events-nav-inner {
            min-height: 72px;
            padding: 9px 5%;
            gap: 12px;
          }

          .events-logo {
            width: 112px;
            height: 52px;
          }

          .events-nav-links {
            gap: 13px;
          }

          .events-nav-link {
            font-size: 12px;
          }

          .events-signin {
            min-height: 37px;
            padding: 0 12px;
            border-radius: 9px;
            font-size: 12px;
          }

          .events-content {
            padding: 38px 5% 60px;
          }

          .events-heading {
            margin-bottom: 25px;
          }

          .events-subtitle {
            font-size: 13px;
          }

          .events-search-box {
            min-height: 50px;
          }

          .events-search-input {
            height: 48px;
            font-size: 12px;
          }

          .events-glass-card {
            padding: 19px;
          }

          .events-card-main {
            flex-direction: column;
            gap: 20px;
          }

          .events-card-action {
            width: 100%;
          }

          .events-results-button {
            width: 100%;
            min-height: 43px;
          }

          .events-card-title {
            font-size: 17px;
          }
        }

        @media (max-width: 380px) {
          .events-logo {
            width: 92px;
          }

          .events-nav-links {
            gap: 9px;
          }

          .events-nav-link {
            font-size: 11px;
          }

          .events-signin {
            padding: 0 9px;
          }
        }

        /* Reduced motion accessibility */

        @media (prefers-reduced-motion: reduce) {
          .events-bubble {
            animation: none !important;
            display: none;
          }

          .events-loader {
            animation: none !important;
          }

          .events-page *,
          .events-page *::before,
          .events-page *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }

      `}</style>
    </div>
  );
}