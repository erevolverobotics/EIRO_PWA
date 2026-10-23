'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, setDoc, updateDoc, doc,
  serverTimestamp, getDoc, query, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-context';
import { PageHeader, Card, KpiCard, Button, Badge, Modal, Select } from '@/components/ui';
import {
  Users, Plus, Shield, Mail, Search, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, UserX, Edit3, ShieldCheck,
} from 'lucide-react';
import type { UserRole, ScopeType, RoleAssignment, UserProfile } from '@/lib/types';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: { value: UserRole; label: string; scopeType: ScopeType }[] = [
  { value: 'SUPER_ADMIN',        label: 'Super Admin',         scopeType: 'GLOBAL'   },
  { value: 'DISTRICT_ADMIN',     label: 'District Admin',      scopeType: 'DISTRICT' },
  { value: 'HEAD_JUDGE',         label: 'Head Judge',          scopeType: 'EVENT'    },
  { value: 'VENUE_COORDINATOR',  label: 'Venue Coordinator',   scopeType: 'VENUE'    },
  { value: 'SCHOOL_COORDINATOR', label: 'School Coordinator',  scopeType: 'SCHOOL'   },
  { value: 'JUDGE',              label: 'Judge',               scopeType: 'EVENT'    },
  { value: 'CHECKIN_VOLUNTEER',  label: 'Check-in Volunteer',  scopeType: 'VENUE'    },
];

const ROLE_BADGE: Record<string, 'danger' | 'warning' | 'purple' | 'success' | 'info' | 'default'> = {
  SUPER_ADMIN:        'danger',
  DISTRICT_ADMIN:     'warning',
  HEAD_JUDGE:         'purple',
  VENUE_COORDINATOR:  'success',
  SCHOOL_COORDINATOR: 'info',
  JUDGE:              'purple',
  CHECKIN_VOLUNTEER:  'default',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveAssignment = RoleAssignment & { firestoreId: string };

interface UserRow {
  profile: UserProfile;
  assignments: ActiveAssignment[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { user } = useAuth();

  const [rows, setRows]             = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [revoking, setRevoking]     = useState<string | null>(null);

  // Edit-role modal state
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [newRole, setNewRole]       = useState<UserRole>('JUDGE');
  const [newScope, setNewScope]     = useState('global');

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, assignSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'roleAssignments'), where('active', '==', true))),
      ]);

      const profiles  = usersSnap.docs.map(d => d.data() as UserProfile);
      const assignments: ActiveAssignment[] = assignSnap.docs.map(d => ({
        ...(d.data() as RoleAssignment),
        firestoreId: d.id,
      }));

      const byUid: Record<string, ActiveAssignment[]> = {};
      for (const a of assignments) {
        if (!byUid[a.uid]) byUid[a.uid] = [];
        byUid[a.uid].push(a);
      }

      // Show ALL registered users, regardless of whether they have a role
      const built: UserRow[] = profiles.map(p => ({
        profile: p,
        assignments: byUid[p.uid] ?? [],
      }));

      built.sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
      setRows(built);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open edit modal ─────────────────────────────────────────────────────────

  const openEdit = (row: UserRow) => {
    setEditTarget(row);
    setNewRole('JUDGE');
    setNewScope('global');
  };

  // ── Assign / update role ────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!editTarget || !user) return;
    setSaving(true);
    try {
      const roleInfo = ALL_ROLES.find(r => r.value === newRole)!;
      const docId    = `${editTarget.profile.uid}_${newRole}`;
      const existing = await getDoc(doc(db, 'roleAssignments', docId));

      if (existing.exists() && existing.data().active) {
        toast.error(`${editTarget.profile.displayName} already has the ${roleInfo.label} role.`);
        setSaving(false);
        return;
      }

      // Use setDoc — ID matches the rules pattern: {uid}_{role}
      await setDoc(doc(db, 'roleAssignments', docId), {
        uid:       editTarget.profile.uid,
        role:      newRole,
        scopeType: roleInfo.scopeType,
        scopeId:   newScope.trim() || 'global',
        createdBy: user.uid,
        active:    true,
        createdAt: serverTimestamp(),
      });

      toast.success(`${roleInfo.label} assigned to ${editTarget.profile.displayName}`);
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

  const handleRevoke = async (firestoreId: string, roleName: string, displayName: string) => {
    if (!confirm(`Remove ${roleName.replace(/_/g, ' ')} from ${displayName}?`)) return;
    setRevoking(firestoreId);
    try {
      await updateDoc(doc(db, 'roleAssignments', firestoreId), { active: false });
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

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.profile.displayName.toLowerCase().includes(q) ||
      r.profile.email.toLowerCase().includes(q) ||
      r.assignments.some(a => a.role.toLowerCase().includes(q))
    );
  });

  // ── Counts ──────────────────────────────────────────────────────────────────

  const allAssignments = rows.flatMap(r => r.assignments);
  const withRole       = rows.filter(r => r.assignments.length > 0).length;
  const noRole         = rows.filter(r => r.assignments.length === 0).length;
  const judgeCount     = allAssignments.filter(a => a.role === 'JUDGE' || a.role === 'HEAD_JUDGE').length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Users & Role Management"
        subtitle={`${rows.length} registered users — assign and manage roles`}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Users"  value={rows.length}  icon={Users}       color="indigo" />
        <KpiCard title="With Role"    value={withRole}     icon={ShieldCheck} color="green"  />
        <KpiCard title="No Role Yet"  value={noRole}       icon={Users}       color="orange" />
        <KpiCard title="Judges"       value={judgeCount}   icon={Shield}      color="purple" />
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="eiro-input pl-9 w-full"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">{search ? 'No users match your search.' : 'No registered users yet.'}</p>
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
                {filtered.map(row => (
                  <tr key={row.profile.uid}>

                    {/* Avatar + name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {row.profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{row.profile.displayName}</p>
                          <p className="text-[10px] text-gray-600 font-mono">{row.profile.uid.slice(0, 14)}…</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                        {row.profile.email}
                      </div>
                    </td>

                    {/* Role badges + revoke */}
                    <td>
                      {row.assignments.length === 0 ? (
                        <span className="text-xs text-gray-600 italic">No role assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.assignments.map(a => (
                            <div key={a.firestoreId} className="flex items-center gap-1">
                              <Badge variant={ROLE_BADGE[a.role]}>
                                {a.role.replace(/_/g, ' ')}
                                {a.scopeId !== 'global' && (
                                  <span className="ml-1 opacity-60">· {a.scopeId}</span>
                                )}
                              </Badge>
                              <button
                                onClick={() => handleRevoke(a.firestoreId, a.role, row.profile.displayName)}
                                disabled={revoking === a.firestoreId}
                                title="Remove role"
                                className="ml-0.5 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                              >
                                {revoking === a.firestoreId
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <UserX className="w-3 h-3" />
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Assign / add role */}
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={row.assignments.length === 0 ? Plus : Edit3}
                        onClick={() => openEdit(row)}
                      >
                        {row.assignments.length === 0 ? 'Assign Role' : 'Add Role'}
                      </Button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit / Assign Role Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget?.assignments.length === 0 ? 'Assign Role' : 'Add Another Role'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button icon={CheckCircle2} loading={saving} onClick={handleAssign}>
              Save Role
            </Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {editTarget.profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{editTarget.profile.displayName}</p>
                <p className="text-xs text-gray-500">{editTarget.profile.email}</p>
              </div>
            </div>

            {/* Current roles */}
            {editTarget.assignments.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Current roles:</p>
                <div className="flex flex-wrap gap-1.5">
                  {editTarget.assignments.map(a => (
                    <Badge key={a.firestoreId} variant={ROLE_BADGE[a.role]}>
                      {a.role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Select
              id="edit-role"
              label="Role to Assign"
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              options={ALL_ROLES.map(r => ({ value: r.value, label: r.label }))}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Scope ID
              </label>
              <input
                id="edit-scope"
                type="text"
                className="eiro-input w-full"
                value={newScope}
                onChange={e => setNewScope(e.target.value)}
                placeholder={
                  newRole === 'SUPER_ADMIN'        ? 'global' :
                  newRole === 'DISTRICT_ADMIN'     ? 'e.g. district_chennai' :
                  newRole === 'JUDGE' || newRole === 'HEAD_JUDGE' ? 'e.g. event_2026_chennai' :
                  newRole === 'VENUE_COORDINATOR' || newRole === 'CHECKIN_VOLUNTEER' ? 'e.g. venue_abc' :
                  newRole === 'SCHOOL_COORDINATOR' ? 'e.g. school_001' : 'global'
                }
              />
              <p className="text-[11px] text-gray-600 mt-1">
                Scope type: <span className="text-indigo-400">
                  {ALL_ROLES.find(r => r.value === newRole)?.scopeType}
                </span>
              </p>
            </div>

            {/* Role description */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-xs text-gray-500">
                {newRole === 'SUPER_ADMIN'        && 'Full platform access. Manage all seasons, staff, and settings.'}
                {newRole === 'DISTRICT_ADMIN'     && 'Manages all events, schools, and staff within their district.'}
                {newRole === 'HEAD_JUDGE'         && 'Oversees scoring, can verify and lock scores for an event.'}
                {newRole === 'VENUE_COORDINATOR'  && 'Manages check-in, schedule, and on-site ops for a venue.'}
                {newRole === 'SCHOOL_COORDINATOR' && 'Registers and manages teams for their school.'}
                {newRole === 'JUDGE'              && 'Submits scores for assigned categories at an event.'}
                {newRole === 'CHECKIN_VOLUNTEER'  && 'Scans QR codes and marks team check-in at a venue.'}
              </p>
            </div>

            {editTarget.assignments.some(a => a.role === newRole) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-xs text-yellow-300">This user already has the selected role.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
