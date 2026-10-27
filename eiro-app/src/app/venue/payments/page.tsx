'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Badge, KpiCard } from '@/components/ui';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';

type Payment = { id: string; teamId?: string; schoolId: string; amountMinorUnits: number; method: string; externalReference?: string; status: string; receivedAt?: { toDate?: () => Date } | string; verifiedAt?: { toDate?: () => Date } | string };

export default function VenuePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getAll<Payment>('payments').then(setPayments)
      .catch(() => setError('Payment records could not be loaded. Check venue permissions.'))
      .finally(() => setLoading(false));
  }, []);
  const amount = (minor: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(minor / 100);
  const when = (value?: Payment['receivedAt']) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—';
  };
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Payment Records" subtitle="Read-only payment status from Firestore" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <KpiCard title="Pending" value={payments.filter(payment => payment.status === 'PENDING').length} icon={Clock} color="orange" />
      <KpiCard title="Verified" value={payments.filter(payment => payment.status === 'VERIFIED').length} icon={CheckCircle2} color="green" />
      <KpiCard title="Total Recorded" value={amount(payments.reduce((sum, payment) => sum + (payment.status === 'VERIFIED' ? payment.amountMinorUnits : 0), 0))} icon={CreditCard} color="indigo" />
      <KpiCard title="Rejected" value={payments.filter(payment => payment.status === 'REJECTED').length} icon={XCircle} color="red" />
    </div>
    <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 text-xs text-yellow-300">Payment verification is unavailable on this page because no supported callable for this operation is specified. Records are view-only.</div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading payments…</p> : error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> : payments.length === 0 ? <Card className="text-center py-12 text-gray-400">No payment records are available.</Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Payment</th><th>School</th><th>Team</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Received</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id}>
        <td className="font-mono text-xs">{payment.id}</td><td>{payment.schoolId}</td><td>{payment.teamId ?? '—'}</td><td>{amount(payment.amountMinorUnits)}</td><td>{payment.method}</td><td>{payment.externalReference ?? '—'}</td><td><Badge variant={payment.status === 'VERIFIED' ? 'success' : payment.status === 'REJECTED' ? 'danger' : 'warning'}>{payment.status}</Badge></td><td>{when(payment.receivedAt ?? payment.verifiedAt)}</td>
      </tr>)}</tbody></table></div></Card>}
  </div>;
}
