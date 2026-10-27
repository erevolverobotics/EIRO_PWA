'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge } from '@/components/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { queryByField } from '@/lib/firebase/firestore';
import type { Registration, Student, Team } from '@/lib/types';

type RegistrationRow = Registration & { id: string };
type TeamRow = Team & { id: string };

export default function RegistrationsPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

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
        const registeredTeamIds = new Set(registrationData.map(registration => registration.teamId));
        const counts = students.reduce<Record<string, number>>((result, student) => {
          if (student.teamId) result[student.teamId] = (result[student.teamId] ?? 0) + 1;
          return result;
        }, {});
        setRegistrations(registrationData);
        setTeams(teamData.filter(team => registeredTeamIds.has(team.id)));
        setMembersByTeam(counts);
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
      team?.teamName.toLowerCase().includes(search.toLowerCase()) ||
      team?.displayTeamCode.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === 'ALL' || registration.state === filter);
  });

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
            setLoading(true);
            setError('');
            setReload(value => value + 1);
          }}>Retry</Button>
        </Card>
      ) : null}

      <div className="flex gap-3 flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search teams…"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="eiro-input flex-1"
        />
        <select value={filter} onChange={event => setFilter(event.target.value)} className="eiro-input sm:w-56">
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
            return (
              <Card key={registration.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-bold text-white">{team.teamName}</h3>
                      <CategoryBadge code={team.categoryCode} />
                      <StatusBadge status={registration.state} />
                      <StatusBadge status={registration.feeStatus} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="font-mono text-indigo-400">{team.displayTeamCode}</span>
                      <span>{membersByTeam[team.id] ?? 0} members</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
