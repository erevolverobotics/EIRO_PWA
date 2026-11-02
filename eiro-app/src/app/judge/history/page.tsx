// 'use client';

// import { useEffect, useState } from 'react';
// import { PageHeader, Card, CategoryBadge, StatusBadge } from '@/components/ui';
// import { History } from 'lucide-react';
// import type { CategoryCode } from '@/lib/types';
// import { useAuth } from '@/lib/firebase/auth-context';
// import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

// type Scorecard = { id: string; judgeUid: string; categoryCode?: CategoryCode; type?: string; teamName?: string; teamId?: string; computedTotal?: number; status: string; submittedAt?: { toDate?: () => Date } | string };
// export default function JudgeHistoryPage() {
//   const { user, loading: authLoading } = useAuth();
//   const [history, setHistory] = useState<Scorecard[]>([]);
//   const [fetching, setFetching] = useState(true);
//   const [error, setError] = useState('');
//   useEffect(() => {
//     if (!user) return;
//     getDocs(query(collection(db, 'scorecards'), where('judgeUid', '==', user.uid)))
//       .then(snapshot => setHistory(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Scorecard))))
//       .catch(() => setError('Your scorecards could not be loaded.'))
//       .finally(() => setFetching(false));
//   }, [user]);
//   const loading = authLoading || (Boolean(user) && fetching);
//   return <div className="space-y-6 animate-fade-in-up"><PageHeader title="Scorecard History" subtitle="Persisted scorecards submitted by your account" />
//     {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading scorecards…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : history.length === 0 ? <Card className="text-center py-16"><History className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No scorecards submitted yet.</p></Card> :
//       <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>ID</th><th>Type</th><th>Team/Entry</th><th>Category</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{history.map(item => <tr key={item.id}><td className="font-mono text-xs text-gray-500">{item.id}</td><td>{item.type ?? 'Scorecard'}</td><td>{item.teamName ?? item.teamId ?? '—'}</td><td>{item.categoryCode && <CategoryBadge code={item.categoryCode} />}</td><td className="font-mono">{item.computedTotal ?? '—'}</td><td><StatusBadge status={item.status} /></td><td>{item.submittedAt ? (typeof item.submittedAt === 'string' ? new Date(item.submittedAt) : item.submittedAt.toDate?.())?.toLocaleString() : '—'}</td></tr>)}</tbody></table></div></Card>}
//   </div>;
// }



'use client';

import { useEffect, useState } from 'react';

import {
  PageHeader,
  Card,
  CategoryBadge,
  StatusBadge,
} from '@/components/ui';

import { History } from 'lucide-react';

import type { CategoryCode } from '@/lib/types';

import { useAuth } from '@/lib/firebase/auth-context';

import {
  collection,
  db,
  getDocs,
  query,
  where,
} from '@/lib/firebase/firestore';


/* =========================================
   TYPES
========================================= */

type Scorecard = {
  id: string;
  judgeUid: string;
  categoryCode?: CategoryCode;
  type?: string;
  teamName?: string;
  teamId?: string;
  computedTotal?: number;
  status: string;
  submittedAt?: { toDate?: () => Date } | string;
};


/* =========================================
   FLOATING BACKGROUND BUBBLES
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
   JUDGE HISTORY PAGE
========================================= */

export default function JudgeHistoryPage() {

  const { user, loading: authLoading } = useAuth();

  const [history, setHistory] = useState<Scorecard[]>([]);

  const [fetching, setFetching] = useState(true);

  const [error, setError] = useState('');


  /* =========================================
     LOAD SCORECARD HISTORY
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  useEffect(() => {

    if (!user) {
      setFetching(false);
      return;
    }

    setFetching(true);

    getDocs(
      query(
        collection(db, 'scorecards'),
        where('judgeUid', '==', user.uid)
      )
    )

      .then(snapshot => {

        setHistory(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data(),
          } as Scorecard))
        );

        setError('');

      })

      .catch(loadError => {

        console.error(loadError);

        setError(
          'Your scorecards could not be loaded.'
        );

      })

      .finally(() => {

        setFetching(false);

      });

  }, [user]);


  /* =========================================
     LOADING STATE
  ========================================= */

  const loading =
    authLoading ||
    (Boolean(user) && fetching);


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="history-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="history-ambient"
        aria-hidden="true"
      >

        {/* BACKGROUND GRID */}

        <div className="history-grid" />


        {/* GLOWING ORBS */}

        <div className="history-orb history-orb-one" />

        <div className="history-orb history-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="history-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`history-bubble ${bubble.tone}`}
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

      <div className="history-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader
          title="Scorecard History"
          subtitle="View scorecards submitted by your judge account"
        />


        {/* =====================================
            LOADING STATE
        ===================================== */}

        {loading ? (

          <Card className="history-glass-card text-center py-12 text-gray-400">

            Loading scorecards…

          </Card>

        ) : error ? (

          /* =====================================
             ERROR STATE
          ===================================== */

          <Card className="history-glass-card text-red-400">

            {error}

          </Card>

        ) : history.length === 0 ? (

          /* =====================================
             EMPTY STATE
          ===================================== */

          <Card className="history-glass-card text-center py-16">

            <div className="history-empty-icon">

              <History className="w-10 h-10 text-violet-300" />

            </div>

            <h3 className="text-white font-semibold mt-4">

              No Scorecards Yet

            </h3>

            <p className="text-gray-400 text-sm mt-2">

              Your submitted scorecards will appear here.

            </p>

          </Card>

        ) : (

          /* =====================================
             SCORECARD TABLE
          ===================================== */

          <Card
            padding="none"
            className="history-glass-card history-table-card"
          >

            {/* TABLE HEADER */}

            <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 history-table-heading">

              <div className="flex items-center gap-3">

                <div className="history-icon-box">

                  <History className="w-5 h-5 text-violet-300" />

                </div>

                <div>

                  <h2 className="font-semibold text-white">

                    Submitted Scorecards

                  </h2>

                  <p className="text-xs text-gray-400 mt-1">

                    Your recorded judging results

                  </p>

                </div>

              </div>


              <div className="history-count">

                {history.length} Records

              </div>

            </div>


            {/* RESPONSIVE TABLE */}

            <div className="overflow-x-auto history-table-wrapper">

              <table className="eiro-table history-table">

                <thead>

                  <tr>

                    <th>ID</th>

                    <th>Type</th>

                    <th>Team / Entry</th>

                    <th>Category</th>

                    <th>Score</th>

                    <th>Status</th>

                    <th>Submitted</th>

                  </tr>

                </thead>


                <tbody>

                  {history.map(item => (

                    <tr key={item.id}>

                      {/* ID */}

                      <td>

                        <span className="history-id">

                          {item.id}

                        </span>

                      </td>


                      {/* TYPE */}

                      <td>

                        <span className="history-type">

                          {item.type ?? 'Scorecard'}

                        </span>

                      </td>


                      {/* TEAM */}

                      <td>

                        <span className="history-team">

                          {item.teamName ?? item.teamId ?? '—'}

                        </span>

                      </td>


                      {/* CATEGORY */}

                      <td>

                        {item.categoryCode && (

                          <CategoryBadge
                            code={item.categoryCode}
                          />

                        )}

                      </td>


                      {/* SCORE */}

                      <td>

                        <span className="history-score">

                          {item.computedTotal ?? '—'}

                        </span>

                      </td>


                      {/* STATUS */}

                      <td>

                        <StatusBadge
                          status={item.status}
                        />

                      </td>


                      {/* SUBMITTED DATE */}

                      <td>

                        <span className="history-date">

                          {item.submittedAt

                            ? (

                                typeof item.submittedAt === 'string'

                                  ? new Date(item.submittedAt)

                                  : item.submittedAt.toDate?.()

                              )?.toLocaleString() ?? '—'

                            : '—'

                          }

                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>


            {/* TABLE FOOTER */}

            <div className="history-table-footer">

              <span>

                Scorecard records are loaded from your judge account.

              </span>

              <span>

                Total: {history.length}

              </span>

            </div>

          </Card>

        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* =====================================
           MAIN PAGE
        ===================================== */

        .history-page {

          position: relative;
          isolation: isolate;

          width: 100%;
          max-width: none;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

        }


        .history-page * {

          box-sizing: border-box;

        }


        /* =====================================
           FULL SCREEN ANIMATED BACKGROUND
        ===================================== */

        .history-ambient {

          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;

          pointer-events: none;

          background: transparent !important;

        }


        /* =====================================
           BACKGROUND GRID
        ===================================== */

        .history-grid {

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


        /* =====================================
           GLOWING ORBS
        ===================================== */

        .history-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .history-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .history-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* =====================================
           BUBBLE CONTAINER
        ===================================== */

        .history-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        /* =====================================
           FLOATING BUBBLES
        ===================================== */

        .history-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: history-float linear infinite;

        }


        .history-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .history-bubble.rose {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );

        }


        /* =====================================
           BUBBLE ANIMATION
        ===================================== */

        @keyframes history-float {

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


        /* =====================================
           FULL WIDTH PAGE CONTENT
        ===================================== */

        .history-content {

          position: relative;
          z-index: 10;

          display: block;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          margin: 0;

          background: transparent !important;

          box-shadow: none !important;

        }


        /* =====================================
           GLASS CARDS
        ===================================== */

        .history-page .history-glass-card {

          display: block;

          width: 100%;
          max-width: none;

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


        .history-page .history-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* =====================================
           EMPTY STATE ICON
        ===================================== */

        .history-empty-icon {

          width: 72px;
          height: 72px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin: 0 auto;

          border-radius: 20px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.22);

        }


        /* =====================================
           TABLE HEADER SECTION
        ===================================== */

        .history-table-heading {

          border-bottom: 1px solid rgba(148, 163, 184, 0.12);

        }


        .history-icon-box {

          width: 42px;
          height: 42px;

          display: flex;

          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 12px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.20);

        }


        .history-count {

          padding: 7px 12px;

          border-radius: 8px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.20);

          color: #c4b5fd;

          font-size: 12px;

          font-weight: 600;

        }


        /* =====================================
           TABLE WRAPPER
        ===================================== */

        .history-table-wrapper {

          width: 100%;

          overflow-x: auto;

        }


        /* =====================================
           TABLE
        ===================================== */

        .history-table {

          width: 100%;

          min-width: 850px;

          border-collapse: collapse;

          background: transparent !important;

        }


        /* TABLE HEAD */

        .history-table thead {

          background: rgba(15, 23, 42, 0.38);

        }


        .history-table thead th {

          padding: 16px 18px;

          color: #a5b4fc;

          font-size: 11px;

          font-weight: 700;

          letter-spacing: 0.09em;

          text-transform: uppercase;

          text-align: left;

          white-space: nowrap;

          border-bottom: 1px solid rgba(148, 163, 184, 0.15);

        }


        /* TABLE BODY */

        .history-table tbody tr {

          background: transparent !important;

          border-bottom: 1px solid rgba(148, 163, 184, 0.09);

          transition: background 0.2s ease;

        }


        .history-table tbody tr:last-child {

          border-bottom: none;

        }


        .history-table tbody tr:hover {

          background: rgba(139, 92, 246, 0.07) !important;

        }


        .history-table tbody td {

          padding: 16px 18px;

          color: #d1d5db;

          font-size: 13px;

          vertical-align: middle;

          white-space: nowrap;

        }


        /* SCORECARD ID */

        .history-id {

          display: inline-block;

          max-width: 150px;

          overflow: hidden;

          text-overflow: ellipsis;

          color: #9ca3af;

          font-family: monospace;

          font-size: 11px;

        }


        /* TYPE */

        .history-type {

          color: #c4b5fd;

          font-weight: 500;

        }


        /* TEAM */

        .history-team {

          color: #f3f4f6;

          font-weight: 600;

        }


        /* SCORE */

        .history-score {

          display: inline-flex;

          align-items: center;
          justify-content: center;

          min-width: 42px;

          padding: 5px 9px;

          border-radius: 7px;

          background: rgba(139, 92, 246, 0.12);

          color: #c4b5fd;

          font-family: monospace;

          font-weight: 700;

        }


        /* SUBMITTED DATE */

        .history-date {

          color: #9ca3af;

          font-size: 12px;

        }


        /* =====================================
           TABLE FOOTER
        ===================================== */

        .history-table-footer {

          display: flex;

          align-items: center;
          justify-content: space-between;

          flex-wrap: wrap;

          gap: 10px;

          padding: 14px 18px;

          border-top: 1px solid rgba(148, 163, 184, 0.12);

          background: rgba(15, 23, 42, 0.18);

          color: #9ca3af;

          font-size: 11px;

        }


        /* =====================================
           RESPONSIVE
        ===================================== */

        @media (max-width: 768px) {

          .history-content {

            padding: 18px 14px 28px;

          }

          .history-table-heading {

            padding: 14px;

          }

        }


        @media (max-width: 480px) {

          .history-content {

            padding: 16px 10px 24px;

          }

          .history-table-footer {

            padding: 12px;

          }

        }


        /* =====================================
           REDUCED MOTION
        ===================================== */

        @media (prefers-reduced-motion: reduce) {

          .history-bubble {

            animation: none;

          }

          .history-glass-card,
          .history-table tbody tr {

            transition: none;

          }

        }

      `}</style>

    </main>

  );

}
