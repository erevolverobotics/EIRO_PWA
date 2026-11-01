'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, QrCode, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { CategoryCode, RegistrationState } from '@/lib/types';


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


interface Team {
  id: string;
  schoolId: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
}

interface Registration {
  id: string;
  schoolId: string;
  teamId: string;
  state: RegistrationState;
  seasonId?: string;
}


export default function TeamPassesPage() {
  const { roles } = useAuth();

  const schoolId = roles.find(
    role => role.role === 'SCHOOL_COORDINATOR' && role.active
  )?.scopeId;

  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  /* =========================================
     LOAD DATA
     ORIGINAL FIREBASE LOGIC UNCHANGED
  ========================================= */

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') return;

    try {
      const [teamSnap, registrationSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'teams'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDocs(
          query(
            collection(db, 'registrations'),
            where('schoolId', '==', schoolId)
          )
        ),
      ]);

      setError('');

      setTeams(
        teamSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Team, 'id'>),
        }))
      );

      setRegistrations(
        registrationSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Registration, 'id'>),
        }))
      );

    } catch (loadError) {
      console.error(loadError);

      setError(
        'Approved registration information could not be loaded. Check your school assignment and Firestore permissions, then retry.'
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

  const approved = registrations.filter(
    registration => registration.state === 'APPROVED'
  );

  const approvedTeams = approved
    .map(registration => ({
      registration,
      team: teamById.get(registration.teamId),
    }))
    .filter(item => item.team);


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="team-passes-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div className="team-passes-ambient" aria-hidden="true">

        {/* GRID */}

        <div className="team-passes-grid" />


        {/* GLOWING ORBS */}

        <div className="team-passes-orb team-passes-orb-one" />

        <div className="team-passes-orb team-passes-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="team-passes-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`team-passes-bubble ${bubble.tone}`}
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
          ORIGINAL FUNCTIONALITY PRESERVED
      ===================================== */}

      <div className="team-passes-content relative z-10 w-full space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader
          title="Team Passes"
          subtitle="Approved team registrations and pass availability"
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

        <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">

          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />

          <p className="text-sm text-blue-300">
            Team passes require an approved event entry. The current Firestore rules do not grant school coordinators access to stage-entry records, so this page never fabricates a QR code or pass identifier.
          </p>

        </div>


        {/* SCHOOL ASSIGNMENT */}

        {!schoolId || schoolId === 'unassigned' ? (

          <Card className="team-passes-glass-card text-center py-12">

            <p className="font-medium text-gray-300">
              School scope not assigned
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Approved team passes are available after an administrator assigns this account to a school.
            </p>

          </Card>

        ) : error ? (

          /* ERROR */

          <div role="alert">

            <Card className="team-passes-glass-card text-sm text-red-300">
              {error}
            </Card>

          </div>

        ) : loading ? (

          /* LOADING */

          <Card className="team-passes-glass-card text-center text-gray-400">
            Loading registrations…
          </Card>

        ) : approvedTeams.length === 0 ? (

          /* EMPTY STATE */

          <Card className="team-passes-glass-card text-center py-14">

            <QrCode className="w-10 h-10 text-gray-600 mx-auto mb-3" />

            <p className="font-medium text-gray-300">
              No approved team entries found
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Team passes appear after the registration and event-entry approval process.
            </p>

          </Card>

        ) : (

          /* APPROVED TEAM LIST */

          <div className="space-y-3">

            {approvedTeams.map(({ registration, team }) => (

              <Card
                key={registration.id}
                className="team-passes-glass-card"
              >

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <h2 className="font-semibold text-white">
                      {team?.teamName ||
                        team?.displayTeamCode ||
                        'Registered team'}
                    </h2>

                    {team?.categoryCode && (
                      <CategoryBadge
                        code={team.categoryCode}
                      />
                    )}

                    <p className="text-xs font-mono text-gray-500 mt-2">
                      {team?.displayTeamCode || team?.id}
                    </p>

                  </div>

                  <StatusBadge
                    status={registration.state}
                  />

                </div>

                <p className="text-xs text-gray-500 mt-4">
                  An event entry and approved pass have not been made available to this school scope.
                </p>

              </Card>

            ))}

          </div>

        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .team-passes-page {
          position: relative;
          isolation: isolate;

          width: 100%;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .team-passes-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .team-passes-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .team-passes-grid {
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

        .team-passes-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .team-passes-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .team-passes-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .team-passes-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .team-passes-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: team-passes-float linear infinite;
        }

        .team-passes-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .team-passes-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes team-passes-float {

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

        .team-passes-content {
          position: relative;
          z-index: 10;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* TRANSPARENT GLASS CARDS */

        .team-passes-page .team-passes-glass-card {
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

        .team-passes-page .team-passes-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {
          .team-passes-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .team-passes-content {
            padding: 16px 10px 24px;
          }
        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .team-passes-bubble {
            animation: none;
          }

          .team-passes-glass-card {
            transition: none;
          }
        }

      `}</style>

    </main>
  );
}
