'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { CalendarDays, Users } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';

type Session = { id: string; eventId: string; dayNumber: number; title: string; sessionDate?: { toDate?: () => Date } | string; status?: string };
type Attendance = { id: string; sessionId: string; teamId: string; studentId: string; dayNumber: number; status: AttendanceStatus };
type Membership = { teamId: string; studentId: string; status?: string };

export default function TrainingDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getAll<Session>('trainingSessions'), getAll<Attendance>('trainingAttendance'), getAll<Membership>('teamMemberships')])
      .then(([sessionRows, attendanceRows, memberRows]) => { setSessions(sessionRows); setAttendance(attendanceRows); setMembers(memberRows); })
      .catch(() => setError('Training attendance data could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  const students = new Set(members.filter(member => member.status !== 'INACTIVE').map(member => member.studentId));
  const presentDay1 = new Set(attendance.filter(record => record.dayNumber === 1 && record.status === 'PRESENT').map(record => record.studentId));
  const presentDay2 = new Set(attendance.filter(record => record.dayNumber === 2 && record.status === 'PRESENT').map(record => record.studentId));
  const bothDays = [...students].filter(id => presentDay1.has(id) && presentDay2.has(id)).length;
  const dateLabel = (value?: Session['sessionDate']) => {
    if (!value) return 'Date not set';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Date not set';
  };
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="Training Attendance Dashboard" subtitle="Attendance summarized from configured sessions and records" actions={<div className="flex gap-2"><Link href="/venue/training/day1"><Button variant="secondary" size="sm">Day 1</Button></Link><Link href="/venue/training/day2"><Button size="sm">Day 2</Button></Link></div>} />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[
      ['Roster students', students.size], ['Day 1 present', presentDay1.size], ['Day 2 present', presentDay2.size], ['Present both days', bothDays],
    ].map(([label, value]) => <Card key={label} className="text-center"><div className="text-2xl font-black text-indigo-300">{value}</div><div className="text-xs text-gray-500">{label}</div></Card>)}</div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading training records…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : sessions.length === 0 ? <Card className="text-center py-12 text-gray-400">No training sessions have been configured.</Card> :
      <div className="grid lg:grid-cols-2 gap-4">{sessions.map(session => <Card key={session.id}><div className="flex justify-between items-start"><div className="flex gap-3"><CalendarDays className="w-5 h-5 text-indigo-400" /><div><h3 className="font-semibold text-white">{session.title}</h3><p className="text-xs text-gray-500">{dateLabel(session.sessionDate)} · Event {session.eventId}</p></div></div><Badge variant="info">Day {session.dayNumber}</Badge></div><div className="mt-4 flex justify-between text-sm text-gray-400"><span className="flex gap-2"><Users className="w-4 h-4" />Recorded attendance</span><span>{attendance.filter(record => record.sessionId === session.id).length}</span></div><Link className="inline-block mt-4 text-xs text-indigo-400 hover:underline" href={`/venue/training/day${session.dayNumber}`}>Open Day {session.dayNumber} attendance</Link></Card>)}</div>}
  </div>;
}
