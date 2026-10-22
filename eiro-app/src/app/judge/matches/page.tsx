'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, Modal } from '@/components/ui';
import { Swords, Trophy, XCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const MATCH = {
  id: 'M001',
  round: 'Round 1 – Match 3',
  teamA: { id: 'TE001', name: 'Robo Warriors', code: 'EIRO-2026-041', school: 'DAV Public School' },
  teamB: { id: 'TE002', name: 'Iron Crushers', code: 'EIRO-2026-055', school: 'St. Josephs HS' },
  maxBouts: 3,
};

interface Bout {
  num: number;
  winner: 'A' | 'B' | 'DRAW' | null;
  penalty?: string;
  duration: number;
}

export default function MatchesPage() {
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [boutDuration, setBoutDuration] = useState(60);
  const [penaltyNote, setPenaltyNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [boutRunning, setBoutRunning] = useState(false);
  const [boutElapsed, setBoutElapsed] = useState(0);

  const boutNum = bouts.length + 1;
  const winsA = bouts.filter(b => b.winner === 'A').length;
  const winsB = bouts.filter(b => b.winner === 'B').length;
  const matchWinner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : null;
  const matchComplete = bouts.length >= MATCH.maxBouts || winsA > MATCH.maxBouts / 2 || winsB > MATCH.maxBouts / 2;

  const recordBout = (winner: Bout['winner']) => {
    setBouts(b => [...b, { num: boutNum, winner, duration: boutDuration, penalty: penaltyNote || undefined }]);
    setPenaltyNote('');
    setBoutRunning(false); setBoutElapsed(0);
    if (winner === 'A') toast.success(`Bout ${boutNum}: ${MATCH.teamA.name} wins!`);
    else if (winner === 'B') toast.success(`Bout ${boutNum}: ${MATCH.teamB.name} wins!`);
    else toast(`Bout ${boutNum}: Draw`);
  };

  const handleConfirm = () => { setConfirmOpen(false); setSubmitted(true); toast.success('Match result submitted!'); };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-12">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Match Result Submitted</h3>
          <p className="text-2xl font-black gradient-text mb-2">
            {matchWinner === 'A' ? MATCH.teamA.name : matchWinner === 'B' ? MATCH.teamB.name : 'Draw'}
          </p>
          <p className="text-gray-400 mb-2">Wins: {MATCH.teamA.name} {winsA} – {winsB} {MATCH.teamB.name}</p>
          <p className="text-gray-500 text-sm mb-6">Result submitted for Head Judge review</p>
          <Button onClick={() => setSubmitted(false)}>Back to Assignments</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader title="Sumo Match" subtitle={`${MATCH.round} · Arena A – Sumo Ring 1 · 09:00 AM`} />

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        {[MATCH.teamA, MATCH.teamB].map((team, idx) => {
          const wins = idx === 0 ? winsA : winsB;
          const isLeading = (idx === 0 && winsA > winsB) || (idx === 1 && winsB > winsA);
          return (
            <Card key={team.id} className={`text-center ${isLeading ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
              <div className="text-sm text-gray-500 mb-1">{idx === 0 ? 'Team A (Red)' : 'Team B (Blue)'}</div>
              <h3 className="text-lg font-bold text-white mb-0.5">{team.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{team.school}</p>
              <div className={`text-5xl font-black mb-1 ${isLeading ? 'text-yellow-400' : 'text-white'}`}>{wins}</div>
              <p className="text-xs text-gray-600">wins</p>
            </Card>
          );
        })}
      </div>

      {/* Bout history */}
      {bouts.length > 0 && (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="font-semibold text-white text-sm">Bout Results</h3>
          </div>
          <div className="divide-y divide-white/5">
            {bouts.map(b => (
              <div key={b.num} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs font-mono text-gray-500 w-12">Bout {b.num}</span>
                <div className="flex-1">
                  {b.winner === 'A' && <span className="text-green-400 font-medium text-sm">{MATCH.teamA.name} wins</span>}
                  {b.winner === 'B' && <span className="text-green-400 font-medium text-sm">{MATCH.teamB.name} wins</span>}
                  {b.winner === 'DRAW' && <span className="text-yellow-400 font-medium text-sm">Draw</span>}
                  {b.penalty && <p className="text-xs text-red-400 mt-0.5">Penalty: {b.penalty}</p>}
                </div>
                <span className="text-xs text-gray-600">{b.duration}s</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current bout controls */}
      {!matchComplete ? (
        <Card>
          <h3 className="font-semibold text-white mb-4">Bout {boutNum} Controls</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-400">Duration (s):</span>
            <input type="number" value={boutDuration} onChange={e => setBoutDuration(Number(e.target.value))}
              className="eiro-input w-24 text-center" min={1} max={300} />
          </div>
          <div className="mb-4">
            <input type="text" placeholder="Penalty note (optional)…" value={penaltyNote}
              onChange={e => setPenaltyNote(e.target.value)} className="eiro-input text-sm" />
          </div>

          <p className="text-xs text-gray-500 mb-3">Record bout winner:</p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="primary"
              icon={Trophy}
              onClick={() => recordBout('A')}
              className="bg-red-700 hover:bg-red-600 border-red-600"
            >
              {MATCH.teamA.name}
            </Button>
            <Button variant="secondary" onClick={() => recordBout('DRAW')}>Draw / Replay</Button>
            <Button
              variant="primary"
              icon={Trophy}
              onClick={() => recordBout('B')}
              className="bg-blue-700 hover:bg-blue-600 border-blue-600"
            >
              {MATCH.teamB.name}
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => {
              toast.error('Team A disqualified');
              setBouts(b => [...b, { num: boutNum, winner: 'B', duration: boutDuration, penalty: 'DISQUALIFIED' }]);
            }}>DQ Team A</Button>
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => {
              toast.error('Team B disqualified');
              setBouts(b => [...b, { num: boutNum, winner: 'A', duration: boutDuration, penalty: 'DISQUALIFIED' }]);
            }}>DQ Team B</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-4">
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <p className="font-bold text-white text-lg mb-1">Match Complete</p>
            <p className="text-gray-400 text-sm mb-4">
              Winner: <span className="text-yellow-400 font-semibold">
                {matchWinner === 'A' ? MATCH.teamA.name : matchWinner === 'B' ? MATCH.teamB.name : 'Draw — see tiebreak rules'}
              </span>
            </p>
            <Button icon={CheckCircle2} onClick={() => setConfirmOpen(true)}>Submit Match Result</Button>
          </div>
        </Card>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Match Result"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>Confirm Result</Button>
          </>
        }
      >
        <div className="space-y-2">
          {bouts.map(b => (
            <div key={b.num} className="flex justify-between text-sm py-1.5 border-b border-white/5">
              <span className="text-gray-400">Bout {b.num}</span>
              <span className="text-white">{b.winner === 'A' ? MATCH.teamA.name : b.winner === 'B' ? MATCH.teamB.name : 'Draw'}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-2">
            <span className="text-gray-300">Final Winner</span>
            <span className="gradient-text">
              {matchWinner === 'A' ? MATCH.teamA.name : matchWinner === 'B' ? MATCH.teamB.name : 'Draw'}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
