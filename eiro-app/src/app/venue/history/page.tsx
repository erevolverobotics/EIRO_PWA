'use client';

import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, KpiCard } from '@/components/ui';
import { History, Download, UserCheck, AlertCircle, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

const HISTORY = [
  { id: 'ATT-H001', team: 'Robo Warriors', code: 'EIRO-2026-041', category: 'SUMO' as CategoryCode, event: 'Competition Day', student: 'Arjun Sharma', status: 'PRESENT', markedBy: 'Venue Coord. Lakshmi', at: '09:02 AM' },
  { id: 'ATT-H002', team: 'Robo Warriors', code: 'EIRO-2026-041', category: 'SUMO' as CategoryCode, event: 'Competition Day', student: 'Riya Patel', status: 'PRESENT', markedBy: 'Venue Coord. Lakshmi', at: '09:02 AM' },
  { id: 'ATT-H003', team: 'Metal Beasts', code: 'EIRO-2026-043', category: 'SUMO' as CategoryCode, event: 'Competition Day', student: 'Vikram Kumar', status: 'ABSENT', markedBy: 'Venue Coord. Lakshmi', at: '09:05 AM' },
  { id: 'ATT-H004', team: 'Eco Rangers', code: 'EIRO-2026-042', category: 'ECO_CITY' as CategoryCode, event: 'Competition Day', student: 'Aditya Kumar', status: 'PRESENT', markedBy: 'Venue Coord. Lakshmi', at: '10:45 AM' },
  { id: 'ATT-H005', team: 'Eco Rangers', code: 'EIRO-2026-042', category: 'ECO_CITY' as CategoryCode, event: 'Competition Day', student: 'Sneha Rao', status: 'ABSENT', markedBy: 'Venue Coord. Lakshmi', at: '10:45 AM' },
  { id: 'ATT-H006', team: 'Maze Masters', code: 'EIRO-2026-044', category: 'MAZE' as CategoryCode, event: 'Competition Day', student: 'Pooja Nair', status: 'PRESENT', markedBy: 'Venue Coord. Lakshmi', at: '09:55 AM' },
];

const STATUS_COLOR: Record<string, string> = {
  PRESENT: 'text-green-400',
  ABSENT: 'text-red-400',
  NOT_MARKED: 'text-gray-500',
};

export default function AttendanceHistoryPage() {
  const present = HISTORY.filter(h => h.status === 'PRESENT').length;
  const absent = HISTORY.filter(h => h.status === 'ABSENT').length;
  const teams = new Set(HISTORY.map(h => h.team)).size;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Attendance History"
        subtitle="Complete log of all attendance records marked today"
        actions={<Button variant="secondary" size="sm" icon={Download}>Export CSV</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Records" value={HISTORY.length} icon={History} color="indigo" />
        <KpiCard title="Present" value={present} icon={UserCheck} color="green" />
        <KpiCard title="Absent" value={absent} icon={AlertCircle} color="red" />
        <KpiCard title="Teams" value={teams} icon={Users} color="blue" />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Record ID</th><th>Team</th><th>Category</th><th>Student</th><th>Status</th><th>Marked By</th><th>Time</th></tr>
            </thead>
            <tbody>
              {HISTORY.map(h => (
                <tr key={h.id}>
                  <td><span className="font-mono text-xs text-gray-500">{h.id}</span></td>
                  <td>
                    <p className="font-medium text-white text-sm">{h.team}</p>
                    <p className="font-mono text-[10px] text-gray-600">{h.code}</p>
                  </td>
                  <td><CategoryBadge code={h.category} /></td>
                  <td><span className="text-sm text-gray-300">{h.student}</span></td>
                  <td>
                    <span className={`font-bold text-sm ${STATUS_COLOR[h.status]}`}>
                      {h.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </td>
                  <td><span className="text-xs text-gray-500">{h.markedBy}</span></td>
                  <td><span className="text-xs text-gray-500 font-mono">{h.at}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
