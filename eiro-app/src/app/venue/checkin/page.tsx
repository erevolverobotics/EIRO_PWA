'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge } from '@/components/ui';
import { QrCode, Search, CheckCircle2, Users, AlertCircle, UserCheck } from 'lucide-react';
import type { CategoryCode, AttendanceStatus } from '@/lib/types';
import toast from 'react-hot-toast';

const MOCK_TEAM = {
  code: 'EIRO-2026-041',
  name: 'Robo Warriors',
  category: 'SUMO' as CategoryCode,
  school: 'DAV Public School',
  event: 'District Preliminary — Chennai',
  arena: 'Arena A – Sumo Ring 1',
  slot: '09:00 AM',
  status: 'APPROVED',
  members: [
    { id: 'S001', name: 'Arjun Sharma', grade: '7A', attendance: 'NOT_MARKED' as AttendanceStatus },
    { id: 'S002', name: 'Riya Patel', grade: '7B', attendance: 'NOT_MARKED' as AttendanceStatus },
  ],
};

export default function CheckInPage() {
  const [query, setQuery] = useState('');
  const [foundTeam, setFoundTeam] = useState<typeof MOCK_TEAM | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const handleSearch = () => {
    if (query.toUpperCase() === 'EIRO-2026-041' || query === 'PE-2026-041') {
      setFoundTeam(MOCK_TEAM);
      const init: Record<string, AttendanceStatus> = {};
      MOCK_TEAM.members.forEach(m => { init[m.id] = 'NOT_MARKED'; });
      setAttendance(init);
      setSaved(false);
    } else {
      toast.error('Team not found. Verify the code and try again.');
    }
  };

  const mark = (id: string, status: AttendanceStatus) => {
    setAttendance(a => ({ ...a, [id]: status }));
    setSaved(false);
  };

  const handleSave = () => {
    const unmarked = Object.values(attendance).filter(a => a === 'NOT_MARKED').length;
    if (unmarked > 0) {
      toast.error(`${unmarked} student(s) not yet marked. Please mark all.`);
      return;
    }
    setSaved(true);
    toast.success('Attendance saved successfully!');
  };

  const presentCount = Object.values(attendance).filter(a => a === 'PRESENT').length;
  const total = foundTeam?.members.length ?? 0;

  return (
    <div className="max-w-xl space-y-6 animate-fade-in-up">
      <PageHeader title="QR Team Check-in" subtitle="V02/V04 — Scan or search team, then mark individual attendance" />

      {/* Scanner UI */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-indigo-400" /> Scan or Search Team
        </h3>

        {/* QR Scan area */}
        <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center mb-4 hover:border-indigo-500/30 transition-colors cursor-pointer">
          <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">Camera QR Scan</p>
          <p className="text-xs text-gray-600">Tap to open camera (requires permission)</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => {
            // In production: trigger camera API for QR scan
            setQuery('EIRO-2026-041');
            toast('Demo: Using code EIRO-2026-041', { icon: 'ℹ️' });
          }}>
            Simulate Scan
          </Button>
        </div>

        {/* Manual search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Enter Team Code or Pass ID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="eiro-input pl-9"
            />
          </div>
          <Button icon={Search} onClick={handleSearch}>Search</Button>
        </div>
      </Card>

      {/* Team found */}
      {foundTeam && (
        <>
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white text-lg">{foundTeam.name}</h3>
                  <StatusBadge status={foundTeam.status} />
                </div>
                <p className="text-sm text-gray-400">{foundTeam.school}</p>
                <p className="font-mono text-xs text-gray-600 mt-0.5">{foundTeam.code}</p>
              </div>
              <CategoryBadge code={foundTeam.category} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 mb-0.5">Event</p>
                <p className="text-white text-xs">{foundTeam.event}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 mb-0.5">Arena · Slot</p>
                <p className="text-white text-xs">{foundTeam.arena} · {foundTeam.slot}</p>
              </div>
            </div>

            {/* Attendance status summary */}
            <div className={`p-3 rounded-xl mb-4 border flex items-center justify-between ${
              presentCount === total ? 'bg-green-500/10 border-green-500/20' :
              presentCount === 0 ? 'bg-gray-500/10 border-gray-600' :
              'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white font-medium">{presentCount}/{total} Present</span>
              </div>
              {presentCount < 2 && (
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <AlertCircle className="w-3 h-3" />
                  May be short-staffed
                </div>
              )}
            </div>
          </Card>

          {/* Individual student attendance */}
          <Card>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Student Attendance
            </h3>
            <div className="space-y-3">
              {foundTeam.members.map(m => {
                const status = attendance[m.id] ?? 'NOT_MARKED';
                return (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.03]">
                    <div>
                      <p className="font-medium text-white text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500">Grade {m.grade}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => mark(m.id, 'PRESENT')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          status === 'PRESENT'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Present
                      </button>
                      <button
                        onClick={() => mark(m.id, 'ABSENT')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          status === 'ABSENT'
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" /> Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-3">
              <Button className="flex-1" icon={CheckCircle2} onClick={handleSave} disabled={saved}>
                {saved ? 'Attendance Saved ✓' : 'Save Attendance'}
              </Button>
            </div>

            {saved && presentCount < foundTeam.members.length && (
              <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-400 font-medium">⚠ Team is below minimum size</p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  {foundTeam.members.length - presentCount} member(s) absent.
                  Consider initiating a merge or transfer request via the Merge / Transfer screen.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
