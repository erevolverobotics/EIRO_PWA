'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  Card,
  KpiCard,
  Button,
  CategoryBadge,
  Badge,
} from '@/components/ui';

import {
  UserCheck,
  RefreshCw,
  BarChart3,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  studentId?: string;
  teamId?: string;
  entryId?: string;
  eventId?: string;
  sessionId?: string;
  dayNumber?: number;
  status?: string;
  markedAt?: unknown;
}

interface Team {
  id: string;
  categoryCode?: string;
  displayTeamCode?: string;
  teamName?: string;
}

interface Student {
  id: string;
  name?: string;
}

// ─── Animated Background ─────────────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Load attendance data ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [training, competition, teamData, studentData] = await Promise.all([
        getAll<AttendanceRecord>('trainingAttendance'),
        getAll<AttendanceRecord>('studentAttendance'),
        getAll<Team>('teams'),
        getAll<Student>('students'),
      ]);

      setAttendance([...training, ...competition]);
      setTeams(teamData);
      setStudents(studentData);
      setError('');
    } catch (e) {
      console.error(e);
      setError(
        'Could not load attendance records. Check your access and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError('');
    void load();
  };

  // ── Attendance counts ──────────────────────────────────────────────────────

  const counts = useMemo(
    () => ({
      present: attendance.filter(
        (record) => record.status === 'PRESENT'
      ).length,

      absent: attendance.filter(
        (record) => record.status === 'ABSENT'
      ).length,

      unmarked: attendance.filter(
        (record) =>
          !record.status || record.status === 'NOT_MARKED'
      ).length,

      students: new Set(
        attendance
          .map((record) => record.studentId)
          .filter(Boolean)
      ).size,
    }),
    [attendance]
  );

  // ── Category statistics ────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const grouped = new Map<
      string,
      {
        present: number;
        absent: number;
        unmarked: number;
        students: Set<string>;
      }
    >();

    attendance.forEach((record) => {
      const team = teams.find(
        (item) => item.id === record.teamId
      );

      const code = team?.categoryCode || 'UNASSIGNED';

      const item = grouped.get(code) || {
        present: 0,
        absent: 0,
        unmarked: 0,
        students: new Set<string>(),
      };

      if (record.studentId) {
        item.students.add(record.studentId);
      }

      if (record.status === 'PRESENT') {
        item.present += 1;
      } else if (record.status === 'ABSENT') {
        item.absent += 1;
      } else {
        item.unmarked += 1;
      }

      grouped.set(code, item);
    });

    return [...grouped.entries()];
  }, [attendance, teams]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="attendance-page relative isolate min-h-screen w-full">

      {/* ── ADMIN DASHBOARD ANIMATED BACKGROUND ── */}

      <div
        className="attendance-ambient fixed inset-0 z-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Animated glowing orbs */}

        <div className="attendance-orb attendance-orb-one" />
        <div className="attendance-orb attendance-orb-two" />
        <div className="attendance-orb attendance-orb-three" />
        <div className="attendance-orb attendance-orb-four" />

        {/* Dot grid */}

        <div className="attendance-dot-grid absolute inset-0" />

        {/* Rotating rings */}

        <div className="attendance-ring attendance-ring-one" />
        <div className="attendance-ring attendance-ring-two" />

        {/* Floating particles */}

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`attendance-particle ${particle}`}
          />
        ))}

        {/* Floating bubbles */}

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

        {/* Central ambient glow */}

        <div className="attendance-center-glow" />
      </div>

      {/* ── PAGE CONTENT ── */}

      <main className="attendance-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* PAGE HEADER */}

        <PageHeader
          title="Attendance Management"
          subtitle="Attendance records from training and competition"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* KPI CARDS */}

        <div className="attendance-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-4">

          <div className="attendance-kpi-shell">
            <KpiCard
              title="Unique Students"
              value={counts.students}
              icon={Users}
              color="indigo"
            />
          </div>

          <div className="attendance-kpi-shell">
            <KpiCard
              title="Present Records"
              value={counts.present}
              icon={UserCheck}
              color="green"
            />
          </div>

          <div className="attendance-kpi-shell">
            <KpiCard
              title="Absent Records"
              value={counts.absent}
              icon={AlertCircle}
              color="red"
            />
          </div>

          <div className="attendance-kpi-shell">
            <KpiCard
              title="Unmarked Records"
              value={counts.unmarked}
              icon={BarChart3}
              color="orange"
            />
          </div>

        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="attendance-error text-sm text-red-400"
          >
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : attendance.length === 0 ? (

          /* EMPTY STATE */

          <Card className="attendance-card text-center text-gray-400">
            No attendance records found.
          </Card>

        ) : (

          <>
            {/* CATEGORY SUMMARY */}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Category Attendance
                </h3>

                <span className="text-xs text-gray-500">
                  {categories.length} categories
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {categories.map(([code, item]) => {
                  const total =
                    item.present +
                    item.absent +
                    item.unmarked;

                  const rate = total
                    ? Math.round((item.present / total) * 100)
                    : 0;

                  return (
                    <Card
                      key={code}
                      className="attendance-card"
                    >
                      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">

                        {code === 'UNASSIGNED' ? (
                          <Badge>
                            Unassigned category
                          </Badge>
                        ) : (
                          <CategoryBadge
                            code={code as CategoryCode}
                          />
                        )}

                        <span className="text-xs text-gray-400">
                          {item.students.size} unique students · {rate}% present records
                        </span>

                      </div>

                      {/* Attendance progress */}

                      <div className="attendance-progress-track mb-3">
                        <div
                          className="attendance-progress-fill"
                          style={{ width: `${rate}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-400">
                        <span className="text-green-400">
                          Present {item.present}
                        </span>
                        {' · '}
                        <span className="text-red-400">
                          Absent {item.absent}
                        </span>
                        {' · '}
                        <span className="text-orange-400">
                          Unmarked {item.unmarked}
                        </span>
                      </p>

                    </Card>
                  );
                })}

              </div>
            </section>

            {/* ATTENDANCE RECORDS TABLE */}

            <section>
              <Card
                className="attendance-card"
                padding="none"
              >
                <div className="attendance-table-header px-6 py-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">
                      Attendance Records
                    </h3>

                    <span className="text-xs text-gray-500">
                      {attendance.length} total records
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="eiro-table attendance-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Team</th>
                        <th>Event / Session</th>
                        <th>Day</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {attendance.map((record) => {
                        const team = teams.find(
                          (item) => item.id === record.teamId
                        );

                        const student = students.find(
                          (item) => item.id === record.studentId
                        );

                        return (
                          <tr key={record.id}>

                            <td className="text-xs text-gray-300">
                              {student?.name ||
                                record.studentId ||
                                '—'}
                            </td>

                            <td className="text-xs text-gray-400">
                              {team?.teamName ||
                                team?.displayTeamCode ||
                                record.teamId ||
                                record.entryId ||
                                '—'}
                            </td>

                            <td className="text-xs text-gray-400">
                              {record.eventId ||
                                record.sessionId ||
                                '—'}
                            </td>

                            <td className="text-xs text-gray-400">
                              {record.dayNumber ?? '—'}
                            </td>

                            <td>
                              <Badge
                                variant={
                                  record.status === 'PRESENT'
                                    ? 'success'
                                    : record.status === 'ABSENT'
                                      ? 'danger'
                                      : 'warning'
                                }
                              >
                                {record.status || 'NOT_MARKED'}
                              </Badge>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </>
        )}

      </main>

      {/* ── ANIMATED BACKGROUND CSS ── */}

      <style jsx global>{`

        /* PAGE ROOT
           Transparent — no large dark rectangle.
        */

        .attendance-page {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background: transparent !important;
        }

        .attendance-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        .attendance-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .attendance-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .attendance-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;

          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );

          animation: attendanceOrbOne 18s ease-in-out infinite alternate;
        }

        .attendance-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;

          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );

          animation: attendanceOrbTwo 22s ease-in-out infinite alternate;
        }

        .attendance-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;

          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );

          animation: attendanceOrbThree 20s ease-in-out infinite alternate;
        }

        .attendance-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;

          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );

          animation: attendanceOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .attendance-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );

          background-size: 27px 27px;
          opacity: 0.55;

          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );

          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ROTATING RINGS */

        .attendance-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .attendance-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;

          animation: attendanceRingOne 35s linear infinite;
        }

        .attendance-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;

          border-color: rgba(178, 75, 178, 0.14);

          animation: attendanceRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .attendance-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;

          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);

          animation: attendanceParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .attendance-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .attendance-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);

          animation: attendanceBubbleFloat linear infinite;
        }

        .attendance-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .attendance-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes attendanceBubbleFloat {
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

        /* CENTRAL GLOW */

        .attendance-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);

          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* TRANSPARENT KPI CARDS */

        .attendance-kpi-shell {
          min-width: 0;
          background: transparent !important;
        }

        .attendance-kpi-shell > * {
          background: rgba(18, 12, 29, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.14) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* TRANSPARENT CONTENT CARDS */

        .attendance-page .attendance-card {
          background: rgba(18, 12, 29, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .attendance-page .attendance-card:hover {
          background: rgba(25, 16, 38, 0.20) !important;
          border-color: rgba(221, 143, 224, 0.28) !important;
        }

        /* TABLE */

        .attendance-table-header {
          background: transparent !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .attendance-table {
          background: transparent !important;
        }

        .attendance-table thead {
          background: rgba(18, 12, 29, 0.15) !important;
        }

        .attendance-table tbody tr {
          background: transparent !important;
          transition: background 0.2s ease;
        }

        .attendance-table tbody tr:hover {
          background: rgba(168, 85, 247, 0.07) !important;
        }

        /* PROGRESS BAR */

        .attendance-progress-track {
          width: 100%;
          height: 5px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.07);
        }

        .attendance-progress-fill {
          height: 100%;
          border-radius: inherit;

          background: linear-gradient(
            90deg,
            #8b5cf6,
            #c084fc,
            #e879f9
          );

          box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
          transition: width 0.5s ease;
        }

        .attendance-error {
          background: transparent !important;
        }

        /* ORB ANIMATIONS */

        @keyframes attendanceOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes attendanceOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes attendanceOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }

          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes attendanceOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        /* RING ANIMATIONS */

        @keyframes attendanceRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }

          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes attendanceRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }

          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        /* PARTICLE ANIMATION */

        @keyframes attendanceParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }

          50% {
            opacity: 0.9;
          }

          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .attendance-orb-one {
            width: 320px;
            height: 320px;
          }

          .attendance-orb-two {
            width: 360px;
            height: 360px;
          }

          .attendance-orb-three {
            width: 340px;
            height: 340px;
          }

          .attendance-ring-one {
            width: 300px;
            height: 300px;
          }

          .attendance-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .attendance-orb,
          .attendance-ring,
          .attendance-particle,
          .attendance-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
