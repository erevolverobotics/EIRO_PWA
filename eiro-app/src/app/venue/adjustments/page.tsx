'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Textarea } from '@/components/ui';
import { Shuffle, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import toast from 'react-hot-toast';

const PENDING_REQUESTS = [
  {
    id: 'ADJ-V001',
    type: 'MERGE_TEAMS',
    category: 'SUMO' as CategoryCode,
    source: { code: 'EIRO-2026-043', name: 'Metal Beasts', school: 'KV No.1', present: 1, total: 2 },
    target: { code: 'EIRO-2026-041', name: 'Robo Warriors', school: 'DAV Public', present: 2, total: 2 },
    students: ['Rahul Sharma'],
    reason: 'One member absent. Team cannot compete alone. Requesting merge.',
    requestedBy: 'Venue Coord. Lakshmi',
    requestedAt: '09:15 AM',
    warnings: ['Cross-school merge — needs explicit approval', 'Robo Warriors will have 3 members after merge'],
  },
];

export default function VenueAdjustmentsPage() {
  const [selected, setSelected] = useState<typeof PENDING_REQUESTS[0] | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  const handleAction = () => {
    if (actionType === 'approve') {
      toast.success(`${selected?.id} approved and applied atomically`);
    } else {
      toast.error(`${selected?.id} rejected`);
    }
    setSelected(null);
    setNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Merge / Transfer" subtitle="V14 — On-site team adjustment approvals" />

      <div className="p-4 rounded-2xl bg-red-900/20 border border-red-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-red-400 space-y-1">
          <p><strong>On-site adjustments only.</strong> These are emergency operations for competition day. Cross-school merges require super admin confirmation.</p>
          <p>Approval is atomic — both rosters are updated simultaneously. A before/after snapshot is logged permanently.</p>
        </div>
      </div>

      {PENDING_REQUESTS.length === 0 ? (
        <Card className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No pending adjustment requests</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {PENDING_REQUESTS.map(req => (
            <Card key={req.id} className="border-orange-500/20 bg-orange-500/[0.02]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white text-sm">{req.id}</span>
                  <Badge variant={req.type === 'MERGE_TEAMS' ? 'danger' : 'info'}>
                    {req.type === 'MERGE_TEAMS' ? 'Team Merge' : 'Transfer'}
                  </Badge>
                  <CategoryBadge code={req.category} />
                </div>
                <p className="text-xs text-gray-500">Requested by {req.requestedBy} · {req.requestedAt}</p>
              </div>

              {/* Source → Target */}
              <div className="grid grid-cols-3 gap-3 items-center mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 font-medium mb-1">FROM</p>
                  <p className="font-semibold text-white text-sm">{req.source.name}</p>
                  <p className="text-xs text-gray-500">{req.source.school}</p>
                  <p className="text-xs text-red-400 mt-1">{req.source.present}/{req.source.total} present</p>
                </div>
                <div className="text-center">
                  <Shuffle className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  {req.students.map(s => (
                    <div key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 mb-1">{s}</div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium mb-1">TO</p>
                  <p className="font-semibold text-white text-sm">{req.target.name}</p>
                  <p className="text-xs text-gray-500">{req.target.school}</p>
                  <p className="text-xs text-green-400 mt-1">{req.target.present}/{req.target.total} present</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3">
                <p className="text-xs text-gray-500 mb-0.5">Reason:</p>
                <p className="text-sm text-gray-300">{req.reason}</p>
              </div>

              {req.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <p className="text-xs text-yellow-400">{w}</p>
                </div>
              ))}

              <div className="flex gap-2 mt-3 justify-end">
                <Button variant="danger" size="sm" icon={XCircle}
                  onClick={() => { setSelected(req); setActionType('reject'); }}>Reject</Button>
                <Button size="sm" icon={CheckCircle2}
                  onClick={() => { setSelected(req); setActionType('approve'); }}>Approve</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setNotes(''); }}
        title={actionType === 'approve' ? 'Approve Adjustment' : 'Reject Request'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant={actionType === 'approve' ? 'primary' : 'danger'}
              icon={actionType === 'approve' ? CheckCircle2 : XCircle} onClick={handleAction}>
              Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </>
        }
      >
        <Textarea
          label={actionType === 'approve' ? 'Authorization note (optional)' : 'Rejection reason *'}
          id="adj-notes" rows={3} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={actionType === 'approve' ? 'e.g. Cross-school merge authorized by Head Judge' : 'Reason for rejection…'}
        />
      </Modal>
    </div>
  );
}
