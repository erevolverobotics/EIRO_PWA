'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Trophy } from 'lucide-react';
import { Badge, CategoryBadge } from '@/components/ui';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type ResultRecord = {
  id: string;
  eventId?: string;
  eventName?: string;
  categoryCode?: CategoryCode;
  teamName?: string;
  schoolName?: string;
  rank?: number;
  score?: string | number;
  status?: string;
  publishedAt?: { toDate?: () => Date } | string;
  rankings?: Array<{
    teamName?: string;
    schoolName?: string;
    rank?: number;
    score?: string | number;
  }>;
};

const RESULTS_AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

function publishedDate(value?: ResultRecord['publishedAt']) {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value.toDate?.();

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString()
    : '';
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'results'), where('publishedAt', '!=', null)))
      .then(snapshot =>
        setResults(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data(),
          } as ResultRecord))
        )
      )
      .catch(() =>
        setError('Published results could not be loaded. Please try again later.')
      )
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(results.map(result => result.categoryCode).filter(Boolean))
      ) as CategoryCode[],
    [results]
  );

  const visible = results.filter(result =>
    (selectedCategory === 'ALL' || result.categoryCode === selectedCategory) &&
    `${result.teamName ?? ''} ${result.schoolName ?? ''} ${result.eventName ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="results-page relative isolate min-h-screen w-full">

      {/* Animated background */}
      <div className="results-background" aria-hidden="true">
        <div className="results-orb results-orb-one" />
        <div className="results-orb results-orb-two" />
        <div className="results-orb results-orb-three" />

        {RESULTS_AMBIENT_BUBBLES.map((bubble, index) => (
          <span
            key={index}
            className={`results-bubble results-bubble-${bubble.tone}`}
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
      <nav className="results-nav sticky top-0 z-30">
        <div className="results-nav-inner">

          <Link href="/" className="results-brand" aria-label="EIRO Home">
            <Image
              src="/IMAGES/image-removebg-preview%20(8).png"
              alt="EIRO Logo"
              width={180}
              height={70}
              priority
              className="results-logo"
            />
          </Link>

          <div className="results-nav-links">
            <Link href="/events" className="results-nav-link">
              Events
            </Link>

            <Link href="/verify" className="results-nav-link">
              Verify
            </Link>

            <Link href="/login" className="results-signin">
              Sign In
            </Link>
          </div>

        </div>
      </nav>

      {/* Main content */}
      <main className="results-content">

        {/* Page heading */}
        <section className="results-heading">

          <div className="results-heading-top">
            <Badge variant="success">
              Published records only
            </Badge>
          </div>

          <div className="results-title-row">
            <div className="results-title-icon">
              <Trophy />
            </div>

            <div>
              <h1 className="results-title">
                Results
              </h1>

              <p className="results-description">
                Official results made public by the organizing committee.
              </p>
            </div>
          </div>

        </section>

        {/* Search and filters */}
        <section className="results-controls">

          <div className="results-search">
            <Search className="results-search-icon" />

            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search teams, schools or events..."
              className="results-search-input"
              aria-label="Search teams, schools or events"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="results-clear"
              >
                Clear
              </button>
            )}
          </div>

          <div className="results-filter-area">
            <span className="results-filter-label">
              Filter by category
            </span>

            <div className="results-filters">
              {(['ALL', ...categories] as const).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`results-filter-button ${
                    selectedCategory === category
                      ? 'results-filter-active'
                      : ''
                  }`}
                >
                  {category === 'ALL' ? 'All' : category}
                </button>
              ))}
            </div>
          </div>

        </section>

        {/* Results count */}
        {!loading && !error && (
          <div className="results-list-heading">
            <h2>Published Results</h2>
            <span>
              {visible.length} {visible.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        )}

        {/* Results list */}
        <section className="results-list-section">

          {loading ? (
            <div className="results-state">
              <div className="results-loader" />
              <p role="status">Loading published results...</p>
            </div>
          ) : error ? (
            <div className="results-state">
              <p className="text-red-400" role="alert">{error}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="results-state">
              <div className="results-empty-icon">
                <Trophy />
              </div>
              <h3>No published results found</h3>
              <p>
                No published results match your current search or category.
              </p>
            </div>
          ) : (
            <div className="results-list">

              {visible.map(result => {
                const rows =
                  result.rankings ??
                  (result.teamName
                    ? [{
                        teamName: result.teamName,
                        schoolName: result.schoolName,
                        rank: result.rank,
                        score: result.score,
                      }]
                    : []);

                return (
                  <article
                    key={result.id}
                    className="results-card"
                  >

                    {/* Result card header */}
                    <div className="results-card-header">

                      <div className="results-card-heading">
                        {result.categoryCode && (
                          <CategoryBadge code={result.categoryCode} />
                        )}

                        <h2>
                          {CATEGORY_LABELS[result.categoryCode as CategoryCode] ??
                            result.eventName ??
                            'Published result'}
                        </h2>
                      </div>

                      {publishedDate(result.publishedAt) && (
                        <span className="results-published-date">
                          Published {publishedDate(result.publishedAt)}
                        </span>
                      )}

                    </div>

                    {/* Ranking rows */}
                    {rows.length ? (
                      <div className="results-ranking-list">

                        {rows
                          .filter(row =>
                            `${row.teamName ?? ''} ${row.schoolName ?? ''}`
                              .toLowerCase()
                              .includes(search.toLowerCase())
                          )
                          .map((row, index) => (
                            <div
                              key={`${result.id}-${row.rank ?? index}`}
                              className="results-ranking-row"
                            >

                              <div className="results-rank">
                                {row.rank ? `#${row.rank}` : '—'}
                              </div>

                              <div className="results-team-info">
                                <p className="results-team-name">
                                  {row.teamName ?? 'Team'}
                                </p>

                                {row.schoolName && (
                                  <p className="results-school-name">
                                    {row.schoolName}
                                  </p>
                                )}
                              </div>

                              {row.score !== undefined && (
                                <div className="results-score">
                                  <span className="results-score-label">
                                    Score
                                  </span>
                                  <span className="results-score-value">
                                    {row.score}
                                  </span>
                                </div>
                              )}

                            </div>
                          ))}

                      </div>
                    ) : (
                      <p className="results-no-rankings">
                        This published result record does not expose team ranking details.
                      </p>
                    )}

                  </article>
                );
              })}

            </div>
          )}

        </section>

        {/* Footer */}
        <footer className="results-footer">
          Certificate verification is available on the{' '}
          <Link href="/verify">
            Verify
          </Link>{' '}
          page.
        </footer>

      </main>

      {/* Styles */}
      <style jsx global>{`

        /* Page */

        .results-page {
          width: 100%;
          min-height: 100vh;
          isolation: isolate;
          background: transparent;
        }

        /* Animated background */

        .results-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .results-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .results-orb-one {
          top: -220px;
          left: -180px;
          background: #7c3aed;
        }

        .results-orb-two {
          top: 25%;
          right: -260px;
          background: #b24bb2;
        }

        .results-orb-three {
          bottom: -300px;
          left: 35%;
          background: #7c3aed;
          opacity: 0.08;
        }

        .results-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation-name: results-float-up;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .results-bubble-violet {
          background: radial-gradient(
            circle at 35% 35%,
            rgba(168, 85, 247, 0.2),
            rgba(168, 85, 247, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(168, 85, 247, 0.12);
        }

        .results-bubble-rose {
          background: radial-gradient(
            circle at 35% 35%,
            rgba(221, 143, 224, 0.16),
            rgba(221, 143, 224, 0.03) 65%,
            transparent 100%
          );
          border: 1px solid rgba(221, 143, 224, 0.12);
        }

        @keyframes results-float-up {
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

        .results-nav {
          width: 100%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(17, 24, 39, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .results-nav-inner {
          width: 100%;
          min-height: 76px;
          padding: 12px 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .results-brand {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          text-decoration: none;
        }

        .results-logo {
          display: block;
          width: 180px;
          height: 54px;
          object-fit: contain;
          object-position: left center;
        }

        .results-nav-links {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .results-nav-link {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .results-nav-link:hover {
          color: white;
        }

        .results-signin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 20px;
          border-radius: 10px;
          background: #4f46e5;
          color: white;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s ease;
        }

        .results-signin:hover {
          background: #6366f1;
        }

        /* Main layout */

        .results-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 52px 32px 45px;
        }

        /* Heading */

        .results-heading {
          margin-bottom: 38px;
        }

        .results-heading-top {
          margin-bottom: 18px;
        }

        .results-title-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .results-title-icon {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(250, 204, 21, 0.2);
          border-radius: 16px;
          background: rgba(250, 204, 21, 0.08);
        }

        .results-title-icon svg {
          width: 28px;
          height: 28px;
          color: #facc15;
        }

        .results-title {
          margin: 0;
          color: white;
          font-size: clamp(30px, 4vw, 40px);
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .results-description {
          margin-top: 7px;
          color: #9ca3af;
          font-size: 14px;
          line-height: 1.6;
        }

        /* Search and filters */

        .results-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
          padding: 22px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 17px;
          background: rgba(17, 24, 39, 0.25);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .results-search {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 50px;
          padding: 0 14px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.035);
          transition: border-color 0.2s ease;
        }

        .results-search:focus-within {
          border-color: rgba(167, 139, 250, 0.6);
        }

        .results-search-icon {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
          color: #818cf8;
        }

        .results-search-input {
          width: 100%;
          height: 48px;
          min-width: 0;
          padding: 0 12px;
          outline: none;
          border: none;
          background: transparent;
          color: white;
          font-size: 13px;
        }

        .results-search-input::placeholder {
          color: #71717a;
        }

        .results-clear {
          flex-shrink: 0;
          padding: 6px 9px;
          color: #a78bfa;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .results-filter-area {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .results-filter-label {
          color: #9ca3af;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .results-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .results-filter-button {
          min-height: 35px;
          padding: 0 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .results-filter-button:hover {
          border-color: rgba(167, 139, 250, 0.45);
          color: white;
        }

        .results-filter-active {
          border-color: #4f46e5;
          background: #4f46e5;
          color: white;
        }

        .results-filter-active:hover {
          border-color: #6366f1;
          background: #6366f1;
        }

        /* List heading */

        .results-list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .results-list-heading h2 {
          color: white;
          font-size: 16px;
          font-weight: 700;
        }

        .results-list-heading span {
          color: #9ca3af;
          font-size: 12px;
        }

        /* Results cards */

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .results-card {
          width: 100%;
          min-width: 0;
          padding: 22px;
          border: 1px solid rgba(148, 163, 184, 0.17);
          border-radius: 16px;
          background: rgba(17, 24, 39, 0.3);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .results-card:hover {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(30, 41, 59, 0.36);
        }

        .results-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px 20px;
          margin-bottom: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .results-card-heading {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          min-width: 0;
        }

        .results-card-heading h2 {
          color: white;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .results-published-date {
          flex-shrink: 0;
          color: #71717a;
          font-size: 11px;
        }

        /* Ranking rows */

        .results-ranking-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .results-ranking-row {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          min-height: 70px;
          padding: 13px 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .results-ranking-row:hover {
          border-color: rgba(167, 139, 250, 0.25);
          background: rgba(139, 92, 246, 0.06);
        }

        .results-rank {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          min-width: 48px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: #d1d5db;
          font-size: 14px;
          font-weight: 800;
        }

        .results-team-info {
          flex: 1;
          min-width: 0;
        }

        .results-team-name {
          color: white;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .results-school-name {
          margin-top: 4px;
          color: #858594;
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .results-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          min-width: 65px;
          padding-left: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        .results-score-label {
          color: #71717a;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .results-score-value {
          color: white;
          font-family: monospace;
          font-size: 15px;
          font-weight: 800;
        }

        .results-no-rankings {
          padding: 12px 0;
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.6;
        }

        /* Loading and empty states */

        .results-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 13px;
          min-height: 240px;
          padding: 30px 20px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 16px;
          background: rgba(17, 24, 39, 0.3);
          text-align: center;
        }

        .results-state p {
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.6;
        }

        .results-state h3 {
          color: white;
          font-size: 16px;
          font-weight: 700;
        }

        .results-loader {
          width: 29px;
          height: 29px;
          border: 3px solid rgba(167, 139, 250, 0.2);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: results-spin 0.8s linear infinite;
        }

        @keyframes results-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .results-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border: 1px solid rgba(167, 139, 250, 0.2);
          border-radius: 14px;
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }

        .results-empty-icon svg {
          width: 23px;
          height: 23px;
        }

        /* Footer */

        .results-footer {
          margin-top: 42px;
          padding-top: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: #71717a;
          font-size: 11px;
          line-height: 1.7;
          text-align: center;
        }

        .results-footer a {
          color: #a78bfa;
          text-decoration: none;
        }

        .results-footer a:hover {
          text-decoration: underline;
        }

        /* Responsive */

        @media (max-width: 640px) {
          .results-nav-inner {
            min-height: 68px;
            padding: 10px 5%;
          }

          .results-logo {
            width: 145px;
            height: 46px;
          }

          .results-nav-links {
            gap: 14px;
          }

          .results-nav-link {
            font-size: 12px;
          }

          .results-signin {
            min-height: 36px;
            padding: 0 12px;
            font-size: 11px;
          }

          .results-content {
            padding: 35px 5% 35px;
          }

          .results-heading {
            margin-bottom: 27px;
          }

          .results-title-row {
            gap: 13px;
          }

          .results-title-icon {
            width: 47px;
            height: 47px;
            border-radius: 13px;
          }

          .results-title-icon svg {
            width: 23px;
            height: 23px;
          }

          .results-title {
            font-size: 30px;
          }

          .results-description {
            font-size: 12px;
          }

          .results-controls {
            padding: 15px;
            gap: 17px;
            margin-bottom: 25px;
          }

          .results-filters {
            gap: 7px;
          }

          .results-filter-button {
            min-height: 33px;
            padding: 0 11px;
            font-size: 11px;
          }

          .results-card {
            padding: 16px;
          }

          .results-card-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
          }

          .results-card-heading {
            gap: 9px;
          }

          .results-card-heading h2 {
            font-size: 14px;
          }

          .results-ranking-row {
            gap: 11px;
            padding: 11px;
          }

          .results-rank {
            width: 40px;
            min-width: 40px;
            height: 38px;
            font-size: 12px;
          }

          .results-team-name {
            font-size: 12px;
          }

          .results-school-name {
            font-size: 10px;
          }

          .results-score {
            min-width: 52px;
            padding-left: 9px;
          }

          .results-score-value {
            font-size: 13px;
          }

          .results-footer {
            margin-top: 32px;
          }
        }

        @media (max-width: 380px) {
          .results-logo {
            width: 115px;
            height: 40px;
          }

          .results-nav-links {
            gap: 10px;
          }

          .results-nav-link {
            font-size: 11px;
          }

          .results-signin {
            padding: 0 9px;
          }

          .results-ranking-row {
            gap: 8px;
            padding: 9px;
          }
        }

        /* Reduced motion */

        @media (prefers-reduced-motion: reduce) {
          .results-bubble,
          .results-loader {
            animation: none !important;
            display: none;
          }

          .results-page *,
          .results-page *::before,
          .results-page *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }

      `}</style>
    </div>
  );
}