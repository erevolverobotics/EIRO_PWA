
'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  CategoryBadge,
  Modal,
} from '@/components/ui';

import {
  Plus,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { queryByField } from '@/lib/firebase/firestore';

import type {
  Registration,
  Student,
  Team,
} from '@/lib/types';

/* =========================================
   TYPES
========================================= */

type RegistrationRow = Registration & { id: string };
type TeamRow = Team & { id: string };

interface MemberInfo {
  id: string;
  name: string;
  grade: string;
  section?: string;
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
   REGISTRATIONS PAGE
========================================= */

export default function RegistrationsPage() {
  const { roles } = useAuth();

  const schoolId = roles.find(
    role => role.role === 'SCHOOL_COORDINATOR' && role.active
  )?.scopeId;

  /* =========================================
     STATE
  ========================================= */

  const [registrations, setRegistrations] =
    useState<RegistrationRow[]>([]);

  const [teams, setTeams] =
    useState<TeamRow[]>([]);

  const [membersByTeam, setMembersByTeam] =
    useState<Record<string, MemberInfo[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const [filter, setFilter] = useState('ALL');

  const [expandedTeams, setExpandedTeams] =
    useState<Set<string>>(new Set());

  const [detailTeam, setDetailTeam] =
    useState<{
      team: TeamRow;
      reg: RegistrationRow;
    } | null>(null);

  /* =========================================
     LOAD REGISTRATIONS
     FIREBASE LOGIC UNCHANGED
  ========================================= */

  useEffect(() => {
    if (!schoolId || schoolId === 'unassigned') return;

    let active = true;

    Promise.all([
      queryByField<Registration>(
        'registrations',
        'schoolId',
        schoolId
      ),
      queryByField<Team>(
        'teams',
        'schoolId',
        schoolId
      ),
      queryByField<Student>(
        'students',
        'schoolId',
        schoolId
      ),
    ])
      .then(([registrationData, teamData, students]) => {
        if (!active) return;

        const registeredTeamIds = new Set(
          registrationData.map(r => r.teamId)
        );

        /* BUILD TEAM MEMBER LIST */

        const memberMap: Record<string, MemberInfo[]> = {};

        students.forEach(s => {
          if (!s.teamId) return;

          if (!memberMap[s.teamId]) {
            memberMap[s.teamId] = [];
          }

          memberMap[s.teamId].push({
            id:
              (s as any).id ??
              s.teamId + '_' + memberMap[s.teamId].length,

            name: (
              (s as any).name ??
              (s as any).studentName ??
              (s as any).fullName ??
              '—'
            ) as string,

            grade: ((s as any).grade ?? '') as string,
            section: ((s as any).section ?? '') as string,
          });
        });

        /* UPDATE STATE */

        setRegistrations(registrationData);

        setTeams(
          teamData.filter(team =>
            registeredTeamIds.has(team.id)
          )
        );

        setMembersByTeam(memberMap);
      })
      .catch(loadError => {
        console.error(
          'Failed to load school registrations',
          loadError
        );

        if (active) {
          setError(
            'Unable to load registrations. Check your connection and access, then retry.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [schoolId, reload]);

  /* =========================================
     DERIVED DATA
  ========================================= */

  const teamById = new Map(
    teams.map(team => [team.id, team])
  );

  const loadingData = Boolean(
    schoolId &&
    schoolId !== 'unassigned' &&
    loading
  );

  /* =========================================
     STATUS FILTER
  ========================================= */

  const filteredRegistrations = registrations.filter(
    registration =>
      filter === 'ALL' || registration.state === filter
  );

  /* =========================================
     EXPAND / COLLAPSE MEMBERS
  ========================================= */

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);

      next.has(teamId)
        ? next.delete(teamId)
        : next.add(teamId);

      return next;
    });
  };

  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="registrations-page relative isolate min-h-screen w-full">

      {/* FULL SCREEN ANIMATED BACKGROUND */}

      <div className="reg-ambient" aria-hidden="true">
        <div className="reg-grid" />

        <div className="reg-orb reg-orb-one" />
        <div className="reg-orb reg-orb-two" />

        <div className="reg-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`reg-bubble ${bubble.tone}`}
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

      {/* PAGE CONTENT */}

      <div className="reg-content relative z-10 w-full max-w-none space-y-6">

        {/* HEADER */}

        <PageHeader
          title="My Registrations"
          subtitle="All team registrations submitted by your school"
          actions={
            <Link href="/coordinator/register">
              <Button size="sm" icon={Plus}>
                Register Team
              </Button>
            </Link>
          }
        />

        {/* SCHOOL ASSIGNMENT */}

        {!schoolId || schoolId === 'unassigned' ? (
          <Card className="reg-glass-card">
            <p className="text-amber-400">
              Your coordinator account is not assigned to a school.
              Contact an administrator to link your account.
            </p>
          </Card>
        ) : null}

        {/* ERROR AND RETRY */}

        {error ? (
          <Card className="reg-glass-card flex items-center justify-between gap-4">
            <p className="text-sm text-red-400">
              {error}
            </p>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setLoading(true);
                setError('');
                setReload(v => v + 1);
              }}
            >
              Retry
            </Button>
          </Card>
        ) : null}

        {/* STATUS FILTER ONLY — SEARCH CARD REMOVED */}

        <div className="reg-filter-panel w-full">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="eiro-input w-full"
            aria-label="Filter registrations by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CORRECTION_REQUIRED">
              Correction Required
            </option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>

        {/* LOADING / EMPTY / REGISTRATION LIST */}

        {loadingData ? (
          <Card className="reg-glass-card py-12 text-center">
            <p className="text-gray-400">
              Loading registrations…
            </p>
          </Card>
        ) : registrations.length === 0 ? (
          <Card className="reg-glass-card py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-indigo-400" />

            <p className="font-medium text-gray-300">
              No registrations yet
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Teams registered to your school will appear here.
            </p>
          </Card>
        ) : filteredRegistrations.length === 0 ? (
          <Card className="reg-glass-card py-12 text-center">
            <p className="text-gray-400">
              No registrations match the selected status.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRegistrations.map(registration => {
              const team = teamById.get(registration.teamId);

              if (!team) {
                return (
                  <Card
                    key={registration.id}
                    className="reg-glass-card"
                  >
                    <p className="text-sm text-amber-400">
                      Registration {registration.id} references a team
                      that could not be loaded.
                    </p>
                  </Card>
                );
              }

              const members = membersByTeam[team.id] ?? [];
              const isExpanded = expandedTeams.has(team.id);

              return (
                <Card
                  key={registration.id}
                  className="reg-glass-card reg-team-card"
                >
                  {/* TEAM TOP ROW */}

                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">

                      <div className="mb-1.5 flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-white">
                          {team.teamName ||
                            team.displayTeamCode ||
                            team.id}
                        </h3>

                        {team.displayTeamCode && (
                          <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-xs text-indigo-400">
                            {team.displayTeamCode}
                          </span>
                        )}

                        <CategoryBadge code={team.categoryCode} />

                        <StatusBadge status={registration.state} />

                        <StatusBadge status={registration.feeStatus} />
                      </div>

                      {/* MEMBER COUNT */}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {members.length} member
                          {members.length !== 1 ? 's' : ''}
                        </span>

                        {members.length > 0 && !isExpanded && (
                          <span className="max-w-xs truncate text-gray-500">
                            {members.map(m => m.name).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* CORRECTION NOTE */}

                      {registration.state === 'CORRECTION_REQUIRED' &&
                        (registration as any).correctionNote && (
                          <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
                            ⚠ Correction required:{' '}
                            {(registration as any).correctionNote}
                          </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDetailTeam({
                            team,
                            reg: registration,
                          })
                        }
                      >
                        View Details
                      </Button>

                      {members.length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={
                            isExpanded
                              ? ChevronUp
                              : ChevronDown
                          }
                          onClick={() => toggleExpand(team.id)}
                        >
                          {isExpanded ? 'Hide' : 'Members'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED MEMBER LIST */}

                  {isExpanded && members.length > 0 && (
                    <div className="reg-members-expanded mt-3 space-y-2 border-t border-white/10 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Team Members
                      </p>

                      {members.map((m, i) => (
                        <div
                          key={m.id}
                          className="reg-member-row flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2"
                        >
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-indigo-300">
                            {i + 1}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-white">
                              {m.name}
                            </p>

                            <p className="text-xs text-gray-400">
                              Grade {m.grade}
                              {m.section
                                ? ` — Section ${m.section}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* DETAIL MODAL */}

        {detailTeam && (
          <Modal
            open={!!detailTeam}
            onClose={() => setDetailTeam(null)}
            title={`Team Details — ${
              detailTeam.team.teamName ||
              detailTeam.team.displayTeamCode
            }`}
          >
            <div className="reg-modal-content space-y-4 text-sm">

              {/* TEAM INFORMATION */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-gray-400">
                    Team ID
                  </p>

                  <span className="font-mono font-bold text-indigo-400">
                    {detailTeam.team.displayTeamCode || '—'}
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-400">
                    Category
                  </p>

                  <CategoryBadge
                    code={detailTeam.team.categoryCode}
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-400">
                    Registration Status
                  </p>

                  <StatusBadge status={detailTeam.reg.state} />
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-400">
                    Fee Status
                  </p>

                  <StatusBadge status={detailTeam.reg.feeStatus} />
                </div>
              </div>

              {/* TEAM MEMBERS */}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Team Members (
                  {(membersByTeam[detailTeam.team.id] ?? []).length}
                  )
                </p>

                {(membersByTeam[detailTeam.team.id] ?? []).length === 0 ? (
                  <p className="text-xs italic text-gray-500">
                    No member records found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(membersByTeam[detailTeam.team.id] ?? []).map(
                      (m, i) => (
                        <div
                          key={m.id}
                          className="reg-member-row flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2"
                        >
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-indigo-300">
                            {i + 1}
                          </div>

                          <div>
                            <p className="font-medium text-white">
                              {m.name}
                            </p>

                            <p className="text-xs text-gray-400">
                              Grade {m.grade}
                              {m.section
                                ? ` — Section ${m.section}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* CORRECTION NOTE */}

              {(detailTeam.reg as any).correctionNote && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="mb-1 text-xs font-semibold text-amber-400">
                    Correction Required:
                  </p>

                  <p className="text-xs text-amber-300">
                    {(detailTeam.reg as any).correctionNote}
                  </p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>

      {/* BACKGROUND AND PAGE STYLES */}

      <style jsx global>{`

        /* MAIN PAGE */

        .registrations-page {
          position: relative;
          isolation: isolate;
          width: 100%;
          min-height: 100vh;
          background: transparent !important;
          color: #f5f6fb;
          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .registrations-page * {
          box-sizing: border-box;
        }

        /* FULL SCREEN ANIMATED BACKGROUND */

        .reg-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        /* GRID */

        .reg-grid {
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

        .reg-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .reg-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .reg-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }

        /* BUBBLE CONTAINER */

        .reg-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        /* FLOATING BUBBLES */

        .reg-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: reg-float linear infinite;
        }

        .reg-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .reg-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }

        /* BUBBLE ANIMATION */

        @keyframes reg-float {
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

        .reg-content {
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

        .registrations-page .reg-glass-card {
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

        .registrations-page .reg-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }

        /* TEAM CARD */

        .reg-team-card {
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        /* STATUS FILTER */

        .reg-filter-panel {
          position: relative;
          z-index: 10;
          width: 100%;
        }

        .registrations-page .eiro-input {
          display: block;
          width: 100%;
          min-width: 0;
          height: 52px;
          padding: 0 16px;

          background: rgba(15, 23, 42, 0.48) !important;

          border: 1px solid rgba(148, 163, 184, 0.20);
          border-radius: 12px;

          color: #f8fafc;
          outline: none;
        }

        .registrations-page .eiro-input:focus {
          border-color: rgba(129, 140, 248, 0.75);
          outline: none;
        }

        .registrations-page .eiro-input option {
          background: #171329;
          color: #f8fafc;
        }

        /* MEMBER ROWS */

        .reg-member-row {
          background: rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .reg-member-row:hover {
          background: rgba(255, 255, 255, 0.065);
          border-color: rgba(168, 85, 247, 0.25);
        }

        /* RESPONSIVE */

        @media (max-width: 768px) {
          .reg-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .reg-content {
            padding: 16px 10px 24px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .reg-bubble {
            animation: none;
          }

          .reg-glass-card,
          .reg-member-row {
            transition: none;
          }
        }

      `}</style>
    </main>
  );
}
