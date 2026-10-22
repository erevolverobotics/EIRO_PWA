'use client';

import { useState } from 'react';
import { PageHeader, Card, KpiCard, Button, Badge, StatusBadge, CategoryBadge, Modal } from '@/components/ui';
import { Zap, Users, Clock, Activity, QrCode, Trophy, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

const LIVE_MATCHES = [
  { id: 'M001', category: 'SUMO' as CategoryCode, arena: 'A1', teamA: 'Robo Warriors', teamB: 'Iron Crushers', round: 'QF1', status: 'IN_PROGRESS', scoreA: 2, scoreB: 1 },
  { id: 'M002', category: 'SUMO' as CategoryCode, arena: 'A2', teamA: 'Metal Beasts', teamB: 'Circuit Kings', round: 'QF2', status: 'UPCOMING', scoreA: 0, scoreB: 0 },
  { id: 'M003', category: 'MAZE' as CategoryCode, arena: 'B1', teamA: 'Maze Masters', teamB: '', round: 'Attempt 2', status: 'IN_PROGRESS', scoreA: 0, scoreB: 0 },
];

const ARENA_STATUS = [
  { id: 'A1', name: 'Sumo Ring 1', category: 'SUMO' as CategoryCode, status: 'ACTIVE', match: 'QF1 – Robo Warriors vs Iron Crushers' },
  { id: 'A2', name: 'Sumo Ring 2', category: 'SUMO' as CategoryCode, status: 'SETUP', match: 'QF2 – Metal Beasts vs Circuit Kings' },
  { id: 'B1', name: 'Maze Track 1', category: 'MAZE' as CategoryCode, status: 'ACTIVE', match: 'Maze Masters — Attempt 2' },
  { id: 'B2', name: 'Maze Track 2', category: 'MAZE' as CategoryCode, status: 'IDLE', match: '' },
  { id: 'C1', name: 'Presentation Hall', category: 'ECO_CITY' as CategoryCode, status: 'ACTIVE', match: 'Eco Rangers — Judging' },
];

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-400',
  SETUP: 'bg-yellow-400',
  IDLE: 'bg-gray-500',
};

export default function LiveOperationsPage() {
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            Live Operations
          </h2>
          <p className="text-sm text-gray-400 mt-1">District Preliminary — Chennai · Oct 28, 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw}>Refresh</Button>
          <Button variant="danger" size="sm" icon={AlertCircle} onClick={() => setEmergencyOpen(true)}>Emergency Stop</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Active Arenas" value={ARENA_STATUS.filter(a => a.status === 'ACTIVE').length} icon={Activity} color="green" />
        <KpiCard title="Matches Running" value={LIVE_MATCHES.filter(m => m.status === 'IN_PROGRESS').length} icon={Zap} color="indigo" />
        <KpiCard title="Teams Today" value={48} icon={Users} color="blue" />
        <KpiCard title="Avg Wait Time" value="12m" icon={Clock} color="orange" />
      </div>

      {/* Live Matches */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <span className="pulse-dot" /> Live Matches
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {LIVE_MATCHES.map(m => (
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
      </Card>

      {/* Arena Status Grid */}
      <div>
        <h3 className="font-semibold text-white mb-3">Arena Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARENA_STATUS.map(arena => (
            <Card key={arena.id} className={`border ${arena.status === 'ACTIVE' ? 'border-green-500/20 bg-green-500/[0.03]' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[arena.status]}`} />
                  <span className="font-semibold text-white text-sm">{arena.name}</span>
                </div>
                <CategoryBadge code={arena.category} />
              </div>
              {arena.match ? (
                <p className="text-xs text-gray-400">{arena.match}</p>
              ) : (
                <p className="text-xs text-gray-600">No match assigned</p>
              )}
              <p className={`text-xs font-medium mt-2 ${
                arena.status === 'ACTIVE' ? 'text-green-400' :
                arena.status === 'SETUP' ? 'text-yellow-400' : 'text-gray-600'
              }`}>{arena.status}</p>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} title="Emergency Stop"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmergencyOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={AlertCircle} onClick={() => setEmergencyOpen(false)}>HALT ALL OPERATIONS</Button>
          </>
        }
      >
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 mb-4">
          <p className="text-red-300 font-semibold mb-1">⚠ This will halt all live matches</p>
          <p className="text-sm text-red-500">All active scoring sessions will be paused. A broadcast notification will be sent to all judges and coordinators on-site.</p>
        </div>
        <p className="text-sm text-gray-400">Use only in case of emergency (fire alarm, medical incident, power outage, etc.). All progress is auto-saved.</p>
      </Modal>
    </div>
  );
}
