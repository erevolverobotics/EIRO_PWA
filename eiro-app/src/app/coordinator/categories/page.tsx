'use client';

import { PageHeader, Card, CategoryBadge, Badge } from '@/components/ui';
import { CATEGORY_LABELS, CATEGORY_ENGINE, type CategoryCode } from '@/lib/types';
import { Zap, Timer, Star, Settings, Users, CreditCard, Info } from 'lucide-react';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

const ENGINE_META: Record<string, { icon: React.ElementType; label: string; color: string; desc: string }> = {
  MATCH_TOURNAMENT: { icon: Zap, label: 'Match Tournament', color: 'text-red-400', desc: 'Head-to-head elimination brackets. Best of 3 bouts.' },
  TIMED_TECHNICAL: { icon: Timer, label: 'Timed Technical', color: 'text-blue-400', desc: 'Fastest time wins. Multiple attempts, best is scored.' },
  JUDGED_RUBRIC:   { icon: Star, label: 'Judged Rubric', color: 'text-green-400', desc: 'Panel of judges score against published criteria.' },
  HYBRID:          { icon: Settings, label: 'Hybrid', color: 'text-orange-400', desc: 'Combines timed runs with rubric presentation.' },
};

const CATEGORY_DETAILS: Record<CategoryCode, { minAge: string; teamSize: string; fee: string; equipment: string; ruleDoc: string }> = {
  SUMO:             { minAge: 'Grade 5+', teamSize: '2 members', fee: '₹500 / team', equipment: 'Custom sumo robot ≤ 500g, ≤ 10×10cm', ruleDoc: 'SUMO-v2026.1' },
  MAZE:             { minAge: 'Grade 6+', teamSize: '2 members', fee: '₹500 / team', equipment: 'Autonomous maze-solving robot', ruleDoc: 'MAZE-v2026.1' },
  WALL:             { minAge: 'Grade 6+', teamSize: '2 members', fee: '₹500 / team', equipment: 'Wall-following robot, IR sensors allowed', ruleDoc: 'WALL-v2026.1' },
  ECO_CITY:         { minAge: 'Grade 7+', teamSize: '2–5 members', fee: 'Free', equipment: 'Prototype + presentation materials', ruleDoc: 'ECOCITY-v2026.1' },
  NEXTGEN_FACTORY:  { minAge: 'Grade 8+', teamSize: '2–5 members', fee: 'Free', equipment: 'Automation model + technical report', ruleDoc: 'NEXTGEN-v2026.1' },
  INNOVATOR_JUNIOR: { minAge: 'Grade 6–8', teamSize: '2–6 members', fee: 'Free', equipment: 'Working prototype, open technology', ruleDoc: 'INNOV-JR-v2026.1' },
  INNOVATOR_SENIOR: { minAge: 'Grade 9–12', teamSize: '2–6 members', fee: 'Free', equipment: 'Working prototype, open technology', ruleDoc: 'INNOV-SR-v2026.1' },
};

export default function CategoryDirectoryPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Category Directory"
        subtitle="All EIRO 2026 competition categories, rules, and requirements"
      />

      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          Register your teams under the correct category before the deadline. Rule documents are published on the official EIRO website.
          Your school can enter multiple categories, with separate team registrations per category.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ALL_CATEGORIES.map(cat => {
          const engine = CATEGORY_ENGINE[cat];
          const meta = ENGINE_META[engine];
          const details = CATEGORY_DETAILS[cat];
          const Icon = meta.icon;

          return (
            <Card key={cat} hover>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-white">{CATEGORY_LABELS[cat]}</h3>
                      <CategoryBadge code={cat} />
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{meta.desc}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: Users, label: 'Team Size', value: details.teamSize },
                        { icon: CreditCard, label: 'Fee', value: details.fee },
                        { icon: Info, label: 'Eligibility', value: details.minAge },
                        { icon: Settings, label: 'Rules', value: details.ruleDoc },
                      ].map(d => (
                        <div key={d.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-[10px] text-gray-500 mb-0.5">{d.label}</p>
                          <p className="text-xs font-medium text-white">{d.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Equipment / Materials:</p>
                      <p className="text-xs text-gray-400">{details.equipment}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Badge variant={engine === 'MATCH_TOURNAMENT' ? 'danger' : engine === 'TIMED_TECHNICAL' ? 'info' : engine === 'JUDGED_RUBRIC' ? 'success' : 'warning'}>
                    {meta.label}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
