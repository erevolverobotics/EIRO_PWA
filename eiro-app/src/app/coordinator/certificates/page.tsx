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
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Certificates" subtitle="Active certificates issued for your school's teams" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Certificates are available after an administrator assigns this account to a school.</p></div></Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading certificates…</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KpiCard title="Active certificates" value={ownCertificates.length} icon={Award} color="indigo" />
            <KpiCard title="Shareable codes" value={ownCertificates.length} icon={Share2} color="blue" />
            <KpiCard title="Verification status" value="Active records" icon={ShieldCheck} color="green" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search by student, team or verification code…" value={search} onChange={event => setSearch(event.target.value)} className="eiro-input pl-9" />
          </div>
          {ownCertificates.length === 0 ? (
            <Card className="text-center py-14">
              <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="font-medium text-gray-300">No certificates available</p>
              <p className="text-sm text-gray-500 mt-2">Certificates appear after authorized publication and issuance.</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="text-center py-12 text-gray-400">No certificates match this search.</Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map(certificate => {
                const team = certificate.teamId ? teamById.get(certificate.teamId) : undefined;
                const student = certificate.studentId ? studentById.get(certificate.studentId) : undefined;
                return (
                  <Card key={certificate.id} className="border-indigo-500/20">
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
  );
}
