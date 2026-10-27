'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Activity, QrCode, UserCheck, Users } from 'lucide-react';
import { Button, Card, CategoryBadge, KpiCard, PageHeader, StatusBadge } from '@/components/ui';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode, EntryStatus, StageEntry, Team } from '@/lib/types';

type VenueTeam = Team & { entry?: StageEntry; membersPresent: number; membersTotal: number };
type Membership = { teamId: string; studentId: string; status?: string };

export default function VenueDashboard() {
  const [teams, setTeams] = useState<VenueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAll<Team>('teams'),
      getAll<StageEntry>('stageEntries'),
      getAll<Membership>('teamMemberships'),
      getAll<{ entryId: string; studentId: string; status: string }>('studentAttendance'),
    ]).then(([teamDocs, entries, memberships, attendance]) => {
      const currentEntries = new Map(entries.filter(entry => !entry.mergedIntoEntryId).map(entry => [entry.teamId, entry]));
      setTeams(teamDocs.map(team => {
        const entry = currentEntries.get(team.id);
        const members = memberships.filter(member => member.teamId === team.id);
        const presentIds = new Set(attendance.filter(record => record.entryId === entry?.id && record.status === 'PRESENT').map(record => record.studentId));
        return { ...team, entry, membersTotal: members.length, membersPresent: members.filter(member => presentIds.has(member.studentId)).length };
      }));
    }).catch(() => setError('Venue data could not be loaded. Check your role and Firestore access.'))
      .finally(() => setLoading(false));
  }, []);

  const entries = teams.filter(team => team.entry);
  const checkedIn = entries.filter(team => ['CHECKED_IN', 'COMPETING', 'COMPLETED'].includes(team.entry?.entryStatus ?? '')).length;
  const competing = entries.filter(team => team.entry?.entryStatus === 'COMPETING').length;
  const shortStaffed = teams.filter(team => team.membersPresent < team.membersTotal).length;

  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Venue Dashboard" subtitle="Live data from event entries, teams and attendance" actions={<Link href="/venue/checkin"><Button icon={QrCode}>Start Check-in</Button></Link>} />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <KpiCard title="Teams" value={teams.length} icon={Users} color="indigo" />
      <KpiCard title="Checked In" value={checkedIn} icon={UserCheck} color="green" />
      <KpiCard title="Short-staffed" value={shortStaffed} icon={AlertCircle} color="orange" />
      <KpiCard title="Competing" value={competing} icon={Activity} color="blue" />
    </div>
    {loading ? <p className="text-center text-gray-400 py-12" role="status">Loading venue data…</p> :
      error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> :
        entries.length === 0 ? <Card className="text-center py-12 text-gray-400">No event entries are available.</Card> :
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Event Teams</h3></div>
            <div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Team</th><th>Category</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {entries.map(team => <tr key={team.id}>
                <td><div className="font-medium text-white text-sm">{team.teamName}</div><div className="font-mono text-[10px] text-gray-500">{team.displayTeamCode}</div></td>
                <td><CategoryBadge code={team.categoryCode as CategoryCode} /></td>
                <td>{team.membersPresent}/{team.membersTotal}</td>
                <td><StatusBadge status={team.entry?.entryStatus as EntryStatus} /></td>
                <td>{team.entry?.entryStatus === 'APPROVED' && <Link href={`/venue/checkin?team=${encodeURIComponent(team.displayTeamCode)}`}><Button size="sm" icon={QrCode}>Check In</Button></Link>}</td>
              </tr>)}
            </tbody></table></div>
          </Card>}
  </div>;
}
