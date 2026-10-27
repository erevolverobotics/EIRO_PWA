'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, CategoryBadge, Modal } from '@/components/ui';
import { Plus, Trash2, ChevronRight, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import type { CategoryCode, Season } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import toast from 'react-hot-toast';
import { getAll, getOne } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';

const CATEGORIES: CategoryCode[] = ['SUMO', 'MAZE', 'WALL', 'ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'];

interface Member { id: string; name: string; grade: string; section: string; }
interface CategoryRegistrationSettings {
  minTeam: number;
  maxTeam: number;
  feeAmount: number;
  hasFee: boolean;
  rounds: number;
}
type CategoryConfiguration = Partial<Record<CategoryCode, CategoryRegistrationSettings>>;
type SubmitRegistrationRequest = {
  seasonId: string;
  categoryCode: CategoryCode;
  teamName: string;
  projectTitle?: string;
  members: { name: string; grade: string; section?: string }[];
  state: 'DRAFT' | 'SUBMITTED';
};

export default function RegisterTeamPage() {
  const { user, roles } = useAuth();
  const router = useRouter();
  const schoolId = roles.find(r => r.role === 'SCHOOL_COORDINATOR' && r.active)?.scopeId;
  const [category, setCategory] = useState<CategoryCode | ''>('');
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [members, setMembers] = useState<Member[]>([{ id: '1', name: '', grade: '', section: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [seasons, setSeasons] = useState<(Season & { id: string })[]>([]);
  const [categoryConfiguration, setCategoryConfiguration] = useState<CategoryConfiguration | null>(null);
  const [seasonId, setSeasonId] = useState('');
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getAll<Season>('seasons'),
      getOne<CategoryConfiguration>('config', 'categories'),
    ])
      .then(([allSeasons, configuredCategories]) => {
        if (!active) return;
        const openSeasons = allSeasons.filter(season => season.phase === 'REGISTRATION_OPEN');
        setSeasons(openSeasons);
        setCategoryConfiguration(configuredCategories);
        if (openSeasons.length === 1) setSeasonId(openSeasons[0].id);
      })
      .catch(error => {
        console.error('Failed to load registration seasons', error);
        if (active) setLoadError('Unable to load open registration seasons. Please try again later.');
      })
      .finally(() => {
        if (active) setLoadingSeasons(false);
      });
    return () => { active = false; };
  }, []);

  const categorySettings = category ? categoryConfiguration?.[category] : undefined;
  const needsProject = ['ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'].includes(category);

  const registrationBlocker = loadingSeasons
    ? 'Registration settings are still loading.'
    : loadError
      ? 'Registration settings could not be loaded. Refresh the page and try again.'
      : !schoolId || schoolId === 'unassigned'
        ? 'Your coordinator account is not assigned to a school. Submit a school application and wait for approval before registering teams.'
        : seasons.length === 0
          ? 'There is no open registration season. Ask an administrator to open a season.'
          : !seasonId
            ? 'Select an open registration season before continuing.'
            : !category
              ? 'Select a competition category before continuing.'
              : !categorySettings
                ? 'This category has no saved registration settings. Ask an administrator to configure it.'
                : '';

  const addMember = () => {
    if (categorySettings && members.length < categorySettings.maxTeam) {
      setMembers(m => [...m, { id: Date.now().toString(), name: '', grade: '', section: '' }]);
    }
  };
  const removeMember = (id: string) => {
    if (members.length > 1) setMembers(m => m.filter(x => x.id !== id));
  };
  const updateMember = (id: string, field: keyof Member, value: string) => {
    setMembers(m => m.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Please select a category';
    if (category && !categorySettings) e.category = 'Registration settings are not available for this category';
    if (categorySettings && members.length < categorySettings.minTeam) {
      e.members = `At least ${categorySettings.minTeam} students are required`;
    }
    if (categorySettings && members.length > categorySettings.maxTeam) {
      e.members = `No more than ${categorySettings.maxTeam} students are allowed`;
    }
    if (!teamName.trim()) e.teamName = 'Team name is required';
    if (needsProject && !projectTitle.trim()) e.projectTitle = 'Project title is required for this category';
    members.forEach((m, i) => {
      if (!m.name.trim()) e[`name_${i}`] = 'Student name required';
      if (!m.grade.trim()) e[`grade_${i}`] = 'Grade required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (registrationBlocker) {
      toast.error(registrationBlocker);
      return;
    }
    if (!validate()) { toast.error('Please fix the errors before submitting'); return; }
    setConfirmOpen(true);
  };

  const handleSaveDraft = () => {
    if (registrationBlocker) {
      toast.error(registrationBlocker);
      return;
    }
    if (validate()) void saveRegistration('DRAFT');
  };

  const saveRegistration = async (state: 'DRAFT' | 'SUBMITTED') => {
    if (!user) {
      toast.error('Sign in before saving a registration.');
      return;
    }
    if (!schoolId || schoolId === 'unassigned') {
      toast.error('Your account is not assigned to a school. Contact an administrator.');
      return;
    }
    if (!seasonId) {
      toast.error('Select an open registration season before saving.');
      return;
    }
    if (!category) {
      toast.error('Select a category before saving.');
      return;
    }
    if (!categorySettings) {
      toast.error('This category is not configured yet. Contact an administrator.');
      return;
    }
    setSaving(true);
    try {
      const request: SubmitRegistrationRequest = {
        seasonId,
        categoryCode: category,
        teamName: teamName.trim(),
        ...(projectTitle.trim() ? { projectTitle: projectTitle.trim() } : {}),
        members: members.map(member => ({
          name: member.name.trim(),
          grade: member.grade,
          ...(member.section.trim() ? { section: member.section.trim() } : {}),
        })),
        state,
      };
      await callEiroFunction<SubmitRegistrationRequest, { teamId: string; registrationId: string }>(
        'submitRegistration',
        request
      );
      toast.success(state === 'DRAFT' ? 'Draft saved.' : 'Registration submitted for review.');
      if (state === 'SUBMITTED') setSubmitted(true);
    } catch (error) {
      console.error('Failed to save team registration', error);
      const message = error instanceof FirebaseError && error.code === 'functions/failed-precondition'
        ? error.message
        : error instanceof FirebaseError && error.code === 'functions/permission-denied'
          ? 'Your account does not have an active school coordinator assignment for this school. Ask an administrator to check your school assignment.'
          : error instanceof FirebaseError && error.code === 'functions/internal'
            ? 'The registration service failed while checking or saving team data. Ask an administrator to check the latest submitRegistration function logs.'
            : error instanceof Error
              ? error.message
              : 'Registration could not be saved. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    await saveRegistration('SUBMITTED');
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Team Submitted!</h2>
          <p className="text-gray-400 mb-2">Your registration was submitted and is awaiting review.</p>
          <p className="text-sm text-gray-500 mb-6">You&apos;ll be notified once it&apos;s approved or if corrections are needed.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setSubmitted(false)}>Register Another</Button>
            <Button onClick={() => router.push('/coordinator/registrations')}>View Registrations</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <PageHeader title="Register Team" subtitle="S05 — Add a new team manually" />

      <Card>
        <label htmlFor="registration-season" className="block text-sm font-medium text-gray-300 mb-2">Registration season</label>
        {loadingSeasons ? (
          <p className="text-sm text-gray-500">Loading open seasons…</p>
        ) : loadError ? (
          <p className="text-sm text-red-400">{loadError}</p>
        ) : seasons.length === 0 ? (
          <p className="text-sm text-gray-500">There are no open registration seasons.</p>
        ) : seasons.length === 1 ? (
          <p className="text-sm text-white">{seasons[0].name}</p>
        ) : (
          <select id="registration-season" className="eiro-input" value={seasonId} onChange={e => setSeasonId(e.target.value)}>
            <option value="">Select a season</option>
            {seasons.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
        )}
        {(!schoolId || schoolId === 'unassigned') && (
          <p className="text-sm text-amber-400 mt-3">Your coordinator account has not been assigned to a school. Contact an administrator before registering a team.</p>
        )}
        {category && !loadingSeasons && !loadError && !categoryConfiguration?.[category] && (
          <p className="text-sm text-amber-400 mt-3">This category has no saved registration configuration. Contact an administrator.</p>
        )}
      </Card>

      {/* Category Selection */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Select Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setErrors(e => ({ ...e, category: '' })); }}
              className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                category === c
                  ? 'border-indigo-500 bg-indigo-600/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-indigo-500/40 hover:text-white'
              }`}
            >
              <div className="text-sm font-semibold mb-0.5">{CATEGORY_LABELS[c]}</div>
              <div className="text-[10px] font-mono text-gray-600">{c}</div>
            </button>
          ))}
        </div>
        {errors.category && <p className="text-xs text-red-400 mt-2">{errors.category}</p>}
      </Card>

      {/* Team Details */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          Team Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Team Name *</label>
            <input type="text" className={`eiro-input ${errors.teamName ? 'border-red-500/60' : ''}`}
              placeholder="Enter team name" value={teamName} onChange={e => { setTeamName(e.target.value); setErrors(ex => ({ ...ex, teamName: '' })); }} />
            {errors.teamName && <p className="text-xs text-red-400 mt-1">{errors.teamName}</p>}
          </div>

          {needsProject && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Title *</label>
              <input type="text" className={`eiro-input ${errors.projectTitle ? 'border-red-500/60' : ''}`}
                placeholder="Enter project title" value={projectTitle}
                onChange={e => { setProjectTitle(e.target.value); setErrors(ex => ({ ...ex, projectTitle: '' })); }} />
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
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={categorySettings && members.length >= categorySettings.minTeam ? 'success' : 'danger'}>
              {members.length} student{members.length !== 1 ? 's' : ''}
              {categorySettings ? ` (min ${categorySettings.minTeam}, max ${categorySettings.maxTeam})` : ''}
            </Badge>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addMember}
              disabled={!categorySettings || members.length >= categorySettings.maxTeam}>Add</Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Minimum and maximum team sizes are configured per category. Check Category Directory for limits.
        </p>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Student {i + 1}
                </span>
                {members.length > 1 && (
                  <button onClick={() => removeMember(m.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <input
                    className={`eiro-input text-sm ${errors[`name_${i}`] ? 'border-red-500/60' : ''}`}
                    placeholder="Full name"
                    value={m.name}
                    onChange={e => { updateMember(m.id, 'name', e.target.value); setErrors(ex => ({ ...ex, [`name_${i}`]: '' })); }}
                  />
                  {errors[`name_${i}`] && <p className="text-xs text-red-400 mt-1">{errors[`name_${i}`]}</p>}
                </div>
                <div>
                  <select
                    className={`eiro-input text-sm ${errors[`grade_${i}`] ? 'border-red-500/60' : ''}`}
                    value={m.grade}
                    onChange={e => { updateMember(m.id, 'grade', e.target.value); setErrors(ex => ({ ...ex, [`grade_${i}`]: '' })); }}
                  >
                    <option value="">Grade</option>
                    {['6','7','8','9','10','11','12'].map(g => <option key={g} value={g} className="bg-gray-900">Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <input className="eiro-input text-sm" placeholder="Section" value={m.section}
                    onChange={e => updateMember(m.id, 'section', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.members && <p className="text-xs text-red-400 mt-2">{errors.members}</p>}
      </Card>

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-4">
        <Button variant="secondary" disabled={saving} onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <Button icon={ChevronRight} iconPosition="right" disabled={saving} onClick={handleSubmit}>
          {saving ? 'Saving…' : 'Review & Submit'}
        </Button>
      </div>
      {registrationBlocker && (
        <p role="status" className="pb-4 text-right text-sm text-amber-400">
          {registrationBlocker}
        </p>
      )}

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Registration"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button icon={CheckCircle2} disabled={saving} onClick={handleConfirm}>Submit Registration</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-gray-400">Category</span>
              {category && <CategoryBadge code={category as CategoryCode} />}
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-gray-400">Team Name</span>
              <span className="text-white font-medium">{teamName}</span>
            </div>
            {needsProject && (
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-gray-400">Project</span>
                <span className="text-white font-medium">{projectTitle}</span>
              </div>
            )}
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-400">Students</span>
              <span className="text-white font-medium">{members.filter(m => m.name).length}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">After submission, an admin will review your registration. If a fee is required, payment instructions will be shown in the Fee Status page.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
