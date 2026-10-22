'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Input, Select, StatusBadge, CategoryBadge, Badge, Modal, Textarea } from '@/components/ui';
import { Search, Filter, CheckCircle2, XCircle, AlertCircle, Eye, School } from 'lucide-react';
import type { CategoryCode, RegistrationState } from '@/lib/types';

const MOCK_SCHOOLS = [
  {
    id: 'SCH001', name: 'DAV Public School', code: 'DAV-CHN-001', district: 'Chennai',
    coordinator: 'Mrs. Priya Kumar', phone: '+91 98765 43210',
    verificationStatus: 'VERIFIED',
    teams: [
      { id: 'T001', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, state: 'UNDER_REVIEW' as RegistrationState, members: 2, fee: 'PENDING' },
      { id: 'T002', name: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, state: 'APPROVED' as RegistrationState, members: 3, fee: 'VERIFIED' },
    ]
  },
  {
    id: 'SCH002', name: 'St. Josephs Higher Secondary', code: 'STJ-CHN-002', district: 'Chennai',
    coordinator: 'Mr. Rajan Iyer', phone: '+91 87654 32109',
    verificationStatus: 'VERIFIED',
    teams: [
      { id: 'T003', name: 'Maze Masters', category: 'MAZE' as CategoryCode, state: 'APPROVED' as RegistrationState, members: 2, fee: 'VERIFIED' },
    ]
  },
  {
    id: 'SCH003', name: 'KV No. 1 Chennai', code: 'KV1-CHN-003', district: 'Chennai',
    coordinator: 'Mrs. Sunita Singh', phone: '+91 76543 21098',
    verificationStatus: 'PENDING',
    teams: [
      { id: 'T004', name: 'Smart Bots', category: 'INNOVATOR_JUNIOR' as CategoryCode, state: 'SUBMITTED' as RegistrationState, members: 4, fee: 'NOT_REQUIRED' },
      { id: 'T005', name: 'Eco Innovators', category: 'ECO_CITY' as CategoryCode, state: 'CORRECTION_REQUIRED' as RegistrationState, members: 3, fee: 'NOT_REQUIRED' },
    ]
  },
];

export default function SchoolApprovalsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string; state: string } | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; type: 'approve' | 'reject' | 'correction' } | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');

  const allTeams = MOCK_SCHOOLS.flatMap(s => s.teams.map(t => ({ ...t, schoolName: s.name, schoolCode: s.code })));
  const filtered = allTeams.filter(t =>
    (search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.schoolName.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'ALL' || t.state === statusFilter)
  );

  const pendingCount = allTeams.filter(t => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.state)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="School & Team Approvals"
        subtitle={`${pendingCount} teams pending review`}
        actions={
          <Button size="sm" icon={CheckCircle2}>Approve Selected</Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Submitted', count: allTeams.filter(t => t.state === 'SUBMITTED').length, color: 'text-blue-400' },
          { label: 'Under Review', count: allTeams.filter(t => t.state === 'UNDER_REVIEW').length, color: 'text-yellow-400' },
          { label: 'Correction Req.', count: allTeams.filter(t => t.state === 'CORRECTION_REQUIRED').length, color: 'text-red-400' },
          { label: 'Approved', count: allTeams.filter(t => t.state === 'APPROVED').length, color: 'text-green-400' },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <div className={`text-3xl font-black ${s.color} mb-1`}>{s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search teams or schools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="eiro-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="eiro-input sm:w-48"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="secondary" size="md" icon={Filter}>Filters</Button>
      </div>

      {/* Teams table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Team / School</th>
                <th>Category</th>
                <th>Members</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="font-medium text-white text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <School className="w-3 h-3" />{t.schoolName}
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">{t.schoolCode}</div>
                  </td>
                  <td><CategoryBadge code={t.category} /></td>
                  <td><span className="text-sm text-white">{t.members}</span></td>
                  <td><StatusBadge status={t.state} /></td>
                  <td><StatusBadge status={t.fee} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedTeam({ id: t.id, name: t.name, state: t.state }); setActionModal({ open: true, type: 'approve' }); }}
                        className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedTeam({ id: t.id, name: t.name, state: t.state }); setActionModal({ open: true, type: 'correction' }); }}
                        className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                        title="Request Correction"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedTeam({ id: t.id, name: t.name, state: t.state }); setActionModal({ open: true, type: 'reject' }); }}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">No teams match your search</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Schools list */}
      <PageHeader title="Schools" subtitle="All registered schools and their status" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_SCHOOLS.map(s => (
          <Card key={s.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  <StatusBadge status={s.verificationStatus} />
                </div>
                <p className="text-xs text-gray-500 font-mono">{s.code}</p>
                <p className="text-xs text-gray-500 mt-1">{s.district} · {s.coordinator} · {s.phone}</p>
              </div>
              <Badge variant="info">{s.teams.length} teams</Badge>
            </div>
            <div className="space-y-2">
              {s.teams.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div>
                    <span className="text-xs font-medium text-white">{t.name}</span>
                    <span className="text-[10px] text-gray-600 ml-2">({t.members} members)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CategoryBadge code={t.category} />
                    <StatusBadge status={t.state} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Action Modal */}
      <Modal
        open={actionModal?.open ?? false}
        onClose={() => setActionModal(null)}
        title={
          actionModal?.type === 'approve' ? `Approve — ${selectedTeam?.name}` :
          actionModal?.type === 'reject' ? `Reject — ${selectedTeam?.name}` :
          `Request Correction — ${selectedTeam?.name}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal?.type === 'approve' ? 'primary' : actionModal?.type === 'reject' ? 'danger' : 'primary'}
              onClick={() => setActionModal(null)}
            >
              {actionModal?.type === 'approve' ? 'Approve Registration' :
               actionModal?.type === 'reject' ? 'Reject Registration' : 'Send Correction Request'}
            </Button>
          </>
        }
      >
        {actionModal?.type === 'approve' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">✓ Eligibility checks passed. This team will receive a QR pass upon approval.</p>
            </div>
            <p className="text-sm text-gray-400">Approving this registration will notify the school coordinator and generate a team QR pass once venue assignment is complete.</p>
          </div>
        )}
        {actionModal?.type === 'reject' && (
          <div className="space-y-4">
            <Textarea label="Rejection reason (required)" placeholder="Explain why this registration is being rejected…" rows={4} value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} />
          </div>
        )}
        {actionModal?.type === 'correction' && (
          <div className="space-y-4">
            <Textarea label="Correction required (visible to school coordinator)" placeholder="Describe what needs to be corrected…" rows={4} value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
