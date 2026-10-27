'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, assertFirebaseConfigured, firebaseConfigured } from '@/lib/firebase/config';
import { UserRole, UserProfile, RoleAssignment } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: RoleAssignment[];
  loading: boolean;
  authError: string | null;
  primaryRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (role: UserRole, scopeId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(
    firebaseConfigured ? null : 'Firebase is not configured. Add the required NEXT_PUBLIC_FIREBASE_* values to .env.local.'
  );

  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setAuthError(null);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          setProfile(null);
          setRoles([]);
          // Fetch user profile
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setAuthError('Your user profile is missing. Contact an administrator.');
          }
          // Load roles via individual getDoc calls (not a list query).
          // Use allSettled so a permission-denied on a non-existent role doc
          // doesn't kill the entire Promise — only fulfilled docs are used.
          const ALL_ROLE_KEYS = [
            'SUPER_ADMIN', 'DISTRICT_ADMIN', 'HEAD_JUDGE',
            'VENUE_COORDINATOR', 'SCHOOL_COORDINATOR', 'JUDGE', 'CHECKIN_VOLUNTEER',
          ];
          const roleResults = await Promise.allSettled(
            ALL_ROLE_KEYS.map(role =>
              getDoc(doc(db, 'roleAssignments', `${firebaseUser.uid}_${role}`))
            )
          );
          setRoles(
            roleResults
              .filter(r => r.status === 'fulfilled' && r.value.exists() && r.value.data()?.active === true)
              .map(r => {
                const snap = (r as PromiseFulfilledResult<import('firebase/firestore').DocumentSnapshot>).value;
                return { id: snap.id, ...snap.data() } as RoleAssignment;
              })
          );
        } catch (error) {
          console.error('Failed to load authenticated user data', error);
          setProfile(null);
          setRoles([]);
          setAuthError('Your account data could not be loaded. Check your connection and try again.');
        }
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    assertFirebaseConfigured();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    assertFirebaseConfigured();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });

    const uid = credential.user.uid;

    // Write user profile + default SCHOOL_COORDINATOR role in one batch
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', uid), {
      uid,
      displayName,
      email: email.toLowerCase().trim(),
      state: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Default role — admin can promote/change via /admin/staff
    // Document ID must follow {uid}_{role} pattern for Firestore rules
    batch.set(doc(db, 'roleAssignments', `${uid}_SCHOOL_COORDINATOR`), {
      uid,
      role: 'SCHOOL_COORDINATOR',
      scopeType: 'SCHOOL',
      scopeId: 'unassigned',
      createdBy: 'self',
      active: true,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    // onAuthStateChanged already fired (when createUserWithEmailAndPassword completed)
    // BEFORE the batch write finished, so roles = []. Fix: inject state directly now.
    setUser(credential.user);
    setAuthError(null);
    setProfile({
      uid,
      displayName,
      email: email.toLowerCase().trim(),
      state: 'ACTIVE',
      createdAt: null,
      updatedAt: null,
    });
    setRoles([{
      id: `${uid}_SCHOOL_COORDINATOR`,
      uid,
      role: 'SCHOOL_COORDINATOR' as UserRole,
      scopeType: 'SCHOOL',
      scopeId: 'unassigned',
      createdBy: 'self',
      active: true,
      createdAt: null,
    } as RoleAssignment]);
    setLoading(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    assertFirebaseConfigured();
    await sendPasswordResetEmail(auth, email);
  };

  const hasRole = (role: UserRole, scopeId?: string): boolean => {
    return roles.some(
      (r) => r.role === role && r.active && (!scopeId || r.scopeId === scopeId)
    );
  };

  // Derive primary role from assignments (highest privilege first)
  const ROLE_PRIORITY: UserRole[] = [
    'SUPER_ADMIN', 'DISTRICT_ADMIN', 'HEAD_JUDGE',
    'VENUE_COORDINATOR', 'SCHOOL_COORDINATOR', 'JUDGE',
    'CHECKIN_VOLUNTEER', 'PUBLIC_VIEWER',
  ];

  const primaryRole: UserRole | null = roles.length > 0
    ? ROLE_PRIORITY.find((r) => roles.some((ra) => ra.role === r && ra.active)) ?? null
    : null;

  return (
    <AuthContext.Provider value={{ user, profile, roles, loading, authError, primaryRole, signIn, signUp, signOut, resetPassword, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
