'use client';

import { useState } from 'react';
import { PageHeader, Card, StatusBadge, CategoryBadge, Button, Badge } from '@/components/ui';
import { Filter, Search, Eye, Edit3, AlertCircle, ChevronRight } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

type RegistrationState = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

const MY_REGISTRATIONS = [
  { id: 'T001', code: 'EIRO-2026-041', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, members: 2, status: 'APPROVED' as RegistrationState, fee: 'VERIFIED', submittedAt: 'Oct 10, 2026', note: '' },
  { id: 'T002', code: 'EIRO-2026-042', name: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, members: 3, status: 'UNDER_REVIEW' as RegistrationState, fee: 'PENDING', submittedAt: 'Oct 12, 2026', note: '' },
  { id: 'T003', code: 'EIRO-2026-043', name: 'Wall Riders', category: 'WALL' as CategoryCode, members: 2, status: 'CORRECTION_REQUIRED' as RegistrationState, fee: 'NOT_REQUIRED', submittedAt: 'Oct 13, 2026', note: 'Please upload a photo of the robot. Robot dimensions must be declared.' },
  { id: 'T004', code: '', name: 'Smart Innovators', category: 'INNOVATOR_JUNIOR' as CategoryCode, members: 4, status: 'DRAFT' as RegistrationState, fee: 'NOT_REQUIRED', submittedAt: '—', note: '' },
];

export default function RegistrationsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filtered = MY_REGISTRATIONS.filter(r =>
    (search === '' || r.name.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'ALL' || r.status === filter)
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="My Registrations" subtitle="All team registrations submitted by your school" />

      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search teams…" value={search} onChange={e => setSearch(e.target.value)} className="eiro-input pl-9" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="eiro-input sm:w-48">
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
          <option value="APPROVED">Approved</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(reg => (
          <Card key={reg.id} className={reg.status === 'CORRECTION_REQUIRED' ? 'border-red-500/30 bg-red-500/[0.02]' : ''}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h3 className="font-bold text-white">{reg.name}</h3>
                  <CategoryBadge code={reg.category} />
                  <StatusBadge status={reg.status} />
                  {reg.fee !== 'NOT_REQUIRED' && <StatusBadge status={reg.fee} />}
                </div>

                <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                  {reg.code && <span className="font-mono text-indigo-400">{reg.code}</span>}
                  <span>{reg.members} members</span>
                  <span>Submitted: {reg.submittedAt}</span>
                </div>

                {reg.note && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{reg.note}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {reg.status === 'DRAFT' && (
                  <Link href="/coordinator/register">
                    <Button size="sm" icon={Edit3}>Continue</Button>
                  </Link>
                )}
                {reg.status === 'CORRECTION_REQUIRED' && (
                  <Button size="sm" variant="danger" icon={AlertCircle}>Fix & Resubmit</Button>
                )}
                {reg.status === 'APPROVED' && (
                  <Link href="/coordinator/passes">
                    <Button size="sm" variant="secondary" icon={ChevronRight} iconPosition="right">Get QR Pass</Button>
                  </Link>
                )}
                <Button size="sm" variant="secondary" icon={Eye}>View</Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-gray-500">No registrations match your search</p>
          </Card>
        )}
      </div>
    </div>
  );
}
