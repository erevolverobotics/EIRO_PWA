'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge, Modal } from '@/components/ui';
import { Plus, ChevronDown, ChevronUp, Users, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { queryByField } from '@/lib/firebase/firestore';
import type { Registration, Student, Team } from '@/lib/types';

type RegistrationRow = Registration & { id: string };
type TeamRow = Team & { id: string };

interface MemberInfo {
  id: string;
  name: string;
  grade: string;
  section?: string;
}

export default function RegistrationsPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [teams, setTeams]                 = useState<TeamRow[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, MemberInfo[]>>({});
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [reload, setReload]               = useState(0);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState('ALL');

  // Track which team cards have members expanded
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  // Detail modal
  const [detailTeam, setDetailTeam]       = useState<{ team: TeamRow; reg: RegistrationRow } | null>(null);

  useEffect(() => {
    if (!schoolId || schoolId === 'unassigned') return;
    let active = true;
    Promise.all([
      queryByField<Registration>('registrations', 'schoolId', schoolId),
      queryByField<Team>('teams', 'schoolId', schoolId),
      queryByField<Student>('students', 'schoolId', schoolId),
    ])
      .then(([registrationData, teamData, students]) => {
        if (!active) return;
        const registeredTeamIds = new Set(registrationData.map(r => r.teamId));
        setExpandedTeams(new Set(registeredTeamIds));

        // Build per-team member list
        const memberMap: Record<string, MemberInfo[]> = {};
        students.forEach(s => {
          if (!s.teamId) return;
          if (!memberMap[s.teamId]) memberMap[s.teamId] = [];
          memberMap[s.teamId].push({
            id: (s as any).id ?? s.teamId + '_' + memberMap[s.teamId].length,
            name: ((s as any).name ?? (s as any).studentName ?? (s as any).fullName ?? '—') as string,
            grade: ((s as any).grade ?? '') as string,
            section: ((s as any).section ?? '') as string,
          });
        });

        setRegistrations(registrationData);
        setTeams(teamData.filter(team => registeredTeamIds.has(team.id)));
        setMembersByTeam(memberMap);
      })
      .catch(loadError => {
        console.error('Failed to load school registrations', loadError);
        if (active) setError('Unable to load registrations. Check your connection and access, then retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [schoolId, reload]);

  const teamById = new Map(teams.map(team => [team.id, team]));
  const loadingData = Boolean(schoolId && schoolId !== 'unassigned' && loading);

  const filteredRegistrations = registrations.filter(registration => {
    const team = teamById.get(registration.teamId);
    const matchesSearch = !search ||
      (team?.teamName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (team?.displayTeamCode ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === 'ALL' || registration.state === filter);
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="My Registrations"
        subtitle="All team registrations submitted by your school"
        actions={
          <Link href="/coordinator/register">
            <Button size="sm" icon={Plus}>Register Team</Button>
          </Link>
        }
      />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card><p className="text-amber-400">Your coordinator account is not assigned to a school. Contact an administrator to link your account.</p></Card>
      ) : null}
      {error ? (
        <Card className="flex items-center justify-between gap-4">
          <p className="text-sm text-red-400">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => {
            setLoading(true); setError(''); setReload(v => v + 1);
          }}>Retry</Button>
        </Card>
      ) : null}

      {/* Search + filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search teams…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="eiro-input flex-1"
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="eiro-input sm:w-56">
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
          <option value="APPROVED">Approved</option>
        </select>
      </div>

      {loadingData ? (
        <Card className="text-center py-12"><p className="text-gray-500">Loading registrations…</p></Card>
      ) : registrations.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-300 font-medium">No registrations yet</p>
          <p className="text-sm text-gray-500 mt-2">Teams registered to your school will appear here.</p>
        </Card>
      ) : filteredRegistrations.length === 0 ? (
        <Card className="text-center py-12"><p className="text-gray-500">No registrations match your search.</p></Card>
      ) : (
        <div className="space-y-3">
          {filteredRegistrations.map(registration => {
            const team = teamById.get(registration.teamId);
            if (!team) return (
              <Card key={registration.id}>
                <p className="text-sm text-amber-400">Registration {registration.id} references a team that could not be loaded.</p>
              </Card>
            );

            const members = membersByTeam[team.id] ?? [];
            const isExpanded = expandedTeams.has(team.id);

            return (
              <Card key={registration.id}>
                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <h3 className="font-bold text-white">
                        {team.teamName || team.displayTeamCode || team.id}
                      </h3>
                      {team.displayTeamCode && (
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                          {team.displayTeamCode}
                        </span>
                      )}
                      <CategoryBadge code={team.categoryCode} />
                      <StatusBadge status={registration.state} />
                      <StatusBadge status={registration.feeStatus} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                      {/* Compact member names */}
                      {members.length > 0 && !isExpanded && (
                        <span className="text-gray-600 truncate max-w-xs">
                          {members.map(m => m.name).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Correction note alert */}
                    {registration.state === 'CORRECTION_REQUIRED' && (registration as any).correctionNote && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        ⚠ Correction required: {(registration as any).correctionNote}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => setDetailTeam({ team, reg: registration })}>
                      View Details
                    </Button>
                    {members.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={isExpanded ? ChevronUp : ChevronDown}
                        onClick={() => toggleExpand(team.id)}
                      >
                        {isExpanded ? 'Hide' : 'Members'}
                      </Button>
                    )}
                    {/* Edit button — only for CORRECTION_REQUIRED */}
                    {registration.state === 'CORRECTION_REQUIRED' && (
                      <Link href={`/coordinator/registrations/${registration.id}/edit`}>
                        <Button size="sm" icon={Pencil} variant="primary">
                          Fix &amp; Resubmit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Expanded member list */}
                {isExpanded && members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Team Members</p>
                    {members.map((m, i) => (
                      <div key={m.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{m.name}</p>
                          <p className="text-gray-500 text-xs">
                            Grade {m.grade}{m.section ? ` — Section ${m.section}` : ''}
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

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {detailTeam && (
        <Modal
          open={!!detailTeam}
          onClose={() => setDetailTeam(null)}
          title={`Team Details — ${detailTeam.team.teamName || detailTeam.team.displayTeamCode}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Team ID</p>
                <span className="font-mono font-bold text-indigo-400">{detailTeam.team.displayTeamCode || '—'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <CategoryBadge code={detailTeam.team.categoryCode} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Registration Status</p>
                <StatusBadge status={detailTeam.reg.state} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fee Status</p>
                <StatusBadge status={detailTeam.reg.feeStatus} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                Team Members ({(membersByTeam[detailTeam.team.id] ?? []).length})
              </p>
              {(membersByTeam[detailTeam.team.id] ?? []).length === 0 ? (
                <p className="text-gray-600 text-xs italic">No member records found.</p>
              ) : (
                <div className="space-y-2">
                  {(membersByTeam[detailTeam.team.id] ?? []).map((m, i) => (
                    <div key={m.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{m.name}</p>
                        <p className="text-gray-500 text-xs">
                          Grade {m.grade}{m.section ? ` — Section ${m.section}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(detailTeam.reg as any).correctionNote && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400 font-semibold mb-1">Correction Required:</p>
                <p className="text-xs text-amber-300">{(detailTeam.reg as any).correctionNote}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
