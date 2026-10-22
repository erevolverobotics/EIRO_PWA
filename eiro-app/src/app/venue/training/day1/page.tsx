'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge } from '@/components/ui';
import { CalendarDays, CheckCircle2, AlertCircle, Users, Save, Info } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import toast from 'react-hot-toast';

const SESSION = {
  dayNumber: 1 as 1 | 2,
  title: 'EIRO 2026 Training — Day 1',
  date: 'October 25, 2026',
  time: '9:00 AM – 1:00 PM',
  venue: 'Jawaharlal Nehru Indoor Stadium',
};

interface TeamAttendance {
  teamId: string;
  teamCode: string;
  teamName: string;
  school: string;
  students: { id: string; name: string; grade: string; status: AttendanceStatus }[];
}

const MOCK_TEAMS: TeamAttendance[] = [
  {
    teamId: 'T001', teamCode: 'EIRO-2026-041', teamName: 'Robo Warriors', school: 'DAV Public School',
    students: [
      { id: 'S001', name: 'Arjun Sharma', grade: '7A', status: 'NOT_MARKED' },
      { id: 'S002', name: 'Riya Patel', grade: '7B', status: 'NOT_MARKED' },
    ],
  },
  {
    teamId: 'T002', teamCode: 'EIRO-2026-042', teamName: 'Eco Rangers', school: 'DAV Public School',
    students: [
      { id: 'S003', name: 'Aditya Kumar', grade: '8A', status: 'NOT_MARKED' },
      { id: 'S004', name: 'Sneha Rao', grade: '8B', status: 'NOT_MARKED' },
      { id: 'S005', name: 'Vikram Singh', grade: '8A', status: 'NOT_MARKED' },
    ],
  },
  {
    teamId: 'T003', teamCode: 'EIRO-2026-043', teamName: 'Maze Masters', school: 'St. Josephs HS',
    students: [
      { id: 'S006', name: 'Pooja Nair', grade: '9A', status: 'NOT_MARKED' },
      { id: 'S007', name: 'Rahul Gupta', grade: '9B', status: 'NOT_MARKED' },
    ],
  },
];

export default function TrainingDay1Page() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    MOCK_TEAMS.forEach(t => t.students.forEach(s => { init[s.id] = 'NOT_MARKED'; }));
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mark = (studentId: string, status: AttendanceStatus) => {
    setAttendance(a => ({ ...a, [studentId]: status }));
    setSaved(false);
  };

  const markAllTeam = (teamId: string, status: AttendanceStatus) => {
    const team = MOCK_TEAMS.find(t => t.teamId === teamId);
    if (!team) return;
    const updates: Record<string, AttendanceStatus> = {};
    team.students.forEach(s => { updates[s.id] = status; });
    setAttendance(a => ({ ...a, ...updates }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      toast.success('Training Day 1 attendance saved!');
    }, 1000);
  };

  const allStudents = MOCK_TEAMS.flatMap(t => t.students);
  const totalPresent = allStudents.filter(s => attendance[s.id] === 'PRESENT').length;
  const totalAbsent = allStudents.filter(s => attendance[s.id] === 'ABSENT').length;
  const notMarked = allStudents.filter(s => attendance[s.id] === 'NOT_MARKED').length;

  const getStatusColor = (status: AttendanceStatus) => ({
    PRESENT: 'bg-green-500/10 border-green-500/20 text-green-400',
    ABSENT: 'bg-red-500/10 border-red-500/20 text-red-400',
    NOT_MARKED: 'bg-white/5 border-white/10 text-gray-500',
  }[status]);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="Training Day 1 Attendance"
        subtitle={`V10 — ${SESSION.title} · ${SESSION.date}`}
        actions={
          <Button icon={Save} loading={saving} onClick={handleSave}
            variant={saved ? 'secondary' : 'primary'}>
            {saved ? 'Saved ✓' : 'Save Attendance'}
          </Button>
        }
      />

      {/* Session info */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <CalendarDays className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Date</p>
            <p className="text-sm font-medium text-white">{SESSION.date}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time</p>
            <p className="text-sm font-medium text-white">{SESSION.time}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Venue</p>
            <p className="text-sm font-medium text-white truncate">{SESSION.venue}</p>
          </div>
          <div>
            <Badge variant={SESSION.dayNumber === 1 ? 'info' : 'purple'} className="text-base px-4 py-1">Day {SESSION.dayNumber}</Badge>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{totalPresent}</div>
          <div className="text-xs text-gray-500">Present</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-red-400 mb-1">{totalAbsent}</div>
          <div className="text-xs text-gray-500">Absent</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-gray-500 mb-1">{notMarked}</div>
          <div className="text-xs text-gray-500">Not Marked</div>
        </Card>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400">
          <strong>Important:</strong> Students not explicitly marked are <em>NOT</em> counted as present.
          Day 1 and Day 2 attendance are recorded independently — do not assume Day 1 carries to Day 2.
        </p>
      </div>

      {/* Team-by-team attendance */}
      {MOCK_TEAMS.map(team => {
        const teamPresent = team.students.filter(s => attendance[s.id] === 'PRESENT').length;
        return (
          <Card key={team.teamId} padding="none">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">{team.teamName}</h3>
                <p className="text-xs text-gray-500">{team.school} · {team.teamCode}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{teamPresent}/{team.students.length} present</span>
                <div className="flex gap-1">
                  <button onClick={() => markAllTeam(team.teamId, 'PRESENT')}
                    className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                    All Present
                  </button>
                  <button onClick={() => markAllTeam(team.teamId, 'ABSENT')}
                    className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    All Absent
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {team.students.map(student => {
                const status = attendance[student.id];
                return (
                  <div key={student.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{student.name}</p>
                      <p className="text-xs text-gray-500">Grade {student.grade}</p>
                    </div>
                    <div className="flex gap-2">
                      {(['PRESENT', 'ABSENT', 'NOT_MARKED'] as AttendanceStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => mark(student.id, s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 border ${
                            status === s
                              ? getStatusColor(s) + ' ring-2 ring-offset-1 ring-offset-transparent ' + (
                                  s === 'PRESENT' ? 'ring-green-500' : s === 'ABSENT' ? 'ring-red-500' : 'ring-gray-600'
                                )
                              : 'bg-white/[0.03] border-white/10 text-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {s === 'NOT_MARKED' ? '—' : s === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <div className="flex gap-3 justify-end pb-4">
        <Button variant="secondary">Export CSV</Button>
        <Button icon={Save} loading={saving} onClick={handleSave}>
          Save Day 1 Attendance
        </Button>
      </div>
    </div>
  );
}
