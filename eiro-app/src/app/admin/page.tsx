'use client';

import { KpiCard, Card, StatusBadge, CategoryBadge, Button, PageHeader } from '@/components/ui';
import {
  Users, School, Trophy, CreditCard, Clock, CheckCircle2,
  AlertCircle, Upload, Zap, ChevronRight, TrendingUp
} from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

// ─── Mock data (replace with Firestore queries) ───────────────────────────────
const ALERTS = [
  { id: 1, type: 'warning', message: '3 registrations awaiting approval', href: '/admin/schools', icon: School },
  { id: 2, type: 'danger', message: '1 merge request pending admin review', href: '/admin/adjustments', icon: AlertCircle },
  { id: 3, type: 'info', message: '2 import jobs completed — ready to review', href: '/admin/imports', icon: Upload },
  { id: 4, type: 'success', message: 'District Prelim Chennai results locked', href: '/admin/scores', icon: CheckCircle2 },
];

const RECENT_REGS = [
  { id: 'R001', team: 'Robo Warriors', school: 'DAV Public School', category: 'SUMO' as CategoryCode, status: 'UNDER_REVIEW', fee: 'PENDING' },
  { id: 'R002', team: 'Maze Masters', school: 'St. Josephs HS', category: 'MAZE' as CategoryCode, status: 'APPROVED', fee: 'VERIFIED' },
  { id: 'R003', team: 'Eco Innovators', school: 'KV No.1', category: 'ECO_CITY' as CategoryCode, status: 'CORRECTION_REQUIRED', fee: 'NOT_REQUIRED' },
  { id: 'R004', team: 'Tech Titans', school: 'Asan Memorial', category: 'NEXTGEN_FACTORY' as CategoryCode, status: 'SUBMITTED', fee: 'PARTIAL' },
  { id: 'R005', team: 'Wall Riders', school: 'PSBB School', category: 'WALL' as CategoryCode, status: 'APPROVED', fee: 'VERIFIED' },
];

const DISTRICT_SUMMARY = [
  { district: 'Chennai', teams: 48, approved: 42, checked_in: 36, competing: 28 },
  { district: 'Coimbatore', teams: 35, approved: 30, checked_in: 25, competing: 18 },
  { district: 'Madurai', teams: 22, approved: 20, checked_in: 16, competing: 12 },
  { district: 'Salem', teams: 18, approved: 15, checked_in: 10, competing: 8 },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Competition Overview"
        subtitle="EIRO 2026 Season · District Preliminaries"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Upload}>Export Report</Button>
            <Button size="sm" icon={Zap}>Live Operations</Button>
          </>
        }
      />

      {/* Season Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/30 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
          <div>
            <p className="text-sm font-semibold text-white">EIRO 2026 — District Preliminaries</p>
            <p className="text-xs text-gray-400">Registration Open · 4 districts active · 7 categories</p>
          </div>
        </div>
        <Link href="/admin/seasons">
          <Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right">Manage Season</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Schools" value={42} icon={School} color="blue" trend={8} />
        <KpiCard title="Registered Teams" value={123} icon={Trophy} color="indigo" trend={12} />
        <KpiCard title="Students" value={487} icon={Users} color="purple" trend={15} />
        <KpiCard title="Payments Verified" value={98} icon={CreditCard} color="green" trend={5} subtitle="₹2,94,000 collected" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Additional KPIs */}
        <KpiCard title="Pending Approvals" value={3} icon={Clock} color="orange" />
        <KpiCard title="Checked In Today" value={36} icon={CheckCircle2} color="green" />
        <KpiCard title="Active Matches" value={7} icon={Zap} color="yellow" />
      </div>

      {/* Alerts */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Alerts & Actions Required</h3>
          <span className="text-xs text-gray-500">{ALERTS.filter(a => a.type !== 'success').length} items need attention</span>
        </div>
        <div className="divide-y divide-white/5">
          {ALERTS.map(a => (
            <Link key={a.id} href={a.href}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                ${a.type === 'warning' ? 'bg-yellow-500/15 text-yellow-400' :
                  a.type === 'danger' ? 'bg-red-500/15 text-red-400' :
                  a.type === 'success' ? 'bg-green-500/15 text-green-400' :
                  'bg-blue-500/15 text-blue-400'}`}>
                <a.icon className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-300 flex-1 group-hover:text-white transition-colors">{a.message}</p>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Registrations */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Recent Registrations</h3>
            <Link href="/admin/schools">
              <Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">View all</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="eiro-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_REGS.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-white text-xs">{r.team}</div>
                      <div className="text-gray-500 text-[10px]">{r.school}</div>
                    </td>
                    <td><CategoryBadge code={r.category} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><StatusBadge status={r.fee} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* District Summary */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">District Participation</h3>
            <Link href="/admin/districts">
              <Button variant="ghost" size="sm" icon={TrendingUp} iconPosition="right">Details</Button>
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {DISTRICT_SUMMARY.map(d => (
              <div key={d.district} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white">{d.district}</span>
                  <span className="text-gray-500">{d.competing}/{d.teams} competing</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-700"
                    style={{ width: `${(d.competing / d.teams) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-[10px] text-gray-600">
                  <span>{d.approved} approved</span>
                  <span>{d.checked_in} checked in</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
