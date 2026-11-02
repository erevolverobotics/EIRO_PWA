// 'use client';

// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { PageHeader, Card, CategoryBadge, KpiCard, StatusBadge } from '@/components/ui';
// import { ClipboardCheck, Star, Swords, Timer } from 'lucide-react';
// import type { CategoryCode } from '@/lib/types';
// import { useAuth } from '@/lib/firebase/auth-context';
// import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

// type Assignment = { id: string; uid: string; categoryCode?: CategoryCode; type?: string; status?: string; matchId?: string; entryId?: string; eventId?: string; teamName?: string; teamAName?: string; teamBName?: string; scheduledAt?: { toDate?: () => Date } | string; arena?: string; round?: string };
// export default function JudgeDashboard() {
//   const { user, loading: authLoading } = useAuth();
//   const [assignments, setAssignments] = useState<Assignment[]>([]);
//   const [fetching, setFetching] = useState(true);
//   const [error, setError] = useState('');
//   useEffect(() => {
//     if (!user) return;
//     getDocs(query(collection(db, 'judgeAssignments'), where('uid', '==', user.uid)))
//       .then(snapshot => setAssignments(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Assignment))))
//       .catch(() => setError('Judge assignments could not be loaded.'))
//       .finally(() => setFetching(false));
//   }, [user]);
//   const loading = authLoading || (Boolean(user) && fetching);
//   const typeOf = (assignment: Assignment) => assignment.type?.toUpperCase() ?? 'ASSIGNMENT';
//   const routeFor = (assignment: Assignment) => typeOf(assignment).includes('MATCH') ? '/judge/matches' : typeOf(assignment).includes('TIMED') || typeOf(assignment).includes('RUN') ? '/judge/timed-runs' : '/judge/rubric';
//   return <div className="space-y-6 animate-fade-in-up">
//     <PageHeader title="My Assignments" subtitle="Assignments loaded for the signed-in judge account" />
//     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Assigned" value={assignments.length} icon={ClipboardCheck} color="indigo" /><KpiCard title="Matches" value={assignments.filter(item => typeOf(item).includes('MATCH')).length} icon={Swords} color="red" /><KpiCard title="Timed Runs" value={assignments.filter(item => typeOf(item).includes('TIMED') || typeOf(item).includes('RUN')).length} icon={Timer} color="blue" /><KpiCard title="Scorecards" value={assignments.filter(item => typeOf(item).includes('RUBRIC')).length} icon={Star} color="purple" /></div>
//     {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading assignments…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : assignments.length === 0 ? <Card className="text-center py-16 text-gray-400">No judge assignments are available for this account.</Card> :
//       <Card padding="none"><div className="divide-y divide-white/5">{assignments.map(assignment => <div key={assignment.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
//         <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{assignment.categoryCode && <CategoryBadge code={assignment.categoryCode} />}<span className="text-xs text-gray-500">{assignment.round ?? typeOf(assignment)}</span></div><p className="text-sm font-medium text-white">{assignment.teamAName && assignment.teamBName ? `${assignment.teamAName} vs ${assignment.teamBName}` : assignment.teamName ?? assignment.entryId ?? assignment.matchId ?? `Assignment ${assignment.id}`}</p><p className="text-xs text-gray-500">{assignment.arena ?? ''} {assignment.scheduledAt ? `· ${typeof assignment.scheduledAt === 'string' ? assignment.scheduledAt : assignment.scheduledAt.toDate?.()?.toLocaleString()}` : ''}</p></div>
//         <StatusBadge status={assignment.status ?? 'ASSIGNED'} /><Link href={`${routeFor(assignment)}?assignmentId=${encodeURIComponent(assignment.id)}`} className="text-sm text-indigo-400 hover:underline">Open</Link>
//       </div>)}</div></Card>}
//   </div>;
// }


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  PageHeader,
  Card,
  CategoryBadge,
  KpiCard,
  StatusBadge,
} from '@/components/ui';

import {
  ClipboardCheck,
  Star,
  Swords,
  Timer,
} from 'lucide-react';

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

type Assignment = {
  id: string;
  uid: string;
  categoryCode?: CategoryCode;
  type?: string;
  status?: string;
  matchId?: string;
  entryId?: string;
  eventId?: string;
  teamName?: string;
  teamAName?: string;
  teamBName?: string;
  scheduledAt?: { toDate?: () => Date } | string;
  arena?: string;
  round?: string;
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
   JUDGE DASHBOARD
========================================= */

export default function JudgeDashboard() {

  const { user, loading: authLoading } = useAuth();

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [fetching, setFetching] =
    useState(true);

  const [error, setError] =
    useState('');


  /* =========================================
     LOAD JUDGE ASSIGNMENTS
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
        collection(db, 'judgeAssignments'),
        where('uid', '==', user.uid)
      )
    )

      .then(snapshot => {

        setAssignments(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data(),
          } as Assignment))
        );

        setError('');

      })

      .catch(loadError => {

        console.error(loadError);

        setError(
          'Judge assignments could not be loaded.'
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
     ASSIGNMENT TYPE
  ========================================= */

  const typeOf = (assignment: Assignment) =>
    assignment.type?.toUpperCase() ?? 'ASSIGNMENT';


  /* =========================================
     ROUTING
  ========================================= */

  const routeFor = (assignment: Assignment) => {

    const type = typeOf(assignment);

    if (type.includes('MATCH')) {
      return '/judge/matches';
    }

    if (
      type.includes('TIMED') ||
      type.includes('RUN')
    ) {
      return '/judge/timed-runs';
    }

    return '/judge/rubric';

  };


  /* =========================================
     KPI CALCULATIONS
  ========================================= */

  const totalAssignments =
    assignments.length;

  const totalMatches =
    assignments.filter(item =>
      typeOf(item).includes('MATCH')
    ).length;

  const totalTimedRuns =
    assignments.filter(item =>
      typeOf(item).includes('TIMED') ||
      typeOf(item).includes('RUN')
    ).length;

  const totalScorecards =
    assignments.filter(item =>
      typeOf(item).includes('RUBRIC')
    ).length;


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="judge-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="judge-ambient"
        aria-hidden="true"
      >

        {/* BACKGROUND GRID */}

        <div className="judge-grid" />


        {/* GLOWING ORBS */}

        <div className="judge-orb judge-orb-one" />

        <div className="judge-orb judge-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="judge-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`judge-bubble ${bubble.tone}`}
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

      <div className="judge-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader
          title="My Assignments"
          subtitle="Assignments loaded for the signed-in judge account"
        />


        {/* =====================================
            KPI CARDS
        ===================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <KpiCard
            title="Assigned"
            value={totalAssignments}
            icon={ClipboardCheck}
            color="indigo"
          />

          <KpiCard
            title="Matches"
            value={totalMatches}
            icon={Swords}
            color="red"
          />

          <KpiCard
            title="Timed Runs"
            value={totalTimedRuns}
            icon={Timer}
            color="blue"
          />

          <KpiCard
            title="Scorecards"
            value={totalScorecards}
            icon={Star}
            color="purple"
          />

        </div>


        {/* =====================================
            LOADING STATE
        ===================================== */}

        {loading ? (

          <Card className="judge-glass-card text-center py-12 text-gray-400">

            Loading assignments…

          </Card>

        ) : error ? (

          /* =====================================
             ERROR STATE
          ===================================== */

          <div role="alert">

            <Card className="judge-glass-card text-red-400">

              {error}

            </Card>

          </div>

        ) : assignments.length === 0 ? (

          /* =====================================
             EMPTY STATE
          ===================================== */

          <Card className="judge-glass-card text-center py-16 text-gray-400">

            No judge assignments are available for this account.

          </Card>

        ) : (

          /* =====================================
             ASSIGNMENT LIST
          ===================================== */

          <Card
            padding="none"
            className="judge-glass-card judge-assignment-card"
          >

            <div className="divide-y divide-white/10">

              {assignments.map(assignment => (

                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 judge-assignment-row"
                >

                  {/* ASSIGNMENT INFORMATION */}

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2 mb-1 flex-wrap">

                      {assignment.categoryCode && (

                        <CategoryBadge
                          code={assignment.categoryCode}
                        />

                      )}

                      <span className="text-xs text-gray-400">

                        {assignment.round ?? typeOf(assignment)}

                      </span>

                    </div>


                    {/* TEAM / MATCH NAME */}

                    <p className="text-sm font-medium text-white">

                      {assignment.teamAName && assignment.teamBName

                        ? `${assignment.teamAName} vs ${assignment.teamBName}`

                        : assignment.teamName ??
                          assignment.entryId ??
                          assignment.matchId ??
                          `Assignment ${assignment.id}`

                      }

                    </p>


                    {/* ARENA AND SCHEDULE */}

                    <p className="text-xs text-gray-400 mt-1">

                      {assignment.arena ?? ''}

                      {assignment.scheduledAt

                        ? ` · ${
                            typeof assignment.scheduledAt === 'string'
                              ? assignment.scheduledAt
                              : assignment.scheduledAt.toDate?.()?.toLocaleString() ?? ''
                          }`

                        : ''

                      }

                    </p>

                  </div>


                  {/* STATUS */}

                  <StatusBadge
                    status={assignment.status ?? 'ASSIGNED'}
                  />


                  {/* OPEN BUTTON */}

                  <Link
                    href={`${routeFor(assignment)}?assignmentId=${encodeURIComponent(assignment.id)}`}
                    className="judge-open-link text-sm"
                  >

                    Open

                  </Link>

                </div>

              ))}

            </div>

          </Card>

        )}

      </div>


      {/* =====================================
          ANIMATED BACKGROUND STYLES
      ===================================== */}

      <style jsx global>{`

        /* =====================================
           MAIN PAGE
        ===================================== */

        .judge-page {

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


        .judge-page * {
          box-sizing: border-box;
        }


        /* =====================================
           FULL SCREEN ANIMATED BACKGROUND
        ===================================== */

        .judge-ambient {

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

        .judge-grid {

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

        .judge-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .judge-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .judge-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* =====================================
           BUBBLE CONTAINER
        ===================================== */

        .judge-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        /* =====================================
           FLOATING BUBBLES
        ===================================== */

        .judge-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: judge-float linear infinite;

        }


        .judge-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .judge-bubble.rose {

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

        @keyframes judge-float {

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
           PAGE CONTENT
        ===================================== */

        .judge-content {

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
           TRANSPARENT GLASS CARDS
        ===================================== */

        .judge-page .judge-glass-card {

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


        .judge-page .judge-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* =====================================
           ASSIGNMENT CARD
        ===================================== */

        .judge-assignment-card {

          width: 100%;

          overflow: hidden;

        }


        /* =====================================
           ASSIGNMENT ROW
        ===================================== */

        .judge-assignment-row {

          transition: background 0.2s ease;

        }


        .judge-assignment-row:hover {

          background: rgba(168, 85, 247, 0.07);

        }


        /* =====================================
           OPEN LINK
        ===================================== */

        .judge-open-link {

          color: #a78bfa;

          font-weight: 500;

          transition:
            color 0.2s ease,
            opacity 0.2s ease;

        }


        .judge-open-link:hover {

          color: #c4b5fd;

          text-decoration: underline;

        }


        /* =====================================
           RESPONSIVE
        ===================================== */

        @media (max-width: 768px) {

          .judge-content {

            padding: 18px 14px 28px;

          }

        }


        @media (max-width: 480px) {

          .judge-content {

            padding: 16px 10px 24px;

          }

          .judge-assignment-row {

            padding-left: 14px;
            padding-right: 14px;

          }

        }


        /* =====================================
           REDUCED MOTION
        ===================================== */

        @media (prefers-reduced-motion: reduce) {

          .judge-bubble {

            animation: none;

          }

          .judge-glass-card,
          .judge-assignment-row {

            transition: none;

          }

        }

      `}</style>

    </main>

  );

}
