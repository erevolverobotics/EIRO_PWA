'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { db, auth } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Shield, LogOut, KeyRound,
  CheckCircle2, Loader2, ArrowLeft, Edit2, Save, X,
} from 'lucide-react';
import Link from 'next/link';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:        'Super Admin',
  DISTRICT_ADMIN:     'District Admin',
  HEAD_JUDGE:         'Head Judge',
  JUDGE:              'Judge / Referee',
  VENUE_COORDINATOR:  'Venue Coordinator',
  CHECKIN_VOLUNTEER:  'Check-in Volunteer',
  SCHOOL_COORDINATOR: 'School Coordinator',
  PUBLIC_VIEWER:      'Public Viewer',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN:        'bg-red-500/20 text-red-300 border-red-500/30',
  DISTRICT_ADMIN:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  HEAD_JUDGE:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  JUDGE:              'bg-purple-500/20 text-purple-300 border-purple-500/30',
  VENUE_COORDINATOR:  'bg-green-500/20 text-green-300 border-green-500/30',
  CHECKIN_VOLUNTEER:  'bg-green-500/20 text-green-300 border-green-500/30',
  SCHOOL_COORDINATOR: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PUBLIC_VIEWER:      'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export default function ProfilePage() {
  const { user, profile, roles, primaryRole, signOut } = useAuth();
  const router = useRouter();

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName]       = useState(profile?.displayName ?? '');
  const [phone, setPhone]                   = useState(profile?.phone ?? '');
  const [savingProfile, setSavingProfile]   = useState(false);

  // Change password state
  const [changingPw, setChangingPw]         = useState(false);
  const [currentPw, setCurrentPw]           = useState('');
  const [newPw, setNewPw]                   = useState('');
  const [confirmPw, setConfirmPw]           = useState('');
  const [savingPw, setSavingPw]             = useState(false);

  const [signingOut, setSigningOut]         = useState(false);

  // ── Save profile ────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!displayName.trim()) { toast.error('Display name cannot be empty.'); return; }
    if (!user) return;
    setSavingProfile(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() });
      // Update Firestore users doc
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        updatedAt: serverTimestamp(),
      });
      toast.success('Profile updated! ✅');
      setEditingProfile(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────────

  const changePassword = async () => {
    if (!currentPw) { toast.error('Enter your current password.'); return; }
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match.'); return; }
    if (!user?.email) return;
    setSavingPw(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      toast.success('Password changed successfully! ✅');
      setChangingPw(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      console.error(e);
      const msg = e?.code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : e instanceof Error ? e.message : 'Failed to change password.';
      toast.error(msg);
    } finally {
      setSavingPw(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (e) {
      console.error(e);
      toast.error('Sign out failed.');
      setSigningOut(false);
    }
  };

  // Initials avatar
  const initials = (profile?.displayName ?? user?.displayName ?? user?.email ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const activeRoles = roles.filter(r => r.active);

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Top nav bar */}
      <div className="border-b border-white/5 bg-[#0d1327]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-white/20">/</span>
          <span className="text-sm text-gray-300 font-medium">My Profile</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Avatar + name card ─────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
          {/* Gradient banner */}
          <div className="h-24 bg-gradient-to-r from-indigo-600/40 via-purple-600/30 to-blue-600/40" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white border-4 border-[#0a0f1e] shadow-xl">
                {initials}
              </div>
              <button
                onClick={() => { setDisplayName(profile?.displayName ?? ''); setPhone(profile?.phone ?? ''); setEditingProfile(true); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>

            {!editingProfile ? (
              <>
                <h1 className="text-2xl font-bold text-white">{profile?.displayName ?? user?.displayName ?? '—'}</h1>
                <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
                {profile?.phone && (
                  <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />{profile.phone}
                  </p>
                )}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    profile?.state === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    profile?.state === 'SUSPENDED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {profile?.state ?? 'Unknown'}
                  </span>
                </div>
              </>
            ) : (
              /* Inline edit form */
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Display Name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="eiro-input w-full"
                    placeholder="Your full name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="eiro-input w-full"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors border border-white/10"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Roles card ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Roles & Permissions</h2>
          </div>

          {activeRoles.length === 0 ? (
            <p className="text-sm text-gray-500">No roles assigned yet. Contact an administrator.</p>
          ) : (
            <div className="space-y-2">
              {activeRoles.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLOR[r.role] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {ROLE_LABEL[r.role] ?? r.role}
                    </span>
                    {r.role === primaryRole && (
                      <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  {r.scopeId && r.scopeId !== 'unassigned' && (
                    <span className="text-xs text-gray-500 font-mono">{r.scopeId}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Account info card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Account Info</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-500 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
              <span className="text-gray-200 font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-500">User ID</span>
              <span className="text-gray-500 font-mono text-xs">{user?.uid}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-500">Email Verified</span>
              <span className={user?.emailVerified ? 'text-green-400 flex items-center gap-1' : 'text-amber-400'}>
                {user?.emailVerified ? <><CheckCircle2 className="w-3.5 h-3.5" /> Verified</> : 'Not Verified'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Account Status</span>
              <span className={profile?.state === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}>
                {profile?.state ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Security card ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">Security</h2>
            </div>
            {!changingPw && (
              <button
                onClick={() => setChangingPw(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Change Password
              </button>
            )}
          </div>

          {!changingPw ? (
            <p className="text-sm text-gray-500">Password last changed: unknown. Use the button above to update your password.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Current Password *</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="eiro-input w-full"
                  placeholder="Enter current password"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">New Password *</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="eiro-input w-full"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="eiro-input w-full"
                  placeholder="Repeat new password"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={changePassword}
                  disabled={savingPw}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {savingPw ? 'Changing…' : 'Change Password'}
                </button>
                <button
                  onClick={() => { setChangingPw(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sign out ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-300 text-sm">Sign Out</p>
            <p className="text-xs text-gray-500 mt-0.5">You will be redirected to the login page.</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-sm font-medium transition-all disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>

      </div>
    </div>
  );
}
