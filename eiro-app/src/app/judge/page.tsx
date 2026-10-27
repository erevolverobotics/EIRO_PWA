'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card, CategoryBadge, KpiCard, StatusBadge } from '@/components/ui';
import { ClipboardCheck, Star, Swords, Timer } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { useAuth } from '@/lib/firebase/auth-context';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';

type Assignment = { id: string; uid: string; categoryCode?: CategoryCode; type?: string; status?: string; matchId?: string; entryId?: string; eventId?: string; teamName?: string; teamAName?: string; teamBName?: string; scheduledAt?: { toDate?: () => Date } | string; arena?: string; round?: string };
export default function JudgeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'judgeAssignments'), where('uid', '==', user.uid)))
      .then(snapshot => setAssignments(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Assignment))))
      .catch(() => setError('Judge assignments could not be loaded.'))
      .finally(() => setFetching(false));
  }, [user]);
  const loading = authLoading || (Boolean(user) && fetching);
  const typeOf = (assignment: Assignment) => assignment.type?.toUpperCase() ?? 'ASSIGNMENT';
  const routeFor = (assignment: Assignment) => typeOf(assignment).includes('MATCH') ? '/judge/matches' : typeOf(assignment).includes('TIMED') || typeOf(assignment).includes('RUN') ? '/judge/timed-runs' : '/judge/rubric';
  return <div className="space-y-6 animate-fade-in-up">
    <PageHeader title="My Assignments" subtitle="Assignments loaded for the signed-in judge account" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><KpiCard title="Assigned" value={assignments.length} icon={ClipboardCheck} color="indigo" /><KpiCard title="Matches" value={assignments.filter(item => typeOf(item).includes('MATCH')).length} icon={Swords} color="red" /><KpiCard title="Timed Runs" value={assignments.filter(item => typeOf(item).includes('TIMED') || typeOf(item).includes('RUN')).length} icon={Timer} color="blue" /><KpiCard title="Scorecards" value={assignments.filter(item => typeOf(item).includes('RUBRIC')).length} icon={Star} color="purple" /></div>
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading assignments…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : assignments.length === 0 ? <Card className="text-center py-16 text-gray-400">No judge assignments are available for this account.</Card> :
      <Card padding="none"><div className="divide-y divide-white/5">{assignments.map(assignment => <div key={assignment.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{assignment.categoryCode && <CategoryBadge code={assignment.categoryCode} />}<span className="text-xs text-gray-500">{assignment.round ?? typeOf(assignment)}</span></div><p className="text-sm font-medium text-white">{assignment.teamAName && assignment.teamBName ? `${assignment.teamAName} vs ${assignment.teamBName}` : assignment.teamName ?? assignment.entryId ?? assignment.matchId ?? `Assignment ${assignment.id}`}</p><p className="text-xs text-gray-500">{assignment.arena ?? ''} {assignment.scheduledAt ? `· ${typeof assignment.scheduledAt === 'string' ? assignment.scheduledAt : assignment.scheduledAt.toDate?.()?.toLocaleString()}` : ''}</p></div>
        <StatusBadge status={assignment.status ?? 'ASSIGNED'} /><Link href={`${routeFor(assignment)}?assignmentId=${encodeURIComponent(assignment.id)}`} className="text-sm text-indigo-400 hover:underline">Open</Link>
      </div>)}</div></Card>}
  </div>;
}
