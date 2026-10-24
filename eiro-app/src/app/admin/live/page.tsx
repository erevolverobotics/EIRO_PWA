'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, KpiCard, Button, Badge, CategoryBadge, Modal } from '@/components/ui';
import { Zap, Users, Clock, Activity, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, doc, updateDoc, serverTimestamp, query, where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Match {
  id: string;
  category: CategoryCode;
  arena: string;
  teamA: string;
  teamB: string;
  round: string;
  status: string;
  scoreA: number;
  scoreB: number;
}

interface Arena {
  id: string;
  name: string;
  category: CategoryCode;
  status: string;
  currentMatch?: string;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-400',
  SETUP:  'bg-yellow-400',
  IDLE:   'bg-gray-500',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveOperationsPage() {
  const [matches, setMatches]         = useState<Match[]>([]);
  const [arenas, setArenas]           = useState<Arena[]>([]);
  const [loading, setLoading]         = useState(true);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [halting, setHalting]         = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matchSnap, arenaSnap] = await Promise.all([
        getDocs(query(collection(db, 'matches'), where('status', 'in', ['IN_PROGRESS', 'UPCOMING']))),
        getDocs(collection(db, 'arenas')),
      ]);

      setMatches(matchSnap.docs.map(d => ({
        id: d.id,
        category: 'SUMO' as CategoryCode,
        arena: '', teamA: '', teamB: '', round: '',
        status: 'UPCOMING', scoreA: 0, scoreB: 0,
        ...(d.data() as Partial<Match>),
      })));

      setArenas(arenaSnap.docs.map(d => ({
        id: d.id,
        name: d.id,
        category: 'SUMO' as CategoryCode,
        status: 'IDLE',
        ...(d.data() as Partial<Arena>),
      })));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load live data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Emergency stop ──────────────────────────────────────────────────────────

  const handleEmergencyStop = async () => {
    setHalting(true);
    try {
      // Mark all in-progress matches as HALTED
      const inProgress = matches.filter(m => m.status === 'IN_PROGRESS');
      await Promise.all(inProgress.map(m =>
        updateDoc(doc(db, 'matches', m.id), {
          status: 'HALTED',
          haltedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      ));
      // Mark all active arenas as IDLE
      const active = arenas.filter(a => a.status === 'ACTIVE');
      await Promise.all(active.map(a =>
        updateDoc(doc(db, 'arenas', a.id), {
          status: 'IDLE',
          updatedAt: serverTimestamp(),
        })
      ));
      toast.success('Emergency stop issued — all active matches halted.');
      setEmergencyOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to issue emergency stop.');
    } finally {
      setHalting(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const activeArenas  = arenas.filter(a => a.status === 'ACTIVE').length;
  const liveMatches   = matches.filter(m => m.status === 'IN_PROGRESS').length;
  const uniqueTeams   = new Set(matches.flatMap(m => [m.teamA, m.teamB].filter(Boolean))).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Operations
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time match and arena status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={loading ? Loader2 : RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
          <Button variant="danger" size="sm" icon={AlertCircle} onClick={() => setEmergencyOpen(true)}>Emergency Stop</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Active Arenas"    value={activeArenas} icon={Activity} color="green"  />
        <KpiCard title="Matches Running"  value={liveMatches}  icon={Zap}      color="indigo" />
        <KpiCard title="Teams Today"      value={uniqueTeams}  icon={Users}    color="blue"   />
        <KpiCard title="Avg Wait Time"    value="—"            icon={Clock}    color="orange" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Live Matches */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live & Upcoming Matches
              </h3>
            </div>
            {matches.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-10">No active matches right now.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-shrink-0 text-xs font-mono text-gray-500 w-8">{m.arena}</div>
                    <CategoryBadge code={m.category} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${m.scoreA > m.scoreB ? 'text-green-400' : 'text-white'}`}>{m.teamA}</span>
                        {m.teamB && (
                          <>
                            <span className="text-gray-600 text-sm font-bold font-mono">{m.scoreA} – {m.scoreB}</span>
                            <span className={`text-sm font-semibold ${m.scoreB > m.scoreA ? 'text-green-400' : 'text-white'}`}>{m.teamB}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.round}</p>
                    </div>
                    <Badge variant={m.status === 'IN_PROGRESS' ? 'success' : 'default'}>
                      {m.status === 'IN_PROGRESS' ? '● Live' : 'Upcoming'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Arena Status Grid */}
          <div>
            <h3 className="font-semibold text-white mb-3">Arena Status</h3>
            {arenas.length === 0 ? (
              <Card className="text-center py-10">
                <p className="text-gray-500 text-sm">No arenas configured. Add arenas in Firestore under <code>arenas</code> collection.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {arenas.map(arena => (
                  <Card key={arena.id} className={`border ${arena.status === 'ACTIVE' ? 'border-green-500/20 bg-green-500/[0.03]' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[arena.status] ?? 'bg-gray-500'}`} />
                        <span className="font-semibold text-white text-sm">{arena.name}</span>
                      </div>
                      <CategoryBadge code={arena.category} />
                    </div>
                    {arena.currentMatch ? (
                      <p className="text-xs text-gray-400">{arena.currentMatch}</p>
                    ) : (
                      <p className="text-xs text-gray-600">No match assigned</p>
                    )}
                    <p className={`text-xs font-medium mt-2 ${
                      arena.status === 'ACTIVE' ? 'text-green-400' :
                      arena.status === 'SETUP'  ? 'text-yellow-400' : 'text-gray-600'
                    }`}>{arena.status}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Emergency Stop modal */}
      <Modal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} title="Emergency Stop"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmergencyOpen(false)} disabled={halting}>Cancel</Button>
            <Button variant="danger" icon={halting ? Loader2 : AlertCircle} onClick={handleEmergencyStop} disabled={halting}>
              {halting ? 'Halting…' : 'HALT ALL OPERATIONS'}
            </Button>
          </>
        }
      >
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 mb-4">
          <p className="text-red-300 font-semibold mb-1">⚠ This will halt all live matches</p>
          <p className="text-sm text-red-500">All active scoring sessions will be paused. All progress is auto-saved.</p>
        </div>
        <p className="text-sm text-gray-400">Use only in case of emergency (fire alarm, medical incident, power outage, etc.).</p>
      </Modal>
    </div>
  );
}
