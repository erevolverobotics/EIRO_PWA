'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, Button, Badge, CategoryBadge, KpiCard } from '@/components/ui';
import { BarChart3, Trophy, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

interface ResultRecord {
  id: string;
  eventId?: string;
  entryId?: string;
  rank?: number;
  scoreSnapshot?: unknown;
  status?: string;
}
interface Qualification {
  id: string;
  eventId?: string;
  sourceEntryId?: string;
  finalsEntryId?: string;
  status?: string;
}
interface Event { id: string; categoryCode?: string; name?: string }
interface Entry { id: string; teamId?: string }
interface Team { id: string; teamName?: string; displayTeamCode?: string; schoolId?: string; categoryCode?: string }
interface School { id: string; name?: string }

export default function RankingsPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const [resultData, qualificationData, eventData, entryData, teamData, schoolData] = await Promise.all([
        getAll<ResultRecord>('results'), getAll<Qualification>('qualifications'),
        getAll<Event>('events'), getAll<Entry>('stageEntries'),
        getAll<Team>('teams'), getAll<School>('schools'),
      ]);
      setResults(resultData);
      setQualifications(qualificationData);
      setEvents(eventData);
      setEntries(entryData);
      setTeams(teamData);
      setSchools(schoolData);
    } catch (e) {
      console.error(e);
      setError('Could not load results and qualification data. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const resultTeam = useCallback((result: ResultRecord) => {
    const teamId = entries.find(entry => entry.id === result.entryId)?.teamId;
    return teams.find(team => team.id === teamId);
  }, [entries, teams]);
  const grouped = useMemo(() => {
    const groups = new Map<string, ResultRecord[]>();
    results.forEach(result => {
      const team = resultTeam(result);
      const event = events.find(item => item.id === result.eventId);
      const category = event?.categoryCode || team?.categoryCode || 'UNASSIGNED';
      groups.set(category, [...(groups.get(category) || []), result]);
    });
    return [...groups.entries()].map(([category, values]) => [category, values.sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))] as const);
  }, [results, events, resultTeam]);
  const filtered = selectedCat === 'ALL' ? grouped : grouped.filter(([category]) => category === selectedCat);
  const approvedQualificationCount = qualifications.filter(item => item.status === 'APPROVED' || Boolean(item.finalsEntryId)).length;
  const pendingSourceEventIds = [...new Set(results
    .filter(result => result.eventId && qualifications.some(item => item.sourceEntryId === result.entryId && item.status === 'PENDING'))
    .map(result => result.eventId as string))];

  const approve = async (eventId: string) => {
    setBusyEvent(eventId);
    setError('');
    setMessage('');
    try {
      await callEiroFunction<{ eventId: string }, unknown>('approveQualifiers', { eventId });
      setMessage(`Qualifier approval submitted for event ${eventId}.`);
      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);
      setError(`Qualifier approval for ${eventId} was not completed. The callable may be unavailable or the event may not be eligible.`);
    } finally {
      setBusyEvent('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rankings & Qualification" subtitle="Stored result ranks and qualification records"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard title="Categories" value={grouped.length} icon={Trophy} color="indigo" />
        <KpiCard title="Ranked Result Records" value={results.length} icon={BarChart3} color="blue" />
        <KpiCard title="Approved Qualification Records" value={approvedQualificationCount} icon={CheckCircle2} color="green" />
      </div>
      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-400">Ranks and qualification decisions are read from stored records. This screen does not calculate scores, reorder teams, lock results, or infer qualifying quotas; the trusted function validates qualifier approval.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        results.length === 0 ? <Card className="text-center text-gray-400">No result records found.</Card> : <>
          <div className="flex gap-2 flex-wrap">
            {['ALL', ...grouped.map(([category]) => category)].map(category => <button key={category} onClick={() => setSelectedCat(category)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${selectedCat === category ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>{category}</button>)}
          </div>
          {filtered.map(([category, categoryRows]) => {
            const categoryEvents = new Set(categoryRows.map(result => result.eventId).filter((eventId): eventId is string => Boolean(eventId)));
            const categoryPendingEvents = pendingSourceEventIds.filter(eventId => categoryEvents.has(eventId));
            return <Card key={category} padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-3">
              {category === 'UNASSIGNED' ? <Badge>Unassigned category</Badge> : <CategoryBadge code={category as CategoryCode} />}
              <div className="flex items-center gap-2">
                {categoryPendingEvents.map(eventId => <Button key={eventId} size="sm" icon={CheckCircle2} loading={busyEvent === eventId} disabled={Boolean(busyEvent)} onClick={() => void approve(eventId)}>Approve qualifiers · {eventId}</Button>)}
              </div>
            </div>
            <div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Rank</th><th>Team</th><th>Score Snapshot</th><th>Qualification</th></tr></thead>
              <tbody>{categoryRows.map(result => {
                const team = resultTeam(result);
                const school = schools.find(item => item.id === team?.schoolId);
                const qualification = qualifications.find(item => item.sourceEntryId === result.entryId);
                return <tr key={result.id}>
                  <td><span className="text-lg">{result.rank ?? '—'}</span></td>
                  <td><div className="font-medium text-white text-sm">{team?.teamName || result.entryId || 'Team details unavailable'}</div><div className="text-xs text-gray-500">{school?.name || school?.id || '—'}</div><div className="font-mono text-[10px] text-gray-600">{team?.displayTeamCode || result.entryId || result.id}</div></td>
                  <td className="font-mono text-xs text-gray-300">{result.scoreSnapshot === undefined ? '—' : JSON.stringify(result.scoreSnapshot)}</td>
                  <td><Badge variant={qualification?.status === 'APPROVED' || qualification?.finalsEntryId ? 'success' : qualification?.status === 'PENDING' ? 'warning' : 'default'}>{qualification?.status || (qualification?.finalsEntryId ? 'FINALS ENTRY CREATED' : 'No qualification record')}</Badge></td>
                </tr>;
              })}</tbody></table></div>
          </Card>;
          })}
        </>}
    </div>
  );
}
