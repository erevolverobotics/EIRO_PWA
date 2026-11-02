'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  School,
  XCircle,
} from 'lucide-react';

import {
  Button,
  Card,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolApplication {
  id: string;
  applicantUid: string;
  applicantName?: string;
  applicantEmail?: string;
  schoolName: string;
  districtId: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface District {
  id: string;
  name?: string;
}

type Decision = 'APPROVE' | 'REJECT';

// ─── Animated Background Settings ─────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolApplicationsPage() {
  const { roles } = useAuth();

  const superAdmin = roles.some(
    role => role.role === 'SUPER_ADMIN' && role.active
  );

  const districtId = roles.find(
    role => role.role === 'DISTRICT_ADMIN' && role.active
  )?.scopeId;

  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<SchoolApplication | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // ─── Load Applications ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      if (superAdmin) {
        const [applicationSnapshot, districtSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, 'schoolApplications'),
              where('status', '==', 'PENDING')
            )
          ),
          getDocs(collection(db, 'districts')),
        ]);

        setApplications(
          applicationSnapshot.docs.map(document => ({
            id: document.id,
            applicantUid: document.id,
            ...document.data(),
          } as SchoolApplication))
        );

        setDistricts(
          districtSnapshot.docs.map(document => ({
            id: document.id,
            name: document.data().name as string | undefined,
          }))
        );

      } else if (districtId && districtId !== 'global') {
        const [applicationSnapshot, districtSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, 'schoolApplications'),
              where('districtId', '==', districtId),
              where('status', '==', 'PENDING')
            )
          ),
          getDoc(doc(db, 'districts', districtId)),
        ]);

        setApplications(
          applicationSnapshot.docs.map(document => ({
            id: document.id,
            applicantUid: document.id,
            ...document.data(),
          } as SchoolApplication))
        );

        setDistricts(
          districtSnapshot.exists()
            ? [{
                id: districtSnapshot.id,
                name: districtSnapshot.data().name as string | undefined,
              }]
            : []
        );

      } else {
        setApplications([]);
        setDistricts([]);
      }

      setError('');

    } catch (loadError) {
      console.error(loadError);

      setError(
        'School applications could not be loaded. Check your district scope and Firestore permissions, then retry.'
      );

    } finally {
      setLoading(false);
    }
  }, [districtId, superAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ─── Review Application ─────────────────────────────────────────────────────

  const review = async () => {
    if (!selected || !decision) return;

    if (decision === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Provide a reason before rejecting this application.');
      return;
    }

    setSaving(true);

    try {
      await callEiroFunction<
        {
          applicantUid: string;
          decision: Decision;
          rejectionReason?: string;
        },
        { status: string }
      >(
        'reviewSchoolApplication',
        {
          applicantUid: selected.applicantUid,
          decision,
          ...(decision === 'REJECT'
            ? { rejectionReason: rejectionReason.trim() }
            : {}),
        }
      );

      toast.success(
        decision === 'APPROVE'
          ? 'School approved and coordinator assigned.'
          : 'School application rejected.'
      );

      setSelected(null);
      setDecision(null);
      setRejectionReason('');

      await load();

    } catch (reviewError) {
      console.error(reviewError);

      toast.error(
        'The school application could not be reviewed. Check your role and try again.'
      );

    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const districtName = (id: string) =>
    districts.find(district => district.id === id)?.name || id;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="school-app-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ─── SAME ADMIN ANIMATED BACKGROUND ─── */}

      <div
        className="school-app-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="school-app-orb school-app-orb-one" />
        <div className="school-app-orb school-app-orb-two" />
        <div className="school-app-orb school-app-orb-three" />
        <div className="school-app-orb school-app-orb-four" />

        <div className="school-app-dot-grid absolute inset-0" />

        <div className="school-app-ring school-app-ring-one" />
        <div className="school-app-ring school-app-ring-two" />

        {ADMIN_PARTICLES.map(particle => (
          <div
            key={particle}
            className={`school-app-particle ${particle}`}
          />
        ))}

        <div className="school-app-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`school-app-bubble ${bubble.tone}`}
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

        <div className="school-app-center-glow" />
      </div>

      {/* ─── PAGE CONTENT ─── */}

      <main className="school-app-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="School Applications"
          subtitle={
            error
              ? 'Application data unavailable'
              : `${applications.length} pending review`
          }
          actions={
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* ERROR */}

        {error && (
          <div className="school-app-card" role="alert">
            <Card className="text-sm text-red-300">
              {error}
            </Card>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>

        ) : applications.length === 0 ? (

          /* EMPTY STATE */

          <div className="school-app-card">
            <Card className="py-16 text-center">
              <School className="w-12 h-12 text-gray-500 mx-auto mb-3" />

              <p className="font-medium text-gray-300">
                No school applications awaiting review
              </p>

              <p className="text-sm text-gray-500 mt-2">
                New school applications will appear here.
              </p>
            </Card>
          </div>

        ) : (

          /* APPLICATION LIST */

          <div className="space-y-3">
            {applications.map(application => (
              <div
                key={application.id}
                className="school-app-card"
              >
                <Card>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    {/* SCHOOL INFORMATION */}

                    <div className="space-y-3 min-w-0">

                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {application.schoolName}
                        </h2>

                        <p className="text-sm text-gray-400 mt-1">
                          District: {districtName(application.districtId)}
                        </p>
                      </div>

                      <div className="grid gap-x-6 gap-y-2 text-sm text-gray-400 sm:grid-cols-2">

                        <p>
                          Coordinator:{' '}
                          {application.applicantName || 'Name not provided'}
                        </p>

                        <p>
                          Account email:{' '}
                          {application.applicantEmail || '—'}
                        </p>

                        {application.email && (
                          <p>
                            School email: {application.email}
                          </p>
                        )}

                        {application.phone && (
                          <p>
                            Phone: {application.phone}
                          </p>
                        )}

                        {application.address && (
                          <p className="sm:col-span-2">
                            Address: {application.address}
                          </p>
                        )}

                        {application.website && (
                          <p className="break-all">
                            Website: {application.website}
                          </p>
                        )}

                      </div>
                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="flex shrink-0 gap-2 flex-wrap">

                      <Button
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => {
                          setSelected(application);
                          setDecision('APPROVE');
                        }}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        icon={XCircle}
                        onClick={() => {
                          setSelected(application);
                          setDecision('REJECT');
                          setRejectionReason('');
                        }}
                      >
                        Reject
                      </Button>

                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* ─── APPROVE / REJECT MODAL ─── */}

        <Modal
          open={!!selected && !!decision}
          onClose={() => {
            if (!saving) {
              setSelected(null);
              setDecision(null);
            }
          }}
          title={
            decision === 'APPROVE'
              ? 'Approve School Registration'
              : 'Reject School Registration'
          }
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  setDecision(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                variant={decision === 'REJECT' ? 'danger' : 'primary'}
                icon={
                  saving
                    ? Loader2
                    : decision === 'REJECT'
                      ? AlertCircle
                      : CheckCircle2
                }
                onClick={() => void review()}
                disabled={saving}
              >
                {saving
                  ? 'Saving…'
                  : decision === 'APPROVE'
                    ? 'Approve School'
                    : 'Reject Application'}
              </Button>
            </>
          }
        >
          {selected && decision === 'APPROVE' ? (

            <p className="text-sm text-gray-300">
              Approving <strong>{selected.schoolName}</strong> creates its
              school record and assigns the applicant as its school coordinator.
            </p>

          ) : (

            <Textarea
              label="Reason for rejection *"
              rows={4}
              value={rejectionReason}
              onChange={event => setRejectionReason(event.target.value)}
              placeholder="Explain what needs to be corrected before resubmitting."
            />

          )}
        </Modal>

      </main>

      {/* ─── ANIMATED BACKGROUND CSS ─── */}

      <style jsx global>{`

        /* PAGE BASE */

        .school-app-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        /*
          IMPORTANT:
          No dark overlay is placed above the animated background.
          The content wrapper is completely transparent.
        */

        .school-app-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* BACKGROUND LAYER */

        .school-app-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .school-app-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .school-app-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );
          animation: schoolOrbOne 18s ease-in-out infinite alternate;
        }

        .school-app-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );
          animation: schoolOrbTwo 22s ease-in-out infinite alternate;
        }

        .school-app-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );
          animation: schoolOrbThree 20s ease-in-out infinite alternate;
        }

        .school-app-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: schoolOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .school-app-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.55;
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

        .school-app-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .school-app-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: schoolRingOne 35s linear infinite;
        }

        .school-app-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: schoolRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .school-app-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: schoolParticle 8s ease-in-out infinite alternate;
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

        .school-app-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .school-app-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: schoolBubbleFloat linear infinite;
        }

        .school-app-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .school-app-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes schoolBubbleFloat {
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

        /* CENTRAL GLOW */

        .school-app-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* APPLICATION CARDS */

        /*
          Only individual cards receive a subtle transparent surface.
          No full-page dark box and no backdrop blur.
        */

        .school-app-page .school-app-card > * {
          background: rgba(18, 12, 29, 0.16) !important;
          border: 1px solid rgba(221, 143, 224, 0.14) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /*
          Keep nested card content transparent so it does not
          create another dark layer over the background.
        */

        .school-app-page .school-app-card > * > * {
          background-color: transparent;
        }

        /* Remove any background from the main content area */

        .school-app-page .school-app-content,
        .school-app-page .school-app-content > * {
          background-color: transparent;
        }

        /* ANIMATIONS */

        @keyframes schoolOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes schoolOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes schoolOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }

          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes schoolOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes schoolRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }

          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes schoolRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }

          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes schoolParticle {
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
          .school-app-orb-one {
            width: 320px;
            height: 320px;
          }

          .school-app-orb-two {
            width: 360px;
            height: 360px;
          }

          .school-app-orb-three {
            width: 340px;
            height: 340px;
          }

          .school-app-ring-one {
            width: 300px;
            height: 300px;
          }

          .school-app-ring-two {
            width: 240px;
            height: 240px;
          }

          .school-app-page .school-app-card > * {
            background: rgba(18, 12, 29, 0.12) !important;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .school-app-orb,
          .school-app-ring,
          .school-app-particle,
          .school-app-bubble {
            animation: none !important;
          }
        }

      `}</style>

    </div>
  );
}
