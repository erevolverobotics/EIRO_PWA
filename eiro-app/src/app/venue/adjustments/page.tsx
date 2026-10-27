'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { AlertCircle, Shuffle } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Entry = { id: string; teamId: string; eventId: string; entryStatus: string; mergedIntoEntryId?: string };
type Team = { id: string; teamName: string; displayTeamCode: string };
type Adjustment = { id: string; type?: string; status?: string; sourceEntryId?: string; targetEntryId?: string; studentIds?: string[]; reason?: string; createdAt?: { toDate?: () => Date } | string };

export default function VenueAdjustmentsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<Adjustment[]>([]);
  const [sourceEntryId, setSourceEntryId] = useState('');
  const [targetEntryId, setTargetEntryId] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    Promise.all([getAll<Entry>('stageEntries'), getAll<Team>('teams'), getAll<Adjustment>('teamAdjustmentRequests')])
      .then(([entryRows, teamRows, requestRows]) => { setEntries(entryRows.filter(entry => !entry.mergedIntoEntryId)); setTeams(teamRows); setRequests(requestRows); })
      .catch(() => setError('Adjustment requests could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const teamName = (entryId: string) => {
    const entry = entries.find(item => item.id === entryId);
    return teams.find(team => team.id === entry?.teamId)?.teamName ?? entry?.teamId ?? entryId;
  };
  const submit = async () => {
    if (!sourceEntryId || !targetEntryId || sourceEntryId === targetEntryId || !studentIds.trim() || !reason.trim()) {
      toast.error('Select two different entries, at least one student, and provide a reason.');
      return;
    }
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('requestTeamAdjustment', {
        type: 'TRANSFER_MEMBERS',
        sourceEntryId,
        targetEntryId,
        studentIds: studentIds.split(',').map(id => id.trim()).filter(Boolean),
        reason: reason.trim(),
      });
      toast.success('Adjustment request sent for review.');
      setSourceEntryId(''); setTargetEntryId(''); setStudentIds(''); setReason('');
      load();
    } catch {
      toast.error('The adjustment request was not accepted.');
    } finally { setSaving(false); }
  };
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Team Adjustments" subtitle="Submit venue adjustment requests for authorized review" />
    <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex gap-3 text-xs text-yellow-300"><AlertCircle className="w-4 h-4 shrink-0" /><span>Requests are not applied here. Approval and roster changes require an authorized backend workflow; this page does not simulate approval.</span></div>
    <Card>
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Shuffle className="w-4 h-4 text-purple-400" />Request member transfer</h3>
      {entries.length === 0 ? <p className="text-sm text-gray-400">No active stage entries are available for a request.</p> : <>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm text-gray-400">Source entry<select className="eiro-input mt-1" value={sourceEntryId} onChange={event => setSourceEntryId(event.target.value)}><option value="">Select source</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{teamName(entry.id)}</option>)}</select></label>
          <label className="text-sm text-gray-400">Target entry<select className="eiro-input mt-1" value={targetEntryId} onChange={event => setTargetEntryId(event.target.value)}><option value="">Select target</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{teamName(entry.id)}</option>)}</select></label>
          <label className="text-sm text-gray-400 sm:col-span-2">Student IDs (comma-separated)<input className="eiro-input mt-1" value={studentIds} onChange={event => setStudentIds(event.target.value)} placeholder="IDs to transfer" /></label>
          <label className="text-sm text-gray-400 sm:col-span-2">Request reason<textarea className="eiro-input mt-1" rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
        </div>
        <div className="flex justify-end mt-4"><Button onClick={() => void submit()} loading={saving} disabled={loading}>Send Request</Button></div>
      </>}
    </Card>
    {loading ? <p role="status" className="text-center text-gray-400 py-8">Loading adjustment records…</p> : error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> :
      <Card padding="none"><div className="px-5 py-4 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Existing requests</h3></div>{requests.length === 0 ? <p className="p-6 text-center text-gray-400">No adjustment requests found.</p> : <div className="divide-y divide-white/5">{requests.map(request => <div key={request.id} className="p-5"><div className="flex justify-between gap-3"><span className="font-medium text-white">{teamName(request.sourceEntryId ?? '')} → {teamName(request.targetEntryId ?? '')}</span><Badge variant="warning">{request.status ?? 'PENDING'}</Badge></div><p className="text-xs text-gray-400 mt-2">{request.reason ?? 'No reason supplied'}</p><p className="text-xs text-gray-500 mt-1">Students: {request.studentIds?.join(', ') ?? '—'}</p></div>)}</div>}</Card>}
  </div>;
}
