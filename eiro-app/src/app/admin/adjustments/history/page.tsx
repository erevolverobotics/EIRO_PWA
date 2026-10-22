'use client';

import { PageHeader, Card, Button, Badge, CategoryBadge, KpiCard } from '@/components/ui';
import { History, Clock, CheckCircle2, XCircle, Shuffle, Download } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const HISTORY = [
  {
    id: 'ADJ-001', type: 'MERGE_TEAMS', category: 'SUMO' as CategoryCode,
    source: 'Iron Crushers (EIRO-2026-055)', target: 'Robo Warriors (EIRO-2026-041)',
    students: ['Riya Patel'], outcome: 'APPROVED',
    approvedBy: 'Admin Dr. Anand', appliedAt: 'Oct 28 · 09:20 AM',
    note: 'Cross-school merge authorized. Source team marked MERGED.',
  },
  {
    id: 'ADJ-002', type: 'TRANSFER_MEMBERS', category: 'ECO_CITY' as CategoryCode,
    source: 'Eco Rangers (EIRO-2026-042)', target: 'Green Minds (EIRO-2026-077)',
    students: ['Vikram Singh'], outcome: 'REJECTED',
    approvedBy: 'Admin Dr. Anand', appliedAt: 'Oct 27 · 04:45 PM',
    note: 'Scheduling conflict reason insufficient. Teams remain unchanged.',
  },
];

export default function AdminAdjustmentHistoryPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Adjustment History"
        subtitle="Immutable audit log of all team merge and transfer operations"
        actions={<Button variant="secondary" size="sm" icon={Download}>Export</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Operations" value={HISTORY.length} icon={History} color="indigo" />
        <KpiCard title="Approved" value={HISTORY.filter(h => h.outcome === 'APPROVED').length} icon={CheckCircle2} color="green" />
        <KpiCard title="Rejected" value={HISTORY.filter(h => h.outcome === 'REJECTED').length} icon={XCircle} color="red" />
        <KpiCard title="Cross-school" value={1} icon={Shuffle} color="orange" />
      </div>

      <div className="space-y-4">
        {HISTORY.map(h => (
          <Card key={h.id} className={h.outcome === 'APPROVED' ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]'}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${h.outcome === 'APPROVED' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {h.outcome === 'APPROVED' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-indigo-400">{h.id}</span>
                    <Badge variant={h.type === 'MERGE_TEAMS' ? 'danger' : 'info'}>
                      {h.type === 'MERGE_TEAMS' ? 'Merge' : 'Transfer'}
                    </Badge>
                    <CategoryBadge code={h.category} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{h.appliedAt} · {h.approvedBy}</p>
                </div>
              </div>
              <Badge variant={h.outcome === 'APPROVED' ? 'success' : 'danger'}>{h.outcome}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm text-gray-300">{h.source}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 mb-1">To</p>
                <p className="text-sm text-gray-300">{h.target}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-2">
              <p className="text-xs text-gray-500 flex-shrink-0">Students moved:</p>
              <div className="flex gap-1 flex-wrap">
                {h.students.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400">{s}</span>
                ))}
              </div>
            </div>

            {h.note && (
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 mt-2">
                <p className="text-xs text-gray-400">{h.note}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-500/20 flex items-start gap-3">
        <Clock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-400">
          All records in this log are immutable. Before/after roster snapshots are stored with each entry for audit compliance.
          Records cannot be deleted by any user, including Super Admins.
        </p>
      </div>
    </div>
  );
}
