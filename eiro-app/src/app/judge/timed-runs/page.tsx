'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader, Card, Badge, Button, StatusBadge, Modal } from '@/components/ui';
import { Timer, Play, Pause, RotateCcw, CheckCircle2, XCircle, Flag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const CHECKPOINTS = [
  { id: 1, label: 'Start Gate' },
  { id: 2, label: 'Checkpoint A' },
  { id: 3, label: 'Checkpoint B' },
  { id: 4, label: 'Checkpoint C' },
  { id: 5, label: 'Finish Gate' },
];

const PENALTY_TYPES = [
  { id: 'WALL_HIT', label: 'Wall Hit', ms: 5000 },
  { id: 'OFF_COURSE', label: 'Off Course', ms: 10000 },
  { id: 'RESTART', label: 'Robot Restart', ms: 15000 },
  { id: 'JUDGE_DQ', label: 'Rule Violation (DQ)', ms: 0 },
];

interface Penalty {
  id: string;
  type: string;
  label: string;
  ms: number;
  at: number;
}

export default function TimedRunsPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checkpointsTouched, setCheckpointsTouched] = useState<number[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [attemptIndex, setAttemptIndex] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 10), 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    const msFrac = ms % 1000;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${String(msFrac).padStart(3, '0')}`;
  };

  const penaltyMs = penalties.filter(p => p.ms > 0).reduce((s, p) => s + p.ms, 0);
  const adjustedMs = elapsed + penaltyMs;

  const touchCheckpoint = (cpId: number) => {
    if (!running) return;
    if (!checkpointsTouched.includes(cpId)) {
      setCheckpointsTouched(c => [...c, cpId]);
      toast.success(`✓ ${CHECKPOINTS.find(c => c.id === cpId)?.label}`);
    }
  };

  const addPenalty = (type: typeof PENALTY_TYPES[0]) => {
    if (type.id === 'JUDGE_DQ') { setRunning(false); setDisqualified(true); return; }
    setPenalties(p => [...p, { id: Date.now().toString(), type: type.id, label: type.label, ms: type.ms, at: elapsed }]);
    toast.error(`Penalty: ${type.label} (+${type.ms / 1000}s)`);
  };

  const handleReset = () => {
    setRunning(false); setElapsed(0); setCheckpointsTouched([]); setPenalties([]); setDisqualified(false);
  };

  const handleSubmit = () => {
    setRunning(false);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setSubmitted(true);
    toast.success('Run submitted successfully!');
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Run Submitted</h3>
          <p className="text-gray-400 mb-1">Elapsed: <span className="font-mono text-white">{formatTime(elapsed)}</span></p>
          <p className="text-gray-400 mb-1">Penalties: <span className="text-red-400">+{formatTime(penaltyMs)}</span></p>
          <p className="text-gray-400 mb-4">Adjusted Time: <span className="font-mono text-indigo-400 text-lg font-bold">{formatTime(adjustedMs)}</span></p>
          <Button onClick={() => { setSubmitted(false); handleReset(); setAttemptIndex(i => i + 1); }}>
            Next Attempt (#{attemptIndex + 1})
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title="Timed Run — Maze Solver"
        subtitle="Maze Masters · Attempt #1 · Arena B – Maze Track 2"
      />

      {disqualified && (
        <div className="p-4 rounded-2xl bg-red-900/30 border border-red-500/40 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">Team Disqualified</p>
            <p className="text-xs text-red-500">A rule violation DQ was recorded. This run cannot be submitted.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>Reset</Button>
        </div>
      )}

      {/* Timer display */}
      <Card className="text-center py-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Elapsed Time</p>
        <div className={`text-6xl font-black font-mono mb-2 transition-colors ${running ? 'text-indigo-400' : 'text-white'}`}>
          {formatTime(elapsed)}
        </div>
        {penaltyMs > 0 && (
          <div className="flex items-center justify-center gap-3 text-sm mb-2">
            <span className="text-red-400">+ {formatTime(penaltyMs)} penalties</span>
            <span className="text-gray-600">=</span>
            <span className="text-yellow-400 font-bold">{formatTime(adjustedMs)} adjusted</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          {!running ? (
            <Button icon={Play} onClick={() => setRunning(true)} disabled={disqualified || submitted}
              className="text-lg px-8 py-4">
              {elapsed > 0 ? 'Resume' : 'Start Run'}
            </Button>
          ) : (
            <Button icon={Pause} variant="secondary" onClick={() => setRunning(false)}
              className="text-lg px-8 py-4">Pause</Button>
          )}
          <Button variant="secondary" icon={RotateCcw} onClick={handleReset} disabled={running}>Reset</Button>
          {elapsed > 0 && !running && !disqualified && (
            <Button icon={Flag} onClick={handleSubmit}>Submit Run</Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Checkpoints */}
        <Card>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" /> Checkpoints
          </h3>
          <div className="space-y-2">
            {CHECKPOINTS.map(cp => {
              const reached = checkpointsTouched.includes(cp.id);
              return (
                <button
                  key={cp.id}
                  onClick={() => touchCheckpoint(cp.id)}
                  disabled={!running || reached}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    reached
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : running
                        ? 'border-white/10 bg-white/5 text-gray-300 hover:border-indigo-500/40 hover:text-white cursor-pointer'
                        : 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm font-medium">{cp.label}</span>
                  {reached ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs text-gray-600">Tap when reached</span>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Penalties */}
        <Card>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Penalties
          </h3>
          <div className="space-y-2 mb-4">
            {PENALTY_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => addPenalty(pt)}
                disabled={!running && elapsed === 0}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                  pt.id === 'JUDGE_DQ'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer'
                    : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 cursor-pointer'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="text-sm font-medium">{pt.label}</span>
                <span className="text-xs">{pt.ms > 0 ? `+${pt.ms / 1000}s` : 'DQ'}</span>
              </button>
            ))}
          </div>

          {/* Applied penalties */}
          {penalties.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Applied penalties:</p>
              <div className="space-y-1">
                {penalties.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/[0.03]">
                    <span className="text-gray-400">{p.label}</span>
                    <span className="text-red-400">@{formatTime(p.at)} +{p.ms / 1000}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Confirm submit modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Timed Run"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>Confirm & Submit</Button>
          </>
        }
      >
        <div className="space-y-3">
          {[
            ['Team', 'Maze Masters'],
            ['Attempt', `#${attemptIndex}`],
            ['Checkpoints', `${checkpointsTouched.length}/${CHECKPOINTS.length}`],
            ['Raw Time', formatTime(elapsed)],
            ['Penalties', `+${formatTime(penaltyMs)} (${penalties.length} applied)`],
            ['Adjusted Time', formatTime(adjustedMs)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1.5 border-b border-white/5">
              <span className="text-gray-400">{k}</span>
              <span className="text-white font-medium font-mono">{v}</span>
            </div>
          ))}
          <p className="text-xs text-gray-600 mt-2">Once submitted, this run cannot be modified without Head Judge approval.</p>
        </div>
      </Modal>
    </div>
  );
}
