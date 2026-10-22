'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui';
import { Shuffle, AlertCircle, CheckCircle2, Info, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoordinatorAdjustmentsPage() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'MERGE' | 'TRANSFER'>('MERGE');
  const [form, setForm] = useState({ sourceTeam: '', targetTeam: '', students: '', reason: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.sourceTeam || !form.reason) { toast.error('Please fill in all required fields'); return; }
    setOpen(false);
    setSubmitted(true);
    toast.success('Request submitted for admin review');
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <PageHeader title="Transfer / Merge Request" subtitle="S12 — Request a student transfer or team merge before competition" />

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-400 space-y-1">
          <p><strong>When to use this:</strong> If a student is absent on competition day and the team falls below minimum size, request a merge from a short-staffed team or transfer a student from another team.</p>
          <p><strong>Restrictions:</strong> Cross-school merges need admin approval. Requests are blocked once competition judging begins.</p>
        </div>
      </div>

      {submitted ? (
        <Card className="text-center py-10">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-semibold text-white mb-1">Request Submitted</p>
          <p className="text-sm text-gray-400 mb-4">An admin will review your request shortly. You&apos;ll be notified of the decision.</p>
          <Button variant="secondary" onClick={() => setSubmitted(false)}>Submit Another</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {(['MERGE', 'TRANSFER'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  type === t ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 bg-white/[0.03] hover:border-indigo-500/30'
                }`}>
                <Shuffle className={`w-6 h-6 mb-2 ${type === t ? 'text-indigo-400' : 'text-gray-500'}`} />
                <p className="font-semibold text-white text-sm">{t === 'MERGE' ? 'Team Merge' : 'Member Transfer'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t === 'MERGE' ? 'Merge two short-staffed teams into one' : 'Move one student to another existing team'}
                </p>
              </button>
            ))}
          </div>

          <Card>
            <h3 className="font-semibold text-white mb-4">
              {type === 'MERGE' ? 'Merge Request' : 'Transfer Request'}
            </h3>
            <div className="space-y-4">
              <Select label={type === 'MERGE' ? 'Source Team (to be merged)' : 'Source Team (student moving from)'}
                id="source-team" value={form.sourceTeam}
                onChange={e => setForm(f => ({ ...f, sourceTeam: e.target.value }))}
                options={[
                  { value: '', label: '— Select team —' },
                  { value: 'T002', label: 'Eco Rangers (3 members)' },
                  { value: 'T003', label: 'Wall Riders (2 members)' },
                  { value: 'T004', label: 'Smart Innovators (4 members)' },
                ]} />

              <Select label={type === 'MERGE' ? 'Target Team (absorbing team)' : 'Target Team (student moving to)'}
                id="target-team" value={form.targetTeam}
                onChange={e => setForm(f => ({ ...f, targetTeam: e.target.value }))}
                options={[
                  { value: '', label: '— Select team —' },
                  { value: 'T001', label: 'Robo Warriors (2 members)' },
                  { value: 'T003', label: 'Wall Riders (2 members)' },
                ]} />

              {type === 'TRANSFER' && (
                <Input label="Student(s) to transfer" id="students"
                  placeholder="e.g. Arjun Sharma, Riya Patel"
                  value={form.students} onChange={e => setForm(f => ({ ...f, students: e.target.value }))} />
              )}

              <Textarea label="Reason (required)" id="reason" rows={3}
                placeholder="Explain why this adjustment is needed…"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-400">This request will be reviewed by the Event Coordinator or Admin. Approvals are atomic — both teams&apos; rosters will be updated simultaneously.</p>
              </div>

              <Button icon={Shuffle} className="w-full" onClick={() => setOpen(true)}>Submit Request</Button>
            </div>
          </Card>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Confirm Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleSubmit}>Submit Request</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm py-2 border-b border-white/5">
            <span className="text-gray-400">Type</span>
            <Badge variant={type === 'MERGE' ? 'danger' : 'info'}>{type === 'MERGE' ? 'Team Merge' : 'Member Transfer'}</Badge>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-white/5">
            <span className="text-gray-400">Source Team</span>
            <span className="text-white">{form.sourceTeam || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-white/5">
            <span className="text-gray-400">Target Team</span>
            <span className="text-white">{form.targetTeam || '—'}</span>
          </div>
          <p className="text-xs text-gray-600 pt-1">Request will be logged and cannot be self-approved. Admin/Venue Coordinator authorization required.</p>
        </div>
      </Modal>
    </div>
  );
}
