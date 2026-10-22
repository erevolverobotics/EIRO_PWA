'use client';

import { PageHeader, Card, KpiCard, Button, CategoryBadge, Badge } from '@/components/ui';
import { UserCheck, Download, Filter, BarChart3, Users, AlertCircle } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const SUMMARY = [
  { category: 'SUMO' as CategoryCode, students: 16, present: 14, absent: 1, notMarked: 1, teams: 8 },
  { category: 'MAZE' as CategoryCode, students: 8, present: 8, absent: 0, notMarked: 0, teams: 4 },
  { category: 'ECO_CITY' as CategoryCode, students: 15, present: 12, absent: 2, notMarked: 1, teams: 5 },
  { category: 'WALL' as CategoryCode, students: 8, present: 7, absent: 1, notMarked: 0, teams: 4 },
];

const totalStudents = SUMMARY.reduce((s, c) => s + c.students, 0);
const totalPresent = SUMMARY.reduce((s, c) => s + c.present, 0);
const totalAbsent = SUMMARY.reduce((s, c) => s + c.absent, 0);

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Attendance Management"
        subtitle="A16 — Cross-event student attendance overview"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Filter}>Filter</Button>
            <Button variant="secondary" size="sm" icon={Download}>Export</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Students" value={totalStudents} icon={Users} color="indigo" />
        <KpiCard title="Present" value={totalPresent} icon={UserCheck} color="green" />
        <KpiCard title="Absent" value={totalAbsent} icon={AlertCircle} color="red" />
        <KpiCard title="Attendance Rate" value={`${Math.round((totalPresent / totalStudents) * 100)}%`} icon={BarChart3} color="blue" />
      </div>

      {/* Per-category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SUMMARY.map(cat => {
          const rate = Math.round((cat.present / cat.students) * 100);
          return (
            <Card key={cat.category}>
              <div className="flex items-center justify-between mb-4">
                <CategoryBadge code={cat.category} />
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-400' : rate >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</span>
                  <span className="text-xs text-gray-500">{cat.teams} teams</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Present', count: cat.present, total: cat.students, color: 'bg-green-500' },
                  { label: 'Absent', count: cat.absent, total: cat.students, color: 'bg-red-500' },
                  { label: 'Not Marked', count: cat.notMarked, total: cat.students, color: 'bg-gray-600' },
                ].map(bar => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{bar.label}</span>
                      <span className="text-white font-medium">{bar.count} / {bar.total}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full">
                      <div
                        className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                        style={{ width: `${cat.students > 0 ? (bar.count / cat.students) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {SUMMARY.some(c => c.notMarked > 0) && (
        <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Unmarked attendance detected</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {SUMMARY.reduce((s, c) => s + c.notMarked, 0)} student(s) have not been marked. Venue coordinators should complete attendance marking before competition ends.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
