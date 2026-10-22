'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Textarea } from '@/components/ui';
import { Shuffle, CheckCircle2, XCircle, AlertCircle, Users, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const REQUESTS = [
  {
    id: 'ADJ001',
    type: 'MERGE_TEAMS' as const,
    status: 'PENDING_REVIEW' as const,
    category: 'SUMO' as CategoryCode,
    source: { code: 'EIRO-2026-055', name: 'Iron Crushers', school: 'St. Josephs', present: 1, total: 2 },
    target: { code: 'EIRO-2026-041', name: 'Robo Warriors', school: 'DAV Public', present: 2, total: 2 },
    students: ['Riya Patel'],
    reason: 'Source team has only 1 member present. Requesting merge into target team for competition.',
    requestedBy: 'Coord. Priya Kumar',
    requestedAt: '2026-10-28 08:45 AM',
    warnings: ['Cross-school merge — requires explicit authorization', 'Combined team will have 3 members (within limit)'],
  },
  {
    id: 'ADJ002',
    type: 'TRANSFER_MEMBERS' as const,
    status: 'PENDING_ACKNOWLEDGEMENT' as const,
    category: 'ECO_CITY' as CategoryCode,
    source: { code: 'EIRO-2026-042', name: 'Eco Rangers', school: 'DAV Public', present: 2, total: 3 },
    target: { code: 'EIRO-2026-077', name: 'Green Minds', school: 'DAV Public', present: 2, total: 3 },
    students: ['Vikram Singh'],
    reason: 'Vikram needs to transfer to Green Minds due to scheduling conflict.',
    requestedBy: 'Coord. Priya Kumar',
    requestedAt: '2026-10-28 09:00 AM',
    warnings: ['Source team will have 2 members after transfer (within minimum)'],
  },
];

export default function AdjustmentsPage() {
  const [actionModal, setActionModal] = useState<{ open: boolean; req?: typeof REQUESTS[0]; type: 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Adjustment Approvals"
        subtitle="A15 — Review and authorize merge/transfer requests"
      />

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300 mb-1">Safety Rules</p>
          <ul className="text-xs text-yellow-600 space-y-0.5">
            <li>• Cross-school merges are denied by default unless explicitly authorized</li>
            <li>• Combined/remaining teams must meet min/max size requirements</li>
            <li>• Blocked once competition has begun; only allowed before judging starts</li>
            <li>• Approval executes an atomic roster update — history is preserved</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        {REQUESTS.map(req => (
          <Card key={req.id} padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Shuffle className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{req.id}</span>
                    <Badge variant={req.type === 'MERGE_TEAMS' ? 'danger' : 'info'}>
                      {req.type === 'MERGE_TEAMS' ? 'Team Merge' : 'Member Transfer'}
                    </Badge>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Requested by {req.requestedBy} · {req.requestedAt}</p>
                </div>
              </div>
              <CategoryBadge code={req.category} />
            </div>

            <div className="p-6 space-y-4">
              {/* Source → Target */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-xs text-red-400 font-medium mb-2">SOURCE (from)</p>
                  <p className="font-semibold text-white text-sm">{req.source.name}</p>
                  <p className="text-xs text-gray-500">{req.source.school}</p>
                  <p className="font-mono text-[10px] text-gray-600">{req.source.code}</p>
                  <p className="text-xs mt-2">
                    <span className={req.source.present < req.source.total ? 'text-red-400' : 'text-green-400'}>
                      {req.source.present}/{req.source.total} present
                    </span>
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Shuffle className="w-6 h-6 text-purple-400" />
                    <div className="space-y-1">
                      {req.students.map(s => (
                        <div key={s} className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs text-purple-400">{s}</div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-600">moving →</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium mb-2">TARGET (to)</p>
                  <p className="font-semibold text-white text-sm">{req.target.name}</p>
                  <p className="text-xs text-gray-500">{req.target.school}</p>
                  <p className="font-mono text-[10px] text-gray-600">{req.target.code}</p>
                  <p className="text-xs mt-2 text-green-400">{req.target.present}/{req.target.total} present</p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Reason:</p>
                <p className="text-sm text-gray-300">{req.reason}</p>
              </div>

              {/* Warnings */}
              {req.warnings.length > 0 && (
                <div className="space-y-2">
                  {req.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      <p className="text-xs text-yellow-400">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="danger" size="sm" icon={XCircle}
                  onClick={() => setActionModal({ open: true, req, type: 'reject' })}>
                  Reject
                </Button>
                <Button size="sm" icon={CheckCircle2}
                  onClick={() => setActionModal({ open: true, req, type: 'approve' })}>
                  Approve & Apply
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Action Modal */}
      <Modal
        open={actionModal?.open ?? false}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'approve' ? 'Approve Adjustment' : 'Reject Request'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal?.type === 'approve' ? 'primary' : 'danger'}
              icon={actionModal?.type === 'approve' ? CheckCircle2 : XCircle}
              onClick={() => setActionModal(null)}
            >
              {actionModal?.type === 'approve' ? 'Approve & Apply Atomically' : 'Reject Request'}
            </Button>
          </>
        }
      >
        {actionModal?.type === 'approve' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 font-medium mb-1">This will:</p>
              <ul className="text-xs text-green-600 space-y-1">
                <li>• Atomically update the roster on both stage entries</li>
                <li>• Record a versioned before/after snapshot</li>
                <li>• Notify affected school coordinators</li>
                <li>• Mark source team stage entry as MERGED (if full merge)</li>
              </ul>
            </div>
            <Textarea label="Authorization note (optional)" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        ) : (
          <Textarea label="Rejection reason *" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request is rejected…" />
        )}
      </Modal>
    </div>
  );
}
