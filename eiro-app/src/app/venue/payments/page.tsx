'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard, Modal, Input, Select, Textarea } from '@/components/ui';
import { CreditCard, CheckCircle2, XCircle, AlertCircle, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const PENDING_PAYMENTS = [
  { id: 'PAY-001', school: 'St. Josephs HS', team: 'Iron Crushers', category: 'SUMO', amount: 500, method: 'CASH', ref: '', submittedAt: 'Oct 28 · 08:30 AM', coordinator: 'Rajan Iyer' },
  { id: 'PAY-002', school: 'KV No.1', team: 'Metal Beasts', category: 'SUMO', amount: 500, method: 'UPI', ref: 'UPI28102026001', submittedAt: 'Oct 27 · 06:00 PM', coordinator: 'Sunita Singh' },
  { id: 'PAY-003', school: 'PSBB School', team: 'Speed Navigators', category: 'MAZE', amount: 500, method: 'BANK_TRANSFER', ref: 'NEFT28102026', submittedAt: 'Oct 27 · 04:45 PM', coordinator: 'Vikram Nair' },
];

const VERIFIED = [
  { id: 'PAY-004', school: 'DAV Public School', team: 'Robo Warriors', category: 'SUMO', amount: 500, method: 'CASH', ref: 'CASH-2026-001', verifiedAt: 'Oct 15 · 02:00 PM', verifiedBy: 'Venue Coord. Lakshmi' },
];

export default function VenuePaymentsPage() {
  const [selected, setSelected] = useState<typeof PENDING_PAYMENTS[0] | null>(null);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'verify' | 'reject' | null>(null);

  const handleAction = () => {
    if (action === 'verify') {
      toast.success(`Payment verified for ${selected?.team}`);
    } else {
      toast.error(`Payment rejected for ${selected?.team}`);
    }
    setSelected(null);
    setNotes('');
    setAction(null);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Payment Verification" subtitle="V09 — Verify manual cash/UPI/bank payments on-site" />

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-400 space-y-1">
          <p><strong>On-site verification only.</strong> Ask the coordinator for physical proof of payment (cash receipt, UPI screenshot, bank slip). Verify the amount matches exactly.</p>
          <p>Rejected payments must include a reason — the coordinator will be notified immediately.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Pending" value={PENDING_PAYMENTS.length} icon={Clock} color="orange" />
        <KpiCard title="Verified Today" value={VERIFIED.length} icon={CheckCircle2} color="green" />
        <KpiCard title="Total Collected" value={`₹${VERIFIED.reduce((s, v) => s + v.amount, 0)}`} icon={CreditCard} color="indigo" />
        <KpiCard title="Rejected" value={0} icon={XCircle} color="red" />
      </div>

      {/* Pending */}
      {PENDING_PAYMENTS.length > 0 && (
        <>
          <h3 className="font-semibold text-white">Awaiting Verification</h3>
          <div className="space-y-3">
            {PENDING_PAYMENTS.map(pay => (
              <Card key={pay.id} className="border-yellow-500/20 bg-yellow-500/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white">{pay.team}</h3>
                      <Badge variant="warning">{pay.category}</Badge>
                      <Badge variant="info">{pay.method}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">{pay.school} · {pay.coordinator}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span className="font-bold text-white">₹{pay.amount}</span>
                      {pay.ref && <span>Ref: {pay.ref}</span>}
                      <span>{pay.submittedAt}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" icon={XCircle} onClick={() => { setSelected(pay); setAction('reject'); }}>Reject</Button>
                    <Button size="sm" icon={CheckCircle2} onClick={() => { setSelected(pay); setAction('verify'); }}>Verify</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Verified */}
      {VERIFIED.length > 0 && (
        <>
          <h3 className="font-semibold text-white">Verified Today</h3>
          <div className="space-y-3">
            {VERIFIED.map(pay => (
              <Card key={pay.id} className="border-green-500/20 bg-green-500/[0.02]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <h3 className="font-semibold text-white">{pay.team}</h3>
                      <span className="font-bold text-green-400">₹{pay.amount}</span>
                    </div>
                    <p className="text-xs text-gray-500">{pay.school} · {pay.method} · Ref: {pay.ref}</p>
                    <p className="text-xs text-gray-600 mt-0.5">Verified: {pay.verifiedAt} by {pay.verifiedBy}</p>
                  </div>
                  <Badge variant="success">VERIFIED</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Action Modal */}
      <Modal
        open={!!selected && !!action}
        onClose={() => { setSelected(null); setAction(null); setNotes(''); }}
        title={action === 'verify' ? `Verify Payment — ${selected?.team}` : `Reject Payment — ${selected?.team}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSelected(null); setAction(null); }}>Cancel</Button>
            <Button
              variant={action === 'verify' ? 'primary' : 'danger'}
              icon={action === 'verify' ? CheckCircle2 : XCircle}
              onClick={handleAction}
            >
              {action === 'verify' ? 'Confirm Verification' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="space-y-2">
              {[
                { label: 'Team', value: selected.team },
                { label: 'School', value: selected.school },
                { label: 'Amount', value: `₹${selected.amount}` },
                { label: 'Method', value: selected.method },
                { label: 'Ref', value: selected.ref || '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-white/5">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <Textarea
              label={action === 'verify' ? 'Notes (optional)' : 'Rejection Reason *'}
              id="pay-notes" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={action === 'verify' ? 'e.g. Cash received and counted' : 'Explain why payment is rejected…'}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
