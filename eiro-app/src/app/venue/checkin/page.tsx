'use client';

import { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { QrCode, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AttendanceStatus, CategoryCode } from '@/lib/types';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Team = { id: string; displayTeamCode: string; teamName: string; schoolId: string; categoryCode: CategoryCode };
type Entry = { id: string; teamId: string; eventId: string; entryStatus: string; mergedIntoEntryId?: string };
type Membership = { id: string; teamId: string; studentId: string; status?: string };
type Attendance = { entryId: string; studentId: string; status: AttendanceStatus };

function CheckInPageContent() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('team') ?? '');
  const [teams, setTeams] = useState<Team[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [entryId, setEntryId] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getAll<Team>('teams'), getAll<Entry>('stageEntries'), getAll<Membership>('teamMemberships'), getAll<Attendance & { id: string }>('studentAttendance')])
      .then(([teamRows, entryRows, memberRows, attendanceRows]) => { setTeams(teamRows); setEntries(entryRows); setMemberships(memberRows); setRecords(attendanceRows); })
      .catch(() => setError('Check-in data could not be loaded. Check your venue/check-in role.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedEntry = entries.find(entry => entry.id === entryId);
  const members = useMemo(() => team ? memberships.filter(member => member.teamId === team.id && member.status !== 'INACTIVE') : [], [team, memberships]);
  const presentCount = members.filter(member => attendance[member.studentId] === 'PRESENT').length;
  const findTeam = () => {
    const result = teams.find(item => item.displayTeamCode.toLowerCase() === query.trim().toLowerCase());
    setTeam(result ?? null);
    const teamEntries = result ? entries.filter(item => item.teamId === result.id && !item.mergedIntoEntryId) : [];
    const chosen = teamEntries.length === 1 ? teamEntries[0] : undefined;
    setEntryId(chosen?.id ?? '');
    if (!result) { setError('No team matches this display code.'); return; }
    if (teamEntries.length === 0) { setError('No active event entry exists for this team.'); return; }
    setError('');
    if (chosen) {
      const saved: Record<string, AttendanceStatus> = {};
      memberships.filter(member => member.teamId === result.id && member.status !== 'INACTIVE').forEach(member => { saved[member.studentId] = 'NOT_MARKED'; });
      records.filter(record => record.entryId === chosen.id).forEach(record => { saved[record.studentId] = record.status; });
      setAttendance(saved);
    }
  };
  const selectEntry = (id: string) => {
    setEntryId(id);
    const saved: Record<string, AttendanceStatus> = {};
    memberships.filter(member => member.teamId === team?.id && member.status !== 'INACTIVE').forEach(member => { saved[member.studentId] = 'NOT_MARKED'; });
    records.filter(record => record.entryId === id).forEach(record => { saved[record.studentId] = record.status; });
    setAttendance(saved);
  };
  const save = async () => {
    if (!team || !selectedEntry || members.length === 0) return;
    if (members.some(member => !['PRESENT', 'ABSENT'].includes(attendance[member.studentId]))) { toast.error('Mark every roster member present or absent.'); return; }
    setSaving(true);
    try {
      await callEiroFunction<Record<string, unknown>, unknown>('checkInTeam', { entryId: selectedEntry.id, teamId: team.id, eventId: selectedEntry.eventId });
      for (const member of members) {
        await callEiroFunction<Record<string, unknown>, unknown>('recordStudentAttendance', {
          entryId: selectedEntry.id, teamId: team.id, eventId: selectedEntry.eventId,
          studentId: member.studentId, status: attendance[member.studentId],
        });
      }
      toast.success('Check-in and attendance recorded.');
      setRecords(old => [...old.filter(item => item.entryId !== selectedEntry.id), ...members.map(member => ({ entryId: selectedEntry.id, studentId: member.studentId, status: attendance[member.studentId] }))]);
    } catch {
      toast.error('The check-in or attendance call failed. Refresh to confirm persisted records.');
    } finally { setSaving(false); }
  };
  return <div className="max-w-xl space-y-6 animate-fade-in-up">
    <PageHeader title="Team Check-in" subtitle="Look up a registered team and persist authorized attendance" />
    <Card>
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-indigo-400" />Search by team display code</h3>
      <div className="flex gap-2"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && findTeam()} placeholder="Enter team code" className="eiro-input flex-1" /><Button icon={Search} onClick={findTeam} disabled={loading}>Search</Button></div>
      {loading && <p className="text-xs text-gray-400 mt-3">Loading team roster…</p>}
      {error && <p role="alert" className="text-sm text-red-400 mt-3">{error}</p>}
    </Card>
    {team && <Card>
      <h3 className="font-bold text-white text-lg">{team.teamName}</h3>
      <p className="text-xs font-mono text-gray-500">{team.displayTeamCode}</p>
      <p className="text-sm text-gray-400 mt-2">School ID: {team.schoolId} · Category: {team.categoryCode}</p>
      {entries.filter(item => item.teamId === team.id && !item.mergedIntoEntryId).length > 1 && <label className="block text-sm text-gray-400 mt-4">Event entry<select className="eiro-input mt-1" value={entryId} onChange={event => selectEntry(event.target.value)}><option value="">Select entry</option>{entries.filter(item => item.teamId === team.id && !item.mergedIntoEntryId).map(item => <option key={item.id} value={item.id}>{item.eventId} · {item.entryStatus}</option>)}</select></label>}
      {!selectedEntry ? <p className="text-sm text-yellow-400 mt-4">Select an active event entry to continue.</p> : <>
        <div className="mt-4 space-y-3">{members.length === 0 ? <p className="text-gray-400">No active roster membership records were found.</p> : members.map(member => <div key={member.studentId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5"><span className="text-sm text-white">{member.studentId}</span><div className="flex gap-2">{(['PRESENT', 'ABSENT'] as AttendanceStatus[]).map(status => <button key={status} onClick={() => setAttendance(old => ({ ...old, [member.studentId]: status }))} className={`px-3 py-2 rounded-lg text-xs border ${attendance[member.studentId] === status ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-gray-400'}`}>{status}</button>)}</div></div>)}</div>
        <div className="flex justify-between items-center mt-4"><Badge variant={presentCount === members.length && members.length ? 'success' : 'warning'}>{presentCount}/{members.length} present</Badge><Button icon={CheckCircle2} onClick={() => void save()} loading={saving} disabled={loading || members.length === 0}>Save Check-in</Button></div>
      </>}
      <p className="text-xs text-gray-500 mt-4 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />QR camera scanning is unavailable; use the printed team display code.</p>
    </Card>}
  </div>;
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-400 py-12">Loading check-in…</p>}>
      <CheckInPageContent />
    </Suspense>
  );
}
