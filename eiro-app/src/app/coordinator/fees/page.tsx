'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  Info,
  RefreshCw,
} from 'lucide-react';

import {
  PageHeader,
  Card,
  StatusBadge,
  CategoryBadge,
  Button,
} from '@/components/ui';

import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@/lib/firebase/firestore';

import { useAuth } from '@/lib/firebase/auth-context';

import type {
  CategoryCode,
  RegistrationState,
} from '@/lib/types';


/* =========================================
   TYPES
========================================= */

interface Registration {
  id: string;
  teamId: string;
  schoolId: string;
  categoryCode: CategoryCode;
  state: RegistrationState;
  feeStatus: string;
  feeAmountPerHeadMinorUnits?: number;
  feeTotalMinorUnits?: number;
  eligibilitySnapshot?: {
    memberCount?: number;
  };
}

interface Team {
  id: string;
  teamName?: string;
}

interface CategoryFee {
  feeAmount?: number;
  hasFee?: boolean;
}


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
   MONEY FORMATTER
========================================= */

const money = (minorUnits: number) =>
  `₹${(minorUnits / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;


/* =========================================
   FEES PAGE
========================================= */

export default function FeesPage() {
  const { roles } = useAuth();

  const schoolId = roles.find(
    role =>
      role.role === 'SCHOOL_COORDINATOR' &&
      role.active
  )?.scopeId;


  /* =========================================
     STATE
  ========================================= */

  const [registrations, setRegistrations] =
    useState<Registration[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [memberCounts, setMemberCounts] =
    useState<Map<string, number>>(new Map());

  const [categoryFees, setCategoryFees] =
    useState<Record<string, CategoryFee>>({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');


  /* =========================================
     LOAD FEE DATA
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [
        registrationSnap,
        teamSnap,
        studentSnap,
        categorySnap,
      ] = await Promise.all([
        getDocs(
          query(
            collection(db, 'registrations'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDocs(
          query(
            collection(db, 'teams'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDocs(
          query(
            collection(db, 'students'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDoc(
          doc(db, 'config', 'categories')
        ),
      ]);


      /* BUILD MEMBER COUNTS */

      const counts = new Map<string, number>();

      studentSnap.docs.forEach(snapshot => {
        const teamId = snapshot.data().teamId;

        if (typeof teamId === 'string') {
          counts.set(
            teamId,
            (counts.get(teamId) ?? 0) + 1
          );
        }
      });


      /* UPDATE REGISTRATIONS */

      setRegistrations(
        registrationSnap.docs.map(snapshot => ({
          id: snapshot.id,
          ...snapshot.data(),
        }) as Registration)
      );


      /* UPDATE TEAMS */

      setTeams(
        teamSnap.docs.map(snapshot => ({
          id: snapshot.id,
          ...snapshot.data(),
        }) as Team)
      );


      /* UPDATE MEMBER COUNTS */

      setMemberCounts(counts);


      /* UPDATE CATEGORY FEES */

      setCategoryFees(
        categorySnap.exists()
          ? categorySnap.data() as Record<string, CategoryFee>
          : {}
      );

      setError('');

    } catch (loadError) {
      console.error(loadError);

      setError(
        'Registration fee information could not be loaded. Check your school assignment and Firestore permissions, then retry.'
      );

    } finally {
      setLoading(false);
    }

  }, [schoolId]);


  /* =========================================
     INITIAL DATA LOAD
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

  const teamById = useMemo(
    () => new Map(teams.map(team => [team.id, team])),
    [teams]
  );


  /* =========================================
     FEE ROWS
  ========================================= */

  const feeRows = registrations

    .filter(registration =>
      registration.feeStatus !== 'NOT_REQUIRED' &&
      [
        'SUBMITTED',
        'UNDER_REVIEW',
        'CORRECTION_REQUIRED',
        'APPROVED',
      ].includes(registration.state)
    )

    .map(registration => {
      const snapshotCount =
        registration.eligibilitySnapshot?.memberCount;

      const memberCount =
        Number.isSafeInteger(snapshotCount) &&
        (snapshotCount ?? 0) > 0
          ? snapshotCount!
          : memberCounts.get(registration.teamId) ?? 0;

      const configured =
        categoryFees[registration.categoryCode];

      const feePerHead =
        registration.feeAmountPerHeadMinorUnits ??
        (
          configured?.hasFee &&
          typeof configured.feeAmount === 'number'
            ? Math.round(configured.feeAmount * 100)
            : 0
        );

      const total =
        registration.feeTotalMinorUnits ??
        feePerHead * memberCount;

      return {
        registration,
        memberCount,
        feePerHead,
        total,
      };
    })

    .filter(row =>
      row.memberCount > 0 &&
      row.feePerHead > 0 &&
      row.total > 0
    );


  /* =========================================
     OUTSTANDING TOTAL
  ========================================= */

  const outstandingTotal = feeRows

    .filter(row =>
      !['VERIFIED', 'WAIVED'].includes(
        row.registration.feeStatus
      )
    )

    .reduce(
      (sum, row) => sum + row.total,
      0
    );


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="fees-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="fees-ambient"
        aria-hidden="true"
      >
        <div className="fees-grid" />

        <div className="fees-orb fees-orb-one" />

        <div className="fees-orb fees-orb-two" />

        <div className="fees-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`fees-bubble ${bubble.tone}`}
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
          FULL WIDTH PAGE CONTENT
      ===================================== */}

      <div className="fees-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader
          title="Registration Fee Status"
          subtitle="View per-student registration fees and payment status"
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


        {/* SCHOOL ASSIGNMENT */}

        {!schoolId || schoolId === 'unassigned' ? (
          <Card className="fees-glass-card flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />

            <div>
              <p className="font-medium text-white">
                School scope not assigned
              </p>

              <p className="text-sm text-gray-400 mt-1">
                Fee records appear after an administrator assigns this coordinator to a school.
              </p>
            </div>
          </Card>

        ) : error ? (

          /* ERROR */

          <div role="alert">
            <Card className="fees-glass-card text-sm text-red-300">
              {error}
            </Card>
          </div>

        ) : loading ? (

          /* LOADING */

          <Card className="fees-glass-card text-center text-gray-400">
            Loading registration fees…
          </Card>

        ) : (

          /* FEE CONTENT */

          <>
            {/* OUTSTANDING FEE CARD */}

            <Card className="fees-glass-card">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-indigo-400" />

                <h2 className="font-semibold text-white">
                  Outstanding registration fees
                </h2>
              </div>

              <p className="text-3xl font-black text-white">
                {money(outstandingTotal)}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Per-student fee multiplied by each team's registered student count.
              </p>
            </Card>


            {/* EMPTY STATE */}

            {feeRows.length === 0 ? (
              <Card className="fees-glass-card text-center py-12">
                <p className="font-medium text-gray-300">
                  No registration fees found
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Fees appear here after team registration is submitted.
                </p>
              </Card>

            ) : (

              /* REGISTRATION FEE LIST */

              <div className="space-y-3">
                {feeRows.map(({
                  registration,
                  memberCount,
                  feePerHead,
                  total,
                }) => {
                  const paid = [
                    'VERIFIED',
                    'WAIVED',
                  ].includes(registration.feeStatus);

                  const team = teamById.get(
                    registration.teamId
                  );

                  return (
                    <Card
                      key={registration.id}
                      className="fees-glass-card fees-team-card"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">

                        {/* TEAM INFORMATION */}

                        <div>
                          <h3 className="font-semibold text-white">
                            {team?.teamName || 'Team registration'}
                          </h3>

                          <CategoryBadge
                            code={registration.categoryCode}
                          />

                          <p className="text-xs text-gray-500 mt-2">
                            {memberCount} student
                            {memberCount === 1 ? '' : 's'}
                            {' · '}
                            {money(feePerHead)} per student
                          </p>

                          <p className="text-sm font-bold text-white mt-1">
                            Total: {money(total)}
                          </p>
                        </div>

                        {/* PAYMENT STATUS */}

                        <StatusBadge
                          status={paid ? 'PAID' : 'UNPAID'}
                        />

                      </div>
                    </Card>
                  );
                })}
              </div>
            )}


            {/* PAYMENT INFORMATION */}

            <Card className="fees-glass-card flex items-start gap-3 border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />

              <p className="text-xs text-gray-400">
                Contact the event administrator to confirm payment.
                Only an authorized administrator can mark a registration fee paid.
              </p>
            </Card>

          </>
        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .fees-page {
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

        .fees-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .fees-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .fees-grid {
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

        .fees-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .fees-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .fees-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .fees-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .fees-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: fees-float linear infinite;
        }

        .fees-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .fees-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes fees-float {
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


        /* FULL WIDTH CONTENT */

        .fees-content {
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


        /* FULL WIDTH GLASS CARDS */

        .fees-page .fees-glass-card {
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


        .fees-page .fees-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* TEAM CARDS */

        .fees-team-card {
          width: 100%;

          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {
          .fees-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .fees-content {
            padding: 16px 10px 24px;
          }
        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .fees-bubble {
            animation: none;
          }

          .fees-glass-card {
            transition: none;
          }
        }

      `}</style>

    </main>
  );
}
