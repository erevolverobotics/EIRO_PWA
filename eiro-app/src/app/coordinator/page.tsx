
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  KpiCard,
  Card,
  StatusBadge,
  CategoryBadge,
  Button,
  PageHeader,
} from '@/components/ui';

import {
  Trophy,
  Users,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Plus,
  Upload,
} from 'lucide-react';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { getOne, queryByField } from '@/lib/firebase/firestore';
import type { Registration, School, Student, Team } from '@/lib/types';

type DashboardRegistration = Registration & { id: string };
type DashboardTeam = Team & { id: string };

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function CoordinatorDashboard() {
  const { roles } = useAuth();

  const schoolId = roles.find(
    role => role.role === 'SCHOOL_COORDINATOR' && role.active,
  )?.scopeId;

  const [registrations, setRegistrations] = useState<DashboardRegistration[]>([]);
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!schoolId || schoolId === 'unassigned') {
      setLoading(false);
      return;
    }

    let active = true;

    Promise.all([
      getOne<School>('schools', schoolId),
      queryByField<Registration>('registrations', 'schoolId', schoolId),
      queryByField<Team>('teams', 'schoolId', schoolId),
      queryByField<Student>('students', 'schoolId', schoolId),
    ])
      .then(([schoolData, registrationData, teamData, students]) => {
        if (!active) return;

        const registeredTeamIds = new Set(
          registrationData.map(registration => registration.teamId),
        );

        setSchool(schoolData);
        setRegistrations(registrationData);
        setTeams(teamData.filter(team => registeredTeamIds.has(team.id)));
        setStudentCount(students.length);
        setError('');
      })
      .catch(loadError => {
        console.error('Failed to load school dashboard data', loadError);

        if (active) {
          setError(
            'Unable to load school data. Check your connection and access, then retry.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [schoolId, reload]);

  const registrationByTeam = useMemo(
    () =>
      new Map(
        registrations.map(registration => [
          registration.teamId,
          registration,
        ]),
      ),
    [registrations],
  );

  const loadingData = Boolean(
    schoolId && schoolId !== 'unassigned' && loading,
  );

  const pendingFees = registrations.filter(
    registration =>
      registration.feeStatus === 'PENDING' ||
      registration.feeStatus === 'PARTIAL',
  ).length;

  const approved = registrations.filter(
    registration => registration.state === 'APPROVED',
  ).length;

  const registrationTasks = registrations.filter(
    registration =>
      registration.state === 'CORRECTION_REQUIRED' ||
      registration.feeStatus === 'PENDING' ||
      registration.feeStatus === 'PARTIAL',
  );

  return (
    <main className="coordinator-dashboard relative isolate min-h-screen w-full">

      {/* BACKGROUND */}
      <div className="cd-ambient" aria-hidden="true">
        <div className="cd-grid" />
        <div className="cd-orb cd-orb-one" />
        <div className="cd-orb cd-orb-two" />

        <div className="cd-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`cd-bubble ${bubble.tone}`}
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

      {/* MAIN CONTENT */}
      <div className="cd-content relative z-10 mx-auto w-full max-w-none space-y-6 px-1 py-6 sm:px-1.5">

        {/* SCHOOL DASHBOARD HEADER */}
        <div className="cd-header-panel">
          <PageHeader
            title="School Dashboard"
            subtitle={school?.name ?? 'Overview of your school registrations'}
            actions={
              <>
                <Link href="/coordinator/bulk-upload">
                  <Button variant="secondary" size="sm" icon={Upload}>
                    Bulk Upload
                  </Button>
                </Link>

                <Link href="/coordinator/register">
                  <Button size="sm" icon={Plus}>
                    Register Team
                  </Button>
                </Link>
              </>
            }
          />
        </div>

        {/* NOTICES */}
        {!schoolId || schoolId === 'unassigned' ? (
          <Card>
            <div className="cd-notice">
              <span className="cd-notice-dot" />
              <p>
                Your coordinator account is not assigned to a school.
                Contact an administrator to link your account.
              </p>
            </div>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="cd-notice cd-notice-error">
                <span className="cd-notice-dot" />
                <p className="text-sm">{error}</p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setLoading(true);
                  setError('');
                  setReload(value => value + 1);
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : null}

        {/* KPI CARDS */}
        <section aria-label="School registration overview">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

            <div className="cd-kpi">
              <KpiCard
                title="My Teams"
                value={loadingData ? '…' : registrations.length}
                icon={Trophy}
                color="indigo"
              />
            </div>

            <div className="cd-kpi">
              <KpiCard
                title="Students Registered"
                value={loadingData ? '…' : studentCount}
                icon={Users}
                color="blue"
              />
            </div>

            <div className="cd-kpi">
              <KpiCard
                title="Approved Teams"
                value={loadingData ? '…' : approved}
                icon={CheckCircle2}
                color="green"
              />
            </div>

            <div className="cd-kpi">
              <KpiCard
                title="Fees Pending"
                value={loadingData ? '…' : pendingFees}
                icon={CreditCard}
                color="orange"
              />
            </div>

          </div>
        </section>

        {/* REGISTRATION TASKS */}
        <section className="cd-section-card">

          <div className="cd-card-heading">
            <h2>Registration Tasks</h2>
          </div>

          <div className="cd-task-list">

            {loadingData ? (
              <p className="cd-empty-state">
                Loading registrations…
              </p>
            ) : registrationTasks.length === 0 ? (
              <div className="cd-empty-state">
                <CheckCircle2 size={20} />
                <span>No registration tasks. You’re all caught up.</span>
              </div>
            ) : (
              registrationTasks.map(registration => {
                const team = teams.find(
                  candidate => candidate.id === registration.teamId,
                );

                return (
                  <Link
                    key={registration.id}
                    href="/coordinator/registrations"
                    className="cd-task-row"
                  >
                    <p className="cd-task-name">
                      <strong>{team?.teamName ?? 'Team'}:</strong>
                      <span>
                        {registration.state === 'CORRECTION_REQUIRED'
                          ? 'correction required'
                          : 'payment pending'}
                      </span>
                    </p>

                    <StatusBadge
                      status={
                        registration.state === 'CORRECTION_REQUIRED'
                          ? registration.state
                          : registration.feeStatus
                      }
                    />

                    <ChevronRight className="cd-chevron" size={18} />
                  </Link>
                );
              })
            )}

          </div>
        </section>

        {/* MY TEAMS */}
        <section className="cd-section-card">

          <div className="cd-card-heading cd-team-heading">
            <h2>My Teams</h2>

            <Link
              href="/coordinator/registrations"
              className="cd-view-all"
            >
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="cd-table">

              <thead>
                <tr>
                  <th>Team</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Fee</th>
                </tr>
              </thead>

              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={4} className="cd-table-empty">
                      Loading teams…
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="cd-table-empty">
                      No registered teams.
                    </td>
                  </tr>
                ) : (
                  teams.map(team => {
                    const registration = registrationByTeam.get(team.id);

                    if (!registration) return null;

                    return (
                      <tr key={team.id}>
                        <td>
                          <div className="cd-team-name">
                            {team.teamName}
                          </div>

                          <div className="cd-team-code">
                            {team.displayTeamCode}
                          </div>
                        </td>

                        <td>
                          <CategoryBadge code={team.categoryCode} />
                        </td>

                        <td>
                          <StatusBadge status={registration.state} />
                        </td>

                        <td>
                          <StatusBadge status={registration.feeStatus} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="cd-footer">
          <span>EIRO · School Coordinator Portal</span>
          <span>Built for young innovators</span>
        </footer>

      </div>

      {/* STYLES */}
      <style jsx global>{`

        /* PAGE BACKGROUND */
        html,
        body {
          min-height: 100%;
          background: #0b1020 !important;
        }

        body {
          margin: 0;
        }

        .coordinator-dashboard {
          --cd-bg: #0b1020;
          --cd-panel: #111827;
          --cd-line: #202a3b;
          --cd-text: #f5f6fb;
          --cd-muted: #858fa3;

          background:
            radial-gradient(
              ellipse at 12% 5%,
              rgba(91, 53, 180, .12),
              transparent 40%
            ),
            #0b1020 !important;

          color: var(--cd-text);
          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          isolation: isolate;
        }

        .coordinator-dashboard * {
          box-sizing: border-box;
        }

        /* BACKGROUND EFFECTS */
        .cd-ambient {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .cd-grid {
          position: absolute;
          inset: 0;
          opacity: .08;
          background-image:
            linear-gradient(rgba(168,85,247,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,.12) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: radial-gradient(ellipse 80% 65% at 50% 22%, #000, transparent);
        }

        .cd-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: .12;
        }

        .cd-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .cd-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }

        .cd-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .cd-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: cd-float linear infinite;
        }

        .cd-bubble.violet {
          background: radial-gradient(circle at 30% 30%, rgba(168,85,247,.2), transparent 72%);
        }

        .cd-bubble.rose {
          background: radial-gradient(circle at 30% 30%, rgba(221,143,224,.16), transparent 72%);
        }

        @keyframes cd-float {
          0% {
            transform: translateY(0) scale(.8);
            opacity: 0;
          }

          12% { opacity: .5; }
          88% { opacity: .3; }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CONTENT */
        .cd-content {
          min-height: 100vh;
        }

        /* HEADER - NO BOX */
        .cd-header-panel {
          padding: 0;
          border: none !important;
          border-radius: 0;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .cd-header-panel h1 {
          color: #f8fafc !important;
          font-size: 24px !important;
          font-weight: 750 !important;
          letter-spacing: -.035em;
        }

        .cd-header-panel p {
          color: #9ca3af !important;
        }

        /* KPI CARDS */
        .cd-kpi {
          min-width: 0;
        }

        .cd-kpi > * {
          height: 100%;
          min-height: 160px;
          border: 1px solid #202a3b;
          border-radius: 16px;
          background: #111827 !important;
          box-shadow: none !important;
          backdrop-filter: none;
          transition: border-color .2s ease, transform .2s ease;
        }

        .cd-kpi > *:hover {
          transform: translateY(-2px);
          border-color: #433b80;
          box-shadow: none !important;
        }

        .cd-kpi :global(*) {
          color: inherit;
        }

        .cd-kpi :global([class*="text-gray"]) {
          color: #818b9e !important;
        }

        /* SECTION CARDS */
        .cd-section-card {
          overflow: hidden;
          border: 1px solid #202a3b;
          border-radius: 16px;
          background: #111827;
          box-shadow: none;
          backdrop-filter: none;
        }

        .cd-card-heading {
          display: flex;
          min-height: 51px;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 23px;
          border-bottom: 1px solid #202a3b;
        }

        .cd-card-heading h2 {
          margin: 0;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        /* TASK LIST */
        .cd-task-list {
          padding: 0;
        }

        .cd-task-row {
          display: flex;
          min-height: 49px;
          align-items: center;
          gap: 18px;
          padding: 10px 23px;
          border-bottom: 1px solid #202a3b;
          background: transparent;
          transition: background .2s ease;
        }

        .cd-task-row:last-child {
          border-bottom: 0;
        }

        .cd-task-row:hover {
          background: rgba(124,58,237,.07);
        }

        .cd-task-name {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-wrap: wrap;
          gap: 5px;
          margin: 0;
          color: #c2c8d3;
          font-size: 13px;
        }

        .cd-task-name strong {
          color: #cbd5e1;
          font-weight: 600;
        }

        .cd-task-name span {
          color: #c2c8d3;
        }

        .cd-chevron {
          flex: 0 0 auto;
          color: #64748b;
          transition: transform .2s ease;
        }

        .cd-task-row:hover .cd-chevron {
          transform: translateX(3px);
          color: #a78bfa;
        }

        .cd-empty-state {
          display: flex;
          min-height: 80px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px;
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
        }

        /* VIEW ALL */
        .cd-view-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 600;
          transition: color .2s ease;
        }

        .cd-view-all:hover {
          color: #c4b5fd;
        }

        /* TEAM TABLE */
        .cd-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .cd-table thead {
          background: #0e1628;
        }

        .cd-table th {
          height: 41px;
          padding: 10px 16px;
          color: #8290a8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .07em;
          text-align: center;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .cd-table th:first-child,
        .cd-table td:first-child {
          text-align: left;
          padding-left: 16px;
        }

        .cd-table td {
          height: 62px;
          padding: 12px 16px;
          border-top: 1px solid #202a3b;
          color: #d1d5db;
          font-size: 12px;
          text-align: center;
          white-space: nowrap;
        }

        .cd-table tbody tr {
          transition: background .18s ease;
        }

        .cd-table tbody tr:hover {
          background: rgba(124,58,237,.06);
        }

        .cd-table-empty {
          height: 80px;
          color: #9ca3af !important;
          text-align: center !important;
        }

        .cd-team-name {
          color: #f1f5f9;
          font-size: 13px;
          font-weight: 650;
        }

        .cd-team-code {
          margin-top: 3px;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
        }

        /* NOTICES */
        .cd-notice {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #e8dff1;
          font-size: 13px;
        }

        .cd-notice p {
          margin: 0;
        }

        .cd-notice-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #eab76c;
        }

        .cd-notice-error .cd-notice-dot {
          background: #fb7185;
        }

        /* FOOTER */
        .cd-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 2px 0;
          color: #64748b;
          font-size: 10px;
          letter-spacing: .04em;
        }

        /* RESPONSIVE */
        @media (max-width: 1023px) {
          .cd-kpi > * {
            min-height: 145px;
          }
        }

        @media (max-width: 640px) {
          .cd-content {
            padding: 16px 10px;
          }

          .cd-header-panel h1 {
            font-size: 21px !important;
          }

          .cd-card-heading {
            padding: 0 14px;
          }

          .cd-task-row {
            gap: 8px;
            padding: 12px 14px;
          }

          .cd-task-name {
            font-size: 11px;
          }

          .cd-table th,
          .cd-table td {
            padding-right: 12px;
            padding-left: 12px;
          }

          .cd-footer {
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cd-bubble {
            animation: none;
          }

          .cd-kpi > * {
            transition: none;
          }
        }

      `}</style>
    </main>
  );
}
