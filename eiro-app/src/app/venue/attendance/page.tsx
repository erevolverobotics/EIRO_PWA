'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  PageHeader,
  Card,
  KpiCard,
  CategoryBadge,
  StatusBadge,
  Badge,
} from '@/components/ui';

import {
  AlertCircle,
  UserCheck,
  Users,
} from 'lucide-react';

import type { CategoryCode } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';


/* =========================================
   TYPES
========================================= */

type Team = {
  id: string;
  teamName: string;
  displayTeamCode: string;
  categoryCode: CategoryCode;
};

type Entry = {
  id: string;
  teamId: string;
  entryStatus: string;
  mergedIntoEntryId?: string;
};

type Membership = {
  teamId: string;
  studentId: string;
  status?: string;
};

type Attendance = {
  entryId: string;
  studentId: string;
  status: string;
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
   VENUE ATTENDANCE PAGE
========================================= */

export default function VenueAttendancePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  /* =========================================
     LOAD ATTENDANCE DATA
  ========================================= */

  useEffect(() => {
    Promise.all([
      getAll<Team>('teams'),
      getAll<Entry>('stageEntries'),
      getAll<Membership>('teamMemberships'),
      getAll<Attendance>('studentAttendance'),
    ])
      .then(([teamRows, entryRows, memberRows, attendanceRows]) => {
        setTeams(teamRows);
        setEntries(entryRows);
        setMembers(memberRows);
        setAttendance(attendanceRows);
      })
      .catch(() => {
        setError('Attendance overview could not be loaded.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);


  /* =========================================
     DERIVED ATTENDANCE ROWS
  ========================================= */

  const rows = useMemo(
    () =>
      teams
        .filter(team => {
          const term = search.toLowerCase();

          return (
            !term ||
            team.teamName.toLowerCase().includes(term) ||
            team.displayTeamCode.toLowerCase().includes(term)
          );
        })
        .map(team => {
          const teamMembers = members.filter(
            member =>
              member.teamId === team.id &&
              member.status !== 'INACTIVE'
          );

          const entry = entries.find(
            record =>
              record.teamId === team.id &&
              !record.mergedIntoEntryId
          );

          const presentIds = new Set(
            attendance
              .filter(
                record =>
                  record.entryId === entry?.id &&
                  record.status === 'PRESENT'
              )
              .map(record => record.studentId)
          );

          return {
            ...team,
            memberCount: teamMembers.length,
            presentCount: teamMembers.filter(
              member => presentIds.has(member.studentId)
            ).length,
            entry,
          };
        }),
    [teams, entries, members, attendance, search]
  );


  /* =========================================
     KPI CALCULATIONS
  ========================================= */

  const checkedIn = rows.filter(
    row => row.entry?.entryStatus === 'CHECKED_IN'
  ).length;

  const short = rows.filter(
    row => row.presentCount < row.memberCount
  ).length;

  const full = rows.filter(
    row =>
      row.memberCount > 0 &&
      row.presentCount === row.memberCount
  ).length;


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="attendance-page relative isolate min-h-screen w-full">

      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="attendance-ambient"
        aria-hidden="true"
      >
        {/* GRID */}

        <div className="attendance-grid" />

        {/* GLOWING ORBS */}

        <div className="attendance-orb attendance-orb-one" />

        <div className="attendance-orb attendance-orb-two" />

        {/* FLOATING BUBBLES */}

        <div className="attendance-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`attendance-bubble ${bubble.tone}`}
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

      <div className="attendance-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">

        {/* HEADER */}

        <PageHeader
          title="Team Attendance Overview"
          subtitle="Current student check-in records"
        />


        {/* KPI CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <KpiCard
            title="Teams"
            value={teams.length}
            icon={Users}
            color="indigo"
          />

          <KpiCard
            title="Checked In"
            value={checkedIn}
            icon={UserCheck}
            color="green"
          />

          <KpiCard
            title="Short-staffed"
            value={short}
            icon={AlertCircle}
            color="orange"
          />

          <KpiCard
            title="Full Presence"
            value={full}
            icon={UserCheck}
            color="blue"
          />

        </div>


        {/* SEARCH */}

        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search teams…"
          className="eiro-input attendance-search"
        />


        {/* LOADING */}

        {loading ? (

          <Card className="attendance-glass-card text-center py-12 text-gray-400">
            Loading attendance…
          </Card>

        ) : error ? (

          /* ERROR */

          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400"
          >
            {error}
          </div>

        ) : rows.length === 0 ? (

          /* EMPTY STATE */

          <Card className="attendance-glass-card text-center py-12 text-gray-400">
            No teams found.
          </Card>

        ) : (

          /* ATTENDANCE TABLE */

          <Card
            padding="none"
            className="attendance-glass-card"
          >

            <div className="overflow-x-auto">

              <table className="eiro-table">

                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Category</th>
                    <th>Members present</th>
                    <th>Status</th>
                    <th>Alert</th>
                  </tr>
                </thead>

                <tbody>

                  {rows.map(team => (

                    <tr key={team.id}>

                      {/* TEAM */}

                      <td>
                        <p className="font-medium text-white text-sm">
                          {team.teamName}
                        </p>

                        <p className="font-mono text-[10px] text-gray-400">
                          {team.displayTeamCode}
                        </p>
                      </td>


                      {/* CATEGORY */}

                      <td>
                        <CategoryBadge
                          code={team.categoryCode}
                        />
                      </td>


                      {/* MEMBERS PRESENT */}

                      <td>
                        {team.presentCount}/{team.memberCount}
                      </td>


                      {/* STATUS */}

                      <td>
                        <StatusBadge
                          status={team.entry?.entryStatus ?? 'NO_ENTRY'}
                        />
                      </td>


                      {/* ALERT */}

                      <td>

                        {team.memberCount === 0 ? (

                          <Badge variant="default">
                            No roster data
                          </Badge>

                        ) : team.presentCount < team.memberCount ? (

                          <Badge variant="warning">
                            Short-staffed
                          </Badge>

                        ) : (

                          <Badge variant="success">
                            Full
                          </Badge>

                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </Card>

        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .attendance-page {
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

        .attendance-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .attendance-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .attendance-grid {
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

        .attendance-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .attendance-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .attendance-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .attendance-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .attendance-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: attendance-float linear infinite;
        }

        .attendance-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .attendance-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes attendance-float {
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

        .attendance-content {
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


        /* TRANSPARENT GLASS CARDS */

        .attendance-page .attendance-glass-card {
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


        .attendance-page .attendance-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* SEARCH */

        .attendance-search {
          position: relative;
          z-index: 2;
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {
          .attendance-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .attendance-content {
            padding: 16px 10px 24px;
          }
        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .attendance-bubble {
            animation: none;
          }

          .attendance-glass-card {
            transition: none;
          }
        }

      `}</style>

    </main>
  );
}
