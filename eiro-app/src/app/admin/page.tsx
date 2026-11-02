'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KpiCard,
  Card,
  StatusBadge,
  CategoryBadge,
  Button,
  PageHeader,
} from '@/components/ui';
import {
  Users,
  School,
  Trophy,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronRight,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

interface SchoolRecord {
  id: string;
  name?: string;
  districtId?: string;
  verificationStatus?: string;
}

interface Team {
  id: string;
  teamName?: string;
  categoryCode?: string;
  schoolId?: string;
}

interface Student {
  id: string;
  schoolId?: string;
}

interface Registration {
  id: string;
  teamId?: string;
  schoolId?: string;
  state?: string;
  feeStatus?: string;
  submittedAt?: unknown;
  updatedAt?: unknown;
}

interface Payment {
  id: string;
  status?: string;
  amountMinorUnits?: number;
}

interface Entry {
  id: string;
  teamId?: string;
  entryStatus?: string;
}

interface District {
  id: string;
  name?: string;
}

interface Season {
  id: string;
  name?: string;
  year?: number;
  phase?: string;
}

interface ImportJob {
  id: string;
  status?: string;
}

interface Adjustment {
  id: string;
  status?: string;
}

function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().getTime();
  }

  if (typeof value === 'string') return Date.parse(value) || 0;

  return 0;
}

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

/* Floating bubbles - same settings as Fees page */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function AdminDashboard() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [
        schoolData,
        teamData,
        studentData,
        registrationData,
        paymentData,
        entryData,
        districtData,
        seasonData,
        importData,
        adjustmentData,
      ] = await Promise.all([
        getAll<SchoolRecord>('schools'),
        getAll<Team>('teams'),
        getAll<Student>('students'),
        getAll<Registration>('registrations'),
        getAll<Payment>('payments'),
        getAll<Entry>('stageEntries'),
        getAll<District>('districts'),
        getAll<Season>('seasons'),
        getAll<ImportJob>('importJobs'),
        getAll<Adjustment>('teamAdjustmentRequests'),
      ]);

      setSchools(schoolData);
      setTeams(teamData);
      setStudents(studentData);
      setRegistrations(registrationData);
      setPayments(paymentData);
      setEntries(entryData);
      setDistricts(districtData);
      setSeasons(seasonData);
      setImports(importData);
      setAdjustments(adjustmentData);
    } catch (e) {
      console.error(e);

      setError(
        'Could not load the admin overview. One or more collections may be unavailable under your Firestore access.'
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

  const currentSeason = useMemo(
    () =>
      [...seasons].sort(
        (a, b) => (b.year || 0) - (a.year || 0)
      )[0],
    [seasons]
  );

  const verifiedPayments = payments.filter(
    (payment) => payment.status === 'VERIFIED'
  );

  const pendingRegistrations = registrations.filter((registration) =>
    ['SUBMITTED', 'UNDER_REVIEW'].includes(registration.state || '')
  );

  const pendingAdjustments = adjustments.filter(
    (adjustment) => adjustment.status === 'PENDING_REVIEW'
  ).length;

  const validatedImports = imports.filter(
    (job) => job.status === 'VALIDATED'
  ).length;

  const activeEntries = entries.filter((entry) =>
    ['CHECKED_IN', 'COMPETING'].includes(entry.entryStatus || '')
  );

  const recentRegistrations = useMemo(
    () =>
      [...registrations]
        .sort(
          (a, b) =>
            timestamp(b.submittedAt || b.updatedAt) -
            timestamp(a.submittedAt || a.updatedAt)
        )
        .slice(0, 5),
    [registrations]
  );

  const districtSummary = useMemo(
    () =>
      districts.map((district) => {
        const districtSchools = schools.filter(
          (school) => school.districtId === district.id
        );

        const schoolIds = new Set(
          districtSchools.map((school) => school.id)
        );

        const districtTeams = teams.filter((team) =>
          schoolIds.has(team.schoolId || '')
        );

        const teamIds = new Set(
          districtTeams.map((team) => team.id)
        );

        const activeTeamIds = new Set(
          entries
            .filter(
              (entry) =>
                teamIds.has(entry.teamId || '') &&
                ['CHECKED_IN', 'COMPETING'].includes(
                  entry.entryStatus || ''
                )
            )
            .map((entry) => entry.teamId)
        );

        return {
          ...district,
          teamCount: districtTeams.length,
          activeCount: activeTeamIds.size,
        };
      }),
    [districts, schools, teams, entries]
  );

  return (
    <div className="admin-dashboard relative isolate min-h-screen w-full overflow-hidden">

      {/* ORIGINAL ADMIN BACKGROUND + FLOATING BUBBLES */}

      <div
        className="admin-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="admin-orb admin-orb-one" />
        <div className="admin-orb admin-orb-two" />
        <div className="admin-orb admin-orb-three" />
        <div className="admin-orb admin-orb-four" />

        <div className="admin-dot-grid absolute inset-0" />

        <div className="admin-ring admin-ring-one" />
        <div className="admin-ring admin-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`admin-particle ${particle}`}
          />
        ))}

        <div className="admin-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`admin-bubble ${bubble.tone}`}
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

        <div className="admin-center-glow" />
      </div>

      {/* DASHBOARD CONTENT */}

      <main className="admin-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Competition Overview"
          subtitle={
            currentSeason
              ? `${currentSeason.name || currentSeason.year || currentSeason.id} · ${currentSeason.phase || 'Season status unavailable'}`
              : 'Live summary from Firestore'
          }
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={refresh}
                disabled={loading}
              >
                Refresh
              </Button>

              <Link href="/admin/reports">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                >
                  Reports
                </Button>
              </Link>

              <Link href="/admin/live">
                <Button size="sm" icon={RefreshCw}>
                  Live Operations
                </Button>
              </Link>
            </>
          }
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-300 backdrop-blur-xl"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            <div className="admin-season-glass flex items-center justify-between gap-3 rounded-2xl p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-white">
                  {currentSeason?.name ||
                    (currentSeason?.year
                      ? `Season ${currentSeason.year}`
                      : 'Season information unavailable')}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {currentSeason?.phase || 'No season phase recorded'}
                </p>
              </div>

              <Link href="/admin/seasons">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronRight}
                  iconPosition="right"
                >
                  Manage Season
                </Button>
              </Link>
            </div>

            {/* FIRST KPI ROW */}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Schools"
                  value={schools.length}
                  icon={School}
                  color="blue"
                />
              </div>

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Teams"
                  value={teams.length}
                  icon={Trophy}
                  color="indigo"
                />
              </div>

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Students"
                  value={students.length}
                  icon={Users}
                  color="purple"
                />
              </div>

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Verified Payments"
                  value={verifiedPayments.length}
                  icon={CreditCard}
                  color="green"
                  subtitle={`${verifiedPayments
                    .reduce(
                      (sum, payment) =>
                        sum + (payment.amountMinorUnits || 0),
                      0
                    )
                    .toLocaleString()} minor units`}
                />
              </div>

            </div>

            {/* SECOND KPI ROW */}

            <div className="grid grid-cols-2 gap-4">

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Pending Registration Reviews"
                  value={pendingRegistrations.length}
                  icon={Clock}
                  color="orange"
                />
              </div>

              <div className="admin-glass-shell min-w-0">
                <KpiCard
                  title="Active Stage Entries"
                  value={activeEntries.length}
                  icon={CheckCircle2}
                  color="green"
                />
              </div>

            </div>

            {/* ALERTS */}

            <div className="admin-glass-shell">
              <Card padding="none">
                <div className="border-b border-white/10 px-6 py-4">
                  <h3 className="text-sm font-semibold text-white">
                    Alerts & Actions Required
                  </h3>
                </div>

                <div className="divide-y divide-white/10">

                  {pendingRegistrations.length > 0 && (
                    <Link
                      href="/admin/schools"
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/5"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-yellow-400" />

                      <p className="flex-1 text-sm text-gray-300">
                        {pendingRegistrations.length} registration(s)
                        awaiting review
                      </p>

                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </Link>
                  )}

                  {pendingAdjustments > 0 && (
                    <Link
                      href="/admin/adjustments"
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/5"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />

                      <p className="flex-1 text-sm text-gray-300">
                        {pendingAdjustments} adjustment request(s)
                        pending review
                      </p>

                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </Link>
                  )}

                  {validatedImports > 0 && (
                    <Link
                      href="/admin/imports"
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/5"
                    >
                      <Upload className="h-4 w-4 shrink-0 text-blue-400" />

                      <p className="flex-1 text-sm text-gray-300">
                        {validatedImports} validated import job(s)
                        ready to commit
                      </p>

                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </Link>
                  )}

                  {pendingRegistrations.length === 0 &&
                    pendingAdjustments === 0 &&
                    validatedImports === 0 && (
                      <p className="px-6 py-4 text-sm text-gray-400">
                        No pending actions in the loaded collections.
                      </p>
                    )}

                </div>
              </Card>
            </div>

            {/* REGISTRATIONS AND DISTRICT PARTICIPATION */}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

              <div className="admin-glass-shell min-w-0">
                <Card padding="none">

                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h3 className="text-sm font-semibold text-white">
                      Recent Registrations
                    </h3>

                    <Link href="/admin/schools">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ChevronRight}
                        iconPosition="right"
                      >
                        View all
                      </Button>
                    </Link>
                  </div>

                  {recentRegistrations.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">
                      No registrations found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="eiro-table admin-table">
                        <thead>
                          <tr>
                            <th>Team</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Fee</th>
                          </tr>
                        </thead>

                        <tbody>
                          {recentRegistrations.map((registration) => {
                            const team = teams.find(
                              (item) => item.id === registration.teamId
                            );

                            const school = schools.find(
                              (item) =>
                                item.id ===
                                (registration.schoolId || team?.schoolId)
                            );

                            return (
                              <tr key={registration.id}>
                                <td>
                                  <div className="text-xs font-medium text-white">
                                    {team?.teamName ||
                                      registration.teamId ||
                                      registration.id}
                                  </div>

                                  <div className="text-[10px] text-gray-400">
                                    {school?.name || school?.id || '—'}
                                  </div>
                                </td>

                                <td>
                                  {team?.categoryCode ? (
                                    <CategoryBadge
                                      code={
                                        team.categoryCode as CategoryCode
                                      }
                                    />
                                  ) : (
                                    '—'
                                  )}
                                </td>

                                <td>
                                  <StatusBadge
                                    status={
                                      registration.state || 'UNKNOWN'
                                    }
                                  />
                                </td>

                                <td>
                                  <StatusBadge
                                    status={
                                      registration.feeStatus || 'UNKNOWN'
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </Card>
              </div>

              <div className="admin-glass-shell min-w-0">
                <Card padding="none">

                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h3 className="text-sm font-semibold text-white">
                      District Participation
                    </h3>

                    <Link href="/admin/districts">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={TrendingUp}
                        iconPosition="right"
                      >
                        Details
                      </Button>
                    </Link>
                  </div>

                  {districtSummary.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">
                      No district records found.
                    </p>
                  ) : (
                    <div className="space-y-4 p-4">
                      {districtSummary.map((district) => (
                        <div
                          key={district.id}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium text-white">
                              {district.name || district.id}
                            </span>

                            <span className="text-gray-400">
                              {district.activeCount}/{district.teamCount} teams active
                            </span>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                              style={{
                                width: `${
                                  district.teamCount
                                    ? (district.activeCount /
                                        district.teamCount) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </Card>
              </div>

            </div>
          </>
        )}
      </main>

      {/* ANIMATION AND TRANSPARENT CARD STYLES */}

      <style jsx global>{`

        /* MAIN PAGE */

        .admin-dashboard {
          isolation: isolate;
          position: relative;
          background: #050308;
          min-height: 100vh;
        }

        .admin-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* BACKGROUND LAYER */

        .admin-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* ORIGINAL GLOWING ORBS */

        .admin-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .admin-orb-one {
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
          animation: adminOrbOne 18s ease-in-out infinite alternate;
        }

        .admin-orb-two {
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
          animation: adminOrbTwo 22s ease-in-out infinite alternate;
        }

        .admin-orb-three {
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
          animation: adminOrbThree 20s ease-in-out infinite alternate;
        }

        .admin-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: adminOrbFour 17s ease-in-out infinite alternate;
        }

        /* ORIGINAL DOT GRID */

        .admin-dot-grid {
          position: absolute;
          inset: 0;
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

        /* ORIGINAL RINGS */

        .admin-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .admin-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: adminRingOne 35s linear infinite;
        }

        .admin-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: adminRingTwo 28s linear infinite;
        }

        /* ORIGINAL PARTICLES */

        .admin-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: adminParticle 8s ease-in-out infinite alternate;
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

        .admin-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .admin-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: adminBubbleFloat linear infinite;
        }

        .admin-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .admin-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes adminBubbleFloat {
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

        /* ORIGINAL CENTRAL GLOW */

        .admin-center-glow {
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

        /* SEASON PANEL - TRANSPARENT */

        .admin-season-glass {
          position: relative;
          background: transparent !important;
          border: 1px solid rgba(221, 143, 224, 0.18);
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        /* KPI AND CARD WRAPPERS - NO OPAQUE BACKGROUND */

        .admin-glass-shell {
          min-width: 0;
          border-radius: 16px;
          isolation: isolate;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        /*
          IMPORTANT:
          Remove the filled background from the actual direct
          Card/KpiCard component root. Keep the background animation
          visible behind the content.
        */

        .admin-glass-shell > * {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          border-radius: 16px;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
          transition:
            border-color 300ms ease,
            box-shadow 300ms ease;
        }

        /* Remove nested opaque card layers */

        .admin-glass-shell > * > * {
          background-color: transparent !important;
          background-image: none !important;
        }

        .admin-glass-shell:hover > * {
          background: transparent !important;
          background-color: transparent !important;
          border-color: rgba(216, 180, 254, 0.4) !important;
          box-shadow: 0 8px 28px rgba(79, 42, 120, 0.08) !important;
        }

        /* Keep dashboard content transparent */

        .admin-dashboard .admin-content,
        .admin-dashboard .admin-content > main {
          background: transparent !important;
        }

        /* TABLE */

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: transparent !important;
        }

        .admin-table thead,
        .admin-table tbody {
          background: transparent !important;
        }

        .admin-table th {
          color: #bdb3d8;
          background: rgba(255, 255, 255, 0.025) !important;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-align: left;
          white-space: nowrap;
          padding: 13px 16px;
        }

        .admin-table td {
          color: #d6cce5;
          background: transparent !important;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 13px 16px;
          font-size: 12px;
          white-space: nowrap;
        }

        .admin-table tbody tr {
          background: transparent !important;
          transition: background 200ms ease;
        }

        .admin-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.035) !important;
        }

        /* ORIGINAL ORB ANIMATIONS */

        @keyframes adminOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes adminOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes adminOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }

          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes adminOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        /* ORIGINAL RING ANIMATIONS */

        @keyframes adminRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }

          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes adminRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }

          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        /* ORIGINAL PARTICLE ANIMATION */

        @keyframes adminParticle {
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
          .admin-orb-one {
            width: 320px;
            height: 320px;
          }

          .admin-orb-two {
            width: 360px;
            height: 360px;
          }

          .admin-orb-three {
            width: 340px;
            height: 340px;
          }

          .admin-ring-one {
            width: 300px;
            height: 300px;
          }

          .admin-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .admin-orb,
          .admin-ring,
          .admin-particle,
          .admin-bubble {
            animation: none !important;
          }

          .admin-glass-shell > *,
          .admin-table tbody tr {
            transition: none !important;
          }
        }

      `}</style>
    </div>
  );
}
