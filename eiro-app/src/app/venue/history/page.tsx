'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, CategoryBadge, KpiCard } from '@/components/ui';
import { History, UserCheck, AlertCircle, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';

type Attendance = { id: string; teamId: string; entryId?: string; studentId: string; status: string; recordedAt?: { toDate?: () => Date } | string; markedAt?: { toDate?: () => Date } | string; actorUid?: string; markedByUid?: string };
type Team = { id: string; teamName: string; displayTeamCode: string; categoryCode: CategoryCode };

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getAll<Attendance>('studentAttendance'), getAll<Team>('teams')])
      .then(([attendance, teamRows]) => { setRecords(attendance); setTeams(teamRows); })
      .catch(() => setError('Attendance history could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  const present = records.filter(record => record.status === 'PRESENT').length;
  const absent = records.filter(record => record.status === 'ABSENT').length;
  const dateLabel = (value?: Attendance['recordedAt']) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—';
  };
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Attendance History" subtitle="Persisted competition attendance records" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Records" value={records.length} icon={History} color="indigo" /><KpiCard title="Present" value={present} icon={UserCheck} color="green" /><KpiCard title="Absent" value={absent} icon={AlertCircle} color="red" /><KpiCard title="Teams" value={new Set(records.map(record => record.teamId)).size} icon={Users} color="blue" /></div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading attendance history…</p> : error ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">{error}</div> : records.length === 0 ? <Card className="text-center py-12 text-gray-400">No attendance records have been recorded.</Card> :
      <Card padding="none"><div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Record</th><th>Team</th><th>Category</th><th>Student ID</th><th>Status</th><th>Marked by</th><th>Time</th></tr></thead><tbody>
        {records.map(record => { const team = teams.find(item => item.id === record.teamId); return <tr key={record.id}><td className="font-mono text-xs text-gray-500">{record.id}</td><td><p className="text-white">{team?.teamName ?? record.teamId}</p><p className="font-mono text-[10px] text-gray-500">{team?.displayTeamCode}</p></td><td>{team && <CategoryBadge code={team.categoryCode} />}</td><td>{record.studentId}</td><td className={record.status === 'PRESENT' ? 'text-green-400' : 'text-red-400'}>{record.status}</td><td>{record.markedByUid ?? record.actorUid ?? '—'}</td><td className="font-mono text-xs">{dateLabel(record.markedAt ?? record.recordedAt)}</td></tr>; })}
      </tbody></table></div></Card>}
  </div>;
}
