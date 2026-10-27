'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KpiCard, Card, StatusBadge, CategoryBadge, Button, PageHeader } from '@/components/ui';
import { Users, School, Trophy, CreditCard, Clock, CheckCircle2, AlertCircle, Upload, ChevronRight, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { CategoryCode } from '@/lib/types';
import Link from 'next/link';

interface SchoolRecord { id: string; name?: string; districtId?: string; verificationStatus?: string }
interface Team { id: string; teamName?: string; categoryCode?: string; schoolId?: string }
interface Student { id: string; schoolId?: string }
interface Registration { id: string; teamId?: string; schoolId?: string; state?: string; feeStatus?: string; submittedAt?: unknown; updatedAt?: unknown }
interface Payment { id: string; status?: string; amountMinorUnits?: number }
interface Entry { id: string; teamId?: string; entryStatus?: string }
interface District { id: string; name?: string }
interface Season { id: string; name?: string; year?: number; phase?: string }
interface ImportJob { id: string; status?: string }
interface Adjustment { id: string; status?: string }

function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}

export default function AdminDashboard() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [schoolData, teamData, studentData, registrationData, paymentData, entryData, districtData, seasonData, importData, adjustmentData] = await Promise.all([
        getAll<SchoolRecord>('schools'), getAll<Team>('teams'), getAll<Student>('students'),
        getAll<Registration>('registrations'), getAll<Payment>('payments'), getAll<Entry>('stageEntries'),
        getAll<District>('districts'), getAll<Season>('seasons'), getAll<ImportJob>('importJobs'),
        getAll<Adjustment>('teamAdjustmentRequests'),
      ]);
      setSchools(schoolData); setTeams(teamData); setStudents(studentData); setRegistrations(registrationData);
      setPayments(paymentData); setEntries(entryData); setDistricts(districtData); setSeasons(seasonData);
      setImports(importData); setAdjustments(adjustmentData);
    } catch (e) {
      console.error(e);
      setError('Could not load the admin overview. One or more collections may be unavailable under your Firestore access.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const currentSeason = useMemo(() => [...seasons].sort((a, b) => (b.year || 0) - (a.year || 0))[0], [seasons]);
  const verifiedPayments = payments.filter(payment => payment.status === 'VERIFIED');
  const pendingRegistrations = registrations.filter(registration => ['SUBMITTED', 'UNDER_REVIEW'].includes(registration.state || ''));
  const pendingAdjustments = adjustments.filter(adjustment => adjustment.status === 'PENDING_REVIEW').length;
  const validatedImports = imports.filter(job => job.status === 'VALIDATED').length;
  const recentRegistrations = useMemo(() => [...registrations]
    .sort((a, b) => timestamp(b.submittedAt || b.updatedAt) - timestamp(a.submittedAt || a.updatedAt)).slice(0, 5), [registrations]);
  const districtSummary = useMemo(() => districts.map(district => {
    const districtSchools = schools.filter(school => school.districtId === district.id);
    const schoolIds = new Set(districtSchools.map(school => school.id));
    const districtTeams = teams.filter(team => schoolIds.has(team.schoolId || ''));
    const teamIds = new Set(districtTeams.map(team => team.id));
    const activeTeamIds = new Set(entries.filter(entry => teamIds.has(entry.teamId || '') && ['CHECKED_IN', 'COMPETING'].includes(entry.entryStatus || '')).map(entry => entry.teamId));
    return { ...district, teamCount: districtTeams.length, activeCount: activeTeamIds.size };
  }), [districts, schools, teams, entries]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Competition Overview" subtitle={currentSeason ? `${currentSeason.name || currentSeason.year || currentSeason.id} · ${currentSeason.phase || 'Season status unavailable'}` : 'Live summary from Firestore'}
        actions={<>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>
          <Link href="/admin/reports"><Button variant="secondary" size="sm" icon={Upload}>Reports</Button></Link>
          <Link href="/admin/live"><Button size="sm" icon={RefreshCw}>Live Operations</Button></Link>
        </>} />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> : <>
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/30 border border-indigo-500/20 flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-white">{currentSeason?.name || (currentSeason?.year ? `Season ${currentSeason.year}` : 'Season information unavailable')}</p><p className="text-xs text-gray-400">{currentSeason?.phase || 'No season phase recorded'}</p></div>
          <Link href="/admin/seasons"><Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right">Manage Season</Button></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Schools" value={schools.length} icon={School} color="blue" />
          <KpiCard title="Teams" value={teams.length} icon={Trophy} color="indigo" />
          <KpiCard title="Students" value={students.length} icon={Users} color="purple" />
          <KpiCard title="Verified Payments" value={verifiedPayments.length} icon={CreditCard} color="green" subtitle={`${verifiedPayments.reduce((sum, payment) => sum + (payment.amountMinorUnits || 0), 0).toLocaleString()} minor units`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard title="Pending Registration Reviews" value={pendingRegistrations.length} icon={Clock} color="orange" />
          <KpiCard title="Active Stage Entries" value={entries.filter(entry => ['CHECKED_IN', 'COMPETING'].includes(entry.entryStatus || '')).length} icon={CheckCircle2} color="green" />
        </div>
        <Card padding="none">
          <div className="px-6 py-4 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Alerts & Actions Required</h3></div>
          <div className="divide-y divide-white/5">
            {pendingRegistrations.length > 0 && <Link href="/admin/schools" className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5"><Clock className="w-4 h-4 text-yellow-400" /><p className="text-sm text-gray-300 flex-1">{pendingRegistrations.length} registration(s) awaiting review</p><ChevronRight className="w-4 h-4 text-gray-600" /></Link>}
            {pendingAdjustments > 0 && <Link href="/admin/adjustments" className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5"><AlertCircle className="w-4 h-4 text-red-400" /><p className="text-sm text-gray-300 flex-1">{pendingAdjustments} adjustment request(s) pending review</p><ChevronRight className="w-4 h-4 text-gray-600" /></Link>}
            {validatedImports > 0 && <Link href="/admin/imports" className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5"><Upload className="w-4 h-4 text-blue-400" /><p className="text-sm text-gray-300 flex-1">{validatedImports} validated import job(s) ready to commit</p><ChevronRight className="w-4 h-4 text-gray-600" /></Link>}
            {pendingRegistrations.length === 0 && pendingAdjustments === 0 && validatedImports === 0 && <p className="px-6 py-4 text-sm text-gray-500">No pending actions in the loaded collections.</p>}
          </div>
        </Card>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between"><h3 className="font-semibold text-white text-sm">Recent Registrations</h3><Link href="/admin/schools"><Button variant="ghost" size="sm" icon={ChevronRight} iconPosition="right">View all</Button></Link></div>
            {recentRegistrations.length === 0 ? <p className="p-6 text-sm text-gray-500">No registrations found.</p> :
              <div className="overflow-x-auto"><table className="eiro-table"><thead><tr><th>Team</th><th>Category</th><th>Status</th><th>Fee</th></tr></thead><tbody>
                {recentRegistrations.map(registration => {
                  const team = teams.find(item => item.id === registration.teamId);
                  const school = schools.find(item => item.id === (registration.schoolId || team?.schoolId));
                  return <tr key={registration.id}><td><div className="font-medium text-white text-xs">{team?.teamName || registration.teamId || registration.id}</div><div className="text-gray-500 text-[10px]">{school?.name || school?.id || '—'}</div></td>
                    <td>{team?.categoryCode ? <CategoryBadge code={team.categoryCode as CategoryCode} /> : '—'}</td><td><StatusBadge status={registration.state || 'UNKNOWN'} /></td><td><StatusBadge status={registration.feeStatus || 'UNKNOWN'} /></td></tr>;
                })}
              </tbody></table></div>}
          </Card>
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between"><h3 className="font-semibold text-white text-sm">District Participation</h3><Link href="/admin/districts"><Button variant="ghost" size="sm" icon={TrendingUp} iconPosition="right">Details</Button></Link></div>
            {districtSummary.length === 0 ? <p className="p-6 text-sm text-gray-500">No district records found.</p> : <div className="p-4 space-y-3">
              {districtSummary.map(district => <div key={district.id} className="space-y-1.5"><div className="flex items-center justify-between text-xs"><span className="font-medium text-white">{district.name || district.id}</span><span className="text-gray-500">{district.activeCount}/{district.teamCount} teams active</span></div><div className="w-full h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full" style={{ width: `${district.teamCount ? district.activeCount / district.teamCount * 100 : 0}%` }} /></div></div>)}
            </div>}
          </Card>
        </div>
      </>}
    </div>
  );
}
