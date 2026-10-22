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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { UserRole, UserProfile, RoleAssignment } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: RoleAssignment[];
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Fetch user profile
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          }
          // Role assignments would be fetched from Firestore in production
          // For demo: check custom claims or roleAssignments collection
          setRoles([]);
        } catch {
          // Firebase not configured yet – run in demo mode
          setProfile({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            state: 'ACTIVE',
            createdAt: null,
            updatedAt: null,
          });
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
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      displayName,
      email,
      state: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
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
    <AuthContext.Provider value={{ user, profile, roles, loading, primaryRole, signIn, signUp, signOut, resetPassword, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
