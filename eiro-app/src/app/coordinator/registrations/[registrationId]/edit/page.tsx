'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, Card, Button, CategoryBadge, Modal } from '@/components/ui';
import { Plus, Trash2, ChevronRight, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import toast from 'react-hot-toast';
import { getOne, queryByField } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { FirebaseError } from 'firebase/app';
import { callEiroFunction } from '@/lib/firebase/functions';

const CATEGORIES: CategoryCode[] = ['SUMO', 'MAZE', 'WALL', 'ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'];

interface Member { id: string; name: string; grade: string; section: string; }
interface CategorySettings { minTeam: number; maxTeam: number; feeAmount: number; hasFee: boolean; rounds: number; }
type CategoryConfiguration = Partial<Record<CategoryCode, CategorySettings>>;

// Inner component uses useParams — must be inside <Suspense>
function EditRegistrationContent() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const schoolId = roles.find(r => r.role === 'SCHOOL_COORDINATOR' && r.active)?.scopeId;

  // Pre-filled state
  const [loadingData, setLoadingData]   = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [teamName, setTeamName]         = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [category, setCategory]         = useState<CategoryCode | ''>('');
  const [members, setMembers]           = useState<Member[]>([]);
  const [categoryConfiguration, setCategoryConfiguration] = useState<CategoryConfiguration | null>(null);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [submitted, setSubmitted]       = useState(false);

  // ── Load existing registration data ─────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!registrationId) {
      setLoadError('Registration ID is missing.');
      setLoadingData(false);
      return;
    }
    if (!user) {
      setLoadError('Sign in to view this registration.');
      setLoadingData(false);
      return;
    }
    if (!schoolId || schoolId === 'unassigned') {
      setLoadError('Your coordinator account is not linked to a school.');
      setLoadingData(false);
      return;
    }
    let active = true;
    setLoadError('');
    setLoadingData(true);

    async function load() {
      try {
        // Mirror exactly what the working registrations list page does:
        // queryByField('registrations', 'schoolId', schoolId) — this works for coordinators
        const [allRegistrations, allTeams, allStudents, catConfig] = await Promise.all([
          queryByField<{ teamId: string; schoolId: string; seasonId: string; categoryCode: string; state: string; correctionNote?: string; correctionReason?: string; projectTitle?: string }>(
            'registrations', 'schoolId', schoolId
          ),
          queryByField<{ teamName?: string; projectTitle?: string; displayTeamCode?: string; schoolId?: string }>(
            'teams', 'schoolId', schoolId
          ),
          queryByField<{ name?: string; studentName?: string; fullName?: string; grade?: string; class?: string; section?: string; teamId?: string }>(
            'students', 'schoolId', schoolId
          ),
          getOne<CategoryConfiguration>('config', 'categories').catch(() => null),
        ]);

        const reg = allRegistrations.find(r => r.id === registrationId);
        if (!reg) throw new Error('Registration not found. You may not have access to this registration.');

        if (reg.state !== 'CORRECTION_REQUIRED') {
          if (active) setLoadError('This registration is not in "Correction Required" state and cannot be edited.');
          return;
        }

        const team = allTeams.find(t => t.id === reg.teamId) ?? {};
        const studentDocs = allStudents.filter(s => s.teamId === reg.teamId);

        const loadedMembers: Member[] = studentDocs.map((s, i) => ({
          id: String(i + 1),
          name: (s.name ?? s.studentName ?? s.fullName ?? '') as string,
          grade: (s.grade ?? s.class ?? '') as string,
          section: (s.section ?? '') as string,
        }));

        if (!active) return;
        setCategory((reg.categoryCode ?? '') as CategoryCode);
        setTeamName(((team as any).teamName ?? '') as string);
        setProjectTitle(((team as any).projectTitle ?? reg.projectTitle ?? '') as string);
        setMembers(loadedMembers.length > 0 ? loadedMembers : [{ id: '1', name: '', grade: '', section: '' }]);
        setCategoryConfiguration(catConfig);
        setCorrectionNote(reg.correctionNote ?? reg.correctionReason ?? '');
      } catch (e) {
        console.error(e);
        if (active) setLoadError(e instanceof Error ? e.message : 'Failed to load registration.');
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [authLoading, registrationId, schoolId, user]);

  const categorySettings = category ? categoryConfiguration?.[category] : undefined;
  const needsProject = ['ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'].includes(category);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (categorySettings && members.length < categorySettings.minTeam)
      e.members = `At least ${categorySettings.minTeam} students are required`;
    if (categorySettings && members.length > categorySettings.maxTeam)
      e.members = `No more than ${categorySettings.maxTeam} students are allowed`;
    if (needsProject && !projectTitle.trim())
      e.projectTitle = 'Project title is required for this category';
    members.forEach((m, i) => {
      if (!m.name.trim()) e[`name_${i}`] = 'Student name required';
      if (!m.grade.trim()) e[`grade_${i}`] = 'Grade required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addMember = () => {
    if (categorySettings && members.length < categorySettings.maxTeam)
      setMembers(m => [...m, { id: Date.now().toString(), name: '', grade: '', section: '' }]);
  };
  const removeMember = (id: string) => {
    if (members.length > 1) setMembers(m => m.filter(x => x.id !== id));
  };
  const updateMember = (id: string, field: keyof Member, value: string) =>
    setMembers(m => m.map(x => x.id === id ? { ...x, [field]: value } : x));

  // ── Submit correction ─────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validate()) { toast.error('Please fix the errors before resubmitting.'); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (!user) { toast.error('You must be signed in.'); return; }
    setSaving(true);
    try {
      await callEiroFunction<
        {
          registrationId: string;
          teamName: string;
          projectTitle: string;
          members: Array<{ name: string; grade: string; section: string }>;
        },
        { registrationId: string; state: string }
      >('resubmitRegistration', {
        registrationId,
        teamName: teamName.trim(),
        projectTitle: projectTitle.trim(),
        members: members.map(({ name, grade, section }) => ({
          name: name.trim(),
          grade: grade.trim(),
          section: section.trim(),
        })),
      });
      toast.success('Correction submitted for admin review! ✅');
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      const message = error instanceof FirebaseError ? error.message
        : error instanceof Error ? error.message
        : 'Could not submit correction. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loadingData) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  if (loadError) return (
    <div className="max-w-xl mx-auto">
      <Card className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-300 font-medium mb-4">{loadError}</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push('/coordinator/registrations')}>
          Back to Registrations
        </Button>
      </Card>
    </div>
  );

  if (submitted) return (
    <div className="max-w-xl mx-auto">
      <Card className="text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Correction Submitted!</h2>
        <p className="text-gray-400 mb-6">Your updated registration is now back with the admin for review.</p>
        <Button onClick={() => router.push('/coordinator/registrations')}>View Registrations</Button>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl mx-auto">
      <PageHeader
        title="Edit Registration"
        subtitle="Make the requested corrections and resubmit for admin review"
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push('/coordinator/registrations')}>
            Back
          </Button>
        }
      />

      {/* Correction note from admin */}
      {correctionNote && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wider">Admin's Correction Note</p>
            <p className="text-sm text-amber-200">{correctionNote}</p>
          </div>
        </div>
      )}

      {/* Category (read-only — cannot change category after submission) */}
      <Card>
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Category
        </h3>
        <div className="flex items-center gap-3">
          {category && <CategoryBadge code={category as CategoryCode} />}
          <span className="text-xs text-gray-500">(Category cannot be changed after submission)</span>
        </div>
      </Card>

      {/* Team details */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          Team Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Team Name
              <span className="ml-2 text-xs text-gray-500 font-normal">(optional — team ID used if blank)</span>
            </label>
            <input
              type="text"
              className="eiro-input w-full"
              placeholder="e.g. Robo Warriors"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
            />
          </div>
          {needsProject && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Title *</label>
              <input
                type="text"
                className={`eiro-input w-full ${errors.projectTitle ? 'border-red-500/60' : ''}`}
                placeholder="Enter project title"
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
              />
              {errors.projectTitle && <p className="text-xs text-red-400 mt-1">{errors.projectTitle}</p>}
            </div>
          )}
        </div>
      </Card>

      {/* Members */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Team Members
            {categorySettings && (
              <span className="text-xs text-gray-500 font-normal ml-1">
                ({categorySettings.minTeam}–{categorySettings.maxTeam} students)
              </span>
            )}
          </h3>
          <Button size="sm" icon={Plus} variant="secondary" onClick={addMember}
            disabled={!categorySettings || members.length >= categorySettings.maxTeam}>
            Add Student
          </Button>
        </div>

        {errors.members && (
          <p className="text-xs text-red-400 mb-3">{errors.members}</p>
        )}

        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Student {i + 1}</span>
                {members.length > 1 && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <input
                    type="text"
                    placeholder="Full name *"
                    value={m.name}
                    onChange={e => updateMember(m.id, 'name', e.target.value)}
                    className={`eiro-input w-full ${errors[`name_${i}`] ? 'border-red-500/60' : ''}`}
                  />
                  {errors[`name_${i}`] && <p className="text-xs text-red-400 mt-1">{errors[`name_${i}`]}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Grade *"
                    value={m.grade}
                    onChange={e => updateMember(m.id, 'grade', e.target.value)}
                    className={`eiro-input w-full ${errors[`grade_${i}`] ? 'border-red-500/60' : ''}`}
                  />
                  {errors[`grade_${i}`] && <p className="text-xs text-red-400 mt-1">{errors[`grade_${i}`]}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Section"
                    value={m.section}
                    onChange={e => updateMember(m.id, 'section', e.target.value)}
                    className="eiro-input w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submit button */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="secondary" onClick={() => router.push('/coordinator/registrations')}>Cancel</Button>
        <Button icon={saving ? Loader2 : ChevronRight} iconPosition="right" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Submitting…' : 'Resubmit for Review'}
        </Button>
      </div>

      {/* Confirm modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Resubmission"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleConfirm} disabled={saving}>
              {saving ? 'Submitting…' : 'Yes, Resubmit'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-300">
          <p>You are about to resubmit this registration for admin review.</p>
          <p>The registration status will go back to <strong className="text-white">Under Review</strong> and the admin will be notified.</p>
          {correctionNote && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Make sure you have addressed the admin's note: <em>"{correctionNote}"</em>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Default export wraps in Suspense so useParams() doesn't block prerendering
export default function EditRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    }>
      <EditRegistrationContent />
    </Suspense>
  );
}
