'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, CategoryBadge, KpiCard } from '@/components/ui';
import { History, UserCheck, AlertCircle, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';

type Attendance = {
  id: string;
  teamId: string;
  entryId?: string;
  studentId: string;
  status: string;
  recordedAt?: { toDate?: () => Date } | string;
  markedAt?: { toDate?: () => Date } | string;
  actorUid?: string;
  markedByUid?: string;
};

type Team = {
  id: string;
  teamName: string;
  displayTeamCode: string;
  categoryCode: CategoryCode;
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

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAll<Attendance>('studentAttendance'),
      getAll<Team>('teams'),
    ])
      .then(([attendance, teamRows]) => {
        setRecords(attendance);
        setTeams(teamRows);
      })
      .catch(() => setError('Attendance history could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const present = records.filter(
    record => record.status === 'PRESENT'
  ).length;

  const absent = records.filter(
    record => record.status === 'ABSENT'
  ).length;

  const dateLabel = (value?: Attendance['recordedAt']) => {
    if (!value) return '—';

    const date =
      typeof value === 'string' ? new Date(value) : value.toDate?.();

    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString()
      : '—';
  };

  return (
    <main className="attendance-history-page relative isolate min-h-screen w-full">
      {/* Animated background — no grid */}
      <div className="attendance-ambient" aria-hidden="true">
        <div className="attendance-orb attendance-orb-one" />
        <div className="attendance-orb attendance-orb-two" />

        <div className="attendance-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`attendance-bubble ${bubble.tone}`}
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

      {/* Main content */}
      <div className="attendance-content relative z-10 w-full space-y-6 animate-fade-in-up">
        <PageHeader
          title="Attendance History"
          subtitle="Persisted competition attendance records"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Records"
            value={records.length}
            icon={History}
            color="indigo"
          />

          <KpiCard
            title="Present"
            value={present}
            icon={UserCheck}
            color="green"
          />

          <KpiCard
            title="Absent"
            value={absent}
            icon={AlertCircle}
            color="red"
          />

          <KpiCard
            title="Teams"
            value={new Set(records.map(record => record.teamId)).size}
            icon={Users}
            color="blue"
          />
        </div>

        {/* Attendance records */}
        {loading ? (
          <div
            role="status"
            className="text-center text-gray-400 py-12 attendance-glass-card rounded-2xl"
          >
            Loading attendance history…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400 attendance-glass-card"
          >
            {error}
          </div>
        ) : records.length === 0 ? (
          <Card className="attendance-glass-card text-center py-12 text-gray-400">
            No attendance records have been recorded.
          </Card>
        ) : (
          <Card padding="none" className="attendance-glass-card">
            <div className="overflow-x-auto rounded-2xl">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Team</th>
                    <th>Category</th>
                    <th>Student ID</th>
                    <th>Status</th>
                    <th>Marked by</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map(record => {
                    const team = teams.find(
                      item => item.id === record.teamId
                    );

                    return (
                      <tr key={record.id}>
                        <td className="font-mono text-xs text-gray-500">
                          {record.id}
                        </td>

                        <td>
                          <p className="text-white">
                            {team?.teamName ?? record.teamId}
                          </p>

                          <p className="font-mono text-[10px] text-gray-500">
                            {team?.displayTeamCode}
                          </p>
                        </td>

                        <td>
                          {team && (
                            <CategoryBadge code={team.categoryCode} />
                          )}
                        </td>

                        <td>{record.studentId}</td>

                        <td
                          className={
                            record.status === 'PRESENT'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {record.status}
                        </td>

                        <td>
                          {record.markedByUid ??
                            record.actorUid ??
                            '—'}
                        </td>

                        <td className="font-mono text-xs">
                          {dateLabel(
                            record.markedAt ?? record.recordedAt
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Background animation styles */}
      <style jsx global>{`
        .attendance-history-page {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background: transparent;
        }

        .attendance-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .attendance-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.2;
          animation: attendance-orb-pulse 12s ease-in-out infinite alternate;
        }

        .attendance-orb-one {
          width: 380px;
          height: 380px;
          top: 5%;
          left: -120px;
          background: rgba(124, 58, 237, 0.55);
        }

        .attendance-orb-two {
          width: 340px;
          height: 340px;
          right: -100px;
          bottom: 0;
          background: rgba(219, 39, 119, 0.35);
          animation-delay: -6s;
        }

        .attendance-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .attendance-bubble {
          position: absolute;
          bottom: -100px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          animation-name: attendance-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .attendance-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(196, 181, 253, 0.2),
            rgba(139, 92, 246, 0.045) 65%,
            transparent 100%
          );
          border: 1px solid rgba(167, 139, 250, 0.12);
          box-shadow: inset 0 0 15px rgba(167, 139, 250, 0.06);
        }

        .attendance-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(251, 207, 232, 0.18),
            rgba(244, 63, 94, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 113, 133, 0.12);
          box-shadow: inset 0 0 15px rgba(251, 113, 133, 0.05);
        }

        @keyframes attendance-float {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 0;
          }

          10% {
            opacity: 0.65;
          }

          50% {
            transform: translate3d(35px, -55vh, 0) scale(1);
            opacity: 0.45;
          }

          90% {
            opacity: 0.5;
          }

          100% {
            transform: translate3d(-20px, -115vh, 0) scale(1.15);
            opacity: 0;
          }
        }

        @keyframes attendance-orb-pulse {
          from {
            transform: scale(1);
            opacity: 0.14;
          }

          to {
            transform: scale(1.18);
            opacity: 0.26;
          }
        }

        .attendance-content {
          width: 100%;
          padding: 1.5rem;
        }

        .attendance-glass-card {
          background: rgba(17, 24, 39, 0.3) !important;
          border: 1px solid rgba(148, 163, 184, 0.12) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .attendance-history-page .eiro-table {
          width: 100%;
          border-collapse: collapse;
        }

        .attendance-history-page .eiro-table th,
        .attendance-history-page .eiro-table td {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .attendance-content {
            padding: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .attendance-bubble,
          .attendance-orb {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
