'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Info, RefreshCw, Trophy } from 'lucide-react';
import { PageHeader, Card, CategoryBadge, Badge, Button } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { CategoryCode } from '@/lib/types';

interface Team {
  id: string;
  schoolId: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
}

interface PublishedResult {
  id: string;
  teamId?: string;
  schoolId?: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
  eventName?: string;
  eventId?: string;
  rank?: number;
  score?: number | string;
  scoreSnapshot?: Record<string, unknown>;
  publishedAt?: { toDate?: () => Date } | string;
  qualified?: boolean;
  qualificationStatus?: string;
}

interface Qualification {
  id: string;
  sourceEntryId?: string;
  targetStageId?: string;
  targetEventId?: string;
  finalsEntryId?: string;
  status?: string;
}

function asDate(value?: PublishedResult['publishedAt']): Date | null {
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export default function ResultsPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [teams, setTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<PublishedResult[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') return;
    try {
      const [teamSnap, resultSnap, qualificationSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'results'), where('publishedAt', '!=', null))),
        getDocs(query(collection(db, 'qualifications'), where('schoolId', '==', schoolId))),
      ]);
      setError('');
      setTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) })));
      setResults(resultSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<PublishedResult, 'id'>) })));
      setQualifications(qualificationSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Qualification, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Published results could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const ownResults = results.filter(result =>
    result.schoolId === schoolId ||
    (result.teamId !== undefined && teamById.has(result.teamId))
  );
  const resultNeedsMapping = results.length > 0 && ownResults.length === 0 && teams.length > 0 && qualifications.length === 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Results & Finals" subtitle="Published results for your school's teams" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Results are shown after an administrator assigns this account to a school.</p></div></Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading published results…</Card>
      ) : teams.length === 0 ? (
        <Card className="text-center py-12"><p className="font-medium text-gray-300">No school teams found</p><p className="text-sm text-gray-500 mt-2">Teams and their published results will appear once registered.</p></Card>
      ) : resultNeedsMapping ? (
        <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-yellow-400 mt-0.5" /><div><p className="font-medium text-white">Published results are not linked to school teams</p><p className="text-sm text-gray-400 mt-1">The published result records do not include a school or team reference that can be matched safely. Ask the event administrator to publish that association; no unrelated results are shown.</p></div></Card>
      ) : ownResults.length === 0 && qualifications.length === 0 ? (
        <Card className="text-center py-12"><AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="font-medium text-gray-300">No results published for your teams</p><p className="text-sm text-gray-500 mt-2">Results appear here after the approved result revision is published.</p></Card>
      ) : (
        <>
          {qualifications.length > 0 && (
            <Card>
              <h2 className="font-semibold text-white mb-3">Finals qualification</h2>
              <div className="divide-y divide-white/5">
                {qualifications.map(qualification => (
                  <div key={qualification.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-sm font-medium text-white">Qualification {qualification.id}</p><p className="text-xs text-gray-500 mt-1">Source entry {qualification.sourceEntryId || '—'} · Target {qualification.targetEventId || qualification.targetStageId || '—'}</p></div>
                    <Badge variant={qualification.status === 'APPROVED' ? 'success' : 'info'}>{qualification.status || 'RECORDED'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {ownResults.length > 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ownResults.map(result => {
            const team = result.teamId ? teamById.get(result.teamId) : undefined;
            const category = result.categoryCode || team?.categoryCode;
            const publishedAt = asDate(result.publishedAt);
            return (
              <Card key={result.id} className={result.qualified ? 'border-yellow-500/30 bg-yellow-500/[0.03]' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {category && <CategoryBadge code={category} />}
                      {result.qualified && <Badge variant="warning">Qualified</Badge>}
                    </div>
                    <h3 className="text-lg font-bold text-white">{result.teamName || team?.teamName || team?.displayTeamCode || 'Team result'}</h3>
                    <p className="text-xs text-gray-500 mt-1">{result.eventName || result.eventId || 'Event'}{publishedAt ? ` · Published ${publishedAt.toLocaleDateString()}` : ''}</p>
                  </div>
                  {typeof result.rank === 'number' && <div className="text-center"><Trophy className="w-6 h-6 text-yellow-400 mx-auto" /><p className="text-xl font-black text-white">#{result.rank}</p><p className="text-xs text-gray-500">Rank</p></div>}
                </div>
                {(result.score !== undefined || result.scoreSnapshot) && (
                  <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-gray-500">Published score</p>
                    <p className="text-lg font-bold text-white">{result.score !== undefined ? String(result.score) : scoreSummary(result.scoreSnapshot)}</p>
                  </div>
                )}
                {result.qualificationStatus && <p className="text-sm text-yellow-300 mt-3">Finals qualification: {result.qualificationStatus}</p>}
              </Card>
            );
            })}
          </div> : results.length > 0 && <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-yellow-400 mt-0.5" /><div><p className="font-medium text-white">Published results are not linked to school teams</p><p className="text-sm text-gray-400 mt-1">The published result records do not include a school or team reference that can be matched safely. No unrelated results are shown.</p></div></Card>}
        </>
      )}
    </div>
  );
}

function scoreSummary(snapshot?: Record<string, unknown>): string {
  if (!snapshot) return 'Published';
  const candidate = snapshot.total ?? snapshot.computedTotal ?? snapshot.score;
  return typeof candidate === 'number' || typeof candidate === 'string' ? String(candidate) : 'Published';
}
