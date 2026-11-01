
'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  CategoryBadge,
  Modal,
} from '@/components/ui';

import {
  Plus,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

import type { CategoryCode, Season } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

import toast from 'react-hot-toast';

import { getAll, getOne } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import { useAuth } from '@/lib/firebase/auth-context';

import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';


/* =========================================
   CATEGORIES
========================================= */

const CATEGORIES: CategoryCode[] = [
  'SUMO',
  'MAZE',
  'WALL',
  'ECO_CITY',
  'NEXTGEN_FACTORY',
  'INNOVATOR_JUNIOR',
  'INNOVATOR_SENIOR',
];


/* =========================================
   TYPES
========================================= */

interface Member {
  id: string;
  name: string;
  grade: string;
  section: string;
}

interface CategoryRegistrationSettings {
  minTeam: number;
  maxTeam: number;
  feeAmount: number;
  hasFee: boolean;
  rounds: number;
}

type CategoryConfiguration =
  Partial<Record<CategoryCode, CategoryRegistrationSettings>>;

type SubmitRegistrationRequest = {
  seasonId: string;
  categoryCode: CategoryCode;
  teamName: string;
  projectTitle?: string;
  members: {
    name: string;
    grade: string;
    section?: string;
  }[];
  state: 'DRAFT' | 'SUBMITTED';
};


/* =========================================
   FLOATING BUBBLES
========================================= */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];


/* =========================================
   REGISTER TEAM PAGE
========================================= */

export default function RegisterTeamPage() {
  const { user, roles } = useAuth();
  const router = useRouter();

  const schoolId = roles.find(
    r => r.role === 'SCHOOL_COORDINATOR' && r.active
  )?.scopeId;

  const [category, setCategory] = useState<CategoryCode | ''>('');
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');

  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: '', grade: '', section: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [seasons, setSeasons] = useState<(Season & { id: string })[]>([]);

  const [categoryConfiguration, setCategoryConfiguration] =
    useState<CategoryConfiguration | null>(null);

  const [seasonId, setSeasonId] = useState('');

  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');


  /* =========================================
     LOAD SEASONS AND CONFIGURATION
     FIREBASE LOGIC UNCHANGED
  ========================================= */

  useEffect(() => {
    let active = true;

    Promise.all([
      getAll<Season>('seasons'),
      getOne<CategoryConfiguration>('config', 'categories'),
    ])
      .then(([allSeasons, configuredCategories]) => {
        if (!active) return;

        const openSeasons = allSeasons.filter(
          season => season.phase === 'REGISTRATION_OPEN'
        );

        setSeasons(openSeasons);
        setCategoryConfiguration(configuredCategories);

        if (openSeasons.length === 1) {
          setSeasonId(openSeasons[0].id);
        }
      })
      .catch(error => {
        console.error('Failed to load registration seasons', error);

        if (active) {
          setLoadError(
            'Unable to load open registration seasons. Please try again later.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSeasons(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);


  /* =========================================
     CATEGORY SETTINGS
  ========================================= */

  const categorySettings = category
    ? categoryConfiguration?.[category]
    : undefined;

  const needsProject = [
    'ECO_CITY',
    'NEXTGEN_FACTORY',
    'INNOVATOR_JUNIOR',
    'INNOVATOR_SENIOR',
  ].includes(category);


  /* =========================================
     REGISTRATION BLOCKER
  ========================================= */

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


  /* =========================================
     MEMBER FUNCTIONS
  ========================================= */

  const addMember = () => {
    if (
      categorySettings &&
      members.length < categorySettings.maxTeam
    ) {
      setMembers(m => [
        ...m,
        {
          id: Date.now().toString(),
          name: '',
          grade: '',
          section: '',
        },
      ]);
    }
  };

  const removeMember = (id: string) => {
    if (members.length > 1) {
      setMembers(m => m.filter(x => x.id !== id));
    }
  };

  const updateMember = (
    id: string,
    field: keyof Member,
    value: string
  ) => {
    setMembers(m =>
      m.map(x =>
        x.id === id
          ? { ...x, [field]: value }
          : x
      )
    );
  };


  /* =========================================
     VALIDATION
  ========================================= */

  const validate = () => {
    const e: Record<string, string> = {};

    if (!category) {
      e.category = 'Please select a category';
    }

    if (category && !categorySettings) {
      e.category = 'Registration settings are not available for this category';
    }

    if (
      categorySettings &&
      members.length < categorySettings.minTeam
    ) {
      e.members = `At least ${categorySettings.minTeam} students are required`;
    }

    if (
      categorySettings &&
      members.length > categorySettings.maxTeam
    ) {
      e.members = `No more than ${categorySettings.maxTeam} students are allowed`;
    }

    if (needsProject && !projectTitle.trim()) {
      e.projectTitle = 'Project title is required for this category';
    }

    members.forEach((m, i) => {
      if (!m.name.trim()) {
        e[`name_${i}`] = 'Student name required';
      }

      if (!m.grade.trim()) {
        e[`grade_${i}`] = 'Grade required';
      }
    });

    setErrors(e);

    return Object.keys(e).length === 0;
  };


  /* =========================================
     SUBMIT HANDLERS
  ========================================= */

  const handleSubmit = () => {
    if (registrationBlocker) {
      toast.error(registrationBlocker);
      return;
    }

    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setConfirmOpen(true);
  };

  const handleSaveDraft = () => {
    if (registrationBlocker) {
      toast.error(registrationBlocker);
      return;
    }

    if (validate()) {
      void saveRegistration('DRAFT');
    }
  };


  /* =========================================
     SAVE REGISTRATION
     CLOUD FUNCTION UNCHANGED
  ========================================= */

  const saveRegistration = async (
    state: 'DRAFT' | 'SUBMITTED'
  ) => {
    if (!user) {
      toast.error('Sign in before saving a registration.');
      return;
    }

    if (!schoolId || schoolId === 'unassigned') {
      toast.error(
        'Your account is not assigned to a school. Contact an administrator.'
      );
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
      toast.error(
        'This category is not configured yet. Contact an administrator.'
      );
      return;
    }

    setSaving(true);

    try {
      const request: SubmitRegistrationRequest = {
        seasonId,
        categoryCode: category,
        teamName: teamName.trim() || '',

        ...(projectTitle.trim()
          ? { projectTitle: projectTitle.trim() }
          : {}),

        members: members.map(member => ({
          name: member.name.trim(),
          grade: member.grade,

          ...(member.section.trim()
            ? { section: member.section.trim() }
            : {}),
        })),

        state,
      };

      await callEiroFunction<
        SubmitRegistrationRequest,
        { teamId: string; registrationId: string }
      >(
        'submitRegistration',
        request
      );

      toast.success(
        state === 'DRAFT'
          ? 'Draft saved.'
          : 'Registration submitted for review.'
      );

      if (state === 'SUBMITTED') {
        setSubmitted(true);
      }

    } catch (error) {
      console.error('Failed to save team registration', error);

      const message =
        error instanceof FirebaseError &&
        error.code === 'functions/failed-precondition'
          ? error.message

          : error instanceof FirebaseError &&
            error.code === 'functions/permission-denied'
            ? 'Your account does not have an active school coordinator assignment for this school. Ask an administrator to check your school assignment.'

            : error instanceof FirebaseError &&
              error.code === 'functions/internal'
              ? 'The registration service failed while checking or saving team data. Ask an administrator to check the latest submitRegistration function logs.'

              : error instanceof Error
                ? error.message

                : 'Registration could not be saved. Please try again.';

      toast.error(message);

    } finally {
      setSaving(false);
    }
  };


  /* =========================================
     CONFIRM REGISTRATION
  ========================================= */

  const handleConfirm = async () => {
    setConfirmOpen(false);
    await saveRegistration('SUBMITTED');
  };


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="register-team-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND */}

      <div className="rt-ambient" aria-hidden="true">
        <div className="rt-grid" />

        <div className="rt-orb rt-orb-one" />

        <div className="rt-orb rt-orb-two" />

        <div className="rt-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`rt-bubble ${bubble.tone}`}
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


      {/* FULL-WIDTH PAGE CONTENT */}

      <div className="rt-content relative z-10 w-full max-w-none space-y-6">

        {submitted ? (

          /* SUCCESS MESSAGE */

          <Card className="rt-glass-card text-center py-12">

            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-400" />

            <h2 className="mb-2 text-2xl font-bold text-white">
              Team Submitted!
            </h2>

            <p className="mb-2 text-gray-300">
              Your registration was submitted and is awaiting review.
            </p>

            <p className="mb-6 text-sm text-gray-400">
              You&apos;ll be notified once it&apos;s approved or if corrections are needed.
            </p>

            <div className="flex justify-center gap-3">

              <Button
                variant="secondary"
                onClick={() => setSubmitted(false)}
              >
                Register Another
              </Button>

              <Button
                onClick={() => router.push('/coordinator/registrations')}
              >
                View Registrations
              </Button>

            </div>

          </Card>

        ) : (

          <>

            {/* HEADER */}

            <PageHeader
              title="Register Team"
              subtitle="S05 — Add a new team manually"
            />


            {/* REGISTRATION SEASON */}

            <Card className="rt-glass-card">

              <label
                htmlFor="registration-season"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Registration season
              </label>

              {loadingSeasons ? (

                <p className="text-sm text-gray-400">
                  Loading open seasons…
                </p>

              ) : loadError ? (

                <p className="text-sm text-red-400">
                  {loadError}
                </p>

              ) : seasons.length === 0 ? (

                <p className="text-sm text-gray-400">
                  There are no open registration seasons.
                </p>

              ) : seasons.length === 1 ? (

                <p className="text-sm text-white">
                  {seasons[0].name}
                </p>

              ) : (

                <select
                  id="registration-season"
                  className="eiro-input"
                  value={seasonId}
                  onChange={e => setSeasonId(e.target.value)}
                >
                  <option value="">Select a season</option>

                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}

                </select>

              )}

              {(!schoolId || schoolId === 'unassigned') && (
                <p className="mt-3 text-sm text-amber-400">
                  Your coordinator account has not been assigned to a school.
                  Contact an administrator before registering a team.
                </p>
              )}

              {category &&
                !loadingSeasons &&
                !loadError &&
                !categoryConfiguration?.[category] && (
                  <p className="mt-3 text-sm text-amber-400">
                    This category has no saved registration configuration.
                    Contact an administrator.
                  </p>
                )}

            </Card>


            {/* CATEGORY SELECTION */}

            <Card className="rt-glass-card">

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>

                Select Category

              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {CATEGORIES.map(c => (

                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setErrors(e => ({ ...e, category: '' }));
                    }}
                    className={`rt-category-option rounded-xl border p-4 text-left transition-all duration-200 ${
                      category === c
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-indigo-500/40 hover:text-white'
                    }`}
                  >

                    <div className="mb-0.5 text-sm font-semibold">
                      {CATEGORY_LABELS[c]}
                    </div>

                    <div className="font-mono text-[10px] text-gray-400">
                      {c}
                    </div>

                  </button>

                ))}

              </div>

              {errors.category && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.category}
                </p>
              )}

            </Card>
            
            
            {/* CATEGORY SELECTION */}

            <Card className="rt-glass-card">

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                Select Category
              </h3>

              <div
                role="radiogroup"
                aria-label="Select competition category"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {CATEGORIES.map(c => (
                  <label
                    key={c}
                    className={`rt-category-option flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                      category === c
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-indigo-500/40 hover:text-white'
                    }`}
                  >

                    <input
                      type="radio"
                      name="competition-category"
                      value={c}
                      checked={category === c}
                      onChange={() => {
                        setCategory(c);
                        setErrors(e => ({ ...e, category: '' }));
                      }}
                      className="rt-radio"
                    />

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {CATEGORY_LABELS[c]}
                      </span>

                      <span className="block font-mono text-[10px] text-gray-400">
                        {c}
                      </span>
                    </span>

                  </label>
                ))}
              </div>

              {errors.category && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.category}
                </p>
              )}

            </Card>


            {/* TEAM DETAILS */}

            <Card className="rt-glass-card">

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </span>

                Team Details

              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-300">

                    Team Name

                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (optional — team ID used if blank)
                    </span>

                  </label>

                  <input
                    type="text"
                    className="eiro-input"
                    placeholder="e.g. Robo Warriors (leave blank to use auto ID)"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                  />

                </div>

                {needsProject && (

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      Project Title *
                    </label>

                    <input
                      type="text"
                      className={`eiro-input ${
                        errors.projectTitle ? 'border-red-500/60' : ''
                      }`}
                      placeholder="Enter project title"
                      value={projectTitle}
                      onChange={e => {
                        setProjectTitle(e.target.value);
                        setErrors(ex => ({
                          ...ex,
                          projectTitle: '',
                        }));
                      }}
                    />

                    {errors.projectTitle && (
                      <p className="mt-1 text-xs text-red-400">
                        {errors.projectTitle}
                      </p>
                    )}

                  </div>

                )}

              </div>

            </Card>


            {/* TEAM MEMBERS */}

            <Card className="rt-glass-card">

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

                <h3 className="flex items-center gap-2 font-semibold text-white">

                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    3
                  </span>

                  Team Members

                </h3>

                <div className="flex items-center gap-2">

                  <Badge
                    variant={
                      categorySettings &&
                      members.length >= categorySettings.minTeam
                        ? 'success'
                        : 'danger'
                    }
                  >
                    {members.length} student
                    {members.length !== 1 ? 's' : ''}

                    {categorySettings
                      ? ` (min ${categorySettings.minTeam}, max ${categorySettings.maxTeam})`
                      : ''}
                  </Badge>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={addMember}
                    disabled={
                      !categorySettings ||
                      members.length >= categorySettings.maxTeam
                    }
                  >
                    Add
                  </Button>

                </div>

              </div>

              <p className="mb-4 flex items-center gap-1 text-xs text-gray-400">

                <AlertCircle className="h-3 w-3" />

                Minimum and maximum team sizes are configured per category.
                Check Category Directory for limits.

              </p>


              {/* MEMBER LIST */}

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">

                {members.map((m, i) => (

                  <div
                    key={m.id}
                    className="rt-member-card rounded-xl border p-4"
                  >

                    <div className="mb-3 flex items-center justify-between">

                      <span className="flex items-center gap-1 text-xs font-medium text-gray-300">

                        <Users className="h-3 w-3" />

                        Student {i + 1}

                      </span>

                      {members.length > 1 && (

                        <button
                          onClick={() => removeMember(m.id)}
                          className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                      )}

                    </div>


                    <div className="grid grid-cols-3 gap-3">

                      <div className="col-span-3 sm:col-span-1">

                        <input
                          className={`eiro-input text-sm ${
                            errors[`name_${i}`]
                              ? 'border-red-500/60'
                              : ''
                          }`}
                          placeholder="Full name"
                          value={m.name}
                          onChange={e => {
                            updateMember(m.id, 'name', e.target.value);

                            setErrors(ex => ({
                              ...ex,
                              [`name_${i}`]: '',
                            }));
                          }}
                        />

                        {errors[`name_${i}`] && (
                          <p className="mt-1 text-xs text-red-400">
                            {errors[`name_${i}`]}
                          </p>
                        )}

                      </div>


                      <div>

                        <select
                          className={`eiro-input text-sm ${
                            errors[`grade_${i}`]
                              ? 'border-red-500/60'
                              : ''
                          }`}
                          value={m.grade}
                          onChange={e => {
                            updateMember(m.id, 'grade', e.target.value);

                            setErrors(ex => ({
                              ...ex,
                              [`grade_${i}`]: '',
                            }));
                          }}
                        >

                          <option value="">Grade</option>

                          {['6', '7', '8', '9', '10', '11', '12'].map(g => (
                            <option
                              key={g}
                              value={g}
                              className="bg-gray-900"
                            >
                              Grade {g}
                            </option>
                          ))}

                        </select>

                      </div>


                      <div>

                        <input
                          className="eiro-input text-sm"
                          placeholder="Section"
                          value={m.section}
                          onChange={e =>
                            updateMember(m.id, 'section', e.target.value)
                          }
                        />

                      </div>

                    </div>

                  </div>

                ))}

              </div>

              {errors.members && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.members}
                </p>
              )}

            </Card>


            {/* SUBMIT BUTTONS */}

            <div className="flex justify-end gap-3 pb-4">

              <Button
                variant="secondary"
                disabled={saving}
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>

              <Button
                icon={ChevronRight}
                iconPosition="right"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? 'Saving…' : 'Review & Submit'}
              </Button>

            </div>

            {registrationBlocker && (

              <p
                role="status"
                className="pb-4 text-right text-sm text-amber-400"
              >
                {registrationBlocker}
              </p>

            )}

          </>

        )}

      </div>


      {/* CONFIRMATION MODAL */}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Registration"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Back
            </Button>

            <Button
              icon={CheckCircle2}
              disabled={saving}
              onClick={handleConfirm}
            >
              Submit Registration
            </Button>
          </>
        }
      >

        <div className="space-y-4">

          <div className="space-y-2">

            <div className="flex justify-between border-b border-white/10 py-2 text-sm">

              <span className="text-gray-400">
                Category
              </span>

              {category && (
                <CategoryBadge code={category as CategoryCode} />
              )}

            </div>


            <div className="flex justify-between border-b border-white/10 py-2 text-sm">

              <span className="text-gray-400">
                Team Name
              </span>

              <span className="font-medium text-white">
                {teamName}
              </span>

            </div>


            {needsProject && (

              <div className="flex justify-between border-b border-white/10 py-2 text-sm">

                <span className="text-gray-400">
                  Project
                </span>

                <span className="font-medium text-white">
                  {projectTitle}
                </span>

              </div>

            )}


            <div className="flex justify-between py-2 text-sm">

              <span className="text-gray-400">
                Students
              </span>

              <span className="font-medium text-white">
                {members.filter(m => m.name).length}
              </span>

            </div>

          </div>


          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">

            <p className="text-xs text-blue-400">
              After submission, an admin will review your registration.
              If a fee is required, payment instructions will be shown
              in the Fee Status page.
            </p>

          </div>

        </div>

      </Modal>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .register-team-page {
          position: relative;
          isolation: isolate;

          width: 100%;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .register-team-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .rt-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .rt-grid {
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

        .rt-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .rt-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .rt-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* FLOATING BUBBLES */

        .rt-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }

        .rt-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: rt-float linear infinite;
        }

        .rt-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .rt-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes rt-float {
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


        /* FULL-WIDTH CONTENT */

        .rt-content {
          position: relative;
          z-index: 10;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* ALL MAIN CARDS - GLASS EFFECT */

        .register-team-page .rt-glass-card {
          width: 100%;

          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18) !important;

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .register-team-page .rt-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* MEMBER CARDS */

        .rt-member-card {
          background: rgba(255, 255, 255, 0.035) !important;

          border-color: rgba(255, 255, 255, 0.10) !important;

          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .rt-member-card:hover {
          background: rgba(255, 255, 255, 0.055) !important;

          border-color: rgba(168, 85, 247, 0.25) !important;
        }


        /* CATEGORY OPTIONS */

        .rt-category-option {
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }


        /* INPUTS */

        .register-team-page .eiro-input {
          width: 100%;

          background: rgba(15, 23, 42, 0.48) !important;

          border-color: rgba(148, 163, 184, 0.20);

          color: #f8fafc;
        }

        .register-team-page .eiro-input:focus {
          border-color: rgba(129, 140, 248, 0.75);
          outline: none;
        }

        .register-team-page .eiro-input::placeholder {
          color: #8993a5;
        }


        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .rt-bubble {
            animation: none;
          }

          .rt-glass-card,
          .rt-member-card {
            transition: none;
          }
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {
          .rt-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .rt-content {
            padding: 16px 10px 24px;
          }
        }

      `}</style>

    </main>
  );
}