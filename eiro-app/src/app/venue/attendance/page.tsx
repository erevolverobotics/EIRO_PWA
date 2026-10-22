'use client';

import { PageHeader, Card, Button, KpiCard, CategoryBadge, StatusBadge, Badge } from '@/components/ui';
import { UserCheck, Download, AlertCircle, Users, Search } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { useState } from 'react';

const TEAMS = [
  { id: 'T001', code: 'EIRO-2026-041', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, school: 'DAV Public', totalMembers: 2, presentMembers: 2, status: 'CHECKED_IN' },
  { id: 'T002', code: 'EIRO-2026-042', name: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, school: 'DAV Public', totalMembers: 3, presentMembers: 3, status: 'CHECKED_IN' },
  { id: 'T003', code: 'EIRO-2026-043', name: 'Metal Beasts', category: 'SUMO' as CategoryCode, school: 'KV No.1', totalMembers: 2, presentMembers: 1, status: 'CHECKED_IN' },
  { id: 'T004', code: 'EIRO-2026-044', name: 'Maze Masters', category: 'MAZE' as CategoryCode, school: 'Asan Memorial', totalMembers: 2, presentMembers: 2, status: 'APPROVED' },
  { id: 'T005', code: 'EIRO-2026-045', name: 'Wall Runners', category: 'WALL' as CategoryCode, school: 'PSBB', totalMembers: 2, presentMembers: 2, status: 'APPROVED' },
  { id: 'T006', code: 'EIRO-2026-046', name: 'Speed Navigators', category: 'MAZE' as CategoryCode, school: 'PSBB', totalMembers: 2, presentMembers: 0, status: 'APPROVED' },
];

export default function VenueAttendancePage() {
  const [search, setSearch] = useState('');

  const filtered = TEAMS.filter(t =>
    search === '' ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  const checkedIn = TEAMS.filter(t => t.status === 'CHECKED_IN').length;
  const shortStaffed = TEAMS.filter(t => t.presentMembers < t.totalMembers).length;
  const fullPresent = TEAMS.filter(t => t.presentMembers === t.totalMembers).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Team Attendance Overview"
        subtitle="All teams and their on-site member presence status"
        actions={<Button variant="secondary" size="sm" icon={Download}>Export</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Teams" value={TEAMS.length} icon={Users} color="indigo" />
        <KpiCard title="Checked In" value={checkedIn} icon={UserCheck} color="green" />
        <KpiCard title="Short-staffed" value={shortStaffed} icon={AlertCircle} color="orange" />
        <KpiCard title="Full Presence" value={fullPresent} icon={UserCheck} color="blue" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search teams…" value={search}
          onChange={e => setSearch(e.target.value)} className="eiro-input pl-9" />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Team</th><th>Category</th><th>School</th><th>Members Present</th><th>Status</th><th>Alert</th></tr>
            </thead>
            <tbody>
              {filtered.map(team => {
                const short = team.presentMembers < team.totalMembers;
                const none = team.presentMembers === 0;
                return (
                  <tr key={team.id} className={none ? 'bg-red-500/[0.03]' : short ? 'bg-yellow-500/[0.02]' : ''}>
                    <td>
                      <p className="font-medium text-white text-sm">{team.name}</p>
                      <p className="font-mono text-[10px] text-gray-600">{team.code}</p>
                    </td>
                    <td><CategoryBadge code={team.category} /></td>
                    <td><span className="text-xs text-gray-400">{team.school}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${none ? 'text-red-400' : short ? 'text-orange-400' : 'text-green-400'}`}>
                          {team.presentMembers}/{team.totalMembers}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: team.totalMembers }).map((_, i) => (
                            <div key={i} className={`w-2 h-4 rounded-sm ${i < team.presentMembers ? 'bg-green-500' : 'bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={team.status} /></td>
                    <td>
                      {none && <Badge variant="danger">No members!</Badge>}
                      {!none && short && <Badge variant="warning">Short-staffed</Badge>}
                      {!short && <Badge variant="success">Full</Badge>}
                    </td>
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
