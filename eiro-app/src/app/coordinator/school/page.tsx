'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Edit3,
  Info,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Trophy,
  Users,
  Globe,
  type LucideIcon,
} from 'lucide-react';

import {
  PageHeader,
  Button,
  Badge,
  Input,
  Modal,
} from '@/components/ui';

import {
  collection,
  db,
  doc,
  getAll,
  getDoc,
  getDocs,
  getOne,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@/lib/firebase/firestore';

import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';

import type {
  RegistrationState,
  VerificationStatus,
} from '@/lib/types';

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


// ==========================================
// ANIMATED BACKGROUND BUBBLES
// SAME AS COORDINATOR DASHBOARD
// ==========================================

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];


export default function SchoolProfilePage() {
  const { roles, user } = useAuth();

  const schoolId = roles.find(
    role => role.role === 'SCHOOL_COORDINATOR' && role.active
  )?.scopeId;

  const [school, setSchool] = useState<SchoolProfile | null>(null);

  const [application, setApplication] =
    useState<SchoolApplication | null>(null);

  const [districts, setDistricts] = useState<DistrictOption[]>([]);

  const [stats, setStats] = useState({
    teams: 0,
    students: 0,
    approved: 0,
    feesPaid: 0,
  });

  const [editOpen, setEditOpen] = useState(false);

  const [form, setForm] = useState({
    address: '',
    phone: '',
    email: '',
    website: '',
  });

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


  // ==========================================
  // LOAD SCHOOL DATA
  // ==========================================

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

        setDistricts(
          districtOptions.sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        );

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
          setApplicationForm(current => ({
            ...current,
            email: user.email || '',
          }));
        }

        setError('');
        return;
      }

      const [
        schoolSnap,
        teamSnap,
        studentSnap,
        registrationSnap,
      ] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),

        getDocs(
          query(
            collection(db, 'teams'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDocs(
          query(
            collection(db, 'students'),
            where('schoolId', '==', schoolId)
          )
        ),

        getDocs(
          query(
            collection(db, 'registrations'),
            where('schoolId', '==', schoolId)
          )
        ),
      ]);

      const profile = schoolSnap.exists()
        ? {
            id: schoolSnap.id,
            ...(schoolSnap.data() as Omit<SchoolProfile, 'id'>),
          }
        : null;

      setSchool(profile);

      setForm({
        address: profile?.address || '',
        phone: profile?.phone || '',
        email: profile?.email || '',
        website: profile?.website || '',
      });

      const registrations = registrationSnap.docs.map(
        item => item.data() as Registration
      );

      setStats({
        teams: teamSnap.size,
        students: studentSnap.size,

        approved: registrations.filter(
          registration => registration.state === 'APPROVED'
        ).length,

        feesPaid: registrations.filter(
          registration =>
            ['VERIFIED', 'WAIVED', 'NOT_REQUIRED'].includes(
              registration.feeStatus || ''
            )
        ).length,
      });

      setError('');

    } catch (loadError) {
      console.error(loadError);

      setError(
        'School profile could not be loaded. Check your assignment and Firestore permissions, then retry.'
      );

    } finally {
      setLoading(false);
    }
  }, [schoolId, user]);


  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);


  // ==========================================
  // SAVE SCHOOL CONTACT
  // ==========================================

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

      setError(
        'Changes were not saved. Check Firestore permissions and try again.'
      );

    } finally {
      setSaving(false);
    }
  };


  // ==========================================
  // SUBMIT SCHOOL APPLICATION
  // ==========================================

  const submitApplication = async () => {
    if (
      !applicationForm.schoolName.trim() ||
      !applicationForm.districtId
    ) {
      toast.error('Enter the school name and select its district.');
      return;
    }

    const signedInUser = auth.currentUser;

    if (!user || !signedInUser || signedInUser.uid !== user.uid) {
      const message =
        'Your sign-in has expired. Sign out and sign in again before submitting your school registration.';

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

      toast.success(
        'School registration request submitted for administrator review.'
      );

      await load();

    } catch (submitError) {
      console.error(submitError);

      const message =
        submitError instanceof FirebaseError &&
        submitError.code === 'functions/not-found'
          ? 'The school registration service is not deployed in the configured Firebase region. Ask an administrator to deploy Cloud Functions.'

        : submitError instanceof FirebaseError &&
          submitError.code === 'functions/unauthenticated'
          ? 'Firebase could not authenticate your request. Sign out and sign in again, then retry.'

        : submitError instanceof FirebaseError &&
          submitError.code === 'functions/internal'
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


  // ==========================================
  // PAGE UI
  // ==========================================

  return (

    <main className="school-profile-page relative isolate w-full min-h-screen">

      {/* =====================================
          ANIMATED BACKGROUND
          ===================================== */}

      <div className="sp-ambient" aria-hidden="true">

        <div className="sp-grid" />

        <div className="sp-orb sp-orb-one" />
        <div className="sp-orb sp-orb-two" />

        <div className="sp-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`sp-bubble ${bubble.tone}`}
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


      {/* =====================================
          MAIN CONTENT
          ===================================== */}

      <div className="sp-content relative z-10 w-full min-h-screen space-y-7 px-1 py-6 text-white animate-fade-in-up">


        {/* PAGE HEADER */}

        <PageHeader
          title="School Profile"
          subtitle="School registration details and coordinator contact information"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />


        {/* =====================================
            UNASSIGNED SCHOOL
            ===================================== */}

        {!schoolId || schoolId === 'unassigned' ? (

          loading ? (

            <p className="text-center text-gray-400 py-10">
              Loading school registration…
            </p>

          ) : application?.status === 'PENDING' ? (

            <section className="space-y-5">

              <div className="flex items-start gap-3">

                <Info className="w-5 h-5 text-purple-400 mt-1" />

                <div>
                  <h2 className="font-semibold text-white">
                    School registration under review
                  </h2>

                  <p className="text-sm text-gray-400 mt-1">
                    An administrator will review your school details and assign your account after approval.
                  </p>
                </div>

              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-300">

                <p>
                  <span className="text-gray-500">School:</span>{' '}
                  {application.schoolName}
                </p>

                <p>
                  <span className="text-gray-500">District:</span>{' '}
                  {districts.find(
                    district => district.id === application.districtId
                  )?.name || application.districtId}
                </p>

                <p>
                  <span className="text-gray-500">Address:</span>{' '}
                  {application.address || 'Not provided'}
                </p>

                <p>
                  <span className="text-gray-500">Email:</span>{' '}
                  {application.email || 'Not provided'}
                </p>

              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={() => void load()}
                disabled={loading}
              >
                Refresh status
              </Button>

            </section>

          ) : application?.status === 'APPROVED' ? (

            <section className="space-y-4">

              <div className="flex items-center gap-3">

                <CheckCircle2 className="w-5 h-5 text-green-400" />

                <div>
                  <h2 className="font-semibold text-white">
                    School registration approved
                  </h2>

                  <p className="text-sm text-gray-400 mt-1">
                    Sign in again or refresh this page to load your school coordinator access.
                  </p>
                </div>

              </div>

              <Button
                size="sm"
                icon={RefreshCw}
                onClick={() => window.location.reload()}
              >
                Refresh access
              </Button>

            </section>

          ) : (

            <section className="space-y-5">

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Register your school
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  Submit your school details for administrator review. Team registration becomes available after approval.
                </p>
              </div>

              {application?.status === 'REJECTED' && (
                <div className="border-l-2 border-red-500 pl-4 py-2">

                  <p className="font-medium text-red-300">
                    Application needs changes
                  </p>

                  <p className="text-sm text-red-200/80 mt-1">
                    {application.rejectionReason ||
                      'Please review your details and submit again.'}
                  </p>

                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">

                <Input
                  label="School Name *"
                  id="application-school-name"
                  value={applicationForm.schoolName}
                  onChange={event =>
                    setApplicationForm(current => ({
                      ...current,
                      schoolName: event.target.value,
                    }))
                  }
                />

                <div>

                  <label
                    htmlFor="application-district"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    District *
                  </label>

                  <select
                    id="application-district"
                    className="eiro-input"
                    value={applicationForm.districtId}
                    onChange={event =>
                      setApplicationForm(current => ({
                        ...current,
                        districtId: event.target.value,
                      }))
                    }
                  >

                    <option value="">Select a district</option>

                    {districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name || district.id}
                      </option>
                    ))}

                  </select>

                </div>

                <Input
                  label="School Email"
                  id="application-school-email"
                  type="email"
                  value={applicationForm.email}
                  onChange={event =>
                    setApplicationForm(current => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Phone"
                  id="application-school-phone"
                  type="tel"
                  value={applicationForm.phone}
                  onChange={event =>
                    setApplicationForm(current => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Website"
                  id="application-school-website"
                  type="url"
                  value={applicationForm.website}
                  onChange={event =>
                    setApplicationForm(current => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Address"
                  id="application-school-address"
                  value={applicationForm.address}
                  onChange={event =>
                    setApplicationForm(current => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />

              </div>

              <Button
                icon={CheckCircle2}
                onClick={() => void submitApplication()}
                disabled={saving || districts.length === 0}
              >
                {saving
                  ? 'Submitting…'
                  : application?.status === 'REJECTED'
                    ? 'Resubmit School'
                    : 'Submit School for Review'}
              </Button>

              {districts.length === 0 && (
                <p className="text-xs text-gray-500">
                  No districts are available yet. Contact an administrator before submitting.
                </p>
              )}

            </section>

          )

        ) : error ? (

          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>

        ) : loading ? (

          <p className="text-center text-gray-400 py-10">
            Loading school profile…
          </p>

        ) : !school ? (

          <div className="text-center py-12">

            <p className="font-medium text-gray-300">
              School profile not found
            </p>

            <p className="text-sm text-gray-500 mt-2">
              The assigned school record is missing or not available.
            </p>

          </div>

        ) : (

          <>

            {/* =====================================
                SCHOOL INFORMATION
                TRANSPARENT BACKGROUND
                ===================================== */}

            <section className="w-full space-y-6">

              <div className="flex items-center justify-between gap-4 flex-wrap">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">

                    <Building2 className="w-6 h-6 text-fuchsia-400" />

                  </div>

                  <div className="min-w-0">

                    <div className="flex items-center gap-2 flex-wrap">

                      <h2 className="text-xl sm:text-2xl font-bold text-white">
                        {school.name || 'School name not provided'}
                      </h2>

                      {school.verificationStatus && (
                        <Badge
                          variant={
                            school.verificationStatus === 'VERIFIED'
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {school.verificationStatus}
                        </Badge>
                      )}

                    </div>

                    {school.schoolCode && (
                      <p className="font-mono text-xs text-gray-500 mt-1">
                        {school.schoolCode}
                      </p>
                    )}

                  </div>

                </div>

                <Button
                  size="sm"
                  icon={Edit3}
                  onClick={() => setEditOpen(true)}
                >
                  Edit Contact
                </Button>

              </div>


              {/* SCHOOL DETAILS */}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-5 gap-y-5 py-4">

                <ProfileItem
                  icon={MapPin}
                  label="Address"
                  value={school.address}
                />

                <ProfileItem
                  icon={Building2}
                  label="District ID"
                  value={school.districtId}
                />

                <ProfileItem
                  icon={Phone}
                  label="Phone"
                  value={school.phone}
                />

                <ProfileItem
                  icon={Mail}
                  label="Email"
                  value={school.email}
                />

                <ProfileItem
                  icon={Globe}
                  label="Website"
                  value={school.website}
                />

              </div>

            </section>


            {/* =====================================
                FOUR STATISTIC CARDS
                ===================================== */}

            <section className="space-y-4">

              <div className="flex items-center gap-2">

                <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_10px_#d946ef]" />

                <h3 className="text-xs font-bold tracking-[0.18em] text-fuchsia-300 uppercase">
                  At a Glance
                </h3>

              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                <CompactStat
                  title="My Teams"
                  value={stats.teams}
                  icon={Trophy}
                  color="purple"
                />

                <CompactStat
                  title="Students Registered"
                  value={stats.students}
                  icon={Users}
                  color="blue"
                />

                <CompactStat
                  title="Approved Teams"
                  value={stats.approved}
                  icon={CheckCircle2}
                  color="green"
                />

                <CompactStat
                  title="Fees Paid"
                  value={stats.feesPaid}
                  icon={CheckCircle2}
                  color="pink"
                />

              </div>

            </section>


            {/* =====================================
                COORDINATOR INFORMATION
                ===================================== */}

            {school.coordinatorsSummary &&
              school.coordinatorsSummary.length > 0 && (

                <section className="space-y-3 pt-2">

                  <h3 className="text-xs font-bold tracking-[0.18em] text-fuchsia-300 uppercase">
                    School Contact Summary
                  </h3>

                  <ul className="space-y-3">

                    {school.coordinatorsSummary.map((contact, index) => (
                      <li
                        key={`${contact}-${index}`}
                        className="flex items-center gap-3 text-sm text-gray-300"
                      >

                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />

                        {contact}

                      </li>
                    ))}

                  </ul>

                </section>

              )}


            {/* =====================================
                EDIT CONTACT MODAL
                ===================================== */}

            <Modal
              open={editOpen}
              onClose={() => setEditOpen(false)}
              title="Edit School Contact Details"
              footer={
                <>

                  <Button
                    variant="secondary"
                    onClick={() => setEditOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    icon={CheckCircle2}
                    onClick={() => void save()}
                    loading={saving}
                  >
                    Save Changes
                  </Button>

                </>
              }
            >

              <div className="space-y-4">

                <Input
                  label="Phone"
                  id="school-phone"
                  value={form.phone}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Email"
                  id="school-email"
                  type="email"
                  value={form.email}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Website"
                  id="school-website"
                  value={form.website}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Address"
                  id="school-address"
                  value={form.address}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />

                <p className="text-xs text-gray-500">
                  School name, district and verification status are not editable here.
                </p>

              </div>

            </Modal>

          </>

        )}

      </div>


      {/* =====================================
          ANIMATED BACKGROUND STYLES
          ===================================== */}

      <style jsx global>{`

        /* PAGE BACKGROUND */

        .school-profile-page {
          position: relative;
          min-height: 100vh;
          background: transparent !important;
          color: #fff;
          isolation: isolate;
        }

        .school-profile-page * {
          box-sizing: border-box;
        }


        /* BACKGROUND LAYER */

        .sp-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }


        /* GRID EFFECT */

        .sp-grid {
          position: absolute;
          inset: 0;
          opacity: .08;

          background-image:
            linear-gradient(
              rgba(168,85,247,.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(168,85,247,.12) 1px,
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

        .sp-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: .12;
        }

        .sp-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .sp-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .sp-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }


        /* INDIVIDUAL BUBBLES */

        .sp-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: sp-float linear infinite;
        }


        /* VIOLET BUBBLES */

        .sp-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168,85,247,.2),
              transparent 72%
            );
        }


        /* ROSE BUBBLES */

        .sp-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221,143,224,.16),
              transparent 72%
            );
        }


        /* FLOATING ANIMATION */

        @keyframes sp-float {

          0% {
            transform: translateY(0) scale(.8);
            opacity: 0;
          }

          12% {
            opacity: .5;
          }

          88% {
            opacity: .3;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }

        }


        /* MAIN CONTENT */

        .sp-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
        }


        /* REDUCED MOTION ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {

          .sp-bubble {
            animation: none;
          }

        }

      `}</style>

    </main>

  );
}


// ==========================================
// FOUR COMPACT STATISTIC CARDS
// ==========================================

function CompactStat({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {

  const colors: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-300',
    green: 'bg-emerald-500/15 text-emerald-300',
    blue: 'bg-blue-500/15 text-blue-300',
    pink: 'bg-pink-500/15 text-pink-300',
  };

  return (

    <div className="
      min-w-0
      rounded-2xl
      border border-purple-500/20
      bg-gradient-to-br from-[#29183D] to-[#160E20]
      p-4 sm:p-5
      transition-all duration-200
      hover:border-fuchsia-500/40
      hover:shadow-[0_0_20px_rgba(192,38,211,0.12)]
    ">

      <div className={`
        w-10 h-10 rounded-xl
        flex items-center justify-center
        ${colors[color] || colors.purple}
      `}>

        <Icon className="w-5 h-5" />

      </div>

      <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4">
        {value}
      </h3>

      <p className="text-sm text-gray-400 mt-1">
        {title}
      </p>

    </div>

  );

}


// ==========================================
// TRANSPARENT SCHOOL DETAIL ITEMS
// ==========================================

function ProfileItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
}) {

  return (

    <div className="min-w-0 flex items-start gap-2.5">

      <Icon className="w-4 h-4 text-fuchsia-400 flex-shrink-0 mt-1" />

      <div className="min-w-0 flex-1">

        <p className="text-xs text-gray-500">
          {label}
        </p>

        <p className="text-sm text-gray-200 mt-1 break-words">
          {value || 'Not provided'}
        </p>

      </div>

    </div>

  );

}
