'use client';

import { PageHeader, Card, CategoryBadge, Badge, Button } from '@/components/ui';
import { Trophy, Award, Download, Share2, AlertCircle } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const RESULTS = [
  { teamId: 'T001', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, event: 'Chennai District Prelim 2026', rank: 1, qualified: true, score: '3W 0L', scoreLabel: 'Wins' },
  { teamId: 'T002', name: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, event: 'Chennai District Prelim 2026', rank: 1, qualified: true, score: '88/100', scoreLabel: 'Score' },
];

export default function ResultsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Results & Finals" subtitle="S11 — Your teams' competition results and finals qualification" />

      {RESULTS.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {RESULTS.map(r => (
              <Card key={r.teamId} className={r.qualified ? 'border-yellow-500/30 bg-yellow-500/[0.03]' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CategoryBadge code={r.category} />
                      {r.qualified && <Badge variant="warning">🏆 Qualified for State Finals</Badge>}
                    </div>
                    <h3 className="text-lg font-bold text-white">{r.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{r.event}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black gradient-text-gold">
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                    </div>
                    <p className="text-xs text-gray-500">District Rank</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-xs text-gray-500">{r.scoreLabel}</p>
                    <p className="text-lg font-bold text-white font-mono mt-0.5">{r.score}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-xs text-gray-500">Stage</p>
                    <p className="text-sm font-bold text-indigo-400 mt-0.5">District</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={Download} className="flex-1">Certificate</Button>
                  <Button size="sm" variant="secondary" icon={Share2} className="flex-1">Share</Button>
                </div>
              </Card>
            ))}
          </div>

          {RESULTS.some(r => r.qualified) && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-900/30 to-orange-900/20 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="font-bold text-white text-lg">🎉 Congratulations!</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">Your team(s) have qualified for the <strong className="text-yellow-400">EIRO 2026 State Finals</strong> — December 15–16, 2026 · Chennai Trade Centre.</p>
              <p className="text-xs text-gray-500">State Finals registration details will be sent to your email. Watch for updates in the Schedule & Venue section.</p>
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No results published yet</p>
          <p className="text-sm text-gray-600 mt-1">Results will appear here after the competition and Head Judge review.</p>
        </Card>
      )}
    </div>
  );
}
