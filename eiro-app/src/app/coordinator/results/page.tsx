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

/* FLOATING BUBBLES - SAME AS CATEGORY DIRECTORY */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

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
    <main className="results-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND */}

      <div className="rd-ambient" aria-hidden="true">
        <div className="rd-grid" />

        <div className="rd-orb rd-orb-one" />

        <div className="rd-orb rd-orb-two" />

        <div className="rd-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`rd-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}

      <div className="rd-content relative z-10 mx-auto w-full max-w-none space-y-6 px-1 py-6 sm:px-1.5">

        <div className="rd-header-panel">
          <PageHeader title="Results & Finals" subtitle="Published results for your school's teams" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />
        </div>

        {!schoolId || schoolId === 'unassigned' ? (
          <Card className="rd-state-card flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Results are shown after an administrator assigns this account to a school.</p></div></Card>
        ) : error ? (
          <div role="alert"><Card className="rd-state-card text-sm text-red-300">{error}</Card></div>
        ) : loading ? (
          <Card className="rd-state-card text-center text-gray-400">Loading published results…</Card>
        ) : teams.length === 0 ? (
          <Card className="rd-state-card text-center py-12"><p className="font-medium text-gray-300">No school teams found</p><p className="text-sm text-gray-500 mt-2">Teams and their published results will appear once registered.</p></Card>
        ) : resultNeedsMapping ? (
          <Card className="rd-state-card flex items-start gap-3"><Info className="w-5 h-5 text-yellow-400 mt-0.5" /><div><p className="font-medium text-white">Published results are not linked to school teams</p><p className="text-sm text-gray-400 mt-1">The published result records do not include a school or team reference that can be matched safely. Ask the event administrator to publish that association; no unrelated results are shown.</p></div></Card>
        ) : ownResults.length === 0 && qualifications.length === 0 ? (
          <Card className="rd-state-card text-center py-12"><AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="font-medium text-gray-300">No results published for your teams</p><p className="text-sm text-gray-500 mt-2">Results appear here after the approved result revision is published.</p></Card>
        ) : (
          <>
            {qualifications.length > 0 && (
              <Card className="rd-state-card">
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
                <Card key={result.id} className={`rd-result-card ${result.qualified ? 'border-yellow-500/30 bg-yellow-500/[0.03]' : ''}`}>
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
            </div> : results.length > 0 && <Card className="rd-state-card flex items-start gap-3"><Info className="w-5 h-5 text-yellow-400 mt-0.5" /><div><p className="font-medium text-white">Published results are not linked to school teams</p><p className="text-sm text-gray-400 mt-1">The published result records do not include a school or team reference that can be matched safely. No unrelated results are shown.</p></div></Card>}
          </>
        )}
      </div>

      {/* PAGE STYLES */}

      <style jsx global>{`

        /* MAIN PAGE */

        .results-page {
          --rd-text: #f5f6fb;
          position: relative;
          isolation: isolate;
          background: transparent !important;
          color: var(--rd-text);
          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .results-page * {
          box-sizing: border-box;
        }

        /* ANIMATED BACKGROUND */

        .rd-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        /* GRID */

        .rd-grid {
          position: absolute;
          inset: 0;
          opacity: 0.08;

          background-image:
            linear-gradient(
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            );

          background-size: 58px 58px;

          mask-image:
            radial-gradient(
              ellipse 80% 65% at 50% 22%,
              #000,
              transparent
            );
        }

        /* GLOWING ORBS */

        .rd-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .rd-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .rd-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }

        /* FLOATING BUBBLES */

        .rd-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .rd-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: rd-float linear infinite;
        }

        .rd-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .rd-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }

        /* BUBBLE ANIMATION */

        @keyframes rd-float {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }

          12% {
            opacity: 0.5;
          }

          88% {
            opacity: 0.3;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CONTENT */

        .rd-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          background: transparent !important;
          box-shadow: none !important;
        }

        /* HEADER */

        .rd-header-panel {
          padding: 0;
          border: none !important;
          border-radius: 0;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .rd-header-panel h1 {
          color: #f8fafc !important;
          font-size: 24px !important;
          font-weight: 750 !important;
          letter-spacing: -0.035em;
        }

        .rd-header-panel p {
          color: #9ca3af !important;
        }

        /* STATE CARDS */

        .rd-state-card {
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          border-radius: 16px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none !important;
        }

        /* RESULT AND QUALIFICATION CARDS */

        .rd-result-card {
          position: relative;
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          border-radius: 16px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none !important;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .rd-result-card:hover {
          background: rgba(30, 41, 59, 0.38) !important;
          border-color: rgba(168, 85, 247, 0.45) !important;
        }

        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .rd-bubble {
            animation: none;
          }

          .rd-result-card {
            transition: none;
          }
        }

        /* RESPONSIVE */

        @media (max-width: 640px) {
          .rd-content {
            padding: 16px 10px;
          }

          .rd-header-panel h1 {
            font-size: 21px !important;
          }
        }

      `}</style>
    </main>
  );
}

function scoreSummary(snapshot?: Record<string, unknown>): string {
  if (!snapshot) return 'Published';
  const candidate = snapshot.total ?? snapshot.computedTotal ?? snapshot.score;
  return typeof candidate === 'number' || typeof candidate === 'string' ? String(candidate) : 'Published';
}
