'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge, Modal, Textarea } from '@/components/ui';
import {
  Search, CheckCircle2, XCircle, AlertCircle, Eye,
  Loader2, RefreshCw, Users, UserCheck,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamApprovalsPage() {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [actionType, setActionType]     = useState<'approve' | 'reject' | 'correction' | null>(null);
  const [saving, setSaving]             = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Schools index
      const schoolSnap = await getDocs(collection(db, 'schools'));
      const schoolMap: Record<string, { name: string; code: string }> = {};
      schoolSnap.docs.forEach(d => {
        const data = d.data();
        schoolMap[d.id] = { name: data.name ?? d.id, code: data.schoolCode ?? '' };
      });

      const [registrationSnap, teamSnap, studentSnap] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'students')),
      ]);

      const teamsById = new Map(teamSnap.docs.map(d => [d.id, d.data()]));

      // Build per-team member list (name, grade, section)
      const membersByTeam = new Map<string, Member[]>();
      studentSnap.docs.forEach(d => {
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

      const data: Team[] = registrationSnap.docs.map(d => {
        const reg = d.data();
        const teamId = reg.teamId as string;
        const team   = teamsById.get(teamId) ?? {};
        const schoolId = reg.schoolId as string;
        const members = membersByTeam.get(teamId) ?? [];
        return {
          id: teamId,
          registrationId: d.id,
          name: (team.teamName as string | undefined) ?? teamId,
          teamCode: (team.displayTeamCode as string | undefined) ?? (team.teamCode as string | undefined) ?? '',
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
      setError('Team registration data could not be loaded. Check administrator authorisation and retry.');
      toast.error('Failed to load team registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Action ──────────────────────────────────────────────────────────────────

  const applyAction = async () => {
    if (!selectedTeam || !actionType) return;
    if (actionType === 'approve' && !['NOT_REQUIRED', 'VERIFIED', 'WAIVED'].includes(selectedTeam.feeStatus)) {
      toast.error('Fee must be verified or waived before approving.');
      return;
    }
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('reviewRegistration', {
        registrationId: selectedTeam.registrationId,
        decision: { approve: 'APPROVE', reject: 'REJECT', correction: 'REQUEST_CORRECTION' }[actionType],
        ...(actionType === 'correction' ? { correctionNote: correctionNote.trim() } : {}),
      });
      toast.success(`Team ${actionType === 'approve' ? 'approved ✅' : actionType === 'reject' ? 'rejected' : 'sent for correction'}.`);
      setSelectedTeam(null);
      setActionType(null);
      setCorrectionNote('');
      await load();
    } catch (e) {
      console.error(e);
      const msg = e instanceof FirebaseError ? e.message : e instanceof Error ? e.message : 'Failed to update team.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = teams.filter(t =>
    (statusFilter === 'ALL' || t.state === statusFilter) &&
    (search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.schoolName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.teamCode ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = teams.filter(t => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.state)).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Team Approvals"
        subtitle={error ? 'Registration data unavailable' : `${pendingCount} team${pendingCount !== 1 ? 's' : ''} pending review`}
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/school-applications"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
            >
              School Applications
            </Link>
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Submitted',        count: teams.filter(t => t.state === 'SUBMITTED').length,          color: 'text-blue-400'   },
          { label: 'Under Review',     count: teams.filter(t => t.state === 'UNDER_REVIEW').length,        color: 'text-yellow-400' },
          { label: 'Needs Correction', count: teams.filter(t => t.state === 'CORRECTION_REQUIRED').length, color: 'text-red-400'    },
          { label: 'Approved',         count: teams.filter(t => t.state === 'APPROVED').length,            color: 'text-green-400'  },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className={`text-3xl font-black ${s.color} mb-1`}>{error || loading ? '—' : s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Search team name, school, or team ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Team list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">
          <p>{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card></div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No teams found</p>
          <p className="text-gray-600 text-sm mt-1">Try a different filter or wait for school coordinators to submit registrations.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white">{t.name}</span>
                    {t.teamCode && (
                      <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                        {t.teamCode}
                      </span>
                    )}
                    {t.category && <CategoryBadge code={t.category} />}
                    <StatusBadge status={t.state} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{t.schoolName}{t.schoolCode ? ` (${t.schoolCode})` : ''}</span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                    </span>
                    {/* Show member names inline for quick scan */}
                    {t.memberList.length > 0 && (
                      <span className="text-gray-600">
                        {t.memberList.map(m => m.name).join(', ')}
                      </span>
                    )}
                  </div>
                  {t.correctionNote && (
                    <p className="mt-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                      ⚠ Note: {t.correctionNote}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button size="sm" variant="secondary" icon={Eye}
                    onClick={() => { setSelectedTeam(t); setActionType(null); }}>
                    Details
                  </Button>
                  {['SUBMITTED', 'UNDER_REVIEW'].includes(t.state) && (
                    <>
                      <Button size="sm" icon={CheckCircle2}
                        onClick={() => { setSelectedTeam(t); setActionType('approve'); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" icon={AlertCircle}
                        onClick={() => { setSelectedTeam(t); setActionType('correction'); }}>
                        Correction
                      </Button>
                      <Button size="sm" variant="danger" icon={XCircle}
                        onClick={() => { setSelectedTeam(t); setActionType('reject'); }}>
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

      {/* ── Detail / Action Modal ──────────────────────────────────────────── */}
      {selectedTeam && (
        <Modal
          open={!!selectedTeam}
          onClose={() => { setSelectedTeam(null); setActionType(null); setCorrectionNote(''); }}
          title={actionType
            ? `${actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Request Correction'} — ${selectedTeam.name}`
            : `Team Details — ${selectedTeam.name}`
          }
          footer={actionType ? (
            <>
              <Button variant="secondary" onClick={() => setActionType(null)} disabled={saving}>
                Back
              </Button>
              <Button
                icon={saving ? Loader2 : actionType === 'approve' ? CheckCircle2 : actionType === 'reject' ? XCircle : AlertCircle}
                variant={actionType === 'reject' ? 'danger' : 'primary'}
                onClick={applyAction}
                disabled={saving}
              >
                {saving ? 'Saving…' : `Confirm ${actionType === 'approve' ? 'Approval' : actionType === 'reject' ? 'Rejection' : 'Correction Request'}`}
              </Button>
            </>
          ) : (
            <>
              {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedTeam.state) && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" icon={CheckCircle2} onClick={() => setActionType('approve')}>Approve</Button>
                  <Button size="sm" variant="secondary" icon={AlertCircle} onClick={() => setActionType('correction')}>Request Correction</Button>
                  <Button size="sm" variant="danger" icon={XCircle} onClick={() => setActionType('reject')}>Reject</Button>
                </div>
              )}
            </>
          )}
        >
          <div className="space-y-4 text-sm">

            {/* Team overview */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Team ID</p>
                {selectedTeam.teamCode
                  ? <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-sm">{selectedTeam.teamCode}</span>
                  : <span className="text-gray-600 text-xs">Not yet assigned</span>
                }
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                {selectedTeam.category
                  ? <CategoryBadge code={selectedTeam.category} />
                  : <span className="text-gray-400">—</span>
                }
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">School</p>
                <p className="text-gray-200 font-medium">{selectedTeam.schoolName}</p>
                {selectedTeam.schoolCode && <p className="text-gray-500 text-xs">{selectedTeam.schoolCode}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedTeam.state} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fee Status</p>
                <StatusBadge status={selectedTeam.feeStatus} />
              </div>
              {selectedTeam.projectTitle && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Project Title</p>
                  <p className="text-gray-200">{selectedTeam.projectTitle}</p>
                </div>
              )}
            </div>

            {/* Member list */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                Team Members ({selectedTeam.memberCount})
              </p>
              {selectedTeam.memberList.length === 0 ? (
                <p className="text-gray-600 text-xs italic">No member records found in students collection.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTeam.memberList.map((m, i) => (
                    <div key={m.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{m.name}</p>
                        <p className="text-gray-500 text-xs">
                          Grade {m.grade}{m.section ? ` — Section ${m.section}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Previous correction note if any */}
            {selectedTeam.correctionNote && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400 font-semibold mb-1">Previous Correction Note:</p>
                <p className="text-xs text-amber-300">{selectedTeam.correctionNote}</p>
              </div>
            )}

            {/* Correction textarea */}
            {actionType === 'correction' && (
              <Textarea
                label="Correction Note *"
                id="correction-note"
                placeholder="Describe exactly what needs to be corrected (e.g. student grade missing for member 2)…"
                value={correctionNote}
                onChange={e => setCorrectionNote(e.target.value)}
                rows={3}
              />
            )}

            {/* Approve warning if fee not cleared */}
            {actionType === 'approve' && !['NOT_REQUIRED', 'VERIFIED', 'WAIVED'].includes(selectedTeam.feeStatus) && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">
                  ⚠ Fee status is <strong>{selectedTeam.feeStatus}</strong>. The team cannot be approved until the fee is verified, waived, or marked not required. Go to <strong>Payment Verification</strong> first.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
