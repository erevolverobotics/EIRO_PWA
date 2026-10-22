'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Select } from '@/components/ui';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Eye, Info } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import toast from 'react-hot-toast';

const CHECKS = [
  { id: 'E001', team: 'Robo Warriors', category: 'SUMO' as CategoryCode, school: 'DAV Public', check: 'Robot Weight ≤ 500g', result: 'PASS', value: '487g', limit: '500g' },
  { id: 'E002', team: 'Robo Warriors', category: 'SUMO' as CategoryCode, school: 'DAV Public', check: 'Robot Dimensions ≤ 10x10cm', result: 'PASS', value: '9.8×9.7cm', limit: '10×10cm' },
  { id: 'E003', team: 'Metal Beasts', category: 'SUMO' as CategoryCode, school: 'KV No.1', check: 'Robot Weight ≤ 500g', result: 'FAIL', value: '523g', limit: '500g' },
  { id: 'E004', team: 'Metal Beasts', category: 'SUMO' as CategoryCode, school: 'KV No.1', check: 'Robot Dimensions ≤ 10x10cm', result: 'PASS', value: '10.0×9.9cm', limit: '10×10cm' },
  { id: 'E005', team: 'Maze Masters', category: 'MAZE' as CategoryCode, school: 'Asan Memorial', check: 'Battery Voltage ≤ 12V', result: 'PASS', value: '11.1V', limit: '12V' },
  { id: 'E006', team: 'Speed Navigators', category: 'MAZE' as CategoryCode, school: 'PSBB School', check: 'Battery Voltage ≤ 12V', result: 'PENDING', value: '—', limit: '12V' },
];

const RESULT_COLOR: Record<string, string> = {
  PASS: 'text-green-400 bg-green-500/10 border-green-500/20',
  FAIL: 'text-red-400 bg-red-500/10 border-red-500/20',
  PENDING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

export default function EligibilityPage() {
  const [dqModal, setDqModal] = useState<{ open: boolean; team?: string } | null>(null);
  const [dqReason, setDqReason] = useState('');

  const teams = [...new Set(CHECKS.map(c => c.team))];
  const failedTeams = CHECKS.filter(c => c.result === 'FAIL').map(c => c.team);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Eligibility Check" subtitle="J06 — Pre-competition robot/team specification verification" />

      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400">
          Eligibility checks are performed before competition begins. Failing teams must rectify issues before being allowed to compete. Unresolved failures result in disqualification for that category.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{CHECKS.filter(c => c.result === 'PASS').length}</div>
          <div className="text-xs text-gray-500">Passed</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-red-400 mb-1">{CHECKS.filter(c => c.result === 'FAIL').length}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-yellow-400 mb-1">{CHECKS.filter(c => c.result === 'PENDING').length}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </Card>
      </div>

      {/* Per-team eligibility */}
      {teams.map(teamName => {
        const teamChecks = CHECKS.filter(c => c.team === teamName);
        const teamPassed = teamChecks.every(c => c.result === 'PASS');
        const teamFailed = teamChecks.some(c => c.result === 'FAIL');
        const cat = teamChecks[0].category;

        return (
          <Card key={teamName} className={teamFailed ? 'border-red-500/30 bg-red-500/[0.02]' : teamPassed ? 'border-green-500/20' : ''}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  teamFailed ? 'bg-red-500/15' : teamPassed ? 'bg-green-500/15' : 'bg-yellow-500/15'
                }`}>
                  {teamFailed ? <XCircle className="w-4 h-4 text-red-400" /> :
                   teamPassed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                   <AlertCircle className="w-4 h-4 text-yellow-400" />}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{teamName}</h3>
                  <p className="text-xs text-gray-500">{teamChecks[0].school}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CategoryBadge code={cat} />
                {teamFailed && (
                  <Button size="sm" variant="danger" icon={XCircle} onClick={() => setDqModal({ open: true, team: teamName })}>DQ</Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {teamChecks.map(check => (
                <div key={check.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-xs text-gray-400">{check.check}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500">{check.value} / {check.limit}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RESULT_COLOR[check.result]}`}>
                      {check.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Modal open={dqModal?.open ?? false} onClose={() => setDqModal(null)} title={`Disqualify — ${dqModal?.team}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDqModal(null)}>Cancel</Button>
            <Button variant="danger" icon={XCircle} onClick={() => { setDqModal(null); toast.error(`${dqModal?.team} disqualified`); }}>Confirm DQ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">Disqualification will remove this team from all future rounds and notify the school coordinator immediately.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">DQ Reason *</label>
            <textarea rows={3} className="eiro-input resize-none" value={dqReason} onChange={e => setDqReason(e.target.value)}
              placeholder="State the specific rule violation…" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
