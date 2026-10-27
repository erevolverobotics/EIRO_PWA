'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, KpiCard, CategoryBadge, StatusBadge, Badge } from '@/components/ui';
import { AlertCircle, UserCheck, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';

type Team = { id: string; teamName: string; displayTeamCode: string; categoryCode: CategoryCode };
type Entry = { id: string; teamId: string; entryStatus: string; mergedIntoEntryId?: string };
type Membership = { teamId: string; studentId: string; status?: string };
type Attendance = { entryId: string; studentId: string; status: string };

export default function VenueAttendancePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getAll<Team>('teams'), getAll<Entry>('stageEntries'), getAll<Membership>('teamMemberships'), getAll<Attendance>('studentAttendance')])
      .then(([teamRows, entryRows, memberRows, attendanceRows]) => { setTeams(teamRows); setEntries(entryRows); setMembers(memberRows); setAttendance(attendanceRows); })
      .catch(() => setError('Attendance overview could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  const rows = useMemo(() => teams.filter(team => {
    const term = search.toLowerCase();
    return !term || team.teamName.toLowerCase().includes(term) || team.displayTeamCode.toLowerCase().includes(term);
  }).map(team => {
    const teamMembers = members.filter(member => member.teamId === team.id && member.status !== 'INACTIVE');
    const entry = entries.find(record => record.teamId === team.id && !record.mergedIntoEntryId);
    const presentIds = new Set(attendance.filter(record => record.entryId === entry?.id && record.status === 'PRESENT').map(record => record.studentId));
    return { ...team, memberCount: teamMembers.length, presentCount: teamMembers.filter(member => presentIds.has(member.studentId)).length, entry };
  }), [teams, entries, members, attendance, search]);
  const checkedIn = rows.filter(row => row.entry?.entryStatus === 'CHECKED_IN').length;
  const short = rows.filter(row => row.presentCount < row.memberCount).length;
  const full = rows.filter(row => row.memberCount > 0 && row.presentCount === row.memberCount).length;
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Team Attendance Overview" subtitle="Current student check-in records" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Teams" value={teams.length} icon={Users} color="indigo" /><KpiCard title="Checked In" value={checkedIn} icon={UserCheck} color="green" /><KpiCard title="Short-staffed" value={short} icon={AlertCircle} color="orange" /><KpiCard title="Full Presence" value={full} icon={UserCheck} color="blue" /></div>
    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search teams…" className="eiro-input" />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading attendance…</p> : error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> : rows.length === 0 ? <Card className="text-center py-12 text-gray-400">No teams found.</Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Team</th><th>Category</th><th>Members present</th><th>Status</th><th>Alert</th></tr></thead><tbody>{rows.map(team => <tr key={team.id}>
        <td><p className="font-medium text-white text-sm">{team.teamName}</p><p className="font-mono text-[10px] text-gray-500">{team.displayTeamCode}</p></td><td><CategoryBadge code={team.categoryCode} /></td>
        <td>{team.presentCount}/{team.memberCount}</td><td><StatusBadge status={team.entry?.entryStatus ?? 'NO_ENTRY'} /></td><td>{team.memberCount === 0 ? <Badge variant="default">No roster data</Badge> : team.presentCount < team.memberCount ? <Badge variant="warning">Short-staffed</Badge> : <Badge variant="success">Full</Badge>}</td>
      </tr>)}</tbody></table></div></Card>}
  </div>;
}
