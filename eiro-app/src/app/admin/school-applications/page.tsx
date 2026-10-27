'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, School, XCircle } from 'lucide-react';
import { Button, Card, Modal, PageHeader, Textarea } from '@/components/ui';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

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

export default function SchoolApplicationsPage() {
  const { roles } = useAuth();
  const superAdmin = roles.some(role => role.role === 'SUPER_ADMIN' && role.active);
  const districtId = roles.find(role => role.role === 'DISTRICT_ADMIN' && role.active)?.scopeId;
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SchoolApplication | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (superAdmin) {
        const [applicationSnapshot, districtSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'schoolApplications'), where('status', '==', 'PENDING'))),
          getDocs(collection(db, 'districts')),
        ]);
        setApplications(applicationSnapshot.docs.map(document => ({
          id: document.id,
          applicantUid: document.id,
          ...document.data(),
        } as SchoolApplication)));
        setDistricts(districtSnapshot.docs.map(document => ({
          id: document.id,
          name: document.data().name as string | undefined,
        })));
      } else if (districtId && districtId !== 'global') {
        const [applicationSnapshot, districtSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'schoolApplications'),
            where('districtId', '==', districtId),
            where('status', '==', 'PENDING'),
          )),
          getDoc(doc(db, 'districts', districtId)),
        ]);
        setApplications(applicationSnapshot.docs.map(document => ({
          id: document.id,
          applicantUid: document.id,
          ...document.data(),
        } as SchoolApplication)));
        setDistricts(districtSnapshot.exists()
          ? [{ id: districtSnapshot.id, name: districtSnapshot.data().name as string | undefined }]
          : []);
      } else {
        setApplications([]);
        setDistricts([]);
      }
      setError('');
    } catch (loadError) {
      console.error(loadError);
      setError('School applications could not be loaded. Check your district scope and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [districtId, superAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const review = async () => {
    if (!selected || !decision) return;
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Provide a reason before rejecting this application.');
      return;
    }
    setSaving(true);
    try {
      await callEiroFunction<
        { applicantUid: string; decision: Decision; rejectionReason?: string },
        { status: string }
      >('reviewSchoolApplication', {
        applicantUid: selected.applicantUid,
        decision,
        ...(decision === 'REJECT' ? { rejectionReason: rejectionReason.trim() } : {}),
      });
      toast.success(decision === 'APPROVE'
        ? 'School approved and coordinator assigned.'
        : 'School application rejected.');
      setSelected(null);
      setDecision(null);
      setRejectionReason('');
      await load();
    } catch (reviewError) {
      console.error(reviewError);
      toast.error('The school application could not be reviewed. Check your role and try again.');
    } finally {
      setSaving(false);
    }
  };

  const districtName = (id: string) => districts.find(district => district.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Applications"
        subtitle={error ? 'Application data unavailable' : `${applications.length} pending review`}
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {error && <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
      ) : applications.length === 0 ? (
        <Card className="py-16 text-center">
          <School className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-400">No school applications awaiting review</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map(application => (
            <Card key={application.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{application.schoolName}</h2>
                    <p className="text-sm text-gray-400">
                      District: {districtName(application.districtId)}
                    </p>
                  </div>
                  <div className="grid gap-x-6 gap-y-1 text-sm text-gray-400 sm:grid-cols-2">
                    <p>Coordinator: {application.applicantName || 'Name not provided'}</p>
                    <p>Account email: {application.applicantEmail || '—'}</p>
                    {application.email && <p>School email: {application.email}</p>}
                    {application.phone && <p>Phone: {application.phone}</p>}
                    {application.address && <p className="sm:col-span-2">Address: {application.address}</p>}
                    {application.website && <p>Website: {application.website}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" icon={CheckCircle2}
                    onClick={() => { setSelected(application); setDecision('APPROVE'); }}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" icon={XCircle}
                    onClick={() => { setSelected(application); setDecision('REJECT'); setRejectionReason(''); }}>
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selected && !!decision}
        onClose={() => {
          if (!saving) {
            setSelected(null);
            setDecision(null);
          }
        }}
        title={decision === 'APPROVE' ? 'Approve School Registration' : 'Reject School Registration'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSelected(null); setDecision(null); }} disabled={saving}>Cancel</Button>
            <Button
              variant={decision === 'REJECT' ? 'danger' : 'primary'}
              icon={saving ? Loader2 : decision === 'REJECT' ? AlertCircle : CheckCircle2}
              onClick={() => void review()}
              disabled={saving}
            >
              {saving ? 'Saving…' : decision === 'APPROVE' ? 'Approve School' : 'Reject Application'}
            </Button>
          </>
        }
      >
        {selected && decision === 'APPROVE' ? (
          <p className="text-sm text-gray-300">
            Approving <strong>{selected.schoolName}</strong> creates its school record and assigns the applicant as its school coordinator.
          </p>
        ) : (
          <Textarea label="Reason for rejection *" rows={4} value={rejectionReason}
            onChange={event => setRejectionReason(event.target.value)}
            placeholder="Explain what needs to be corrected before resubmitting." />
        )}
      </Modal>
    </div>
  );
}
