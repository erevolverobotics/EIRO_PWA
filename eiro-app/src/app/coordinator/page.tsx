'use client';

import { KpiCard, Card, StatusBadge, CategoryBadge, Badge, Button, PageHeader } from '@/components/ui';
import { Trophy, Users, CreditCard, QrCode, AlertCircle, CheckCircle2, Clock, ChevronRight, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import type { CategoryCode } from '@/lib/types';

const MY_TEAMS = [
  { id: 'T001', code: 'EIRO-2026-041', name: 'Robo Warriors', category: 'SUMO' as CategoryCode, members: 2, status: 'APPROVED', fee: 'VERIFIED' },
  { id: 'T002', code: 'EIRO-2026-042', name: 'Eco Rangers', category: 'ECO_CITY' as CategoryCode, members: 3, status: 'UNDER_REVIEW', fee: 'PENDING' },
  { id: 'T003', code: 'EIRO-2026-043', name: 'Wall Riders', category: 'WALL' as CategoryCode, members: 2, status: 'CORRECTION_REQUIRED', fee: 'NOT_REQUIRED' },
  { id: 'T004', code: 'EIRO-2026-044', name: 'Smart Innovators', category: 'INNOVATOR_JUNIOR' as CategoryCode, members: 4, status: 'DRAFT', fee: 'NOT_REQUIRED' },
];

const TASKS = [
  { icon: AlertCircle, color: 'text-yellow-400 bg-yellow-500/10', text: '"Wall Riders" registration requires correction', href: '/coordinator/registrations', urgent: true },
  { icon: CreditCard, color: 'text-orange-400 bg-orange-500/10', text: 'Fee pending for "Eco Rangers" — ₹500 due', href: '/coordinator/fees', urgent: true },
  { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10', text: '"Robo Warriors" approved — QR pass available', href: '/coordinator/passes', urgent: false },
  { icon: Clock, color: 'text-blue-400 bg-blue-500/10', text: 'District event scheduled Oct 28, 2026', href: '/coordinator/schedule', urgent: false },
];

export default function CoordinatorDashboard() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Dashboard"
        subtitle="DAV Public School · Chennai District · EIRO 2026"
        actions={
          <>
            <Link href="/coordinator/bulk-upload">
              <Button variant="secondary" size="sm" icon={Upload}>Bulk Upload</Button>
            </Link>
            <Link href="/coordinator/register">
              <Button size="sm" icon={Plus}>Register Team</Button>
            </Link>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="My Teams" value={MY_TEAMS.length} icon={Trophy} color="indigo" />
        <KpiCard title="Students Registered" value={MY_TEAMS.reduce((s, t) => s + t.members, 0)} icon={Users} color="blue" />
        <KpiCard title="Approved Teams" value={MY_TEAMS.filter(t => t.status === 'APPROVED').length} icon={CheckCircle2} color="green" />
        <KpiCard title="Fees Pending" value={MY_TEAMS.filter(t => t.fee === 'PENDING').length} icon={CreditCard} color="orange" />
      </div>

      {/* Tasks */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Tasks & Notices</h3>
        </div>
        <div className="divide-y divide-white/5">
          {TASKS.map((task, i) => (
            <Link key={i} href={task.href}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.color}`}>
                <task.icon className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-300 flex-1 group-hover:text-white transition-colors">{task.text}</p>
              {task.urgent && <Badge variant="danger" size="sm">Action Required</Badge>}
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            </Link>
          ))}
        </div>
      </Card>

      {/* My Teams */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">My Teams</h3>
          <Link href="/coordinator/registrations">
            <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">View all</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Category</th>
                <th>Members</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MY_TEAMS.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="font-medium text-white text-sm">{t.name}</div>
                    <div className="font-mono text-[10px] text-gray-600">{t.code}</div>
                  </td>
                  <td><CategoryBadge code={t.category} /></td>
                  <td><span className="text-sm text-white">{t.members}</span></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><StatusBadge status={t.fee} /></td>
                  <td>
                    <div className="flex gap-2">
                      {t.status === 'APPROVED' && (
                        <Link href="/coordinator/passes">
                          <Button size="sm" variant="secondary" icon={QrCode}>Pass</Button>
                        </Link>
                      )}
                      {t.status === 'CORRECTION_REQUIRED' && (
                        <Link href={`/coordinator/registrations/${t.id}`}>
                          <Button size="sm" variant="danger" icon={AlertCircle}>Fix</Button>
                        </Link>
                      )}
                      {t.fee === 'PENDING' && (
                        <Link href="/coordinator/fees">
                          <Button size="sm" variant="outline" icon={CreditCard}>Fee</Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Event notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-blue-900/20 border border-indigo-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white mb-1">📅 District Preliminary — Chennai</h3>
            <p className="text-sm text-gray-400">October 28, 2026 · Jawaharlal Nehru Indoor Stadium</p>
            <p className="text-xs text-gray-500 mt-1">Reporting time: 8:00 AM · Approved teams must carry QR passes</p>
          </div>
          <Link href="/coordinator/schedule">
            <Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right">View Schedule</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
