'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Info, RefreshCw, Search, Share2, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';

interface Team { id: string; schoolId: string; teamName?: string; }
interface Student { id: string; schoolId: string; name?: string; }
interface Certificate {
  id: string;
  status: string;
  teamId?: string;
  studentId?: string;
  participantName?: string;
  name?: string;
  teamName?: string;
  eventName?: string;
  categoryName?: string;
  categoryCode?: string;
  achievement?: string;
  position?: string;
  issuedAt?: { toDate?: () => Date } | string;
}

function issuedDate(value: Certificate['issuedAt']): string | undefined {
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
  }
  return value?.toDate?.().toLocaleDateString();
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

export default function CertificatesPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') return;
    try {
      const [teamSnap, studentSnap, certificateSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'certificates'), where('status', '==', 'ACTIVE'))),
      ]);
      setError('');
      setTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) })));
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Student, 'id'>) })));
      setCertificates(certificateSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Certificate, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Certificates could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const studentById = useMemo(() => new Map(students.map(student => [student.id, student])), [students]);
  const ownCertificates = certificates.filter(certificate =>
    (certificate.teamId !== undefined && teamById.has(certificate.teamId)) ||
    (certificate.studentId !== undefined && studentById.has(certificate.studentId))
  );
  const searchTerm = search.trim().toLowerCase();
  const filtered = ownCertificates.filter(certificate =>
    !searchTerm ||
    (certificate.participantName || certificate.name || '').toLowerCase().includes(searchTerm) ||
    (certificate.teamName || (certificate.teamId ? teamById.get(certificate.teamId)?.teamName : '') || '').toLowerCase().includes(searchTerm) ||
    certificate.id.toLowerCase().includes(searchTerm)
  );

  const shareCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      setError('Clipboard access is unavailable. Copy the verification code manually.');
      return;
    }
  };

  return (
    <main className="certificates-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND */}

      <div className="cert-ambient" aria-hidden="true">
        <div className="cert-grid" />

        <div className="cert-orb cert-orb-one" />

        <div className="cert-orb cert-orb-two" />

        <div className="cert-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`cert-bubble ${bubble.tone}`}
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

      <div className="cert-content relative z-10 mx-auto w-full max-w-none space-y-6 px-1 py-6 sm:px-1.5">

        {/* HEADER */}

        <div className="cert-header-panel">
          <PageHeader title="Certificates" subtitle="Active certificates issued for your school's teams" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />
        </div>

        {!schoolId || schoolId === 'unassigned' ? (
          <Card className="cert-state-card flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Certificates are available after an administrator assigns this account to a school.</p></div></Card>
        ) : error ? (
          <div role="alert"><Card className="cert-state-card text-sm text-red-300">{error}</Card></div>
        ) : loading ? (
          <Card className="cert-state-card text-center text-gray-400">Loading certificates…</Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KpiCard title="Active certificates" value={ownCertificates.length} icon={Award} color="indigo" />
              <KpiCard title="Shareable codes" value={ownCertificates.length} icon={Share2} color="blue" />
              <KpiCard title="Verification status" value="Active records" icon={ShieldCheck} color="green" />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by student, team or verification code…"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="eiro-input pl-9 cert-search-input"
              />
            </div>

            {ownCertificates.length === 0 ? (
              <Card className="cert-state-card text-center py-14">
                <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="font-medium text-gray-300">No certificates available</p>
                <p className="text-sm text-gray-500 mt-2">Certificates appear after authorized publication and issuance.</p>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="cert-state-card text-center py-12 text-gray-400">No certificates match this search.</Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map(certificate => {
                  const team = certificate.teamId ? teamById.get(certificate.teamId) : undefined;
                  const student = certificate.studentId ? studentById.get(certificate.studentId) : undefined;
                  return (
                    <Card key={certificate.id} className="cert-certificate-card">
                      <div className="text-center border border-white/10 rounded-xl p-5 mb-4 bg-white/[0.02]">
                        <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Certificate of Achievement</p>
                        <p className="text-lg font-black text-white">{certificate.participantName || certificate.name || student?.name || 'Participant'}</p>
                        {(certificate.teamName || team?.teamName) && <p className="text-sm text-gray-400 mt-1">for {certificate.teamName || team?.teamName}</p>}
                        {(certificate.achievement || certificate.position) && <p className="text-sm font-bold text-yellow-400 mt-3">{certificate.achievement || certificate.position}</p>}
                        {certificate.eventName && <p className="text-xs text-gray-500 mt-2">{certificate.eventName}</p>}
                        {issuedDate(certificate.issuedAt) && <p className="text-[10px] text-gray-600 mt-1">Issued: {issuedDate(certificate.issuedAt)}</p>}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0"><p className="text-xs text-gray-500">Verification code</p><p className="font-mono text-xs text-indigo-400 break-all">{certificate.id}</p></div>
                        <Badge variant="success">ACTIVE</Badge>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button size="sm" variant="secondary" icon={Share2} onClick={() => void shareCode(certificate.id)}>Copy verification code</Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-600">Certificate issuance is restricted to authorized administrators. The coordinator view is read-only; private PDF storage paths are not exposed here.</p>
          </>
        )}
      </div>

      {/* PAGE STYLES */}

      <style jsx global>{`

        /* MAIN PAGE */

        .certificates-page {
          --cert-text: #f5f6fb;
          position: relative;
          isolation: isolate;
          background: transparent !important;
          color: var(--cert-text);
          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .certificates-page * {
          box-sizing: border-box;
        }

        /* ANIMATED BACKGROUND */

        .cert-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        /* GRID */

        .cert-grid {
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

        .cert-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .cert-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .cert-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }

        /* FLOATING BUBBLES */

        .cert-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .cert-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: cert-float linear infinite;
        }

        .cert-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .cert-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }

        /* BUBBLE ANIMATION */

        @keyframes cert-float {
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

        .cert-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          background: transparent !important;
          box-shadow: none !important;
        }

        /* HEADER */

        .cert-header-panel {
          padding: 0;
          border: none !important;
          border-radius: 0;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .cert-header-panel h1 {
          color: #f8fafc !important;
          font-size: 24px !important;
          font-weight: 750 !important;
          letter-spacing: -0.035em;
        }

        .cert-header-panel p {
          color: #9ca3af !important;
        }

        /* SEARCH INPUT */

        .cert-search-input {
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .cert-search-input:focus {
          border-color: rgba(168, 85, 247, 0.55) !important;
          outline: none;
        }

        /* STATE CARDS */

        .cert-state-card {
          background: rgba(17, 24, 39, 0.30) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          border-radius: 16px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: none !important;
        }

        /* CERTIFICATE CARDS */

        .cert-certificate-card {
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

        .cert-certificate-card:hover {
          background: rgba(30, 41, 59, 0.38) !important;
          border-color: rgba(168, 85, 247, 0.45) !important;
        }

        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .cert-bubble {
            animation: none;
          }

          .cert-certificate-card {
            transition: none;
          }
        }

        /* RESPONSIVE */

        @media (max-width: 640px) {
          .cert-content {
            padding: 16px 10px;
          }

          .cert-header-panel h1 {
            font-size: 21px !important;
          }
        }

      `}</style>
    </main>
  );
}
