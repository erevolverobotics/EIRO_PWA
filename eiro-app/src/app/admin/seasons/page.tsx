'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, Modal, Input, Textarea } from '@/components/ui';
import { Plus, Edit3, Trophy, Calendar, Archive, ChevronRight, Settings, CheckCircle2 } from 'lucide-react';

const SEASONS = [
  {
    id: 'EIRO_2026', name: 'EIRO 2026', year: 2026,
    phase: 'ACTIVE', regOpen: '2026-09-01', regClose: '2026-10-15',
    districts: 4, teams: 123, events: 6, categories: 7,
  },
  {
    id: 'EIRO_2025', name: 'EIRO 2025', year: 2025,
    phase: 'COMPLETED', regOpen: '2025-09-01', regClose: '2025-10-10',
    districts: 3, teams: 98, events: 5, categories: 6,
  },
];

const PHASE_COLORS: Record<string, string> = {
  SETUP: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  REGISTRATION_OPEN: 'text-green-400 bg-green-500/10 border-green-500/30',
  REGISTRATION_CLOSED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  ACTIVE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  COMPLETED: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  ARCHIVED: 'text-gray-500 bg-gray-600/10 border-gray-600/30',
};

export default function SeasonsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', year: '2027', regOpen: '', regClose: '' });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Seasons"
        subtitle="Manage competition seasons, phases and global settings"
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create Season</Button>
        }
      />

      <div className="space-y-4">
        {SEASONS.map(s => (
          <Card key={s.id} hover>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-white">{s.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${PHASE_COLORS[s.phase]}`}>
                      {s.phase.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Reg: {s.regOpen} → {s.regClose}</span>
                    <span>{s.districts} districts</span>
                    <span>{s.events} events</span>
                    <span>{s.categories} categories</span>
                    <span className="text-indigo-400 font-medium">{s.teams} teams</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {s.phase !== 'COMPLETED' && s.phase !== 'ARCHIVED' && (
                  <>
                    <Button size="sm" variant="secondary" icon={Settings}>Configure</Button>
                    <Button size="sm" icon={ChevronRight} iconPosition="right">Manage Phase</Button>
                  </>
                )}
                {s.phase === 'COMPLETED' && (
                  <Button size="sm" variant="secondary" icon={Archive}>Archive</Button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Districts', value: s.districts, color: 'text-blue-400' },
                { label: 'Teams', value: s.teams, color: 'text-indigo-400' },
                { label: 'Events', value: s.events, color: 'text-purple-400' },
                { label: 'Categories', value: s.categories, color: 'text-green-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center py-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Season"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={() => setCreateOpen(false)}>Create Season</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Season Name" id="season-name" placeholder="e.g. EIRO 2027" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Year" id="season-year" type="number" placeholder="2027" value={form.year}
            onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
          <Input label="Registration Opens" id="reg-open" type="date" value={form.regOpen}
            onChange={e => setForm(f => ({ ...f, regOpen: e.target.value }))} />
          <Input label="Registration Closes" id="reg-close" type="date" value={form.regClose}
            onChange={e => setForm(f => ({ ...f, regClose: e.target.value }))} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">Season will start in SETUP phase. You must configure categories, districts, venues and fee rules before opening registration.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
