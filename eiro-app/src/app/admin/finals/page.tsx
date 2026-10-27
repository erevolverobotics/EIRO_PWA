'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, CategoryBadge, Badge, KpiCard, Button } from '@/components/ui';
import { Trophy, Users, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

interface Qualification {
  id: string;
  teamId?: string;
  schoolId?: string;
  districtId?: string;
  eventId?: string;
  categoryCode?: string;
  category?: string;
  sourceEntryId?: string;
  finalsEntryId?: string;
  districtRank?: number;
  rank?: number;
  status?: string;
}
interface Team { id: string; teamName?: string; displayTeamCode?: string; schoolId?: string; categoryCode?: string }
interface School { id: string; name?: string; districtId?: string }
interface District { id: string; name?: string }
interface Entry { id: string; teamId?: string }

export default function StateFinals() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [qualificationData, teamData, schoolData, districtData, entryData] = await Promise.all([
        getAll<Qualification>('qualifications'),
        getAll<Team>('teams'),
        getAll<School>('schools'),
        getAll<District>('districts'),
        getAll<Entry>('stageEntries'),
      ]);
      setQualifications(qualificationData);
      setTeams(teamData);
      setSchools(schoolData);
      setDistricts(districtData);
      setEntries(entryData);
    } catch (e) {
      console.error(e);
      setError('Could not load qualification records. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const grouped = useMemo(() => {
    const groups = new Map<string, Qualification[]>();
    qualifications.forEach(qualification => {
      const sourceEntry = entries.find(item => item.id === qualification.sourceEntryId);
      const team = teams.find(item => item.id === (qualification.teamId || sourceEntry?.teamId));
      const category = qualification.categoryCode || qualification.category || team?.categoryCode || 'UNASSIGNED';
      groups.set(category, [...(groups.get(category) || []), qualification]);
    });
    return [...groups.entries()];
  }, [qualifications, teams, entries]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="State Finals" subtitle="Qualification records currently stored in Firestore"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard title="Qualification Records" value={qualifications.length} icon={Trophy} color="yellow" />
        <KpiCard title="Categories" value={grouped.length} icon={Users} color="indigo" />
        <KpiCard title="Events" value={new Set(qualifications.map(item => item.eventId).filter(Boolean)).size} icon={Trophy} color="blue" />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        qualifications.length === 0 ? <Card className="text-center text-gray-400">No qualification records found.</Card> :
          grouped.map(([category, rows]) => <Card key={category} padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              {category === 'UNASSIGNED' ? <Badge>Unassigned category</Badge> : <CategoryBadge code={category as CategoryCode} />}
              <Badge variant="info">{rows.length} records</Badge>
            </div>
            <div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Rank</th><th>Team</th><th>School</th><th>District</th><th>Event</th><th>Status</th></tr></thead>
              <tbody>{rows.map(row => {
                const sourceEntry = entries.find(item => item.id === row.sourceEntryId);
                const team = teams.find(item => item.id === (row.teamId || sourceEntry?.teamId));
                const school = schools.find(item => item.id === (row.schoolId || team?.schoolId));
                const districtId = row.districtId || school?.districtId;
                const district = districts.find(item => item.id === districtId);
                const rank = row.districtRank ?? row.rank;
                return <tr key={row.id}>
                  <td className="text-sm text-white">{rank ?? '—'}</td>
                  <td><span className="text-sm text-white">{team?.teamName || 'Team details unavailable'}</span><br /><span className="font-mono text-[10px] text-gray-500">{team?.displayTeamCode || team?.id || row.sourceEntryId || row.teamId || '—'}</span></td>
                  <td className="text-xs text-gray-400">{school?.name || school?.id || '—'}</td>
                  <td className="text-xs text-gray-400">{district?.name || districtId || '—'}</td>
                  <td className="text-xs text-gray-400">{row.eventId || '—'}{row.finalsEntryId ? ` · finals entry ${row.finalsEntryId}` : ''}</td>
                  <td><Badge variant={row.status === 'APPROVED' ? 'success' : 'info'}>{row.status || 'Recorded'}</Badge></td>
                </tr>;
              })}</tbody></table></div>
          </Card>)}
    </div>
  );
}
