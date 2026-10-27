'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, StatusBadge, Modal, Input, Select, Textarea } from '@/components/ui';
import { CreditCard, Search, CheckCircle2, AlertCircle, Loader2, RefreshCw, Receipt } from 'lucide-react';
import type { PaymentMethod } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs,
} from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  schoolId?: string;
  teamId?: string;
  totalMinorUnits?: number;
  paidAmountMinorUnits?: number;
  status?: string;
}

interface Payment {
  id: string;
  invoiceId?: string;
  schoolId?: string;
  teamId?: string;
  amountMinorUnits?: number;
  method?: PaymentMethod;
  externalReference?: string;
  verifiedByUid?: string;
  status?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];
const money = (minorUnits?: number) =>
  typeof minorUnits === 'number' ? `₹${(minorUnits / 100).toLocaleString('en-IN')}` : '—';
const amountDue = (invoice: Invoice) =>
  typeof invoice.totalMinorUnits === 'number'
    ? Math.max(invoice.totalMinorUnits - (invoice.paidAmountMinorUnits ?? 0), 0)
    : undefined;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');

  const [verifyModal, setVerifyModal] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({
    method: 'CASH' as PaymentMethod, amount: '', ref: '', notes: '', idempotencyKey: '',
  });

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invSnap, paySnap] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'payments')),
      ]);

      setInvoices(invSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Invoice, 'id'>) })));
      setPayments(paySnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Payment, 'id'>) })));
      setError('');
    } catch (e) {
      console.error(e);
      setError('Payment information could not be loaded. Check your role and Firestore permissions, then retry.');
      toast.error('Failed to load payments. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Verify payment ──────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!verifyModal) return;
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter an amount greater than zero');
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('verifyManualPayment', {
        invoiceId: verifyModal.id,
        amountMinorUnits: Math.round(amount * 100),
        method: payForm.method,
        externalReference: payForm.ref.trim(),
        notes: payForm.notes.trim(),
        idempotencyKey: payForm.idempotencyKey,
      });

      toast.success('Payment verified!');
      setVerifyModal(null);
      setPayForm({ method: 'CASH', amount: '', ref: '', notes: '', idempotencyKey: '' });
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to verify payment.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredInvoices = invoices.filter(p =>
    !['VERIFIED', 'NOT_REQUIRED'].includes(p.status ?? '') &&
    (q === '' ||
      (p.schoolId ?? '').toLowerCase().includes(q) ||
      (p.teamId ?? '').toLowerCase().includes(q))
  );

  const verifiedPayments = payments.filter(p =>
    p.status === 'VERIFIED' &&
    (q === '' ||
      (p.schoolId ?? '').toLowerCase().includes(q) ||
      (p.teamId ?? '').toLowerCase().includes(q))
  );

  const pendingCount  = invoices.filter(p => p.status === 'PENDING').length;
  const partialCount  = invoices.filter(p => p.status === 'PARTIAL').length;
  const verifiedCount = payments.filter(p => p.status === 'VERIFIED').length;
  const totalVerified = payments
    .filter(p => p.status === 'VERIFIED')
    .reduce((s, p) => s + (p.amountMinorUnits ?? 0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Payment Verification"
        subtitle="Verify cash, UPI, and bank transfer payments. No payment gateway used."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
        }
      />

      {/* Info banner */}
      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300">Manual Verification Only</p>
          <p className="text-xs text-yellow-600 mt-0.5">
            EIRO does not use any payment gateway. Coordinators must verify all payments manually after receiving cash, UPI, or bank transfer from the school.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-yellow-400 mb-1">{error || loading ? '—' : pendingCount}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-orange-400 mb-1">{error || loading ? '—' : partialCount}</div>
          <div className="text-xs text-gray-500">Partial</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{error || loading ? '—' : verifiedCount}</div>
          <div className="text-xs text-gray-500">Verified</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-indigo-400 mb-1">{error || loading ? '—' : money(totalVerified)}</div>
          <div className="text-xs text-gray-500">Total Verified</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search school or team ID…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">
          <p>{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card></div>
      ) : (
        <>
          {/* Pending Payments */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-yellow-400" />
                Pending Verification ({filteredInvoices.length})
              </h3>
            </div>
            {filteredInvoices.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-10">No pending payments 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="eiro-table">
                  <thead>
                    <tr>
                      <th>Invoice</th><th>School / Team IDs</th>
                      <th>Amount Due</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(p => (
                      <tr key={p.id}>
                        <td><span className="font-mono text-xs text-gray-400">{p.id.slice(0, 8)}</span></td>
                        <td>
                          <div className="font-medium text-white text-sm">{p.schoolId ?? '—'}</div>
                          <div className="text-xs text-gray-500">{p.teamId ?? '—'}</div>
                        </td>
                        <td>
                          <div className="font-bold text-white">{money(amountDue(p))}</div>
                          {p.paidAmountMinorUnits ? (
                            <div className="text-xs text-green-400">Paid: {money(p.paidAmountMinorUnits)}</div>
                          ) : null}
                        </td>
                        <td><StatusBadge status={p.status ?? 'UNKNOWN'} /></td>
                        <td>
                          <Button size="sm" icon={CheckCircle2} onClick={() => {
                            setVerifyModal(p);
                            const due = amountDue(p);
                            setPayForm({
                              method: 'CASH',
                              amount: typeof due === 'number' ? String(due / 100) : '',
                              ref: '',
                              notes: '',
                              idempotencyKey: crypto.randomUUID(),
                            });
                          }}>
                            Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Verified Payments */}
          {verifiedPayments.length > 0 && (
            <Card padding="none">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-green-400" />
                  Verified Payments ({verifiedPayments.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="eiro-table">
                  <thead>
                    <tr>
                      <th>School / Team</th><th>Amount</th>
                      <th>Method</th><th>Reference</th><th>Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedPayments.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-medium text-white text-sm">{p.schoolId ?? '—'}</div>
                          <div className="text-xs text-gray-500">{p.teamId ?? '—'}</div>
                        </td>
                        <td><span className="font-bold text-green-400">{money(p.amountMinorUnits)}</span></td>
                        <td><span className="text-xs text-gray-400">{p.method}</span></td>
                        <td><span className="font-mono text-xs text-gray-400">{p.externalReference ?? '—'}</span></td>
                        <td><span className="text-xs text-gray-400">{p.verifiedByUid ?? '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Verify modal */}
      {verifyModal && (
        <Modal open={!!verifyModal} onClose={() => setVerifyModal(null)} title={`Verify Payment — ${verifyModal.teamId ?? verifyModal.id}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setVerifyModal(null)} disabled={saving}>Cancel</Button>
              <Button icon={saving ? Loader2 : CheckCircle2} onClick={handleVerify} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm Payment Verified'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
              <p><span className="text-gray-500">School:</span> {verifyModal.schoolId ?? '—'}</p>
              <p><span className="text-gray-500">Team:</span> {verifyModal.teamId ?? '—'}</p>
              <p><span className="text-gray-500">Amount Due:</span> {money(amountDue(verifyModal))}</p>
            </div>
            <Select label="Payment Method" id="pay-method" value={payForm.method}
              onChange={e => setPayForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
              options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
            <Input label="Amount Received (₹)" id="pay-amount" type="number"
              value={payForm.amount}
              onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            <Input label="Reference / Transaction ID" id="pay-ref"
              placeholder="UTR / Transaction ID / Receipt No."
              value={payForm.ref}
              onChange={e => setPayForm(f => ({ ...f, ref: e.target.value }))} />
            <Textarea label="Notes (optional)" id="pay-notes"
              placeholder="Any additional notes…"
              value={payForm.notes}
              onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} />
          </div>
        </Modal>
      )}
    </div>
  );
}
