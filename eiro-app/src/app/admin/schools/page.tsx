'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  CategoryBadge,
  Modal,
  Textarea,
} from '@/components/ui';

import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
  Users,
  UserCheck,
} from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import type { CategoryCode, RegistrationState } from '@/lib/types';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  grade: string;
  section?: string;
}

interface Team {
  id: string;
  registrationId: string;
  name: string;
  teamCode?: string;
  category?: CategoryCode;
  state: RegistrationState;
  memberCount: number;
  memberList: Member[];
  feeStatus: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  projectTitle?: string;
  correctionNote?: string;
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamApprovalsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [actionType, setActionType] = useState<
    'approve' | 'reject' | 'correction' | null
  >(null);
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const schoolSnap = await getDocs(collection(db, 'schools'));

      const schoolMap: Record<string, { name: string; code: string }> = {};

      schoolSnap.docs.forEach((d) => {
        const data = d.data();

        schoolMap[d.id] = {
          name: data.name ?? d.id,
          code: data.schoolCode ?? '',
        };
      });

      const [registrationSnap, teamSnap, studentSnap] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'students')),
      ]);

      const teamsById = new Map(teamSnap.docs.map((d) => [d.id, d.data()]));

      const membersByTeam = new Map<string, Member[]>();

      studentSnap.docs.forEach((d) => {
        const s = d.data();
        const teamId = s.teamId as string | undefined;

        if (!teamId) return;

        const existing = membersByTeam.get(teamId) ?? [];

        existing.push({
          id: d.id,
          name: (s.name ?? s.studentName ?? s.fullName ?? '—') as string,
          grade: (s.grade ?? s.class ?? '') as string,
          section: (s.section ?? '') as string,
        });

        membersByTeam.set(teamId, existing);
      });

      const data: Team[] = registrationSnap.docs.map((d) => {
        const reg = d.data();
        const teamId = reg.teamId as string;
        const team = teamsById.get(teamId) ?? {};
        const schoolId = reg.schoolId as string;
        const members = membersByTeam.get(teamId) ?? [];

        return {
          id: teamId,
          registrationId: d.id,
          name: (team.teamName as string | undefined) ?? teamId,
          teamCode:
            (team.displayTeamCode as string | undefined) ??
            (team.teamCode as string | undefined) ??
            '',
          category: team.categoryCode as CategoryCode | undefined,
          state: reg.state as RegistrationState,
          memberCount: members.length,
          memberList: members,
          feeStatus: (reg.feeStatus as string | undefined) ?? '—',
          schoolId,
          schoolName: schoolMap[schoolId]?.name ?? schoolId,
          schoolCode: schoolMap[schoolId]?.code ?? '',
          projectTitle: (team.projectTitle ?? reg.projectTitle ?? '') as string,
          correctionNote: (reg.correctionNote ?? '') as string,
        };
      });

      setTeams(data);
      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Team registration data could not be loaded. Check administrator authorisation and retry.'
      );

      toast.error('Failed to load team registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Action ──────────────────────────────────────────────────────────────────

  const applyAction = async () => {
    if (!selectedTeam || !actionType) return;

    if (
      actionType === 'approve' &&
      !['NOT_REQUIRED', 'VERIFIED', 'WAIVED'].includes(
        selectedTeam.feeStatus
      )
    ) {
      toast.error('Fee must be verified or waived before approving.');
      return;
    }

    if (actionType === 'correction' && !correctionNote.trim()) {
      toast.error('Please enter a correction note.');
      return;
    }

    setSaving(true);

    try {
      await callEiroFunction<Record<string, unknown>, unknown>(
        'reviewRegistration',
        {
          registrationId: selectedTeam.registrationId,
          decision: {
            approve: 'APPROVE',
            reject: 'REJECT',
            correction: 'REQUEST_CORRECTION',
          }[actionType],
          ...(actionType === 'correction'
            ? { correctionNote: correctionNote.trim() }
            : {}),
        }
      );

      toast.success(
        `Team ${
          actionType === 'approve'
            ? 'approved ✅'
            : actionType === 'reject'
              ? 'rejected'
              : 'sent for correction'
        }.`
      );

      setSelectedTeam(null);
      setActionType(null);
      setCorrectionNote('');

      await load();
    } catch (e) {
      console.error(e);

      const msg =
        e instanceof FirebaseError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to update team.';

      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = teams.filter(
    (t) =>
      (statusFilter === 'ALL' || t.state === statusFilter) &&
      (search === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.schoolName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.teamCode ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = teams.filter((t) =>
    ['SUBMITTED', 'UNDER_REVIEW'].includes(t.state)
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="team-approvals-page relative isolate min-h-screen w-full">

      {/* ── SAME ADMIN ANIMATED BACKGROUND ── */}

      <div
        className="team-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="team-orb team-orb-one" />
        <div className="team-orb team-orb-two" />
        <div className="team-orb team-orb-three" />
        <div className="team-orb team-orb-four" />

        <div className="team-dot-grid absolute inset-0" />

        <div className="team-ring team-ring-one" />
        <div className="team-ring team-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`team-particle ${particle}`}
          />
        ))}

        <div className="team-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`team-bubble ${bubble.tone}`}
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

        <div className="team-center-glow" />
      </div>

      {/* ── PAGE CONTENT ── */}

      <main className="team-approvals-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Team Approvals"
          subtitle={
            error
              ? 'Registration data unavailable'
              : `${pendingCount} team${pendingCount !== 1 ? 's' : ''} pending review`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/school-applications"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
              >
                School Applications
              </Link>

              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={load}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* ── SUMMARY KPIs ── */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Submitted',
              count: teams.filter((t) => t.state === 'SUBMITTED').length,
              color: 'text-blue-400',
            },
            {
              label: 'Under Review',
              count: teams.filter((t) => t.state === 'UNDER_REVIEW').length,
              color: 'text-yellow-400',
            },
            {
              label: 'Needs Correction',
              count: teams.filter((t) => t.state === 'CORRECTION_REQUIRED').length,
              color: 'text-red-400',
            },
            {
              label: 'Approved',
              count: teams.filter((t) => t.state === 'APPROVED').length,
              color: 'text-green-400',
            },
          ].map((s) => (
            <Card
              key={s.label}
              className="team-glass-card text-center py-4"
            >
              <div className={`text-3xl font-black ${s.color} mb-1`}>
                {error || loading ? '—' : s.count}
              </div>

              <div className="text-xs text-gray-400">
                {s.label}
              </div>
            </Card>
          ))}
        </div>

        {/* ── FILTERS ── */}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Search team name, school, or team ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              'ALL',
              'SUBMITTED',
              'UNDER_REVIEW',
              'CORRECTION_REQUIRED',
              'APPROVED',
              'REJECTED',
            ].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/10 border border-white/5'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* ── TEAM LIST ── */}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div role="alert">
            <Card className="team-glass-card text-sm text-red-300">
              <p>{error}</p>

              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </Card>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="team-glass-card text-center py-16">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />

            <p className="text-gray-300 font-medium">
              No teams found
            </p>

            <p className="text-gray-400 text-sm mt-1">
              Try a different filter or wait for school coordinators to submit registrations.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Card
                key={t.id}
                hover
                className="team-glass-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  {/* TEAM INFORMATION */}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white">
                        {t.name}
                      </span>

                      {t.teamCode && (
                        <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                          {t.teamCode}
                        </span>
                      )}

                      {t.category && (
                        <CategoryBadge code={t.category} />
                      )}

                      <StatusBadge status={t.state} />
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>
                        {t.schoolName}
                        {t.schoolCode ? ` (${t.schoolCode})` : ''}
                      </span>

                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {t.memberCount} member
                        {t.memberCount !== 1 ? 's' : ''}
                      </span>

                      {t.memberList.length > 0 && (
                        <span className="text-gray-400">
                          {t.memberList.map((m) => m.name).join(', ')}
                        </span>
                      )}
                    </div>

                    {t.correctionNote && (
                      <p className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/10 px-2 py-1 rounded">
                        ⚠ Note: {t.correctionNote}
                      </p>
                    )}
                  </div>

                  {/* ACTIONS */}

                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => {
                        setSelectedTeam(t);
                        setActionType(null);
                      }}
                    >
                      Details
                    </Button>

                    {['SUBMITTED', 'UNDER_REVIEW'].includes(t.state) && (
                      <>
                        <Button
                          size="sm"
                          icon={CheckCircle2}
                          onClick={() => {
                            setSelectedTeam(t);
                            setActionType('approve');
                          }}
                        >
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          icon={AlertCircle}
                          onClick={() => {
                            setSelectedTeam(t);
                            setActionType('correction');
                          }}
                        >
                          Correction
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          icon={XCircle}
                          onClick={() => {
                            setSelectedTeam(t);
                            setActionType('reject');
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── DETAIL / ACTION MODAL ── */}

        {selectedTeam && (
          <Modal
            open={!!selectedTeam}
            onClose={() => {
              setSelectedTeam(null);
              setActionType(null);
              setCorrectionNote('');
            }}
            title={
              actionType
                ? `${
                    actionType === 'approve'
                      ? 'Approve'
                      : actionType === 'reject'
                        ? 'Reject'
                        : 'Request Correction'
                  } — ${selectedTeam.name}`
                : `Team Details — ${selectedTeam.name}`
            }
            footer={
              actionType ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setActionType(null)}
                    disabled={saving}
                  >
                    Back
                  </Button>

                  <Button
                    icon={
                      saving
                        ? Loader2
                        : actionType === 'approve'
                          ? CheckCircle2
                          : actionType === 'reject'
                            ? XCircle
                            : AlertCircle
                    }
                    variant={actionType === 'reject' ? 'danger' : 'primary'}
                    onClick={applyAction}
                    disabled={
                      saving ||
                      (actionType === 'approve' &&
                        !['NOT_REQUIRED', 'VERIFIED', 'WAIVED'].includes(
                          selectedTeam.feeStatus
                        ))
                    }
                  >
                    {saving
                      ? 'Saving…'
                      : `Confirm ${
                          actionType === 'approve'
                            ? 'Approval'
                            : actionType === 'reject'
                              ? 'Rejection'
                              : 'Correction Request'
                        }`}
                  </Button>
                </>
              ) : (
                <>
                  {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedTeam.state) && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => setActionType('approve')}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        icon={AlertCircle}
                        onClick={() => setActionType('correction')}
                      >
                        Request Correction
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        icon={XCircle}
                        onClick={() => setActionType('reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </>
              )
            }
          >
            <div className="space-y-4 text-sm">

              {/* TEAM OVERVIEW */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Team ID
                  </p>

                  {selectedTeam.teamCode ? (
                    <span className="font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-sm">
                      {selectedTeam.teamCode}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">
                      Not yet assigned
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Category
                  </p>

                  {selectedTeam.category ? (
                    <CategoryBadge code={selectedTeam.category} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    School
                  </p>

                  <p className="text-gray-200 font-medium">
                    {selectedTeam.schoolName}
                  </p>

                  {selectedTeam.schoolCode && (
                    <p className="text-gray-500 text-xs">
                      {selectedTeam.schoolCode}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Status
                  </p>

                  <StatusBadge status={selectedTeam.state} />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Fee Status
                  </p>

                  <StatusBadge status={selectedTeam.feeStatus} />
                </div>

                {selectedTeam.projectTitle && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Project Title
                    </p>

                    <p className="text-gray-200">
                      {selectedTeam.projectTitle}
                    </p>
                  </div>
                )}
              </div>

              {/* MEMBER LIST */}

              <div>
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                  Team Members ({selectedTeam.memberCount})
                </p>

                {selectedTeam.memberList.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">
                    No member records found in students collection.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeam.memberList.map((m, i) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {m.name}
                          </p>

                          <p className="text-gray-400 text-xs">
                            Grade {m.grade}
                            {m.section ? ` — Section ${m.section}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PREVIOUS CORRECTION NOTE */}

              {selectedTeam.correctionNote && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300 font-semibold mb-1">
                    Previous Correction Note:
                  </p>

                  <p className="text-xs text-amber-200">
                    {selectedTeam.correctionNote}
                  </p>
                </div>
              )}

              {/* CORRECTION TEXTAREA */}

              {actionType === 'correction' && (
                <Textarea
                  label="Correction Note *"
                  id="correction-note"
                  placeholder="Describe exactly what needs to be corrected (e.g. student grade missing for member 2)…"
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  rows={3}
                />
              )}

              {/* APPROVAL WARNING */}

              {actionType === 'approve' &&
                !['NOT_REQUIRED', 'VERIFIED', 'WAIVED'].includes(
                  selectedTeam.feeStatus
                ) && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300">
                      ⚠ Fee status is{' '}
                      <strong>{selectedTeam.feeStatus}</strong>. The team
                      cannot be approved until the fee is verified, waived,
                      or marked not required. Go to{' '}
                      <strong>Payment Verification</strong> first.
                    </p>
                  </div>
                )}
            </div>
          </Modal>
        )}

      </main>

      {/* ── ANIMATED BACKGROUND CSS ── */}

      <style jsx global>{`

        /* ROOT: NO FULL-SCREEN DARK OVERLAY */

        .team-approvals-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
          overflow: clip;
        }

        .team-approvals-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
          isolation: isolate;
        }

        /* BACKGROUND LAYER */

        .team-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .team-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .team-orb-one {
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
          animation: teamOrbOne 18s ease-in-out infinite alternate;
        }

        .team-orb-two {
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
          animation: teamOrbTwo 22s ease-in-out infinite alternate;
        }

        .team-orb-three {
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
          animation: teamOrbThree 20s ease-in-out infinite alternate;
        }

        .team-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: teamOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .team-dot-grid {
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

        .team-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .team-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: teamRingOne 35s linear infinite;
        }

        .team-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: teamRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .team-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: teamParticle 8s ease-in-out infinite alternate;
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

        .team-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .team-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: teamBubbleFloat linear infinite;
        }

        .team-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .team-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTRAL GLOW */

        .team-center-glow {
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

        /* IMPORTANT:
           ONLY INDIVIDUAL CARDS ARE TRANSPARENT.
           NO FULL-PAGE PANEL, NO BLUR LAYER.
        */

        .team-approvals-page .team-glass-card {
          background: rgba(15, 9, 25, 0.22) !important;
          background-color: rgba(15, 9, 25, 0.22) !important;
          border: 1px solid rgba(221, 143, 224, 0.15) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .team-approvals-page .team-glass-card:hover {
          background: rgba(20, 12, 32, 0.30) !important;
          border-color: rgba(221, 143, 224, 0.25) !important;
        }

        /* DO NOT ADD BACKGROUND TO THE CONTENT WRAPPER */

        .team-approvals-page .team-approvals-content,
        .team-approvals-page .team-approvals-content > div {
          background-color: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        /* ANIMATIONS */

        @keyframes teamOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes teamOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes teamOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes teamOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes teamRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes teamRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes teamParticle {
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

        @keyframes teamBubbleFloat {
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
          .team-orb-one {
            width: 320px;
            height: 320px;
          }

          .team-orb-two {
            width: 360px;
            height: 360px;
          }

          .team-orb-three {
            width: 340px;
            height: 340px;
          }

          .team-ring-one {
            width: 300px;
            height: 300px;
          }

          .team-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .team-orb,
          .team-ring,
          .team-particle,
          .team-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
