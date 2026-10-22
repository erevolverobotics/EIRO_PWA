'use client';

import { PageHeader, Card, Button, KpiCard, StatusBadge, CategoryBadge, Badge } from '@/components/ui';
import { Activity, Users, UserCheck, Clock, BarChart3, Download } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const ATTENDANCE_BY_CAT: { category: CategoryCode; total: number; present: number; absent: number; notMarked: number }[] = [
  { category: 'SUMO', total: 16, present: 14, absent: 1, notMarked: 1 },
  { category: 'MAZE', total: 8, present: 8, absent: 0, notMarked: 0 },
  { category: 'ECO_CITY', total: 15, present: 12, absent: 2, notMarked: 1 },
  { category: 'WALL', total: 8, present: 7, absent: 1, notMarked: 0 },
];

const TRAINING_SUMMARY = [
  { studentId: 'S001', name: 'Arjun Sharma', team: 'Robo Warriors', day1: 'PRESENT', day2: 'PRESENT' },
  { studentId: 'S002', name: 'Riya Patel', team: 'Robo Warriors', day1: 'PRESENT', day2: 'ABSENT' },
  { studentId: 'S003', name: 'Aditya Kumar', team: 'Eco Rangers', day1: 'PRESENT', day2: 'PRESENT' },
  { studentId: 'S004', name: 'Sneha Rao', team: 'Eco Rangers', day1: 'ABSENT', day2: 'NOT_MARKED' },
  { studentId: 'S006', name: 'Pooja Nair', team: 'Maze Masters', day1: 'PRESENT', day2: 'PRESENT' },
  { studentId: 'S007', name: 'Rahul Gupta', team: 'Maze Masters', day1: 'ABSENT', day2: 'ABSENT' },
];

const ATT_COLOR: Record<string, string> = {
  PRESENT: 'text-green-400',
  ABSENT: 'text-red-400',
  NOT_MARKED: 'text-gray-600',
};

export default function TrainingDashboardPage() {
  const totalStudents = TRAINING_SUMMARY.length;
  const bothDays = TRAINING_SUMMARY.filter(s => s.day1 === 'PRESENT' && s.day2 === 'PRESENT').length;
  const day1Only = TRAINING_SUMMARY.filter(s => s.day1 === 'PRESENT' && s.day2 !== 'PRESENT').length;
  const neitherDay = TRAINING_SUMMARY.filter(s => s.day1 !== 'PRESENT' && s.day2 !== 'PRESENT').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Training Attendance Dashboard"
        subtitle="V12 — Consolidated training attendance for both days"
        actions={<Button variant="secondary" size="sm" icon={Download}>Export CSV</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Students" value={totalStudents} icon={Users} color="indigo" />
        <KpiCard title="Both Days ✓" value={bothDays} icon={UserCheck} color="green" />
        <KpiCard title="Day 1 Only" value={day1Only} icon={Clock} color="orange" />
        <KpiCard title="Neither Day" value={neitherDay} icon={Activity} color="red" />
      </div>

      {/* Per-category attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ATTENDANCE_BY_CAT.map(cat => (
          <Card key={cat.category}>
            <div className="flex items-center justify-between mb-4">
              <CategoryBadge code={cat.category} />
              <span className="text-xs text-gray-500">{cat.total} students</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Present', count: cat.present, color: 'bg-green-500' },
                { label: 'Absent', count: cat.absent, color: 'bg-red-500' },
                { label: 'Not Marked', count: cat.notMarked, color: 'bg-gray-600' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className="text-white font-medium">{stat.count}/{cat.total}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full">
                    <div className={`h-full ${stat.color} rounded-full transition-all duration-700`}
                      style={{ width: `${(stat.count / cat.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Student-level table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Student Training Attendance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Student</th><th>Team</th><th>Day 1</th><th>Day 2</th><th>Status</th></tr>
            </thead>
            <tbody>
              {TRAINING_SUMMARY.map(s => {
                const both = s.day1 === 'PRESENT' && s.day2 === 'PRESENT';
                const neither = s.day1 !== 'PRESENT' && s.day2 !== 'PRESENT';
                return (
                  <tr key={s.studentId}>
                    <td><span className="font-medium text-white text-sm">{s.name}</span></td>
                    <td><span className="text-xs text-gray-400">{s.team}</span></td>
                    <td><span className={`text-sm font-bold ${ATT_COLOR[s.day1]}`}>{s.day1 === 'PRESENT' ? '✓' : s.day1 === 'ABSENT' ? '✗' : '—'}</span></td>
                    <td><span className={`text-sm font-bold ${ATT_COLOR[s.day2]}`}>{s.day2 === 'PRESENT' ? '✓' : s.day2 === 'ABSENT' ? '✗' : '—'}</span></td>
                    <td>
                      <Badge variant={both ? 'success' : neither ? 'danger' : 'warning'}>
                        {both ? 'Both Days' : neither ? 'None' : 'Partial'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
