'use client';

import { PageHeader, Card, Button, Badge, StatusBadge } from '@/components/ui';
import { CreditCard, AlertCircle, Info, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const FEE_STATUS = [
  { id: 'T001', name: 'Robo Warriors', category: 'SUMO', amount: 500, status: 'VERIFIED', method: 'CASH', ref: 'CASH-2026-001', at: 'Oct 15, 2026' },
  { id: 'T002', name: 'Eco Rangers', category: 'ECO_CITY', amount: 0, status: 'NOT_REQUIRED', method: null, ref: null, at: null },
  { id: 'T003', name: 'Wall Riders', category: 'WALL', amount: 500, status: 'PENDING', method: null, ref: null, at: null },
];

const PAYMENT_DETAILS = {
  bankName: 'Evolve Robotics Education Trust',
  accountNo: '1234567890',
  ifsc: 'SBIN0001234',
  upiId: 'eiro2026@sbi',
  amount: 500,
};

export default function FeesPage() {
  const [copied, setCopied] = useState('');

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopied(''), 2000);
  };

  const pendingTeams = FEE_STATUS.filter(f => f.status === 'PENDING');

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <PageHeader title="Fee Status" subtitle="S08 — Registration fee status and payment instructions" />

      {/* Fee Status per team */}
      <div className="space-y-3">
        {FEE_STATUS.map(fee => (
          <Card key={fee.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{fee.name}</h3>
                <p className="text-xs text-gray-500">{fee.category}</p>
              </div>
              <div className="flex items-center gap-3">
                {fee.amount > 0 && <span className="font-bold text-white">₹{fee.amount}</span>}
                <StatusBadge status={fee.status} />
              </div>
            </div>
            {fee.status === 'VERIFIED' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified · {fee.method} · Ref: {fee.ref} · {fee.at}
              </div>
            )}
            {fee.status === 'PENDING' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Payment required before registration can be approved
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Payment instructions */}
      {pendingTeams.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-white">Payment Instructions</h3>
          </div>

          <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/20 mb-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400">
              <strong>Manual Payment Only.</strong> EIRO does not use any online payment gateway.
              Pay via cash, bank transfer or UPI, then inform your Event Coordinator with proof of payment.
              The coordinator will verify and update the status within 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">Total Due</p>
              <p className="text-3xl font-black text-white">₹{pendingTeams.reduce((s, t) => s + t.amount, 0)}</p>
              <p className="text-xs text-gray-500 mt-1">for {pendingTeams.length} team(s): {pendingTeams.map(t => t.name).join(', ')}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Bank Transfer</p>
              {[
                { label: 'Bank', value: PAYMENT_DETAILS.bankName },
                { label: 'Account No', value: PAYMENT_DETAILS.accountNo, copyable: true },
                { label: 'IFSC', value: PAYMENT_DETAILS.ifsc, copyable: true },
              ].map(({ label, value, copyable }) => (
                <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white font-mono">{value}</span>
                    {copyable && (
                      <button onClick={() => copy(value, label)}
                        className={`p-1 rounded transition-colors ${copied === label ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}>
                        {copied === label ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">UPI</p>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-xs text-gray-500">UPI ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-indigo-400 font-mono">{PAYMENT_DETAILS.upiId}</span>
                  <button onClick={() => copy(PAYMENT_DETAILS.upiId, 'UPI')}
                    className={`p-1 rounded transition-colors ${copied === 'UPI' ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}>
                    {copied === 'UPI' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
