'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Activity,
  QrCode,
  UserCheck,
  Users,
} from 'lucide-react';

import {
  Button,
  Card,
  CategoryBadge,
  KpiCard,
  PageHeader,
  StatusBadge,
} from '@/components/ui';

import { getAll } from '@/lib/firebase/firestore';

import type {
  CategoryCode,
  EntryStatus,
  StageEntry,
  Team,
} from '@/lib/types';

type VenueTeam = Team & {
  entry?: StageEntry;
  membersPresent: number;
  membersTotal: number;
};

type Membership = {
  teamId: string;
  studentId: string;
  status?: string;
};

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function VenueDashboard() {
  const [teams, setTeams] = useState<VenueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAll<Team>('teams'),
      getAll<StageEntry>('stageEntries'),
      getAll<Membership>('teamMemberships'),
      getAll<{
        entryId: string;
        studentId: string;
        status: string;
      }>('studentAttendance'),
    ])
      .then(([teamDocs, entries, memberships, attendance]) => {
        const currentEntries = new Map(
          entries
            .filter(entry => !entry.mergedIntoEntryId)
            .map(entry => [entry.teamId, entry])
        );

        setTeams(
          teamDocs.map(team => {
            const entry = currentEntries.get(team.id);

            const members = memberships.filter(
              member => member.teamId === team.id
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
              entry,
              membersTotal: members.length,
              membersPresent: members.filter(member =>
                presentIds.has(member.studentId)
              ).length,
            };
          })
        );
      })
      .catch(() =>
        setError(
          'Venue data could not be loaded. Check your role and Firestore access.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const entries = teams.filter(team => team.entry);

  const checkedIn = entries.filter(team =>
    ['CHECKED_IN', 'COMPETING', 'COMPLETED'].includes(
      team.entry?.entryStatus ?? ''
    )
  ).length;

  const competing = entries.filter(
    team => team.entry?.entryStatus === 'COMPETING'
  ).length;

  const shortStaffed = teams.filter(
    team => team.membersPresent < team.membersTotal
  ).length;

  return (
    <div className="venue-page">

      {/* Animated Background - Grid Removed */}
      <div className="venue-ambient" aria-hidden="true">

        {/* Purple and Rose Glowing Orbs */}
        <div className="venue-orb venue-orb-one" />
        <div className="venue-orb venue-orb-two" />

        {/* Floating Animated Bubbles */}
        <div className="venue-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`venue-bubble venue-bubble-${bubble.tone}`}
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
      </div>

      {/* Dashboard Content */}
      <main className="venue-content">

        <PageHeader
          title="Venue Dashboard"
          subtitle="Live data from event entries, teams and attendance"
          actions={
            <Link href="/venue/checkin">
              <Button icon={QrCode}>
                Start Check-in
              </Button>
            </Link>
          }
        />

        {/* KPI Cards */}
        <div className="venue-kpi-grid">

          <div className="venue-kpi-shell">
            <KpiCard
              title="Teams"
              value={teams.length}
              icon={Users}
              color="indigo"
            />
          </div>

          <div className="venue-kpi-shell">
            <KpiCard
              title="Checked In"
              value={checkedIn}
              icon={UserCheck}
              color="green"
            />
          </div>

          <div className="venue-kpi-shell">
            <KpiCard
              title="Short-staffed"
              value={shortStaffed}
              icon={AlertCircle}
              color="orange"
            />
          </div>

          <div className="venue-kpi-shell">
            <KpiCard
              title="Competing"
              value={competing}
              icon={Activity}
              color="blue"
            />
          </div>

        </div>

        {/* Loading State */}
        {loading ? (
          <div
            className="venue-state"
            role="status"
          >
            <div className="venue-loader" />
            <p>Loading venue data...</p>
          </div>
        ) : error ? (

          /* Error State */
          <div
            role="alert"
            className="venue-error"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>

        ) : entries.length === 0 ? (

          /* Empty State */
          <Card className="venue-glass-card venue-empty-card">
            <div className="venue-empty-icon">
              <Users size={30} />
            </div>

            <h3>No Event Entries</h3>

            <p>
              No event entries are available.
            </p>
          </Card>

        ) : (

          /* Event Teams Table */
          <Card
            padding="none"
            className="venue-glass-card venue-table-card"
          >

            <div className="venue-table-heading">
              <div>
                <h3>Event Teams</h3>
                <p>
                  Monitor team attendance and competition status
                </p>
              </div>

              <div className="venue-team-count">
                <Users size={15} />
                {entries.length} Teams
              </div>
            </div>

            <div className="overflow-x-auto venue-table-scroll">
              <table className="eiro-table venue-table">

                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Category</th>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {entries.map(team => (
                    <tr key={team.id}>

                      <td>
                        <div className="venue-team-name">
                          {team.teamName}
                        </div>

                        <div className="venue-team-code">
                          {team.displayTeamCode}
                        </div>
                      </td>

                      <td>
                        <CategoryBadge
                          code={team.categoryCode as CategoryCode}
                        />
                      </td>

                      <td>
                        <div className="venue-members">
                          <Users size={14} />

                          <span>
                            {team.membersPresent}/{team.membersTotal}
                          </span>

                          <span className="venue-members-label">
                            present
                          </span>
                        </div>
                      </td>

                      <td>
                        <StatusBadge
                          status={team.entry?.entryStatus as EntryStatus}
                        />
                      </td>

                      <td>
                        {team.entry?.entryStatus === 'APPROVED' && (
                          <Link
                            href={`/venue/checkin?team=${encodeURIComponent(
                              team.displayTeamCode
                            )}`}
                          >
                            <Button
                              size="sm"
                              icon={QrCode}
                            >
                              Check In
                            </Button>
                          </Link>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            <div className="venue-table-footer">
              <span>
                Showing {entries.length} event teams
              </span>

              <span>
                EIRO · Venue Management
              </span>
            </div>

          </Card>
        )}

      </main>

      {/* Page-specific Styling */}
      <style jsx global>{`

        .venue-page {
          position: relative;
          isolation: isolate;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: transparent !important;
          color: #f8fafc;
        }

        /* Animated Background Layer */

        .venue-ambient {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        /* Glowing Orbs */

        .venue-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .venue-orb-one {
          top: -220px;
          left: -160px;
          background: #7c3aed;
        }

        .venue-orb-two {
          top: 20%;
          right: -260px;
          background: #b24bb2;
        }

        /* Floating Bubbles */

        .venue-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .venue-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation-name: venue-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .venue-bubble-violet {
          background: radial-gradient(
            circle at 35% 30%,
            rgba(192, 132, 252, 0.24),
            rgba(168, 85, 247, 0.08) 65%,
            transparent 100%
          );
          border: 1px solid rgba(192, 132, 252, 0.10);
        }

        .venue-bubble-rose {
          background: radial-gradient(
            circle at 35% 30%,
            rgba(251, 182, 206, 0.22),
            rgba(221, 143, 224, 0.07) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 182, 206, 0.10);
        }

        @keyframes venue-float {
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

        /* Main Content */

        .venue-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: none;
          min-height: 100vh;
          padding: 24px 24px 32px;
          background: transparent !important;
          box-shadow: none !important;
        }

        /* KPI Grid */

        .venue-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 24px;
          margin-bottom: 26px;
        }

        .venue-kpi-shell {
          min-width: 0;
        }

        .venue-kpi-shell > div {
          min-height: 145px;
          height: 100%;
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          border-radius: 16px !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none !important;
          transition:
            border-color 0.25s ease,
            transform 0.25s ease,
            background 0.25s ease;
        }

        .venue-kpi-shell > div:hover {
          transform: translateY(-3px);
          border-color: rgba(168, 85, 247, 0.35) !important;
          background: rgba(17, 24, 39, 0.42) !important;
        }

        /* Glass Cards */

        .venue-glass-card {
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          border-radius: 16px !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none !important;
          overflow: hidden;
          transition: border-color 0.25s ease;
        }

        .venue-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }

        /* Table Heading */

        .venue-table-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 21px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .venue-table-heading h3 {
          margin: 0;
          color: #f8fafc;
          font-size: 15px;
          font-weight: 650;
          letter-spacing: -0.2px;
        }

        .venue-table-heading p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .venue-team-count {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border: 1px solid rgba(168, 85, 247, 0.22);
          border-radius: 30px;
          background: rgba(139, 92, 246, 0.09);
          color: #c4b5fd;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        /* Table */

        .venue-table-scroll {
          width: 100%;
        }

        .venue-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .venue-table thead {
          background: rgba(15, 23, 42, 0.24) !important;
        }

        .venue-table th {
          padding: 15px 20px;
          color: #94a3b8 !important;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          white-space: nowrap;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .venue-table td {
          padding: 17px 20px;
          color: #cbd5e1;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
          vertical-align: middle;
        }

        .venue-table tbody tr {
          background: transparent !important;
          transition: background 0.2s ease;
        }

        .venue-table tbody tr:hover {
          background: rgba(168, 85, 247, 0.055) !important;
        }

        .venue-table tbody tr:last-child td {
          border-bottom: none;
        }

        .venue-team-name {
          color: #f8fafc;
          font-size: 13px;
          font-weight: 600;
        }

        .venue-team-code {
          margin-top: 5px;
          color: #64748b;
          font-family: monospace;
          font-size: 10px;
        }

        .venue-members {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #e2e8f0;
          font-size: 13px;
          white-space: nowrap;
        }

        .venue-members svg {
          color: #a78bfa;
        }

        .venue-members-label {
          color: #64748b;
          font-size: 11px;
        }

        /* Footer */

        .venue-table-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: #64748b;
          font-size: 11px;
        }

        /* Loading */

        .venue-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          min-height: 260px;
          color: #94a3b8;
          font-size: 13px;
        }

        .venue-loader {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(168, 85, 247, 0.15);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: venue-spin 0.8s linear infinite;
        }

        @keyframes venue-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Error */

        .venue-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 17px 20px;
          border: 1px solid rgba(248, 113, 113, 0.22);
          border-radius: 14px;
          background: rgba(127, 29, 29, 0.13);
          color: #fca5a5;
          font-size: 13px;
        }

        /* Empty State */

        .venue-empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 270px;
          padding: 35px 20px !important;
          text-align: center;
        }

        .venue-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 58px;
          margin-bottom: 16px;
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 17px;
          background: rgba(139, 92, 246, 0.10);
          color: #c4b5fd;
        }

        .venue-empty-card h3 {
          margin: 0;
          color: #f8fafc;
          font-size: 16px;
          font-weight: 650;
        }

        .venue-empty-card p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        /* Responsive */

        @media (max-width: 900px) {
          .venue-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .venue-content {
            padding: 20px 16px 28px;
          }

          .venue-table-heading {
            padding: 18px;
          }

          .venue-table th,
          .venue-table td {
            padding: 14px 16px;
          }
        }

        @media (max-width: 480px) {
          .venue-content {
            padding: 16px 12px 24px;
          }

          .venue-kpi-grid {
            gap: 10px;
          }

          .venue-kpi-shell > div {
            min-height: 125px;
          }

          .venue-table-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .venue-table-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        /* Accessibility */

        @media (prefers-reduced-motion: reduce) {
          .venue-bubble,
          .venue-loader {
            animation: none !important;
          }

          .venue-kpi-shell > div,
          .venue-glass-card,
          .venue-table tbody tr {
            transition: none !important;
          }
        }

      `}</style>

    </div>
  );
}
