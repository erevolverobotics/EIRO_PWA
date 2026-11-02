'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, setDoc, updateDoc, doc,
  serverTimestamp, getDoc, query, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  PageHeader, Card, KpiCard, Button, Badge, Modal, Select,
} from '@/components/ui';
import {
  Users, Plus, Shield, Mail, Search, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, UserX, Edit3, ShieldCheck,
} from 'lucide-react';
import type {
  UserRole, ScopeType, RoleAssignment, UserProfile,
} from '@/lib/types';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: {
  value: UserRole;
  label: string;
  scopeType: ScopeType;
}[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', scopeType: 'GLOBAL' },
  { value: 'DISTRICT_ADMIN', label: 'District Admin', scopeType: 'DISTRICT' },
  { value: 'HEAD_JUDGE', label: 'Head Judge', scopeType: 'EVENT' },
  { value: 'VENUE_COORDINATOR', label: 'Venue Coordinator', scopeType: 'VENUE' },
  { value: 'SCHOOL_COORDINATOR', label: 'School Coordinator', scopeType: 'SCHOOL' },
  { value: 'JUDGE', label: 'Judge', scopeType: 'EVENT' },
  { value: 'CHECKIN_VOLUNTEER', label: 'Check-in Volunteer', scopeType: 'VENUE' },
];

const ROLE_BADGE: Record<
  string,
  'danger' | 'warning' | 'purple' | 'success' | 'info' | 'default'
> = {
  SUPER_ADMIN: 'danger',
  DISTRICT_ADMIN: 'warning',
  HEAD_JUDGE: 'purple',
  VENUE_COORDINATOR: 'success',
  SCHOOL_COORDINATOR: 'info',
  JUDGE: 'purple',
  CHECKIN_VOLUNTEER: 'default',
};

// ─── Animated Background ──────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveAssignment = RoleAssignment & {
  firestoreId: string;
};

interface UserRow {
  profile: UserProfile;
  assignments: ActiveAssignment[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('JUDGE');
  const [newScope, setNewScope] = useState('global');

  // ── Load users and role assignments ────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [usersSnap, assignSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(
          query(
            collection(db, 'roleAssignments'),
            where('active', '==', true)
          )
        ),
      ]);

      const profiles = usersSnap.docs.map(
        (d) => d.data() as UserProfile
      );

      const assignments: ActiveAssignment[] = assignSnap.docs.map((d) => ({
        ...(d.data() as RoleAssignment),
        firestoreId: d.id,
      }));

      const byUid: Record<string, ActiveAssignment[]> = {};

      for (const assignment of assignments) {
        if (!byUid[assignment.uid]) {
          byUid[assignment.uid] = [];
        }

        byUid[assignment.uid].push(assignment);
      }

      const built: UserRow[] = profiles.map((profile) => ({
        profile,
        assignments: byUid[profile.uid] ?? [],
      }));

      built.sort((a, b) =>
        a.profile.displayName.localeCompare(b.profile.displayName)
      );

      setRows(built);
      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'User and role data could not be loaded. Super administrator authorization may be required; retry after checking permissions.'
      );

      toast.error('Failed to load users. Check Firestore permissions.');
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

  // ── Open edit modal ─────────────────────────────────────────────────────────

  const openEdit = (row: UserRow) => {
    setEditTarget(row);
    setNewRole('JUDGE');
    setNewScope('global');
  };

  // ── Assign role ─────────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!editTarget || !user) return;

    setSaving(true);

    try {
      const roleInfo = ALL_ROLES.find(
        (role) => role.value === newRole
      )!;

      const docId = `${editTarget.profile.uid}_${newRole}`;

      const existing = await getDoc(
        doc(db, 'roleAssignments', docId)
      );

      if (existing.exists() && existing.data().active) {
        toast.error(
          `${editTarget.profile.displayName} already has the ${roleInfo.label} role.`
        );

        setSaving(false);
        return;
      }

      await setDoc(doc(db, 'roleAssignments', docId), {
        id: docId,
        uid: editTarget.profile.uid,
        role: newRole,
        scopeType: roleInfo.scopeType,
        scopeId: newScope.trim() || 'global',
        createdBy: user.uid,
        active: true,
        createdAt: serverTimestamp(),
      });

      toast.success(
        `${roleInfo.label} assigned to ${editTarget.profile.displayName}`
      );

      setEditTarget(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to assign role. Check permissions.');
    } finally {
      setSaving(false);
    }
  };

  // ── Revoke role ─────────────────────────────────────────────────────────────

  const handleRevoke = async (
    firestoreId: string,
    roleName: string,
    displayName: string
  ) => {
    if (
      !confirm(
        `Remove ${roleName.replace(/_/g, ' ')} from ${displayName}?`
      )
    ) {
      return;
    }

    setRevoking(firestoreId);

    try {
      await updateDoc(
        doc(db, 'roleAssignments', firestoreId),
        { active: false }
      );

      toast.success('Role removed');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove role');
    } finally {
      setRevoking(null);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = rows.filter((row) => {
    const q = search.toLowerCase();

    return (
      row.profile.displayName.toLowerCase().includes(q) ||
      row.profile.email.toLowerCase().includes(q) ||
      row.assignments.some((assignment) =>
        assignment.role.toLowerCase().includes(q)
      )
    );
  });

  // ── Counts ──────────────────────────────────────────────────────────────────

  const allAssignments = rows.flatMap((row) => row.assignments);

  const withRole = rows.filter(
    (row) => row.assignments.length > 0
  ).length;

  const noRole = rows.filter(
    (row) => row.assignments.length === 0
  ).length;

  const judgeCount = allAssignments.filter(
    (assignment) =>
      assignment.role === 'JUDGE' ||
      assignment.role === 'HEAD_JUDGE'
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="staff-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ── Animated background ─────────────────────────────────────────── */}

      <div
        className="staff-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="staff-orb staff-orb-one" />
        <div className="staff-orb staff-orb-two" />
        <div className="staff-orb staff-orb-three" />
        <div className="staff-orb staff-orb-four" />

        <div className="staff-dot-grid absolute inset-0" />

        <div className="staff-ring staff-ring-one" />
        <div className="staff-ring staff-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`staff-particle ${particle}`}
          />
        ))}

        <div className="staff-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`staff-bubble ${bubble.tone}`}
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

        <div className="staff-center-glow" />
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}

      <main className="staff-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Users & Role Management"
          subtitle={
            error
              ? 'User and role data unavailable'
              : `${rows.length} registered users — assign and manage roles`
          }
          actions={
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* KPIs */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Total Users"
            value={error || loading ? '—' : rows.length}
            icon={Users}
            color="indigo"
          />

          <KpiCard
            title="With Role"
            value={error || loading ? '—' : withRole}
            icon={ShieldCheck}
            color="green"
          />

          <KpiCard
            title="No Role Yet"
            value={error || loading ? '—' : noRole}
            icon={Users}
            color="orange"
          />

          <KpiCard
            title="Judges"
            value={error || loading ? '—' : judgeCount}
            icon={Shield}
            color="purple"
          />
        </div>

        {/* Search */}

        <Card className="staff-transparent-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search by name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="eiro-input pl-9 w-full"
            />
          </div>
        </Card>

        {/* Users table */}

        <Card
          padding="none"
          className="staff-transparent-card staff-table-card"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              Loading users…
            </div>
          ) : error ? (
            <div role="alert" className="p-5 text-sm text-red-300">
              <p>{error}</p>

              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-300">
              <Users className="w-10 h-10 opacity-40" />

              <p className="text-sm">
                {search
                  ? 'No users match your search.'
                  : 'No registered users yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="eiro-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Current Roles</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.profile.uid}>

                      {/* Avatar and name */}

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {row.profile.displayName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-medium text-white text-sm">
                              {row.profile.displayName}
                            </p>

                            <p className="text-[10px] text-gray-400 font-mono">
                              {row.profile.uid.slice(0, 14)}…
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}

                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-gray-300">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                          {row.profile.email}
                        </div>
                      </td>

                      {/* Role badges and revoke */}

                      <td>
                        {row.assignments.length === 0 ? (
                          <span className="text-xs text-gray-300 italic">
                            No role assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {row.assignments.map((assignment) => (
                              <div
                                key={assignment.firestoreId}
                                className="flex items-center gap-1"
                              >
                                <Badge variant={ROLE_BADGE[assignment.role]}>
                                  {assignment.role.replace(/_/g, ' ')}

                                  {assignment.scopeId !== 'global' && (
                                    <span className="ml-1 opacity-80">
                                      · {assignment.scopeId}
                                    </span>
                                  )}
                                </Badge>

                                <button
                                  onClick={() =>
                                    handleRevoke(
                                      assignment.firestoreId,
                                      assignment.role,
                                      row.profile.displayName
                                    )
                                  }
                                  disabled={
                                    revoking === assignment.firestoreId
                                  }
                                  title="Remove role"
                                  className="ml-0.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                >
                                  {revoking === assignment.firestoreId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserX className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Assign or add role */}

                      <td>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={
                            row.assignments.length === 0
                              ? Plus
                              : Edit3
                          }
                          onClick={() => openEdit(row)}
                        >
                          {row.assignments.length === 0
                            ? 'Assign Role'
                            : 'Add Role'}
                        </Button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Assign role modal */}

        <Modal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title={
            editTarget?.assignments.length === 0
              ? 'Assign Role'
              : 'Add Another Role'
          }
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setEditTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={CheckCircle2}
                loading={saving}
                onClick={handleAssign}
              >
                Save Role
              </Button>
            </>
          }
        >
          {editTarget && (
            <div className="space-y-4">

              {/* User information */}

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {editTarget.profile.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="font-semibold text-white text-sm">
                    {editTarget.profile.displayName}
                  </p>

                  <p className="text-xs text-gray-400">
                    {editTarget.profile.email}
                  </p>
                </div>
              </div>

              {/* Current roles */}

              {editTarget.assignments.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    Current roles:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {editTarget.assignments.map((assignment) => (
                      <Badge
                        key={assignment.firestoreId}
                        variant={ROLE_BADGE[assignment.role]}
                      >
                        {assignment.role.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Role selection */}

              <Select
                id="edit-role"
                label="Role to Assign"
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as UserRole)
                }
                options={ALL_ROLES.map((role) => ({
                  value: role.value,
                  label: role.label,
                }))}
              />

              {/* Scope ID */}

              <div>
                <label
                  htmlFor="edit-scope"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Scope ID
                </label>

                <input
                  id="edit-scope"
                  type="text"
                  className="eiro-input w-full"
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  placeholder={
                    newRole === 'SUPER_ADMIN'
                      ? 'global'
                      : newRole === 'DISTRICT_ADMIN'
                        ? 'e.g. district_chennai'
                        : newRole === 'JUDGE' || newRole === 'HEAD_JUDGE'
                          ? 'e.g. event_2026_chennai'
                          : newRole === 'VENUE_COORDINATOR' ||
                              newRole === 'CHECKIN_VOLUNTEER'
                            ? 'e.g. venue_abc'
                            : newRole === 'SCHOOL_COORDINATOR'
                              ? 'e.g. school_001'
                              : 'global'
                  }
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  Scope type:{' '}
                  <span className="text-indigo-300">
                    {ALL_ROLES.find(
                      (role) => role.value === newRole
                    )?.scopeType}
                  </span>
                </p>
              </div>

              {/* Role description */}

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-xs text-gray-300">
                  {newRole === 'SUPER_ADMIN' &&
                    'Full platform access. Manage all seasons, staff, and settings.'}

                  {newRole === 'DISTRICT_ADMIN' &&
                    'Manages all events, schools, and staff within their district.'}

                  {newRole === 'HEAD_JUDGE' &&
                    'Oversees scoring, can verify and lock scores for an event.'}

                  {newRole === 'VENUE_COORDINATOR' &&
                    'Manages check-in, schedule, and on-site ops for a venue.'}

                  {newRole === 'SCHOOL_COORDINATOR' &&
                    'Registers and manages teams for their school.'}

                  {newRole === 'JUDGE' &&
                    'Submits scores for assigned categories at an event.'}

                  {newRole === 'CHECKIN_VOLUNTEER' &&
                    'Scans QR codes and marks team check-in at a venue.'}
                </p>
              </div>

              {/* Duplicate role warning */}

              {editTarget.assignments.some(
                (assignment) => assignment.role === newRole
              ) && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />

                  <p className="text-xs text-yellow-300">
                    This user already has the selected role.
                  </p>
                </div>
              )}

            </div>
          )}
        </Modal>
      </main>

      {/* ── Background styles ───────────────────────────────────────────── */}

      <style jsx global>{`

        /* PAGE BASE */

        .staff-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .staff-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* IMPORTANT:
           This layer must never create a dark overlay or blur the page.
           It only contains the animated background elements. */

        .staff-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* GLOWING ORBS */

        .staff-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .staff-orb-one {
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
          animation: staffOrbOne 18s ease-in-out infinite alternate;
        }

        .staff-orb-two {
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
          animation: staffOrbTwo 22s ease-in-out infinite alternate;
        }

        .staff-orb-three {
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
          animation: staffOrbThree 20s ease-in-out infinite alternate;
        }

        .staff-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: staffOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .staff-dot-grid {
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

        .staff-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .staff-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: staffRingOne 35s linear infinite;
        }

        .staff-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: staffRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .staff-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: staffParticle 8s ease-in-out infinite alternate;
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

        .staff-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .staff-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: staffBubbleFloat linear infinite;
        }

        .staff-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .staff-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes staffBubbleFloat {
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

        .staff-center-glow {
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

        /* TRANSPARENT CONTENT CARDS
           No backdrop blur and no dark full-screen layer. */

        .staff-page .staff-transparent-card {
          background: rgba(18, 12, 29, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .staff-page .staff-table-card {
          background: rgba(18, 12, 29, 0.10) !important;
        }

        /* Keep the table itself transparent */

        .staff-page .staff-table-card table,
        .staff-page .staff-table-card thead,
        .staff-page .staff-table-card tbody {
          background: transparent !important;
        }

        .staff-page .staff-table-card th {
          background: rgba(18, 12, 29, 0.16) !important;
        }

        .staff-page .staff-table-card td {
          background: transparent !important;
        }

        .staff-page .staff-table-card tbody tr:hover td {
          background: rgba(168, 85, 247, 0.07) !important;
        }

        /* ANIMATIONS */

        @keyframes staffOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes staffOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes staffOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes staffOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes staffRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes staffRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes staffParticle {
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
          .staff-orb-one {
            width: 320px;
            height: 320px;
          }

          .staff-orb-two {
            width: 360px;
            height: 360px;
          }

          .staff-orb-three {
            width: 340px;
            height: 340px;
          }

          .staff-ring-one {
            width: 300px;
            height: 300px;
          }

          .staff-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .staff-orb,
          .staff-ring,
          .staff-particle,
          .staff-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}