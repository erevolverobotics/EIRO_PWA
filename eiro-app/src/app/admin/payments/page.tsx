'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Input, Select, Textarea } from '@/components/ui';
import { CreditCard, Search, CheckCircle2, XCircle, AlertCircle, Upload, Receipt } from 'lucide-react';
import type { PaymentMethod, CategoryCode } from '@/lib/types';

const MOCK_PENDING = [
  { id: 'INV001', school: 'DAV Public School', team: 'Robo Warriors', category: 'SUMO' as CategoryCode, amount: 50000, status: 'PENDING', method: null as PaymentMethod | null },
  { id: 'INV002', school: 'KV No.1 Chennai', team: 'Circuit Breakers', category: 'MAZE' as CategoryCode, amount: 50000, status: 'PARTIAL', method: 'UPI' as PaymentMethod, paidAmount: 25000 },
  { id: 'INV003', school: 'St. Josephs HS', team: 'Wall Runners', category: 'WALL' as CategoryCode, amount: 50000, status: 'PENDING', method: null as PaymentMethod | null },
  { id: 'INV004', school: 'PSBB School', team: 'Eco Warriors', category: 'ECO_CITY' as CategoryCode, amount: 0, status: 'NOT_REQUIRED', method: null as PaymentMethod | null },
];

const MOCK_VERIFIED = [
  { id: 'PAY001', school: 'Asan Memorial', team: 'Factory Bots', amount: 50000, method: 'CASH' as PaymentMethod, ref: 'CASH-2026-001', verifiedBy: 'Coord. Rajan', at: '2026-10-18 10:30' },
  { id: 'PAY002', school: 'Hindustan Matriculation', team: 'Wall Masters', amount: 50000, method: 'BANK_TRANSFER' as PaymentMethod, ref: 'UTR2026001234', verifiedBy: 'Coord. Priya', at: '2026-10-17 15:00' },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [verifyModal, setVerifyModal] = useState<{ open: boolean; invoice?: typeof MOCK_PENDING[0] } | null>(null);
  const [payForm, setPayForm] = useState({ method: 'CASH', amount: '', ref: '', notes: '' });

  const pending = MOCK_PENDING.filter(p => p.status !== 'NOT_REQUIRED' && p.status !== 'VERIFIED');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Payment Verification"
        subtitle="V09 — Verify cash, UPI, and bank transfer payments. No payment gateway used."
      />

      {/* Info banner */}
      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300">Manual Verification Only</p>
          <p className="text-xs text-yellow-600 mt-0.5">
            EIRO does not use any payment gateway. Event Coordinators must verify all payments manually after receiving cash, UPI transfer, or bank transfer from the school.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-yellow-400 mb-1">{MOCK_PENDING.filter(p => p.status === 'PENDING').length}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-orange-400 mb-1">{MOCK_PENDING.filter(p => p.status === 'PARTIAL').length}</div>
          <div className="text-xs text-gray-500">Partial</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{MOCK_VERIFIED.length}</div>
          <div className="text-xs text-gray-500">Verified</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-indigo-400 mb-1">₹{(MOCK_VERIFIED.reduce((s, p) => s + p.amount, 0) / 100).toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">Total Verified</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search school or team…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="eiro-input pl-9"
        />
      </div>

      {/* Pending Payments */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-yellow-400" />
            Pending Verification ({pending.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>School / Team</th>
                <th>Category</th>
                <th>Amount Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(p => (
                <tr key={p.id}>
                  <td><span className="font-mono text-xs text-gray-400">{p.id}</span></td>
                  <td>
                    <div className="font-medium text-white text-sm">{p.school}</div>
                    <div className="text-xs text-gray-500">{p.team}</div>
                  </td>
                  <td><CategoryBadge code={p.category} /></td>
                  <td>
                    <div className="font-bold text-white">₹{(p.amount / 100).toLocaleString('en-IN')}</div>
                    {'paidAmount' in p && p.paidAmount && (
                      <div className="text-xs text-green-400">Paid: ₹{(p.paidAmount / 100).toLocaleString('en-IN')}</div>
                    )}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <Button
                      size="sm"
                      onClick={() => setVerifyModal({ open: true, invoice: p })}
                      icon={CheckCircle2}
                    >
                      Verify Payment
                    </Button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">All payments verified</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verified Payments */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Verified Payments
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>School / Team</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Verified By</th>
                <th>At</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_VERIFIED.map(p => (
                <tr key={p.id}>
                  <td><span className="font-mono text-xs text-gray-400">{p.id}</span></td>
                  <td>
                    <div className="text-sm font-medium text-white">{p.school}</div>
                    <div className="text-xs text-gray-500">{p.team}</div>
                  </td>
                  <td><span className="font-bold text-green-400">₹{(p.amount / 100).toLocaleString('en-IN')}</span></td>
                  <td>
                    <Badge variant={p.method === 'CASH' ? 'warning' : p.method === 'UPI' ? 'info' : 'success'}>
                      {p.method}
                    </Badge>
                  </td>
                  <td><span className="font-mono text-xs text-gray-400">{p.ref}</span></td>
                  <td><span className="text-xs text-gray-400">{p.verifiedBy}</span></td>
                  <td><span className="text-xs text-gray-500">{p.at}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verify Payment Modal */}
      <Modal
        open={verifyModal?.open ?? false}
        onClose={() => setVerifyModal(null)}
        title="Record & Verify Payment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyModal(null)}>Cancel</Button>
            <Button variant="primary" icon={CheckCircle2} onClick={() => setVerifyModal(null)}>Mark as Verified</Button>
          </>
        }
      >
        <div className="space-y-4">
          {verifyModal?.invoice && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">School:</span>
                <span className="text-white font-medium">{verifyModal.invoice.school}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Team:</span>
                <span className="text-white font-medium">{verifyModal.invoice.team}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount Due:</span>
                <span className="text-yellow-400 font-bold">₹{((verifyModal.invoice.amount ?? 0) / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <Select
            label="Payment Method"
            id="pay-method"
            value={payForm.method}
            onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
              { value: 'UPI', label: 'UPI' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          <Input
            label="Amount Received (₹)"
            id="pay-amount"
            type="number"
            placeholder="500"
            value={payForm.amount}
            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
            hint="Enter amount in rupees. Partial payments allowed if policy permits."
          />

          <Input
            label="Receipt / Reference Number"
            id="pay-ref"
            placeholder="e.g. UTR1234567890 / CASH-001"
            value={payForm.ref}
            onChange={e => setPayForm(f => ({ ...f, ref: e.target.value }))}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Proof of Payment (optional)</label>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-indigo-500/30 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Upload receipt image or PDF</p>
            </div>
          </div>

          <Textarea
            label="Notes (optional)"
            id="pay-notes"
            rows={2}
            placeholder="Any additional notes about this payment…"
            value={payForm.notes}
            onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
          />

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">
              <strong>Audit trail:</strong> This action will be logged with your account, timestamp, and all payment details. The school coordinator cannot verify payments — only authorized Event Coordinators or Admins.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
