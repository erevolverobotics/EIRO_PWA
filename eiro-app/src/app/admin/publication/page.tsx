'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, KpiCard, CategoryBadge, Badge, StatusBadge } from '@/components/ui';
import { Award, Globe, Lock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

interface ResultRecord {
  id: string;
  eventId?: string;
  eventName?: string;
  categoryCode?: string;
  category?: string;
  entryId?: string;
  teamIds?: string[];
  teamCount?: number;
  scoreStatus?: string;
  status?: string;
  publishedAt?: unknown;
  qualifiedCount?: number;
}
interface Scorecard { id: string; entryId?: string; status?: string }
interface Event { id: string; name?: string; title?: string; categoryCode?: string }
interface Entry { id: string; teamId?: string }
interface Team { id: string; teamName?: string; displayTeamCode?: string; categoryCode?: string }

export default function PublicationPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [resultData, scorecardData, eventData, entryData, teamData] = await Promise.all([
        getAll<ResultRecord>('results'), getAll<Scorecard>('scorecards'), getAll<Event>('events'),
        getAll<Entry>('stageEntries'), getAll<Team>('teams'),
      ]);
      setResults(resultData);
      setScorecards(scorecardData);
      setEvents(eventData);
      setEntries(entryData);
      setTeams(teamData);
    } catch (e) {
      console.error(e);
      setError('Could not load publication data. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const published = (result: ResultRecord) => Boolean(result.publishedAt) || result.status === 'PUBLISHED';
  const scoreStatus = (result: ResultRecord) => {
    if (result.scoreStatus) return result.scoreStatus;
    const related = scorecards.filter(card => card.entryId === result.entryId);
    if (related.length === 0) return 'UNKNOWN';
    return related.every(card => card.status === 'LOCKED') ? 'LOCKED' : 'NOT_ALL_LOCKED';
  };
  const resultTeam = (result: ResultRecord) => {
    const teamId = entries.find(entry => entry.id === result.entryId)?.teamId;
    return teams.find(team => team.id === teamId);
  };
  const runAction = async (result: ResultRecord, action: 'publishResults' | 'issueCertificate') => {
    setBusy(`${result.id}:${action}`);
    setError('');
    setMessage('');
    try {
      await callEiroFunction<{ resultId: string }, unknown>(action, { resultId: result.id });
      setMessage(action === 'publishResults' ? `Publication submitted for ${result.id}.` : `Certificate issuance submitted for ${result.id}.`);
      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);
      setError(`The ${action === 'publishResults' ? 'publication' : 'certificate'} request was not completed. The callable may be unavailable or the result may no longer be eligible.`);
    } finally {
      setBusy('');
    }
  };
  const publishableCount = results.filter(result => scoreStatus(result) === 'LOCKED' && !published(result)).length;
  const publishedCount = results.filter(published).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Publication & Certificates" subtitle="Publish results and request certificate issuance"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard title="Ready to Publish" value={publishableCount} icon={Globe} color="green" />
        <KpiCard title="Published Results" value={publishedCount} icon={CheckCircle2} color="blue" />
        <KpiCard title="Awaiting Score Lock" value={results.filter(result => scoreStatus(result) !== 'LOCKED').length} icon={Lock} color="orange" />
      </div>
      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">Result publication and certificate issuance are performed by trusted Cloud Functions. The server validates eligibility and applies the operation.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        results.length === 0 ? <Card className="text-center text-gray-400">No result records found.</Card> :
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Results Publication Queue</h3></div>
            <div className="overflow-x-auto"><table className="eiro-table">
              <thead><tr><th>Event</th><th>Category</th><th>Team / Entry</th><th>Score Status</th><th>Publication</th><th>Qualifiers</th><th>Actions</th></tr></thead>
              <tbody>{results.map(result => {
                const isPublished = published(result);
                const team = resultTeam(result);
                const event = events.find(item => item.id === result.eventId);
                const cat = result.categoryCode || result.category || event?.categoryCode || team?.categoryCode;
                return <tr key={result.id}>
                  <td><span className="text-xs text-gray-400">{result.eventName || event?.name || event?.title || result.eventId || result.id}</span></td>
                  <td>{cat ? <CategoryBadge code={cat as CategoryCode} /> : <span className="text-xs text-gray-500">—</span>}</td>
                  <td><span className="text-white">{team?.teamName || team?.displayTeamCode || result.entryId || '—'}</span></td>
                  <td><StatusBadge status={scoreStatus(result)} /></td>
                  <td><div className="flex items-center gap-2"><StatusBadge status={isPublished ? 'PUBLISHED' : 'DRAFT'} />{isPublished && <Globe className="w-3 h-3 text-green-400" />}</div></td>
                  <td>{result.qualifiedCount !== undefined ? <Badge variant="success">{result.qualifiedCount} teams</Badge> : <span className="text-xs text-gray-600">—</span>}</td>
                  <td><div className="flex gap-2">
                    {scoreStatus(result) === 'LOCKED' && !isPublished && <Button size="sm" icon={Globe} loading={busy === `${result.id}:publishResults`} disabled={Boolean(busy)} onClick={() => void runAction(result, 'publishResults')}>Publish</Button>}
                    {isPublished && <Button size="sm" variant="secondary" icon={Award} loading={busy === `${result.id}:issueCertificate`} disabled={Boolean(busy)} onClick={() => void runAction(result, 'issueCertificate')}>Issue Certificates</Button>}
                  </div></td>
                </tr>;
              })}</tbody>
            </table></div>
          </Card>}
    </div>
  );
}
