'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { Swords, Trophy } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Match = { id: string; eventId?: string; entryAId?: string; entryBId?: string; teamAName?: string; teamBName?: string; teamA?: string; teamB?: string; status?: string; round?: string; arena?: string; categoryCode?: string };
type Bout = { id: string; matchId: string; boutNumber?: number; winner?: string; durationSeconds?: number; penaltyNote?: string };
function MatchesPageContent() {
  const params = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [matchId, setMatchId] = useState(params.get('matchId') ?? '');
  const [duration, setDuration] = useState('60');
  const [penalty, setPenalty] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestedMatchId = params.get('matchId');
  const load = useCallback(() => {
    Promise.all([getAll<Match>('matches'), getAll<Bout>('matchBouts')])
      .then(([matchRows, boutRows]) => { setMatches(matchRows); setBouts(boutRows); if (matchRows.length) setMatchId(current => current || requestedMatchId || matchRows[0].id); })
      .catch(() => setError('Match records could not be loaded.'))
      .finally(() => setLoading(false));
  }, [requestedMatchId]);
  useEffect(() => { load(); }, [load]);
  const match = matches.find(item => item.id === matchId);
  const matchBouts = useMemo(() => bouts.filter(bout => bout.matchId === matchId).sort((a, b) => (a.boutNumber ?? 0) - (b.boutNumber ?? 0)), [bouts, matchId]);
  const nextBout = Math.max(0, ...matchBouts.map(bout => bout.boutNumber ?? 0)) + 1;
  const record = async (winner: string) => {
    if (!match) return;
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('recordMatchBout', {
        matchId: match.id, boutNumber: nextBout, winner,
        durationSeconds: Number(duration), penaltyNote: penalty.trim(),
      });
      toast.success('Bout result recorded.');
      setPenalty('');
      load();
    } catch { toast.error('Bout result was not accepted by the scoring service.'); }
    finally { setSaving(false); }
  };
  return <div className="max-w-3xl space-y-6 animate-fade-in-up">
    <PageHeader title="Match Bout Recording" subtitle="Select a persisted match and submit individual bout outcomes" />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading match records…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : matches.length === 0 ? <Card className="text-center py-12 text-gray-400">No match assignments are available.</Card> : <>
      <label className="block text-sm text-gray-400">Match<select className="eiro-input mt-1" value={matchId} onChange={event => setMatchId(event.target.value)}>{matches.map(item => <option key={item.id} value={item.id}>{item.teamAName ?? item.teamA ?? item.entryAId ?? 'Team A'} vs {item.teamBName ?? item.teamB ?? item.entryBId ?? 'Team B'} · {item.id}</option>)}</select></label>
      {match && <>
        <Card><div className="flex items-center gap-3"><Swords className="w-5 h-5 text-red-400" /><div><h2 className="font-bold text-white">{match.teamAName ?? match.teamA ?? match.entryAId ?? 'Team A'} vs {match.teamBName ?? match.teamB ?? match.entryBId ?? 'Team B'}</h2><p className="text-xs text-gray-500">{match.round ?? '—'} · {match.arena ?? '—'}</p></div><Badge variant="info">{match.status ?? '—'}</Badge></div></Card>
        <Card><h3 className="font-semibold text-white mb-4">Bout {nextBout}</h3><label className="block text-sm text-gray-400">Duration (seconds)<input type="number" min="1" value={duration} onChange={event => setDuration(event.target.value)} className="eiro-input mt-1" /></label><label className="block text-sm text-gray-400 mt-3">Penalty note (optional)<input value={penalty} onChange={event => setPenalty(event.target.value)} className="eiro-input mt-1" /></label><p className="text-sm text-gray-400 mt-4 mb-2">Record the observed bout outcome:</p><div className="grid grid-cols-3 gap-2"><Button onClick={() => void record('TEAM_A')} loading={saving}>{match.teamAName ?? match.teamA ?? 'Team A'}</Button><Button variant="secondary" onClick={() => void record('DRAW')} loading={saving}>Draw</Button><Button onClick={() => void record('TEAM_B')} loading={saving}>{match.teamBName ?? match.teamB ?? 'Team B'}</Button></div><p className="text-xs text-gray-500 mt-3">Bout limit, tie-break, and match completion policy are validated by the scoring service.</p></Card>
        {matchBouts.length > 0 && <Card><h3 className="font-semibold text-white mb-3">Recorded bouts</h3>{matchBouts.map(bout => <div key={bout.id} className="flex justify-between border-t border-white/5 py-2 text-sm"><span>Bout {bout.boutNumber ?? '—'} · {bout.winner ?? 'Outcome unavailable'}</span><span className="text-gray-500">{bout.durationSeconds ?? '—'}s</span></div>)}</Card>}
        <Button variant="secondary" icon={Trophy} onClick={load} disabled={loading}>Refresh match records</Button>
      </>}
    </>}
  </div>;
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-400 py-12">Loading matches…</p>}>
      <MatchesPageContent />
    </Suspense>
  );
}
