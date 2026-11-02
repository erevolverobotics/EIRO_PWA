'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  AlertCircle,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button, Card, CategoryBadge, Input, Modal, PageHeader } from '@/components/ui';
import { db } from '@/lib/firebase/config';
import type { CategoryCode } from '@/lib/types';
import { useAuth } from '@/lib/firebase/auth-context';
import { deleteRegisteredStudent as callDeleteRegisteredStudent } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Animated background constants ───────────────────────────────────────────

const ADMIN_PARTICLES = [
  { left: '12%', top: '22%', delay: '0s', duration: '18s' },
  { left: '27%', top: '68%', delay: '-5s', duration: '22s' },
  { left: '46%', top: '32%', delay: '-9s', duration: '20s' },
  { left: '64%', top: '76%', delay: '-3s', duration: '24s' },
  { left: '79%', top: '24%', delay: '-12s', duration: '19s' },
  { left: '91%', top: '58%', delay: '-7s', duration: '21s' },
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolRow {
  id: string;
  name: string;
  code: string;
}

interface DirectoryStudent {
  id: string;
  name: string;
  grade: string;
  section: string;
  schoolId: string;
  schoolName: string;
  teamId: string;
  teamName: string;
  categoryCode?: CategoryCode;
  seasonId?: string;
  teamSize: number;
  minimumTeamSize?: number;
}

interface RegisteredTeam {
  id: string;
  teamName: string;
  schoolId: string;
  categoryCode?: CategoryCode;
  seasonId?: string;
  registrationCount: number;
  registrationState: string;
  memberCount: number;
  minimumTeamSize?: number;
  maximumTeamSize?: number;
}

const compareText = (left: string, right: string) =>
  left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const { roles } = useAuth();

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);

  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('school');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingStudent, setEditingStudent] = useState<DirectoryStudent | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    grade: '',
    section: '',
  });

  const [deletingStudent, setDeletingStudent] = useState<DirectoryStudent | null>(null);
  const [destinationTeamId, setDestinationTeamId] = useState('');
  const [saving, setSaving] = useState(false);

  const canEditStudents = roles.some(role =>
    role.active && ['SUPER_ADMIN', 'DISTRICT_ADMIN'].includes(role.role)
  );

  const canDeleteStudents = canEditStudents;

  // ── Load registered students ────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        schoolSnapshot,
        teamSnapshot,
        registrationSnapshot,
        studentSnapshot,
        categorySnapshot,
      ] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'students')),
        getDoc(doc(db, 'config', 'categories')),
      ]);

      const categoryConfig = categorySnapshot.exists()
        ? categorySnapshot.data()
        : {};

      const schoolById = new Map<string, SchoolRow>();

      schoolSnapshot.docs.forEach(snapshot => {
        const data = snapshot.data();

        schoolById.set(snapshot.id, {
          id: snapshot.id,
          name: typeof data.name === 'string' ? data.name : snapshot.id,
          code: typeof data.schoolCode === 'string' ? data.schoolCode : '',
        });
      });

      const registrationsByTeam = new Map<
        string,
        {
          count: number;
          state: string;
          seasonId?: string;
        }
      >();

      registrationSnapshot.docs.forEach(snapshot => {
        const data = snapshot.data();

        if (typeof data.teamId !== 'string') return;

        const current = registrationsByTeam.get(data.teamId);

        registrationsByTeam.set(data.teamId, {
          count: (current?.count ?? 0) + 1,
          state: typeof data.state === 'string' ? data.state : '',
          seasonId:
            typeof data.seasonId === 'string'
              ? data.seasonId
              : current?.seasonId,
        });
      });

      const teamsById = new Map<
        string,
        Omit<RegisteredTeam, 'memberCount'>
      >();

      teamSnapshot.docs.forEach(snapshot => {
        const registration = registrationsByTeam.get(snapshot.id);

        if (!registration) return;

        const data = snapshot.data();

        if (typeof data.schoolId !== 'string') return;

        const categoryCode =
          typeof data.categoryCode === 'string'
            ? data.categoryCode as CategoryCode
            : undefined;

        const categorySettings = categoryCode
          ? categoryConfig[categoryCode] as {
              minTeam?: unknown;
              maxTeam?: unknown;
            } | undefined
          : undefined;

        const minimumTeamSize = categorySettings?.minTeam;
        const maximumTeamSize = categorySettings?.maxTeam;

        teamsById.set(snapshot.id, {
          id: snapshot.id,
          schoolId: data.schoolId,

          teamName:
            typeof data.teamName === 'string'
              ? data.teamName
              : typeof data.displayTeamCode === 'string'
                ? data.displayTeamCode
                : snapshot.id,

          categoryCode,

          seasonId:
            typeof data.seasonId === 'string'
              ? data.seasonId
              : registration.seasonId,

          registrationCount: registration.count,
          registrationState: registration.state,

          minimumTeamSize:
            typeof minimumTeamSize === 'number' &&
            Number.isSafeInteger(minimumTeamSize) &&
            minimumTeamSize > 0
              ? minimumTeamSize
              : undefined,

          maximumTeamSize:
            typeof maximumTeamSize === 'number' &&
            Number.isSafeInteger(maximumTeamSize) &&
            maximumTeamSize > 0
              ? maximumTeamSize
              : undefined,
        });
      });

      const teamSizes = new Map<string, number>();

      studentSnapshot.docs.forEach(snapshot => {
        const teamId = snapshot.data().teamId;

        if (typeof teamId === 'string') {
          teamSizes.set(
            teamId,
            (teamSizes.get(teamId) ?? 0) + 1
          );
        }
      });

      const directory: DirectoryStudent[] =
        studentSnapshot.docs.flatMap(snapshot => {
          const data = snapshot.data();

          const teamId =
            typeof data.teamId === 'string'
              ? data.teamId
              : '';

          const team = teamsById.get(teamId);

          const schoolId =
            typeof data.schoolId === 'string'
              ? data.schoolId
              : team?.schoolId;

          if (!team || !schoolId || team.schoolId !== schoolId) {
            return [];
          }

          const school = schoolById.get(schoolId);

          const categorySettings = team.categoryCode
            ? categoryConfig[team.categoryCode] as {
                minTeam?: unknown;
              } | undefined
            : undefined;

          const minimumTeamSize = categorySettings?.minTeam;

          return [{
            id: snapshot.id,

            name:
              typeof data.name === 'string'
                ? data.name
                : typeof data.studentName === 'string'
                  ? data.studentName
                  : typeof data.fullName === 'string'
                    ? data.fullName
                    : '—',

            grade:
              typeof data.grade === 'string'
                ? data.grade
                : typeof data.class === 'string'
                  ? data.class
                  : '',

            section:
              typeof data.section === 'string'
                ? data.section
                : '',

            schoolId,
            schoolName: school?.name ?? schoolId,

            teamId,
            teamName: team.teamName,

            categoryCode: team.categoryCode,
            seasonId: team.seasonId,

            teamSize: teamSizes.get(teamId) ?? 0,

            minimumTeamSize:
              typeof minimumTeamSize === 'number' &&
              Number.isSafeInteger(minimumTeamSize) &&
              minimumTeamSize > 0
                ? minimumTeamSize
                : undefined,
          }];
        });

      setRegisteredTeams(
        [...teamsById.values()].map(team => ({
          ...team,
          memberCount: teamSizes.get(team.id) ?? 0,
        }))
      );

      const registeredSchoolIds = new Set(
        [...teamsById.values()].map(team => team.schoolId)
      );

      setSchools(
        [...schoolById.values()]
          .filter(school => registeredSchoolIds.has(school.id))
          .sort((left, right) =>
            compareText(left.name, right.name)
          )
      );

      setStudents(directory);
      setError('');
    } catch (loadError) {
      console.error(
        'Failed to load registered student directory',
        loadError
      );

      setError(
        'Registered schools and students could not be loaded. Check administrator access and retry.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Filters and sorting ─────────────────────────────────────────────────────

  const grades = useMemo(
    () =>
      [...new Set(
        students
          .map(student => student.grade)
          .filter(Boolean)
      )].sort(compareText),
    [students]
  );

  const categories = useMemo(
    () =>
      [...new Set(
        students
          .map(student => student.categoryCode)
          .filter(
            (category): category is CategoryCode => Boolean(category)
          )
      )].sort(compareText),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students
      .filter(student =>
        (schoolFilter === 'ALL' || student.schoolId === schoolFilter) &&
        (gradeFilter === 'ALL' || student.grade === gradeFilter) &&
        (categoryFilter === 'ALL' || student.categoryCode === categoryFilter) &&
        (
          !term ||
          [
            student.name,
            student.schoolName,
            student.teamName,
            student.grade,
            student.section,
            student.categoryCode ?? '',
          ].some(value => value.toLowerCase().includes(term))
        )
      )
      .sort((left, right) => {
        if (sortBy === 'student') {
          return compareText(left.name, right.name);
        }

        if (sortBy === 'grade') {
          return (
            compareText(left.grade, right.grade) ||
            compareText(left.name, right.name)
          );
        }

        if (sortBy === 'category') {
          return (
            compareText(
              left.categoryCode ?? '',
              right.categoryCode ?? ''
            ) ||
            compareText(left.name, right.name)
          );
        }

        return (
          compareText(left.schoolName, right.schoolName) ||
          compareText(left.name, right.name)
        );
      });
  }, [
    students,
    schoolFilter,
    gradeFilter,
    categoryFilter,
    search,
    sortBy,
  ]);

  // ── Edit student ────────────────────────────────────────────────────────────

  const openEdit = (student: DirectoryStudent) => {
    setEditingStudent(student);

    setEditForm({
      name: student.name === '—' ? '' : student.name,
      grade: student.grade,
      section: student.section,
    });
  };

  const saveStudent = async () => {
    if (!editingStudent) return;

    const name = editForm.name.trim();
    const grade = editForm.grade.trim();
    const section = editForm.section.trim();

    if (!name || !grade) {
      toast.error('Student name and class are required.');
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        name,
        grade,
        section: section || null,
        updatedAt: serverTimestamp(),
      });

      setStudents(current =>
        current.map(student =>
          student.id === editingStudent.id
            ? { ...student, name, grade, section }
            : student
        )
      );

      setEditingStudent(null);
      toast.success('Student details updated.');
    } catch (saveError) {
      console.error(
        'Failed to update student record',
        saveError
      );

      toast.error(
        'Student details could not be updated. Check your permissions and retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Team size and destination helpers ───────────────────────────────────────

  const wouldViolateTeamSize = (student: DirectoryStudent) =>
    student.minimumTeamSize !== undefined &&
    student.teamSize - 1 < student.minimumTeamSize;

  const getDestinationTeamCandidates = (student: DirectoryStudent) =>
    registeredTeams.filter(team =>
      team.id !== student.teamId &&
      team.schoolId === student.schoolId
    );

  const getDestinationTeamBlockReason = (
    student: DirectoryStudent,
    team: RegisteredTeam
  ) => {
    const remainingMemberCount = student.teamSize - 1;

    if (team.categoryCode !== student.categoryCode) {
      return `Different category (${team.categoryCode ?? 'unknown'}).`;
    }

    if (!student.seasonId || team.seasonId !== student.seasonId) {
      return 'Different or missing season.';
    }

    if (team.registrationCount !== 1) {
      return 'Must have exactly one registration.';
    }

    if (
      ![
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'CORRECTION_REQUIRED',
        'APPROVED',
      ].includes(team.registrationState)
    ) {
      return `Registration is ${team.registrationState || 'unknown'} and cannot be changed.`;
    }

    if (
      team.minimumTeamSize === undefined ||
      team.maximumTeamSize === undefined
    ) {
      return 'Category team-size settings are unavailable.';
    }

    const updatedMemberCount =
      team.memberCount + remainingMemberCount;

    if (updatedMemberCount < team.minimumTeamSize) {
      return `Would have ${updatedMemberCount}; minimum is ${team.minimumTeamSize}.`;
    }

    if (updatedMemberCount > team.maximumTeamSize) {
      return `Would have ${updatedMemberCount}; maximum is ${team.maximumTeamSize}.`;
    }

    return null;
  };

  const destinationTeams = deletingStudent
    ? getDestinationTeamCandidates(deletingStudent)
    : [];

  const selectedDestinationTeam = deletingStudent
    ? destinationTeams.find(team =>
        team.id === destinationTeamId &&
        getDestinationTeamBlockReason(deletingStudent, team) === null
      )
    : undefined;

  // ── Delete student ──────────────────────────────────────────────────────────

  const deleteStudent = async () => {
    if (!deletingStudent) return;

    const needsMove = wouldViolateTeamSize(deletingStudent);

    if (needsMove && !selectedDestinationTeam) {
      toast.error(
        'Choose an eligible destination team before continuing.'
      );
      return;
    }

    setSaving(true);

    try {
      await callDeleteRegisteredStudent<
        {
          studentId: string;
          destinationTeamId?: string;
        },
        {
          studentId: string;
          memberCount: number;
          feeStatus: string;
          feeTotalMinorUnits: number;
          movedMemberCount?: number;
        }
      >({
        studentId: deletingStudent.id,
        ...(needsMove ? { destinationTeamId } : {}),
      });

      setDeletingStudent(null);
      setDestinationTeamId('');

      await load();

      toast.success(
        needsMove
          ? 'Student deleted and the remaining team members were moved.'
          : 'Student record deleted.'
      );
    } catch (deleteError) {
      console.error(
        'Failed to delete student record',
        deleteError
      );

      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : 'Student record could not be deleted. Check your admin access and retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="students-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ── Animated Admin Dashboard background ───────────────────────────── */}

      <div
        className="students-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="students-orb students-orb-one" />
        <div className="students-orb students-orb-two" />
        <div className="students-orb students-orb-three" />
        <div className="students-orb students-orb-four" />

        <div className="students-dot-grid absolute inset-0" />

        <div className="students-ring students-ring-one" />
        <div className="students-ring students-ring-two" />

        {ADMIN_PARTICLES.map((particle, index) => (
          <div
            key={index}
            className="students-particle"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}

        <div className="students-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <div
              key={index}
              className={`students-bubble students-bubble-${bubble.tone}`}
              style={{
                left: bubble.left,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="students-center-glow" />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}

      <main className="students-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Registered Schools & Students"
          subtitle="Browse registered student rosters by school, class, and category."
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

        {/* ── Error ─────────────────────────────────────────────────────── */}

        {error ? (
          <div role="alert" className="students-glass">
            <Card className="flex items-start gap-3 text-sm text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0" />

              <div>
                <p>{error}</p>

                <Button
                  className="mt-3"
                  variant="secondary"
                  onClick={() => void load()}
                >
                  Retry
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* ── Summary ──────────────────────────────────────────────── */}

            <div className="students-glass">
              <Card className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400" />

                <p className="text-sm text-gray-300">
                  {loading
                    ? 'Loading…'
                    : `${schools.length} registered schools · ${students.length} registered students`}
                </p>
              </Card>
            </div>

            {/* ── Filters ──────────────────────────────────────────────── */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">

              <select
                aria-label="Filter by school"
                value={schoolFilter}
                onChange={event => setSchoolFilter(event.target.value)}
                className="eiro-input"
              >
                <option value="ALL">All registered schools</option>

                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                    {school.code ? ` (${school.code})` : ''}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by class"
                value={gradeFilter}
                onChange={event => setGradeFilter(event.target.value)}
                className="eiro-input"
              >
                <option value="ALL">All classes</option>

                {grades.map(grade => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={event => setCategoryFilter(event.target.value)}
                className="eiro-input"
              >
                <option value="ALL">All categories</option>

                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort students by"
                value={sortBy}
                onChange={event => setSortBy(event.target.value)}
                className="eiro-input"
              >
                <option value="school">Sort: School</option>
                <option value="student">Sort: Student name</option>
                <option value="grade">Sort: Class</option>
                <option value="category">Sort: Category</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  type="search"
                  aria-label="Search registered students"
                  placeholder="Search students, team, school…"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="eiro-input w-full pl-9"
                />
              </div>
            </div>

            {/* ── Student list ─────────────────────────────────────────── */}

            {loading ? (
              <div className="students-glass">
                <Card className="text-center text-gray-400">
                  Loading registered students…
                </Card>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="students-glass">
                <Card className="text-center py-12 text-gray-400">
                  No registered students match these filters.
                </Card>
              </div>
            ) : (
              <div className="students-glass">
                <Card padding="none" className="students-table-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3">Section</th>
                          <th className="px-4 py-3">School</th>
                          <th className="px-4 py-3">Team</th>
                          <th className="px-4 py-3">Category</th>

                          {(canEditStudents || canDeleteStudents) && (
                            <th className="px-4 py-3">Actions</th>
                          )}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5">
                        {filteredStudents.map(student => (
                          <tr
                            key={student.id}
                            className="text-gray-300 hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3 font-medium text-white">
                              {student.name}
                            </td>

                            <td className="px-4 py-3">
                              {student.grade || '—'}
                            </td>

                            <td className="px-4 py-3">
                              {student.section || '—'}
                            </td>

                            <td className="px-4 py-3">
                              {student.schoolName}
                            </td>

                            <td className="px-4 py-3">
                              {student.teamName}
                            </td>

                            <td className="px-4 py-3">
                              {student.categoryCode
                                ? <CategoryBadge code={student.categoryCode} />
                                : '—'}
                            </td>

                            {(canEditStudents || canDeleteStudents) && (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {canEditStudents && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      icon={Pencil}
                                      aria-label={`Edit ${student.name}`}
                                      onClick={() => openEdit(student)}
                                    >
                                      Edit
                                    </Button>
                                  )}

                                  {canDeleteStudents && (
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      icon={Trash2}
                                      aria-label={`Delete ${student.name}`}
                                      onClick={() => {
                                        setDestinationTeamId('');
                                        setDeletingStudent(student);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* ── Edit Student Modal ──────────────────────────────────────────── */}

        <Modal
          open={Boolean(editingStudent)}
          onClose={() => {
            if (!saving) setEditingStudent(null);
          }}
          title={`Edit Student${editingStudent ? ` — ${editingStudent.name}` : ''}`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setEditingStudent(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                onClick={() => void saveStudent()}
                loading={saving}
              >
                Save Changes
              </Button>
            </>
          }
        >
          {editingStudent && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                {editingStudent.schoolName} · {editingStudent.teamName}
              </p>

              <Input
                label="Student name"
                value={editForm.name}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={120}
                required
              />

              <Input
                label="Class / grade"
                value={editForm.grade}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    grade: event.target.value,
                  }))
                }
                maxLength={40}
                required
              />

              <Input
                label="Section"
                value={editForm.section}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    section: event.target.value,
                  }))
                }
                maxLength={40}
              />
            </div>
          )}
        </Modal>

        {/* ── Delete Student Modal ───────────────────────────────────────── */}

        <Modal
          open={Boolean(deletingStudent)}
          onClose={() => {
            if (!saving) setDeletingStudent(null);
          }}
          title={
            deletingStudent && wouldViolateTeamSize(deletingStudent)
              ? 'Delete Student and Move Remaining Members?'
              : 'Delete Student Record?'
          }
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setDeletingStudent(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => void deleteStudent()}
                loading={saving}
                disabled={Boolean(
                  deletingStudent &&
                  wouldViolateTeamSize(deletingStudent) &&
                  !selectedDestinationTeam
                )}
              >
                {deletingStudent && wouldViolateTeamSize(deletingStudent)
                  ? 'Delete & Move Team'
                  : 'Delete Student'}
              </Button>
            </>
          }
        >
          {deletingStudent && (
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                Permanently delete{' '}
                <strong className="text-white">
                  {deletingStudent.name}
                </strong>{' '}
                from team{' '}
                <strong className="text-white">
                  {deletingStudent.teamName}
                </strong>?
              </p>

              {wouldViolateTeamSize(deletingStudent) ? (
                <div className="space-y-3">
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200"
                  >
                    Deleting this student would leave{' '}
                    {deletingStudent.teamName} below its minimum of{' '}
                    {deletingStudent.minimumTeamSize}. Select another
                    registered team for the remaining{' '}
                    {deletingStudent.teamSize - 1} member(s). The delete
                    and move are saved together only after you confirm.
                  </p>

                  <p className="text-xs text-gray-400">
                    The destination must not have event entries or invoices.
                    Moving members into an approved team updates its roster
                    and recalculates its fee.
                  </p>

                  <label className="block space-y-1 text-sm">
                    <span className="text-gray-300">
                      Destination team
                    </span>

                    <select
                      aria-label="Destination team for remaining members"
                      className="eiro-input w-full"
                      value={destinationTeamId}
                      onChange={event =>
                        setDestinationTeamId(event.target.value)
                      }
                    >
                      <option value="">Select a team</option>

                      {destinationTeams.map(team => {
                        const blockReason =
                          getDestinationTeamBlockReason(
                            deletingStudent,
                            team
                          );

                        return (
                          <option
                            key={team.id}
                            value={team.id}
                            disabled={Boolean(blockReason)}
                          >
                            {team.teamName} · {team.categoryCode ?? 'Category unknown'} · {team.memberCount} members
                            {blockReason
                              ? ` — ${blockReason}`
                              : ` → ${team.memberCount + deletingStudent.teamSize - 1} members`}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {destinationTeams.length === 0 && (
                    <p role="alert" className="text-amber-200">
                      No other registered teams were found for this school.
                    </p>
                  )}

                  {destinationTeams.length > 0 &&
                    !destinationTeams.some(team =>
                      getDestinationTeamBlockReason(
                        deletingStudent,
                        team
                      ) === null
                    ) && (
                      <p role="alert" className="text-amber-200">
                        No listed team can accept these members yet.
                        The options show why each team is unavailable.
                      </p>
                    )}
                </div>
              ) : null}

              <p className="text-amber-300">
                This permanently removes the selected student record.
                Other roster changes are reversible only through an administrator.
              </p>
            </div>
          )}
        </Modal>
      </main>

      {/* ── Background animation styles ───────────────────────────────────── */}

      <style jsx global>{`
        .students-page {
          isolation: isolate;
          background: #050308;
          min-height: 100vh;
        }

        .students-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent;
        }

        .students-content {
          position: relative;
          z-index: 10;
          background: transparent;
        }

        /* Glowing orbs */

        .students-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(85px);
          opacity: 0.55;
          will-change: transform;
        }

        .students-orb-one {
          width: 480px;
          height: 480px;
          top: -180px;
          left: -120px;
          background: radial-gradient(
            circle,
            rgba(124, 58, 237, 0.36) 0%,
            rgba(124, 58, 237, 0.08) 45%,
            transparent 72%
          );
          animation: studentsOrbOne 22s ease-in-out infinite alternate;
        }

        .students-orb-two {
          width: 520px;
          height: 520px;
          top: 12%;
          right: -180px;
          background: radial-gradient(
            circle,
            rgba(219, 39, 119, 0.25) 0%,
            rgba(219, 39, 119, 0.06) 48%,
            transparent 72%
          );
          animation: studentsOrbTwo 26s ease-in-out infinite alternate;
        }

        .students-orb-three {
          width: 440px;
          height: 440px;
          bottom: -180px;
          left: 24%;
          background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.24) 0%,
            rgba(99, 102, 241, 0.05) 48%,
            transparent 72%
          );
          animation: studentsOrbThree 24s ease-in-out infinite alternate;
        }

        .students-orb-four {
          width: 360px;
          height: 360px;
          bottom: 5%;
          right: 12%;
          background: radial-gradient(
            circle,
            rgba(168, 85, 247, 0.20) 0%,
            rgba(168, 85, 247, 0.04) 50%,
            transparent 72%
          );
          animation: studentsOrbFour 28s ease-in-out infinite alternate;
        }

        @keyframes studentsOrbOne {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(100px, 80px, 0) scale(1.2);
          }
        }

        @keyframes studentsOrbTwo {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(-110px, 90px, 0) scale(1.15);
          }
        }

        @keyframes studentsOrbThree {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(80px, -90px, 0) scale(1.2);
          }
        }

        @keyframes studentsOrbFour {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(-70px, -70px, 0) scale(1.18);
          }
        }

        /* Dotted background */

        .students-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 1px,
            transparent 1px
          );
          background-size: 27px 27px;
          opacity: 0.48;
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

        /* Rotating rings */

        .students-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.08);
          border-radius: 50%;
          pointer-events: none;
        }

        .students-ring-one {
          width: 620px;
          height: 620px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: studentsRingRotate 75s linear infinite;
        }

        .students-ring-two {
          width: 900px;
          height: 900px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-color: rgba(139, 92, 246, 0.07);
          animation: studentsRingRotateReverse 100s linear infinite;
        }

        @keyframes studentsRingRotate {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes studentsRingRotateReverse {
          from {
            transform: translate(-50%, -50%) rotate(360deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(0deg);
          }
        }

        /* Floating particles */

        .students-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(216, 180, 254, 0.75);
          box-shadow: 0 0 12px rgba(192, 132, 252, 0.75);
          animation: studentsParticleFloat 20s ease-in-out infinite;
        }

        @keyframes studentsParticleFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.2;
          }
          50% {
            transform: translate3d(20px, -35px, 0);
            opacity: 0.9;
          }
        }

        /* Floating bubbles */

        .students-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .students-bubble {
          position: absolute;
          bottom: -90px;
          border-radius: 50%;
          opacity: 0;
          animation-name: studentsBubbleFloat;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }

        .students-bubble-violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(196, 181, 253, 0.32),
            rgba(139, 92, 246, 0.12) 48%,
            rgba(139, 92, 246, 0.02) 72%,
            transparent 74%
          );
          border: 1px solid rgba(196, 181, 253, 0.12);
          box-shadow: inset 0 0 18px rgba(167, 139, 250, 0.08);
        }

        .students-bubble-rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(251, 207, 232, 0.28),
            rgba(244, 114, 182, 0.11) 48%,
            rgba(244, 114, 182, 0.02) 72%,
            transparent 74%
          );
          border: 1px solid rgba(251, 207, 232, 0.12);
          box-shadow: inset 0 0 18px rgba(244, 114, 182, 0.07);
        }

        @keyframes studentsBubbleFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          50% {
            transform: translate3d(35px, -55vh, 0) scale(1);
            opacity: 0.42;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translate3d(-25px, -115vh, 0) scale(1.12);
            opacity: 0;
          }
        }

        /* Center glow */

        .students-center-glow {
          position: absolute;
          width: 700px;
          height: 500px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(124, 58, 237, 0.07) 0%,
            rgba(168, 85, 247, 0.025) 42%,
            transparent 72%
          );
          filter: blur(35px);
        }

        /* Translucent cards: keep the animated background visible */

        .students-glass {
          position: relative;
          isolation: isolate;
        }

        .students-glass > * {
          background: rgba(18, 12, 29, 0.24) !important;
          border: 1px solid rgba(221, 143, 224, 0.13) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .students-table-card {
          overflow: hidden;
        }

        /* Responsive adjustments */

        @media (max-width: 768px) {
          .students-orb-one {
            width: 300px;
            height: 300px;
          }

          .students-orb-two {
            width: 320px;
            height: 320px;
          }

          .students-orb-three {
            width: 280px;
            height: 280px;
          }

          .students-orb-four {
            width: 240px;
            height: 240px;
          }

          .students-ring-one {
            width: 420px;
            height: 420px;
          }

          .students-ring-two {
            width: 620px;
            height: 620px;
          }

          .students-center-glow {
            width: 100%;
            height: 350px;
          }
        }

        /* Accessibility */

        @media (prefers-reduced-motion: reduce) {
          .students-orb,
          .students-ring,
          .students-particle,
          .students-bubble {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}