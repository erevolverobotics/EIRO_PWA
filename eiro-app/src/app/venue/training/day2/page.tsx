'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, Button } from '@/components/ui';
import { Save } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Session = { id: string; eventId: string; dayNumber: 1 | 2; title: string };
type Entry = { id: string; eventId: string; teamId: string; mergedIntoEntryId?: string };
type Team = { id: string; teamName: string; displayTeamCode: string };
type Member = { teamId: string; studentId: string; status?: string };
type TrainingRecord = { id: string; sessionId: string; entryId: string; teamId: string; studentId: string; dayNumber: number; status: AttendanceStatus };

export default function TrainingDay2Page() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getAll<Session>('trainingSessions'), getAll<Entry>('stageEntries'), getAll<Team>('teams'), getAll<Member>('teamMemberships'), getAll<TrainingRecord>('trainingAttendance')])
      .then(([sessionRows, entryRows, teamRows, memberRows, attendanceRows]) => {
        const daySessions = sessionRows.filter(session => session.dayNumber === 2);
        setSessions(daySessions); setSessionId(daySessions[0]?.id ?? '');
        setEntries(entryRows); setTeams(teamRows); setMembers(memberRows); setRecords(attendanceRows);
      }).catch(() => setError('Training attendance could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  const session = sessions.find(item => item.id === sessionId);
  const roster = useMemo(() => session ? entries.filter(entry => entry.eventId === session.eventId && !entry.mergedIntoEntryId).flatMap(entry => {
    const team = teams.find(item => item.id === entry.teamId);
    return members.filter(member => member.teamId === entry.teamId && member.status !== 'INACTIVE').map(member => ({ entry, team, member }));
  }) : [], [session, entries, teams, members]);
  const statusFor = (studentId: string) => attendance[studentId] ?? records.find(item => item.sessionId === session?.id && item.studentId === studentId)?.status ?? 'NOT_MARKED';
  const save = async () => {
    if (!session) return;
    const corrections = roster.filter(({ member }) => {
      const existing = records.find(item => item.sessionId === session.id && item.studentId === member.studentId);
      return existing && existing.status !== statusFor(member.studentId);
    });
    if (corrections.length && !correctionReason.trim()) { toast.error('Provide a reason to correct existing attendance.'); return; }
    setSaving(true);
    try {
      for (const { entry, member } of roster) {
        const status = statusFor(member.studentId);
        const existing = records.find(item => item.sessionId === session.id && item.studentId === member.studentId);
        if (existing && existing.status !== status) {
          await callEiroFunction<Record<string, unknown>, unknown>('correctTrainingAttendance', { attendanceId: existing.id, status, correctionReason: correctionReason.trim() });
        } else if (!existing && status !== 'NOT_MARKED') {
          await callEiroFunction<Record<string, unknown>, unknown>('markTrainingAttendance', { sessionId: session.id, eventId: session.eventId, entryId: entry.id, teamId: entry.teamId, studentId: member.studentId, dayNumber: 2, status });
        }
      }
      toast.success('Training attendance recorded.');
      setCorrectionReason('');
    } catch { toast.error('Training attendance could not be saved. Refresh to confirm persisted records.'); }
    finally { setSaving(false); }
  };
  return <div className="max-w-3xl space-y-6 animate-fade-in-up">
    <PageHeader title="Training Day 2 Attendance" subtitle="Firestore training session and roster records" actions={<Button icon={Save} onClick={() => void save()} loading={saving} disabled={!session}>Save Attendance</Button>} />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading training roster…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : sessions.length === 0 ? <Card className="text-center py-12 text-gray-400">No Day 2 training session has been configured.</Card> : <>
      <label className="block text-sm text-gray-400">Training session<select className="eiro-input mt-1" value={sessionId} onChange={event => { setSessionId(event.target.value); setAttendance({}); }}>{sessions.map(item => <option key={item.id} value={item.id}>{item.title} · {item.id}</option>)}</select></label>
      {roster.length === 0 ? <Card className="text-center py-10 text-gray-400">No active entry roster is associated with this session.</Card> : roster.map(({ entry, team, member }) => {
        const day1Status = records.find(record => record.dayNumber === 1 && record.teamId === entry.teamId && record.studentId === member.studentId)?.status ?? 'NOT_MARKED';
        return <Card key={`${entry.id}-${member.studentId}`} className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-white">{member.studentId}</p><p className="text-xs text-gray-500">{team?.teamName ?? entry.teamId} · Day 1: {day1Status}</p></div><div className="flex gap-2">{(['PRESENT', 'ABSENT', 'NOT_MARKED'] as AttendanceStatus[]).map(status => <button key={status} onClick={() => setAttendance(old => ({ ...old, [member.studentId]: status }))} className={`px-3 py-2 rounded-lg text-xs border ${statusFor(member.studentId) === status ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>{status}</button>)}</div></Card>;
      })}
      {records.some(record => record.sessionId === session?.id) && <label className="block text-sm text-gray-400">Correction reason (required when changing an existing record)<input value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} className="eiro-input mt-1" /></label>}
    </>}
  </div>;
}
