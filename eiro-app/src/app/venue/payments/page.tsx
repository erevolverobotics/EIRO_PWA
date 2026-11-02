'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Badge, KpiCard } from '@/components/ui';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';

type Payment = {
  id: string;
  teamId?: string;
  schoolId: string;
  amountMinorUnits: number;
  method: string;
  externalReference?: string;
  status: string;
  receivedAt?: { toDate?: () => Date } | string;
  verifiedAt?: { toDate?: () => Date } | string;
};

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function VenuePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAll<Payment>('payments')
      .then(setPayments)
      .catch(() =>
        setError('Payment records could not be loaded. Check venue permissions.')
      )
      .finally(() => setLoading(false));
  }, []);

  const amount = (minor: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'INR',
    }).format(minor / 100);

  const when = (value?: Payment['receivedAt']) => {
    if (!value) return '—';

    const date =
      typeof value === 'string' ? new Date(value) : value.toDate?.();

    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString()
      : '—';
  };

  return (
    <main className="payments-page relative isolate min-h-screen w-full">
      {/* Animated background */}
      <div className="payments-ambient" aria-hidden="true">
        {/* <div className="payments-grid" /> */}

        <div className="payments-orb payments-orb-one" />
        <div className="payments-orb payments-orb-two" />

        <div className="payments-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`payments-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="payments-content relative z-10 w-full space-y-6 animate-fade-in-up">
        <PageHeader
          title="Payment Records"
          subtitle="Read-only payment status from Firestore"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Pending"
            value={payments.filter(payment => payment.status === 'PENDING').length}
            icon={Clock}
            color="orange"
          />

          <KpiCard
            title="Verified"
            value={payments.filter(payment => payment.status === 'VERIFIED').length}
            icon={CheckCircle2}
            color="green"
          />

          <KpiCard
            title="Total Recorded"
            value={amount(
              payments.reduce(
                (sum, payment) =>
                  sum +
                  (payment.status === 'VERIFIED'
                    ? payment.amountMinorUnits
                    : 0),
                0
              )
            )}
            icon={CreditCard}
            color="indigo"
          />

          <KpiCard
            title="Rejected"
            value={payments.filter(payment => payment.status === 'REJECTED').length}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* Read-only notice */}
        <div className="payments-glass-card rounded-2xl p-4 text-xs text-yellow-300">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 shrink-0 text-yellow-400" />
            <p>
              Payment verification is unavailable on this page because no
              supported callable for this operation is specified. Records
              are view-only.
            </p>
          </div>
        </div>

        {/* Payment records */}
        {loading ? (
          <div
            role="status"
            className="text-center text-gray-400 py-12 payments-glass-card rounded-2xl"
          >
            Loading payments…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="payments-glass-card rounded-xl p-4 text-red-400"
          >
            {error}
          </div>
        ) : payments.length === 0 ? (
          <Card className="payments-glass-card text-center py-12 text-gray-400">
            No payment records are available.
          </Card>
        ) : (
          <Card padding="none" className="payments-glass-card">
            <div className="overflow-x-auto rounded-2xl">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>School</th>
                    <th>Team</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Received</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="font-mono text-xs">
                        {payment.id}
                      </td>

                      <td>{payment.schoolId}</td>

                      <td>{payment.teamId ?? '—'}</td>

                      <td>{amount(payment.amountMinorUnits)}</td>

                      <td>{payment.method}</td>

                      <td>{payment.externalReference ?? '—'}</td>

                      <td>
                        <Badge
                          variant={
                            payment.status === 'VERIFIED'
                              ? 'success'
                              : payment.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>

                      <td>
                        {when(payment.receivedAt ?? payment.verifiedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Background styles */}
      <style jsx global>{`
        .payments-page {
          background: transparent;
          min-height: 100vh;
          isolation: isolate;
        }

        .payments-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .payments-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(
              rgba(139, 92, 246, 0.045) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(139, 92, 246, 0.045) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
          mask-image: linear-gradient(
            to bottom,
            black 0%,
            rgba(0, 0, 0, 0.65) 65%,
            transparent 100%
          );
        }

        .payments-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.2;
          animation: payments-orb-pulse 12s ease-in-out infinite alternate;
        }

        .payments-orb-one {
          width: 380px;
          height: 380px;
          top: 5%;
          left: -120px;
          background: rgba(124, 58, 237, 0.55);
        }

        .payments-orb-two {
          width: 340px;
          height: 340px;
          right: -100px;
          bottom: 0;
          background: rgba(219, 39, 119, 0.35);
          animation-delay: -6s;
        }

        .payments-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .payments-bubble {
          position: absolute;
          bottom: -100px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          animation-name: payments-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .payments-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(196, 181, 253, 0.2),
            rgba(139, 92, 246, 0.045) 65%,
            transparent 100%
          );
          border: 1px solid rgba(167, 139, 250, 0.12);
          box-shadow: inset 0 0 15px rgba(167, 139, 250, 0.06);
        }

        .payments-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(251, 207, 232, 0.18),
            rgba(244, 63, 94, 0.04) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 113, 133, 0.12);
          box-shadow: inset 0 0 15px rgba(251, 113, 133, 0.05);
        }

        @keyframes payments-float {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.65;
          }
          50% {
            transform: translate3d(35px, -55vh, 0) scale(1);
            opacity: 0.45;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translate3d(-20px, -115vh, 0) scale(1.15);
            opacity: 0;
          }
        }

        @keyframes payments-orb-pulse {
          from {
            transform: scale(1);
            opacity: 0.14;
          }
          to {
            transform: scale(1.18);
            opacity: 0.26;
          }
        }

        .payments-content {
          width: 100%;
          padding: 1.5rem;
        }

        .payments-glass-card {
          background: rgba(17, 24, 39, 0.3) !important;
          border: 1px solid rgba(148, 163, 184, 0.12) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .payments-page .eiro-table {
          width: 100%;
          border-collapse: collapse;
        }

        .payments-page .eiro-table th,
        .payments-page .eiro-table td {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .payments-content {
            padding: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .payments-bubble,
          .payments-orb {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
