'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { CalendarDays, CheckCircle2, AlertCircle, Eye, Save, Info, BarChart3 } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import toast from 'react-hot-toast';

const DAY1_RECORD: Record<string, AttendanceStatus> = {
  'S001': 'PRESENT', 'S002': 'PRESENT',
  'S003': 'PRESENT', 'S004': 'ABSENT', 'S005': 'NOT_MARKED',
  'S006': 'PRESENT', 'S007': 'ABSENT',
};

const MOCK_TEAMS = [
  {
    teamId: 'T001', teamCode: 'EIRO-2026-041', teamName: 'Robo Warriors', school: 'DAV Public School',
    students: [
      { id: 'S001', name: 'Arjun Sharma', grade: '7A' },
      { id: 'S002', name: 'Riya Patel', grade: '7B' },
    ],
  },
  {
    teamId: 'T002', teamCode: 'EIRO-2026-042', teamName: 'Eco Rangers', school: 'DAV Public School',
    students: [
      { id: 'S003', name: 'Aditya Kumar', grade: '8A' },
      { id: 'S004', name: 'Sneha Rao', grade: '8B' },
      { id: 'S005', name: 'Vikram Singh', grade: '8A' },
    ],
  },
  {
    teamId: 'T003', teamCode: 'EIRO-2026-043', teamName: 'Maze Masters', school: 'St. Josephs HS',
    students: [
      { id: 'S006', name: 'Pooja Nair', grade: '9A' },
      { id: 'S007', name: 'Rahul Gupta', grade: '9B' },
    ],
  },
];

const ATTENDANCE_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: 'text-green-400',
  ABSENT: 'text-red-400',
  NOT_MARKED: 'text-gray-500',
};

const ATTENDANCE_BADGE_VARIANT: Record<AttendanceStatus, 'success' | 'danger' | 'default'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  NOT_MARKED: 'default',
};

export default function TrainingDay2Page() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    MOCK_TEAMS.forEach(t => t.students.forEach(s => { init[s.id] = 'NOT_MARKED'; }));
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mark = (id: string, status: AttendanceStatus) => {
    setAttendance(a => ({ ...a, [id]: status }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); toast.success('Training Day 2 attendance saved!'); }, 1000);
  };

  const allStudents = MOCK_TEAMS.flatMap(t => t.students);
  const bothPresent = allStudents.filter(s => DAY1_RECORD[s.id] === 'PRESENT' && attendance[s.id] === 'PRESENT').length;
  const day2Present = allStudents.filter(s => attendance[s.id] === 'PRESENT').length;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="Training Day 2 Attendance"
        subtitle="V11 — Mark Day 2 independently. Day 1 status shown for reference only."
        actions={
          <Button icon={Save} loading={saving} onClick={handleSave} variant={saved ? 'secondary' : 'primary'}>
            {saved ? 'Saved ✓' : 'Save Day 2'}
          </Button>
        }
      />

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400">
          Day 1 attendance is shown as <strong>read-only context</strong>. Day 2 must be marked independently.
          A Day 1 record does NOT automatically carry over to Day 2.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{day2Present}</div>
          <div className="text-xs text-gray-500">Day 2 Present</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-indigo-400 mb-1">{bothPresent}</div>
          <div className="text-xs text-gray-500">Both Days ✓</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-orange-400 mb-1">
            {allStudents.filter(s => DAY1_RECORD[s.id] === 'PRESENT' && attendance[s.id] === 'ABSENT').length}
          </div>
          <div className="text-xs text-gray-500">Day1✓ Day2✗</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-gray-500 mb-1">
            {allStudents.filter(s => attendance[s.id] === 'NOT_MARKED').length}
          </div>
          <div className="text-xs text-gray-500">Not Marked</div>
        </Card>
      </div>

      {MOCK_TEAMS.map(team => (
        <Card key={team.teamId} padding="none">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">{team.teamName}</h3>
              <p className="text-xs text-gray-500">{team.school}</p>
            </div>
            <Badge variant="info">Day 2</Badge>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-4 gap-2 px-5 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
            <span className="col-span-1">Student</span>
            <span className="text-center">Day 1 (ref)</span>
            <span className="text-center col-span-2">Day 2 Mark</span>
          </div>

          <div className="divide-y divide-white/5">
            {team.students.map(student => {
              const day1 = DAY1_RECORD[student.id] ?? 'NOT_MARKED';
              const day2 = attendance[student.id];
              return (
                <div key={student.id} className="grid grid-cols-4 gap-2 items-center px-5 py-3">
                  <div className="col-span-1">
                    <p className="text-sm font-medium text-white">{student.name}</p>
                    <p className="text-xs text-gray-500">Gr {student.grade}</p>
                  </div>
                  {/* Day 1 read-only */}
                  <div className="flex justify-center">
                    <Badge variant={ATTENDANCE_BADGE_VARIANT[day1]}>
                      {day1 === 'NOT_MARKED' ? '—' : day1 === 'PRESENT' ? '✓' : '✗'}
                    </Badge>
                  </div>
                  {/* Day 2 controls */}
                  <div className="col-span-2 flex gap-2 justify-end">
                    <button
                      onClick={() => mark(student.id, 'PRESENT')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-150 border ${
                        day2 === 'PRESENT'
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                      }`}
                    >
                      ✓ Present
                    </button>
                    <button
                      onClick={() => mark(student.id, 'ABSENT')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-150 border ${
                        day2 === 'ABSENT'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      }`}
                    >
                      ✗ Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <div className="flex gap-3 justify-end pb-4">
        <Button variant="secondary" icon={BarChart3}>View Dashboard</Button>
        <Button icon={Save} loading={saving} onClick={handleSave}>Save Day 2 Attendance</Button>
      </div>
    </div>
  );
}
