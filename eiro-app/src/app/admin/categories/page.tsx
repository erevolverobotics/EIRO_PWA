'use client';

import { useState } from 'react';
import { PageHeader, Card, CategoryBadge, Button, Badge, Modal, Input } from '@/components/ui';
import { Settings, Plus, Edit3, Zap, Timer, Star, CheckCircle2 } from 'lucide-react';
import type { CategoryCode, ScoringEngine } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ENGINE } from '@/lib/types';

const ENGINE_ICON: Record<ScoringEngine, React.ElementType> = {
  MATCH_TOURNAMENT: Zap,
  TIMED_TECHNICAL: Timer,
  JUDGED_RUBRIC: Star,
  HYBRID: Settings,
};

const ENGINE_LABEL: Record<ScoringEngine, string> = {
  MATCH_TOURNAMENT: 'Match Tournament',
  TIMED_TECHNICAL: 'Timed Technical',
  JUDGED_RUBRIC: 'Judged Rubric',
  HYBRID: 'Hybrid',
};

const CATEGORY_CONFIG: Record<CategoryCode, { minTeam: number; maxTeam: number; feeAmount: number; hasFee: boolean; rounds: number }> = {
  SUMO:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true, rounds: 3 },
  MAZE:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true, rounds: 2 },
  WALL:             { minTeam: 2, maxTeam: 2, feeAmount: 500, hasFee: true, rounds: 2 },
  ECO_CITY:         { minTeam: 2, maxTeam: 5, feeAmount: 0,   hasFee: false, rounds: 1 },
  NEXTGEN_FACTORY:  { minTeam: 2, maxTeam: 5, feeAmount: 0,   hasFee: false, rounds: 1 },
  INNOVATOR_JUNIOR: { minTeam: 2, maxTeam: 6, feeAmount: 0,   hasFee: false, rounds: 1 },
  INNOVATOR_SENIOR: { minTeam: 2, maxTeam: 6, feeAmount: 0,   hasFee: false, rounds: 1 },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

export default function CategoriesPage() {
  const [editCat, setEditCat] = useState<CategoryCode | null>(null);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Categories & Rules"
        subtitle="Configure competition categories, scoring engines, team sizes and fees"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ALL_CATEGORIES.map(cat => {
          const engine = CATEGORY_ENGINE[cat];
          const config = CATEGORY_CONFIG[cat];
          const Icon = ENGINE_ICON[engine];

          return (
            <Card key={cat} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{CATEGORY_LABELS[cat]}</h3>
                    <p className="font-mono text-xs text-gray-500 mt-0.5">{cat}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon={Edit3} onClick={() => setEditCat(cat)}>Edit</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Scoring Engine</p>
                  <p className="text-sm font-medium text-white">{ENGINE_LABEL[engine]}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Team Size</p>
                  <p className="text-sm font-medium text-white">{config.minTeam}–{config.maxTeam} members</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Participation Fee</p>
                  {config.hasFee
                    ? <p className="text-sm font-bold text-yellow-400">₹{config.feeAmount}</p>
                    : <p className="text-sm text-green-400">Free</p>
                  }
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Rounds / Attempts</p>
                  <p className="text-sm font-medium text-white">{config.rounds}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Badge variant="info" size="sm">{engine}</Badge>
                {config.hasFee && <Badge variant="warning" size="sm">Fee Required</Badge>}
                <Badge variant="default" size="sm">v2026.1</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title={`Edit — ${editCat ? CATEGORY_LABELS[editCat] : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditCat(null)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={() => setEditCat(null)}>Save Rule Version</Button>
          </>
        }
      >
        {editCat && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-400">Saving will create a new rule version. Existing scored entries retain their original version for audit integrity.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min Team Size" id="min-team" type="number" defaultValue={String(CATEGORY_CONFIG[editCat].minTeam)} />
              <Input label="Max Team Size" id="max-team" type="number" defaultValue={String(CATEGORY_CONFIG[editCat].maxTeam)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fee (₹, 0 = free)" id="fee-amount" type="number" defaultValue={String(CATEGORY_CONFIG[editCat].feeAmount)} />
              <Input label="Rounds / Attempts" id="rounds" type="number" defaultValue={String(CATEGORY_CONFIG[editCat].rounds)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
