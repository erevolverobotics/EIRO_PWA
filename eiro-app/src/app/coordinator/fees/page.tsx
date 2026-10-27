'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Info, RefreshCw } from 'lucide-react';
import { PageHeader, Card, StatusBadge, CategoryBadge, Button } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { CategoryCode, FeeStatus, PaymentMethod, PaymentStatus } from '@/lib/types';

interface Invoice {
  id: string;
  schoolId: string;
  teamId?: string;
  registrationId?: string;
  totalMinorUnits?: number;
  status?: FeeStatus | PaymentStatus;
  lineItems?: { description?: string; amountMinorUnits?: number }[];
}

interface Payment {
  id: string;
  invoiceId: string;
  schoolId: string;
  amountMinorUnits?: number;
  method?: PaymentMethod;
  externalReference?: string;
  status?: PaymentStatus;
  receivedAt?: { toDate?: () => Date } | string;
}

interface Team {
  id: string;
  teamName?: string;
  categoryCode?: CategoryCode;
}

const money = (minorUnits?: number) =>
  typeof minorUnits === 'number' ? `₹${(minorUnits / 100).toLocaleString('en-IN')}` : '—';

export default function FeesPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') return;
    try {
      const [invoiceSnap, paymentSnap, teamSnap] = await Promise.all([
        getDocs(query(collection(db, 'invoices'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'payments'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
      ]);
      setError('');
      setInvoices(invoiceSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Invoice, 'id'>) })));
      setPayments(paymentSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Payment, 'id'>) })));
      setTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Fee information could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const paidByInvoice = new Map<string, number>();
  payments.forEach(payment => {
    if (payment.status === 'VERIFIED' || payment.status === 'PARTIAL') {
      paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) || 0) + (payment.amountMinorUnits || 0));
    }
  });
  const totalDue = invoices.reduce((total, invoice) => total + Math.max((invoice.totalMinorUnits ?? 0) - (paidByInvoice.get(invoice.id) || 0), 0), 0);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="Fee Status"
        subtitle="View your school's invoices, payment status and recorded receipts"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-white">School scope not assigned</p>
            <p className="text-sm text-gray-400 mt-1">Fee records are available after an administrator assigns this coordinator to a school.</p>
          </div>
        </Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading school fee records…</Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">Outstanding balance</h2>
            </div>
            <p className="text-3xl font-black text-white">{money(totalDue)}</p>
            <p className="text-xs text-gray-500 mt-1">Calculated from invoice totals and recorded amounts; no online payment gateway is used.</p>
          </Card>

          {invoices.length === 0 ? (
            <Card className="text-center py-12">
              <p className="font-medium text-gray-300">No invoices found</p>
              <p className="text-sm text-gray-500 mt-2">Invoices will appear when a registration requires a fee.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => {
                const team = invoice.teamId ? teamById.get(invoice.teamId) : undefined;
                const receiptList = payments.filter(payment => payment.invoiceId === invoice.id);
                const paid = paidByInvoice.get(invoice.id) || 0;
                return (
                  <Card key={invoice.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{team?.teamName || 'Team registration'}</h3>
                        {team?.categoryCode && <CategoryBadge code={team.categoryCode} />}
                        <p className="text-xs text-gray-500 mt-2">Invoice {invoice.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{money(invoice.totalMinorUnits)}</p>
                        <StatusBadge status={invoice.status || 'PENDING'} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>Verified / partial receipts: {money(paid)}</span>
                      <span>Balance: {money(Math.max((invoice.totalMinorUnits ?? 0) - paid, 0))}</span>
                    </div>
                    {receiptList.length > 0 && (
                      <div className="mt-4 border-t border-white/5 pt-3 space-y-2">
                        {receiptList.map(payment => (
                          <div key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span>{money(payment.amountMinorUnits)} · {payment.method || 'Payment'} · {payment.status || 'Recorded'}</span>
                            {payment.externalReference && <span>Ref: {payment.externalReference}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="flex items-start gap-3 border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">
              School coordinators can view payment status but cannot record or verify payments. Contact the event organizer for manual payment instructions; an authorized event coordinator records receipts.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
