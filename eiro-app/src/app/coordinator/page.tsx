'use client';

import { useEffect, useState } from 'react';
import { KpiCard, Card, StatusBadge, CategoryBadge, Button, PageHeader } from '@/components/ui';
import { Trophy, Users, CreditCard, CheckCircle2, ChevronRight, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { getOne, queryByField } from '@/lib/firebase/firestore';
import type { Registration, School, Student, Team } from '@/lib/types';

type DashboardRegistration = Registration & { id: string };
type DashboardTeam = Team & { id: string };

export default function CoordinatorDashboard() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [registrations, setRegistrations] = useState<DashboardRegistration[]>([]);
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!schoolId || schoolId === 'unassigned') return;
    let active = true;
    Promise.all([
      getOne<School>('schools', schoolId),
      queryByField<Registration>('registrations', 'schoolId', schoolId),
      queryByField<Team>('teams', 'schoolId', schoolId),
      queryByField<Student>('students', 'schoolId', schoolId),
    ])
      .then(([schoolData, registrationData, teamData, students]) => {
        if (!active) return;
        const registeredTeamIds = new Set(registrationData.map(registration => registration.teamId));
        setSchool(schoolData);
        setRegistrations(registrationData);
        setTeams(teamData.filter(team => registeredTeamIds.has(team.id)));
        setStudentCount(students.length);
      })
      .catch(loadError => {
        console.error('Failed to load school dashboard data', loadError);
        if (active) setError('Unable to load school data. Check your connection and access, then retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [schoolId, reload]);

  const registrationByTeam = new Map(registrations.map(registration => [registration.teamId, registration]));
  const loadingData = Boolean(schoolId && schoolId !== 'unassigned' && loading);
  const pendingFees = registrations.filter(registration =>
    registration.feeStatus === 'PENDING' || registration.feeStatus === 'PARTIAL'
  ).length;
  const approved = registrations.filter(registration => registration.state === 'APPROVED').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Dashboard"
        subtitle={school?.name ?? 'Overview of your school registrations'}
        actions={
          <>
            <Link href="/coordinator/bulk-upload">
              <Button variant="secondary" size="sm" icon={Upload}>Bulk Upload</Button>
            </Link>
            <Link href="/coordinator/register">
              <Button size="sm" icon={Plus}>Register Team</Button>
            </Link>
          </>
        }
      />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card>
          <p className="text-amber-400">Your coordinator account is not assigned to a school. Contact an administrator to link your account.</p>
        </Card>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="My Teams" value={loadingData ? '…' : registrations.length} icon={Trophy} color="indigo" />
        <KpiCard title="Students Registered" value={loadingData ? '…' : studentCount} icon={Users} color="blue" />
        <KpiCard title="Approved Teams" value={loadingData ? '…' : approved} icon={CheckCircle2} color="green" />
        <KpiCard title="Fees Pending" value={loadingData ? '…' : pendingFees} icon={CreditCard} color="orange" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Registration Tasks</h3>
        </div>
        <div className="divide-y divide-white/5">
          {loadingData ? (
            <p className="px-6 py-6 text-sm text-gray-500">Loading registrations…</p>
          ) : registrations.filter(registration =>
            registration.state === 'CORRECTION_REQUIRED' ||
            registration.feeStatus === 'PENDING' ||
            registration.feeStatus === 'PARTIAL'
          ).length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-500">No registration tasks.</p>
          ) : registrations.filter(registration =>
            registration.state === 'CORRECTION_REQUIRED' ||
            registration.feeStatus === 'PENDING' ||
            registration.feeStatus === 'PARTIAL'
          ).map(registration => {
            const team = teams.find(candidate => candidate.id === registration.teamId);
            return (
              <Link key={registration.id} href="/coordinator/registrations"
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 transition-colors">
                <p className="text-sm text-gray-300 flex-1">
                  {team?.teamName ?? 'Team'}: {registration.state === 'CORRECTION_REQUIRED' ? 'correction required' : 'payment pending'}
                </p>
                <StatusBadge status={registration.state === 'CORRECTION_REQUIRED' ? registration.state : registration.feeStatus} />
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </Link>
            );
          })}
        </div>
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">My Teams</h3>
          <Link href="/coordinator/registrations">
            <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">View all</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Category</th>
                <th>Status</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">Loading teams…</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">No registered teams.</td></tr>
              ) : teams.map(team => {
                const registration = registrationByTeam.get(team.id);
                if (!registration) return null;
                return (
                  <tr key={team.id}>
                    <td>
                      <div className="font-medium text-white text-sm">{team.teamName}</div>
                      <div className="font-mono text-[10px] text-gray-600">{team.displayTeamCode}</div>
                    </td>
                    <td><CategoryBadge code={team.categoryCode} /></td>
                    <td><StatusBadge status={registration.state} /></td>
                    <td><StatusBadge status={registration.feeStatus} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
