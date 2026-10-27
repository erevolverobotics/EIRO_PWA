'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, KpiCard, Button, CategoryBadge, Badge } from '@/components/ui';
import { UserCheck, RefreshCw, BarChart3, Users, AlertCircle, Loader2 } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';

interface AttendanceRecord {
  id: string;
  studentId?: string;
  teamId?: string;
  entryId?: string;
  eventId?: string;
  sessionId?: string;
  dayNumber?: number;
  status?: string;
  markedAt?: unknown;
}
interface Team { id: string; categoryCode?: string; displayTeamCode?: string; teamName?: string }
interface Student { id: string; name?: string }

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [training, competition, teamData, studentData] = await Promise.all([
        getAll<AttendanceRecord>('trainingAttendance'),
        getAll<AttendanceRecord>('studentAttendance'),
        getAll<Team>('teams'),
        getAll<Student>('students'),
      ]);
      setAttendance([...training, ...competition]);
      setTeams(teamData);
      setStudents(studentData);
    } catch (e) {
      console.error(e);
      setError('Could not load attendance records. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const counts = useMemo(() => ({
    present: attendance.filter(record => record.status === 'PRESENT').length,
    absent: attendance.filter(record => record.status === 'ABSENT').length,
    unmarked: attendance.filter(record => !record.status || record.status === 'NOT_MARKED').length,
    students: new Set(attendance.map(record => record.studentId).filter(Boolean)).size,
  }), [attendance]);
  const categories = useMemo(() => {
    const grouped = new Map<string, { present: number; absent: number; unmarked: number; students: Set<string> }>();
    attendance.forEach(record => {
      const team = teams.find(item => item.id === record.teamId);
      const code = team?.categoryCode || 'UNASSIGNED';
      const item = grouped.get(code) || { present: 0, absent: 0, unmarked: 0, students: new Set<string>() };
      if (record.studentId) item.students.add(record.studentId);
      if (record.status === 'PRESENT') item.present += 1;
      else if (record.status === 'ABSENT') item.absent += 1;
      else item.unmarked += 1;
      grouped.set(code, item);
    });
    return [...grouped.entries()];
  }, [attendance, teams]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Attendance Management" subtitle="Attendance records from training and competition"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Unique Students" value={counts.students} icon={Users} color="indigo" />
        <KpiCard title="Present Records" value={counts.present} icon={UserCheck} color="green" />
        <KpiCard title="Absent Records" value={counts.absent} icon={AlertCircle} color="red" />
        <KpiCard title="Unmarked Records" value={counts.unmarked} icon={BarChart3} color="orange" />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        attendance.length === 0 ? <Card className="text-center text-gray-400">No attendance records found.</Card> : <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categories.map(([code, item]) => {
              const total = item.present + item.absent + item.unmarked;
              const rate = total ? Math.round(item.present / total * 100) : 0;
              return <Card key={code}>
                <div className="flex items-center justify-between mb-4">
                  {code === 'UNASSIGNED' ? <Badge>Unassigned category</Badge> : <CategoryBadge code={code as CategoryCode} />}
                  <span className="text-xs text-gray-400">{item.students.size} unique students · {rate}% present records</span>
                </div>
                <p className="text-xs text-gray-500">Present {item.present} · Absent {item.absent} · Unmarked {item.unmarked}</p>
              </Card>;
            })}
          </div>
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Attendance Records</h3></div>
            <div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Student</th><th>Team</th><th>Event / Session</th><th>Day</th><th>Status</th></tr></thead>
              <tbody>{attendance.map(record => {
                const team = teams.find(item => item.id === record.teamId);
                return <tr key={record.id}>
                  <td className="text-xs text-gray-300">{students.find(student => student.id === record.studentId)?.name || record.studentId || '—'}</td>
                  <td className="text-xs text-gray-400">{team?.teamName || team?.displayTeamCode || record.teamId || record.entryId || '—'}</td>
                  <td className="text-xs text-gray-400">{record.eventId || record.sessionId || '—'}</td>
                  <td className="text-xs text-gray-400">{record.dayNumber ?? '—'}</td>
                  <td><Badge variant={record.status === 'PRESENT' ? 'success' : record.status === 'ABSENT' ? 'danger' : 'warning'}>{record.status || 'NOT_MARKED'}</Badge></td>
                </tr>;
              })}</tbody>
            </table></div>
          </Card>
        </>}
    </div>
  );
}
