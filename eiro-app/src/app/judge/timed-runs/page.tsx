'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader, Card, Button } from '@/components/ui';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Entry = { id: string; eventId: string; teamId: string; entryStatus?: string; mergedIntoEntryId?: string };
type Run = { id: string; entryId: string; elapsedMilliseconds?: number; status?: string };
export default function TimedRunsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [entryId, setEntryId] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const startedAt = useRef(0);
  const load = useCallback(() => {
    Promise.all([getAll<Entry>('stageEntries'), getAll<Run>('timedRuns')])
      .then(([entryRows, runRows]) => { const active = entryRows.filter(entry => !entry.mergedIntoEntryId); setEntries(active); setRuns(runRows); if (!entryId && active.length) setEntryId(active[0].id); })
      .catch(() => setError('Timed-run assignments could not be loaded.'))
      .finally(() => setLoading(false));
  }, [entryId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), 25);
    return () => clearInterval(timer);
  }, [running]);
  const format = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}.${Math.floor(ms % 1000).toString().padStart(3, '0')}`;
  const submit = async () => {
    if (!entryId || elapsed <= 0) return;
    setRunning(false); setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('recordTimedRun', { entryId, elapsedMilliseconds: elapsed });
      toast.success('Timed-run result recorded.');
      setElapsed(0);
      load();
    } catch { toast.error('Run was not accepted by the scoring service.'); }
    finally { setSaving(false); }
  };
  const entryRuns = runs.filter(run => run.entryId === entryId);
  return <div className="space-y-6 max-w-3xl animate-fade-in-up">
    <PageHeader title="Timed Run" subtitle="Record raw elapsed time for a persisted stage entry. Scoring policy is server-validated." />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading timed-run entries…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : entries.length === 0 ? <Card className="text-center py-12 text-gray-400">No stage entries are available for timed runs.</Card> : <>
      <label className="block text-sm text-gray-400">Stage entry<select className="eiro-input mt-1" value={entryId} onChange={event => { setEntryId(event.target.value); setElapsed(0); setRunning(false); }}>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.teamId} · {entry.eventId} · {entry.id}</option>)}</select></label>
      <Card className="text-center py-8"><p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Elapsed Time</p><div className="text-6xl font-black font-mono text-indigo-300">{format(elapsed)}</div><div className="flex justify-center gap-3 mt-6">{!running ? <Button icon={Play} onClick={() => { startedAt.current = Date.now() - elapsed; setRunning(true); }}>{elapsed ? 'Resume' : 'Start'}</Button> : <Button icon={Pause} variant="secondary" onClick={() => setRunning(false)}>Pause</Button>}<Button variant="secondary" icon={RotateCcw} disabled={running || saving} onClick={() => setElapsed(0)}>Reset</Button><Button icon={Flag} disabled={running || elapsed <= 0 || saving} loading={saving} onClick={() => void submit()}>Record Run</Button></div></Card>
      <Card><h3 className="font-semibold text-white mb-2">Existing run records</h3>{entryRuns.length === 0 ? <p className="text-sm text-gray-400">No runs recorded for this entry.</p> : entryRuns.map(run => <div key={run.id} className="flex justify-between border-t border-white/5 py-2 text-sm"><span className="font-mono text-gray-300">{run.id}</span><span>{run.elapsedMilliseconds !== undefined ? format(run.elapsedMilliseconds) : 'Time unavailable'} · {run.status ?? 'Recorded'}</span></div>)}</Card>
      <p className="text-xs text-gray-500">No penalty values, checkpoints, attempt limits, or ranking rules are assumed by this page.</p>
    </>}
  </div>;
}
