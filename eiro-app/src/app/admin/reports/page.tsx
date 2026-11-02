'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  KpiCard,
  Button,
} from '@/components/ui';

import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Trophy,
  Users,
  CreditCard,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { getAll } from '@/lib/firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportId =
  | 'participation'
  | 'payment'
  | 'results'
  | 'attendance'
  | 'imports'
  | 'adjustments';

type Row = Record<string, unknown>;

interface School {
  id: string;
  name?: string;
  districtId?: string;
}

interface Team {
  id: string;
  schoolId?: string;
}

interface Student {
  id: string;
  schoolId?: string;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

const REPORT_TYPES: {
  id: ReportId;
  title: string;
  desc: string;
  icon: typeof Users;
  bg: string;
  border: string;
  text: string;
}[] = [
  {
    id: 'participation',
    title: 'Participation Report',
    desc: 'Teams and schools from stored participation records',
    icon: Users,
    bg: 'bg-indigo-600/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  {
    id: 'payment',
    title: 'Payment Summary',
    desc: 'Payment records and their stored verification statuses',
    icon: CreditCard,
    bg: 'bg-green-600/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  {
    id: 'results',
    title: 'Results & Rankings',
    desc: 'Stored result and ranking documents',
    icon: Trophy,
    bg: 'bg-yellow-600/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
  },
  {
    id: 'attendance',
    title: 'Attendance Report',
    desc: 'Training and competition attendance records',
    icon: Calendar,
    bg: 'bg-blue-600/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  {
    id: 'imports',
    title: 'Import Audit',
    desc: 'Import jobs, validation statuses and timestamps',
    icon: FileText,
    bg: 'bg-purple-600/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  {
    id: 'adjustments',
    title: 'Adjustment Audit',
    desc: 'Immutable team adjustment history records',
    icon: BarChart3,
    bg: 'bg-orange-600/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
];

// ─── Animated Background Settings ─────────────────────────────────────────────

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

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

function csvValue(value: unknown) {
  let text: string;

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    text = value.toDate().toISOString();
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else if (value && typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value ?? '');
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(name: string, rows: Row[]) {
  const headers = [
    ...new Set(rows.flatMap((row) => Object.keys(row))),
  ];

  const body = [
    headers.map(csvValue).join(','),
    ...rows.map((row) =>
      headers.map((header) => csvValue(row[header])).join(',')
    ),
  ].join('\r\n');

  const url = URL.createObjectURL(
    new Blob([`\uFEFF${body}`], {
      type: 'text/csv;charset=utf-8',
    })
  );

  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${name}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports] = useState<Record<ReportId, Row[]>>({
    participation: [],
    payment: [],
    results: [],
    attendance: [],
    imports: [],
    adjustments: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ── Load report data ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [
        schools,
        teams,
        students,
        payments,
        results,
        training,
        competition,
        imports,
        adjustments,
      ] = await Promise.all([
        getAll<School>('schools'),
        getAll<Team>('teams'),
        getAll<Student>('students'),
        getAll<Row>('payments'),
        getAll<Row>('results'),
        getAll<Row>('trainingAttendance'),
        getAll<Row>('studentAttendance'),
        getAll<Row>('importJobs'),
        getAll<Row>('teamAdjustmentHistory'),
      ]);

      const schoolById = new Map(
        schools.map((school) => [school.id, school])
      );

      const schoolStudentCounts = new Map<string, number>();

      students.forEach((student) => {
        if (student.schoolId) {
          schoolStudentCounts.set(
            student.schoolId,
            (schoolStudentCounts.get(student.schoolId) || 0) + 1
          );
        }
      });

      setReports({
        participation: teams.map((team) => {
          const school = schoolById.get(team.schoolId || '');

          return {
            ...team,
            schoolName: school?.name || '',
            districtId: school?.districtId || '',
            studentsAtSchool:
              schoolStudentCounts.get(school?.id || '') || 0,
          };
        }),

        payment: payments,
        results,

        attendance: [
          ...training.map((record) => ({
            ...record,
            recordType: 'training',
          })),
          ...competition.map((record) => ({
            ...record,
            recordType: 'competition',
          })),
        ],

        imports,
        adjustments,
      });

      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Could not load report data. One or more collections may not be readable under your Firestore access.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // ── Refresh ─────────────────────────────────────────────────────────────────

  const refresh = () => {
    setLoading(true);
    setError('');
    setMessage('');
    void load();
  };

  // ── Export report ───────────────────────────────────────────────────────────

  const exportReport = (id: ReportId, title: string) => {
    const rows = reports[id];

    if (!rows.length) {
      setMessage(
        `No ${title.toLowerCase()} records are available to export.`
      );
      return;
    }

    downloadCsv(`eiro-${id}-report`, rows);

    setMessage(
      `${title} CSV downloaded (${rows.length} records).`
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="reports-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ── ANIMATED BACKGROUND ─────────────────────────────────────────── */}

      <div
        className="reports-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="reports-orb reports-orb-one" />
        <div className="reports-orb reports-orb-two" />
        <div className="reports-orb reports-orb-three" />
        <div className="reports-orb reports-orb-four" />

        <div className="reports-dot-grid absolute inset-0" />

        <div className="reports-ring reports-ring-one" />
        <div className="reports-ring reports-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`reports-particle ${particle}`}
          />
        ))}

        <div className="reports-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`reports-bubble ${bubble.tone}`}
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

        <div className="reports-center-glow" />
      </div>

      {/* ── PAGE CONTENT ────────────────────────────────────────────────── */}

      <main className="reports-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Reports & Audit"
          subtitle="Download CSV exports from the currently stored records"
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

        {error && (
          <p
            role="alert"
            className="text-sm text-red-400"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="text-sm text-green-400"
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* ── KPI CARDS ─────────────────────────────────────────────── */}

            <div className="reports-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div className="reports-kpi-item">
                <KpiCard
                  title="Schools"
                  value={
                    new Set(
                      reports.participation
                        .map((row) => String(row.schoolId || ''))
                        .filter(Boolean)
                    ).size
                  }
                  icon={Users}
                  color="indigo"
                />
              </div>

              <div className="reports-kpi-item">
                <KpiCard
                  title="Teams"
                  value={reports.participation.length}
                  icon={Trophy}
                  color="blue"
                />
              </div>

              <div className="reports-kpi-item">
                <KpiCard
                  title="Payment Records"
                  value={reports.payment.length}
                  icon={CreditCard}
                  color="green"
                />
              </div>

              <div className="reports-kpi-item">
                <KpiCard
                  title="Result Records"
                  value={reports.results.length}
                  icon={TrendingUp}
                  color="yellow"
                />
              </div>

            </div>

            {/* ── EMPTY STATE ───────────────────────────────────────────── */}

            {Object.values(reports).every(
              (rows) => rows.length === 0
            ) && (
              <Card className="reports-glass-card text-center text-gray-400">
                No reportable records were found in the loaded collections.
              </Card>
            )}

            {/* ── REPORT DOWNLOAD CARDS ─────────────────────────────────── */}

            <div className="reports-grid grid grid-cols-1 lg:grid-cols-2 gap-4">

              {REPORT_TYPES.map((report) => {
                const Icon = report.icon;
                const count = reports[report.id].length;

                return (
                  <Card
                    key={report.id}
                    className="reports-glass-card flex items-start gap-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${report.bg} ${report.border}`}
                    >
                      <Icon
                        className={`w-5 h-5 ${report.text}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm mb-0.5">
                        {report.title}
                      </h3>

                      <p className="text-xs text-gray-400 mb-3">
                        {report.desc}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-300">
                          {count} records
                        </span>

                        <Button
                          size="sm"
                          icon={Download}
                          onClick={() =>
                            exportReport(report.id, report.title)
                          }
                        >
                          Download CSV
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

            </div>

            {/* ── AUDIT INFORMATION ─────────────────────────────────────── */}

            <Card className="reports-glass-card border-purple-500/20">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />

                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">
                    Immutable Audit Log
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Adjustment exports use the immutable team adjustment
                    history collection. Client-side report exports do not
                    modify Firestore records.
                  </p>
                </div>
              </div>
            </Card>

          </>
        )}

      </main>

      {/* ── BACKGROUND STYLES ────────────────────────────────────────────── */}

      <style jsx global>{`

        /* PAGE BASE
           Important: no full-screen dark overlay or glass layer here. */

        .reports-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .reports-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* ANIMATED BACKGROUND LAYER */

        .reports-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .reports-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .reports-orb-one {
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
          animation: reportsOrbOne 18s ease-in-out infinite alternate;
        }

        .reports-orb-two {
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
          animation: reportsOrbTwo 22s ease-in-out infinite alternate;
        }

        .reports-orb-three {
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
          animation: reportsOrbThree 20s ease-in-out infinite alternate;
        }

        .reports-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: reportsOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .reports-dot-grid {
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

        .reports-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .reports-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: reportsRingOne 35s linear infinite;
        }

        .reports-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: reportsRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .reports-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: reportsParticle 8s ease-in-out infinite alternate;
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

        .reports-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .reports-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: reportsBubbleFloat linear infinite;
        }

        .reports-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .reports-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .reports-center-glow {
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

        /* TRANSPARENT CARDS
           No backdrop blur. The background animation stays visible
           through each card instead of being hidden by a solid panel. */

        .reports-page .reports-glass-card {
          background: rgba(12, 8, 20, 0.30) !important;
          border-color: rgba(221, 143, 224, 0.16) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* KPI CARD WRAPPERS */

        .reports-page .reports-kpi-item {
          min-width: 0;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .reports-page .reports-kpi-item > * {
          background-color: rgba(12, 8, 20, 0.30) !important;
          border-color: rgba(221, 143, 224, 0.16) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08) !important;
        }

        /* Keep report card containers transparent */

        .reports-page .reports-grid,
        .reports-page .reports-kpi-grid {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* ANIMATIONS */

        @keyframes reportsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes reportsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes reportsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes reportsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes reportsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes reportsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes reportsParticle {
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

        @keyframes reportsBubbleFloat {
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

        /* MOBILE */

        @media (max-width: 640px) {
          .reports-orb-one {
            width: 320px;
            height: 320px;
          }

          .reports-orb-two {
            width: 360px;
            height: 360px;
          }

          .reports-orb-three {
            width: 340px;
            height: 340px;
          }

          .reports-ring-one {
            width: 300px;
            height: 300px;
          }

          .reports-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .reports-orb,
          .reports-ring,
          .reports-particle,
          .reports-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}