'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  CategoryBadge,
  Modal,
  Textarea,
} from '@/components/ui';

import {
  Shuffle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Adjustment {
  id: string;
  type?: string;
  status?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  studentIds?: string[];
  reason?: string;
  requestedBy?: string;
  createdAt?: unknown;
}

interface Entry {
  id: string;
  teamId?: string;
}

interface Team {
  id: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: string;
  schoolId?: string;
}

interface School {
  id: string;
  name?: string;
  schoolCode?: string;
}

interface Student {
  id: string;
  name?: string;
}

// ─── BACKGROUND CONFIGURATION ─────────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function displayDate(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return typeof value === 'string' ? value : '—';
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function AdjustmentsPage() {
  const [requests, setRequests] = useState<Adjustment[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<{
    request: Adjustment;
    decision: 'APPROVE' | 'REJECT';
  } | null>(null);

  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  // ─── LOAD DATA ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [
        requestData,
        entryData,
        teamData,
        schoolData,
        studentData,
      ] = await Promise.all([
        getAll<Adjustment>('teamAdjustmentRequests'),
        getAll<Entry>('stageEntries'),
        getAll<Team>('teams'),
        getAll<School>('schools'),
        getAll<Student>('students'),
      ]);

      setRequests(requestData);
      setEntries(entryData);
      setTeams(teamData);
      setSchools(schoolData);
      setStudents(studentData);

      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Could not load adjustment requests or related records. Check your access and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setMessage('');
    void load();
  };

  // ─── LOOKUP HELPERS ─────────────────────────────────────────────────────────

  const teamForEntry = (entryId?: string) => {
    const teamId = entries.find(
      (entry) => entry.id === entryId
    )?.teamId;

    return teams.find((team) => team.id === teamId);
  };

  const schoolName = (schoolId?: string) => {
    const school = schools.find(
      (item) => item.id === schoolId
    );

    return (
      school?.name ||
      school?.schoolCode ||
      schoolId ||
      '—'
    );
  };

  // ─── APPROVE / REJECT ───────────────────────────────────────────────────────

  const submit = async () => {
    if (!modal || busy) return;

    if (modal.decision === 'REJECT' && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await callEiroFunction<
        {
          requestId: string;
          decision: 'APPROVE' | 'REJECT';
          reason?: string;
        },
        unknown
      >(
        'approveTeamAdjustment',
        {
          requestId: modal.request.id,
          decision: modal.decision,
          ...(reason.trim()
            ? { reason: reason.trim() }
            : {}),
        }
      );

      setMessage(
        `Adjustment ${
          modal.decision === 'APPROVE'
            ? 'approved'
            : 'rejected'
        }.`
      );

      setModal(null);
      setReason('');
      setLoading(true);

      await load();
    } catch (e) {
      console.error(e);

      setError(
        'The adjustment action was not completed. The callable may be unavailable or the request may no longer be actionable.'
      );
    } finally {
      setBusy(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="adjustments-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ANIMATED BACKGROUND */}

      <div
        className="adjustments-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="adjustments-orb adjustments-orb-one" />
        <div className="adjustments-orb adjustments-orb-two" />
        <div className="adjustments-orb adjustments-orb-three" />
        <div className="adjustments-orb adjustments-orb-four" />

        <div className="adjustments-dot-grid absolute inset-0" />

        <div className="adjustments-ring adjustments-ring-one" />
        <div className="adjustments-ring adjustments-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`adjustments-particle ${particle}`}
          />
        ))}

        <div className="adjustments-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`adjustments-bubble ${bubble.tone}`}
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

        <div className="adjustments-center-glow" />
      </div>

      {/* PAGE CONTENT */}

      <main className="adjustments-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Team Adjustment Approvals"
          subtitle="A15 — Review and authorize merge/transfer requests"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* SAFETY RULES */}

        <div className="adjustments-notice p-4 rounded-2xl border flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />

          <div>
            <p className="text-sm font-medium text-yellow-300 mb-1">
              Safety Rules
            </p>

            <p className="text-xs text-yellow-200/70">
              Approval and rejection are submitted to the trusted Cloud Function;
              eligibility and roster changes are determined server-side.
            </p>
          </div>
        </div>

        {/* STATUS MESSAGES */}

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="text-sm text-green-400">
            {message}
          </p>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="adjustments-card text-center text-gray-300">
            No adjustment requests found.
          </Card>
        ) : (

          /* REQUEST LIST */

          <div className="space-y-4">
            {requests.map((req) => {
              const source = teamForEntry(req.sourceEntryId);
              const target = teamForEntry(req.targetEntryId);

              const actionable = req.status === 'PENDING_REVIEW';

              return (
                <Card
                  key={req.id}
                  padding="none"
                  className="adjustments-card"
                >
                  {/* REQUEST HEADER */}

                  <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">

                    <div className="flex items-center gap-3">
                      <Shuffle className="w-4 h-4 text-purple-400" />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="font-semibold text-white text-sm">
                            {req.id}
                          </span>

                          <Badge
                            variant={
                              req.type === 'MERGE_TEAMS'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {req.type || 'Adjustment'}
                          </Badge>

                          <StatusBadge status={req.status || 'UNKNOWN'} />

                          {source?.categoryCode && (
                            <CategoryBadge
                              code={source.categoryCode as CategoryCode}
                            />
                          )}

                        </div>

                        <p className="text-xs text-gray-400 mt-1">
                          Requested by {req.requestedBy || '—'}
                          {' · '}
                          {displayDate(req.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* REQUEST DETAILS */}

                  <div className="p-6 space-y-4">

                    {/* SOURCE AND TARGET */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {[
                        ['Source', source, req.sourceEntryId],
                        ['Target', target, req.targetEntryId],
                      ].map(([label, team, id]) => {
                        const item = team as Team | undefined;

                        return (
                          <div
                            key={String(label)}
                            className="adjustments-detail-box p-4 rounded-xl border"
                          >
                            <p className="text-xs text-gray-400 mb-1">
                              {String(label)}
                            </p>

                            <p className="font-semibold text-white text-sm">
                              {item?.teamName ||
                                item?.displayTeamCode ||
                                'Team details unavailable'}
                            </p>

                            <p className="text-xs text-gray-400 mt-1">
                              {schoolName(item?.schoolId)}
                            </p>

                            <p className="font-mono text-[10px] text-gray-500 mt-1">
                              {item?.displayTeamCode ||
                                String(id || '—')}
                            </p>
                          </div>
                        );
                      })}

                    </div>

                    {/* REASON */}

                    <div className="adjustments-detail-box p-3 rounded-xl border">
                      <p className="text-xs text-gray-400 mb-1">
                        Reason
                      </p>

                      <p className="text-sm text-gray-200">
                        {req.reason || '—'}
                      </p>
                    </div>

                    {/* STUDENTS */}

                    <div className="flex gap-2 flex-wrap">
                      {(req.studentIds || []).map((id) => (
                        <span
                          key={id}
                          className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-200 border border-purple-400/20"
                        >
                          {students.find(
                            (student) => student.id === id
                          )?.name || id}
                        </span>
                      ))}
                    </div>

                    {/* ACTION BUTTONS */}

                    {actionable && (
                      <div className="flex gap-3 justify-end flex-wrap">

                        <Button
                          variant="danger"
                          size="sm"
                          icon={XCircle}
                          onClick={() => {
                            setReason('');
                            setModal({
                              request: req,
                              decision: 'REJECT',
                            });
                          }}
                        >
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          icon={CheckCircle2}
                          onClick={() => {
                            setReason('');
                            setModal({
                              request: req,
                              decision: 'APPROVE',
                            });
                          }}
                        >
                          Approve & Apply
                        </Button>

                      </div>
                    )}

                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* APPROVAL / REJECTION MODAL */}

        <Modal
          open={Boolean(modal)}
          onClose={() => !busy && setModal(null)}
          title={
            modal?.decision === 'APPROVE'
              ? 'Approve Adjustment'
              : 'Reject Request'
          }
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button
                variant={
                  modal?.decision === 'APPROVE'
                    ? 'primary'
                    : 'danger'
                }
                loading={busy}
                onClick={() => void submit()}
              >
                {modal?.decision === 'APPROVE'
                  ? 'Approve & Apply'
                  : 'Reject Request'}
              </Button>
            </>
          }
        >
          {modal?.decision === 'APPROVE' ? (
            <Textarea
              label="Authorization note (optional)"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : (
            <Textarea
              label="Rejection reason *"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this request is rejected…"
            />
          )}
        </Modal>

      </main>

      {/* BACKGROUND STYLES */}

      <style jsx global>{`

        /* BASE PAGE — NO OVERLAY */

        .adjustments-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .adjustments-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* ANIMATED BACKGROUND LAYER */

        .adjustments-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .adjustments-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(65px);
          will-change: transform;
          opacity: 0.85;
        }

        .adjustments-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.48),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );
          animation: adjustmentsOrbOne 18s ease-in-out infinite alternate;
        }

        .adjustments-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.36),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );
          animation: adjustmentsOrbTwo 22s ease-in-out infinite alternate;
        }

        .adjustments-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.32),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );
          animation: adjustmentsOrbThree 20s ease-in-out infinite alternate;
        }

        .adjustments-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.32),
            transparent 72%
          );
          animation: adjustmentsOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .adjustments-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.14) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.65;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ROTATING RINGS */

        .adjustments-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.16);
          border-radius: 50%;
          will-change: transform;
        }

        .adjustments-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: adjustmentsRingOne 35s linear infinite;
        }

        .adjustments-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.18);
          animation: adjustmentsRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .adjustments-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c4a0ff;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.6);
          animation: adjustmentsParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .adjustments-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .adjustments-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: none;
          animation: adjustmentsBubbleFloat linear infinite;
        }

        .adjustments-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.38),
            rgba(168, 85, 247, 0.05) 55%,
            transparent 72%
          );
        }

        .adjustments-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.32),
            rgba(221, 143, 224, 0.04) 55%,
            transparent 72%
          );
        }

        @keyframes adjustmentsBubbleFloat {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }

          12% {
            opacity: 0.8;
          }

          88% {
            opacity: 0.5;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CENTRAL GLOW */

        .adjustments-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.20) 0%,
            rgba(91, 52, 130, 0.10) 38%,
            transparent 72%
          );
        }

        /* CARDS — TRANSPARENT, NO BLUR */

        .adjustments-page .adjustments-card {
          background: rgba(10, 7, 18, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* INNER DETAILS — VERY LIGHT BACKGROUND */

        .adjustments-page .adjustments-detail-box {
          background: rgba(255, 255, 255, 0.025) !important;
          border-color: rgba(255, 255, 255, 0.09) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* NOTICE — TRANSPARENT */

        .adjustments-page .adjustments-notice {
          background: rgba(120, 75, 15, 0.08) !important;
          border-color: rgba(234, 179, 8, 0.18) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* ANIMATIONS */

        @keyframes adjustmentsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes adjustmentsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes adjustmentsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes adjustmentsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes adjustmentsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes adjustmentsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes adjustmentsParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .adjustments-orb-one {
            width: 320px;
            height: 320px;
          }

          .adjustments-orb-two {
            width: 360px;
            height: 360px;
          }

          .adjustments-orb-three {
            width: 340px;
            height: 340px;
          }

          .adjustments-ring-one {
            width: 300px;
            height: 300px;
          }

          .adjustments-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .adjustments-orb,
          .adjustments-ring,
          .adjustments-particle,
          .adjustments-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}