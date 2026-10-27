'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Edit3, Info, Mail, MapPin, Phone, RefreshCw, Trophy, Users, Globe } from 'lucide-react';
import { PageHeader, Card, Button, Badge, Input, Modal, KpiCard } from '@/components/ui';
import { collection, db, doc, getAll, getDoc, getDocs, getOne, query, serverTimestamp, updateDoc, where } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import type { RegistrationState, VerificationStatus } from '@/lib/types';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';

interface SchoolProfile {
  id: string;
  schoolCode?: string;
  name?: string;
  districtId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  verificationStatus?: VerificationStatus;
  coordinatorsSummary?: string[];
}

interface Registration {
  id: string;
  schoolId: string;
  state?: RegistrationState;
  feeStatus?: string;
}

interface DistrictOption {
  id: string;
  name?: string;
  state?: string;
}

interface SchoolApplication {
  id: string;
  schoolName: string;
  districtId: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'PENDING' | 'REJECTED' | 'APPROVED';
  rejectionReason?: string;
}

export default function SchoolProfilePage() {
  const { roles, user } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [application, setApplication] = useState<SchoolApplication | null>(null);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [stats, setStats] = useState({ teams: 0, students: 0, approved: 0, feesPaid: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ address: '', phone: '', email: '', website: '' });
  const [applicationForm, setApplicationForm] = useState({
    schoolName: '',
    districtId: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!schoolId || schoolId === 'unassigned') {
        if (!user) {
          setApplication(null);
          setDistricts([]);
          return;
        }
        const [currentApplication, districtOptions] = await Promise.all([
          getOne<SchoolApplication>('schoolApplications', user.uid),
          getAll<DistrictOption>('districts'),
        ]);
        setApplication(currentApplication);
        setDistricts(districtOptions.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        if (currentApplication) {
          setApplicationForm({
            schoolName: currentApplication.schoolName || '',
            districtId: currentApplication.districtId || '',
            address: currentApplication.address || '',
            phone: currentApplication.phone || '',
            email: currentApplication.email || user.email || '',
            website: currentApplication.website || '',
          });
        } else {
          setApplicationForm(current => ({ ...current, email: user.email || '' }));
        }
        setError('');
        return;
      }
      const [schoolSnap, teamSnap, studentSnap, registrationSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'registrations'), where('schoolId', '==', schoolId))),
      ]);
      setError('');
      const profile = schoolSnap.exists()
        ? { id: schoolSnap.id, ...(schoolSnap.data() as Omit<SchoolProfile, 'id'>) }
        : null;
      setSchool(profile);
      setForm({
        address: profile?.address || '',
        phone: profile?.phone || '',
        email: profile?.email || '',
        website: profile?.website || '',
      });
      const registrations = registrationSnap.docs.map(item => item.data() as Registration);
      setStats({
        teams: teamSnap.size,
        students: studentSnap.size,
        approved: registrations.filter(registration => registration.state === 'APPROVED').length,
        feesPaid: registrations.filter(registration => ['VERIFIED', 'WAIVED', 'NOT_REQUIRED'].includes(registration.feeStatus || '')).length,
      });
    } catch (loadError) {
      console.error(loadError);
      setError('School profile could not be loaded. Check your assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    if (!schoolId || !school) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'schools', schoolId), {
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditOpen(false);
      await load();
    } catch (saveError) {
      console.error(saveError);
      setError('Changes were not saved. Check Firestore permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitApplication = async () => {
    if (!applicationForm.schoolName.trim() || !applicationForm.districtId) {
      toast.error('Enter the school name and select its district.');
      return;
    }
    const signedInUser = auth.currentUser;
    if (!user || !signedInUser || signedInUser.uid !== user.uid) {
      const message = 'Your sign-in has expired. Sign out and sign in again before submitting your school registration.';
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await signedInUser.getIdToken(true);
      await callEiroFunction<
        typeof applicationForm,
        { status: string }
      >('submitSchoolApplication', {
        ...applicationForm,
        schoolName: applicationForm.schoolName.trim(),
        address: applicationForm.address.trim(),
        phone: applicationForm.phone.trim(),
        email: applicationForm.email.trim(),
        website: applicationForm.website.trim(),
      });
      toast.success('School registration request submitted for administrator review.');
      await load();
    } catch (submitError) {
      console.error(submitError);
      const message = submitError instanceof FirebaseError && submitError.code === 'functions/not-found'
        ? 'The school registration service is not deployed in the configured Firebase region. Ask an administrator to deploy Cloud Functions.'
        : submitError instanceof FirebaseError && submitError.code === 'functions/unauthenticated'
          ? 'Firebase could not authenticate your request. Sign out and sign in again, then retry.'
        : submitError instanceof FirebaseError && submitError.code === 'functions/internal'
          ? 'The school registration service failed on the server. Ask an administrator to check the submitSchoolApplication function logs.'
          : submitError instanceof Error
            ? submitError.message
            : 'School registration could not be submitted. Check your connection and try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Profile"
        subtitle="School registration details and coordinator contact information"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {!schoolId || schoolId === 'unassigned' ? loading ? (
        <Card className="text-center text-gray-400">Loading school registration…</Card>
      ) : application?.status === 'PENDING' ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium text-white">School registration under review</p>
              <p className="text-sm text-gray-400 mt-1">An administrator will review your school details and assign your account after approval.</p>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
            <p><span className="text-gray-500">School:</span> {application.schoolName}</p>
            <p><span className="text-gray-500">District:</span> {districts.find(district => district.id === application.districtId)?.name || application.districtId}</p>
            {application.address && <p><span className="text-gray-500">Address:</span> {application.address}</p>}
            {application.email && <p><span className="text-gray-500">Email:</span> {application.email}</p>}
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh status</Button>
        </Card>
      ) : application?.status === 'APPROVED' ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <div>
              <p className="font-medium text-white">School registration approved</p>
              <p className="text-sm text-gray-400 mt-1">Sign in again or refresh this page to load your school coordinator access.</p>
            </div>
          </div>
          <Button size="sm" icon={RefreshCw} onClick={() => window.location.reload()}>Refresh access</Button>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Register your school</h2>
            <p className="text-sm text-gray-400 mt-1">Submit your school details for administrator review. Team registration becomes available after approval.</p>
          </div>
          {application?.status === 'REJECTED' && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="font-medium text-red-300">Application needs changes</p>
              <p className="text-sm text-red-200/80 mt-1">{application.rejectionReason || 'Please review your details and submit again.'}</p>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="School Name *" id="application-school-name" value={applicationForm.schoolName}
              onChange={event => setApplicationForm(current => ({ ...current, schoolName: event.target.value }))} />
            <div>
              <label htmlFor="application-district" className="block text-sm font-medium text-gray-300 mb-1.5">District *</label>
              <select id="application-district" className="eiro-input" value={applicationForm.districtId}
                onChange={event => setApplicationForm(current => ({ ...current, districtId: event.target.value }))}>
                <option value="">Select a district</option>
                {districts.map(district => <option key={district.id} value={district.id}>{district.name || district.id}</option>)}
              </select>
            </div>
            <Input label="School Email" id="application-school-email" type="email" value={applicationForm.email}
              onChange={event => setApplicationForm(current => ({ ...current, email: event.target.value }))} />
            <Input label="Phone" id="application-school-phone" type="tel" value={applicationForm.phone}
              onChange={event => setApplicationForm(current => ({ ...current, phone: event.target.value }))} />
            <Input label="Website" id="application-school-website" type="url" value={applicationForm.website}
              onChange={event => setApplicationForm(current => ({ ...current, website: event.target.value }))} />
            <Input label="Address" id="application-school-address" value={applicationForm.address}
              onChange={event => setApplicationForm(current => ({ ...current, address: event.target.value }))} />
          </div>
          <Button icon={CheckCircle2} onClick={() => void submitApplication()} disabled={saving || districts.length === 0}>
            {saving ? 'Submitting…' : application?.status === 'REJECTED' ? 'Resubmit School' : 'Submit School for Review'}
          </Button>
          {districts.length === 0 && <p className="text-xs text-gray-500">No districts are available yet. Contact an administrator before submitting.</p>}
        </Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading school profile…</Card>
      ) : !school ? (
        <Card className="text-center py-12"><p className="font-medium text-gray-300">School profile not found</p><p className="text-sm text-gray-500 mt-2">The assigned school record is missing or not available.</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0"><Building2 className="w-8 h-8 text-indigo-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-white">{school.name || 'School name not provided'}</h2>
                  {school.verificationStatus && <Badge variant={school.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>{school.verificationStatus}</Badge>}
                </div>
                {school.schoolCode && <p className="font-mono text-xs text-gray-500">{school.schoolCode}</p>}
              </div>
              <Button size="sm" icon={Edit3} onClick={() => setEditOpen(true)}>Edit Contact</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileItem icon={MapPin} label="Address" value={school.address} />
              <ProfileItem icon={MapPin} label="District ID" value={school.districtId} />
              <ProfileItem icon={Phone} label="Phone" value={school.phone} />
              <ProfileItem icon={Mail} label="Email" value={school.email} />
              <ProfileItem icon={Globe} label="Website" value={school.website} />
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard title="Teams" value={stats.teams} icon={Trophy} color="indigo" />
            <KpiCard title="Approved registrations" value={stats.approved} icon={CheckCircle2} color="green" />
            <KpiCard title="Students" value={stats.students} icon={Users} color="blue" />
            <KpiCard title="Paid / exempt fees" value={stats.feesPaid} icon={CheckCircle2} color="purple" />
          </div>

          {school.coordinatorsSummary && school.coordinatorsSummary.length > 0 && (
            <Card>
              <h3 className="font-semibold text-white mb-3">School contact summary</h3>
              <ul className="space-y-2">{school.coordinatorsSummary.map((contact, index) => <li key={`${contact}-${index}`} className="text-sm text-gray-300">{contact}</li>)}</ul>
            </Card>
          )}

          <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit School Contact Details"
            footer={<><Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button><Button icon={CheckCircle2} onClick={() => void save()} loading={saving}>Save Changes</Button></>}>
            <div className="space-y-4">
              <Input label="Phone" id="school-phone" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} />
              <Input label="Email" id="school-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} />
              <Input label="Website" id="school-website" value={form.website} onChange={event => setForm(current => ({ ...current, website: event.target.value }))} />
              <Input label="Address" id="school-address" value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} />
              <p className="text-xs text-gray-500">School name, district and verification status are not editable here.</p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0"><p className="text-xs text-gray-500">{label}</p><p className="text-sm text-white mt-0.5 break-words">{value || 'Not provided'}</p></div>
    </div>
  );
}
