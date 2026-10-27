/**
 * Firestore helpers — EIRO PWA
 * Centralised CRUD wrappers used across all admin pages.
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { assertFirebaseConfigured, db } from './config';

// ─── Re-export commonly used firebase/firestore primitives ─────────────────
export {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, serverTimestamp, Timestamp,
};
export { db };

// ─── Generic helpers ──────────────────────────────────────────────────────

/** Fetch all documents from a collection as typed objects (includes document ID as `id`). */
export async function getAll<T>(col: string): Promise<(T & { id: string })[]> {
  assertFirebaseConfigured();
  const snap = await getDocs(collection(db, col));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as T) }));
}

/** Fetch a single document by ID. Returns null if it doesn't exist. */
export async function getOne<T>(col: string, id: string): Promise<(T & { id: string }) | null> {
  assertFirebaseConfigured();
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

/** Add a new document to a collection (auto-generated ID). Returns the new document's ID. */
export async function addItem<T extends object>(col: string, data: T): Promise<string> {
  assertFirebaseConfigured();
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Set (create or overwrite) a document with a specific ID. */
export async function setItem<T extends object>(col: string, id: string, data: T): Promise<void> {
  assertFirebaseConfigured();
  await setDoc(doc(db, col, id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Update specific fields of an existing document. */
export async function updateItem<T extends object>(col: string, id: string, data: Partial<T>): Promise<void> {
  assertFirebaseConfigured();
  await updateDoc(doc(db, col, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a document. */
export async function deleteItem(col: string, id: string): Promise<void> {
  assertFirebaseConfigured();
  await deleteDoc(doc(db, col, id));
}

/** Query a collection by a single field value. */
export async function queryByField<T>(
  col: string,
  field: string,
  value: unknown
): Promise<(T & { id: string })[]> {
  assertFirebaseConfigured();
  const snap = await getDocs(query(collection(db, col), where(field, '==', value)));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as T) }));
}

// ─── Domain-specific helpers ──────────────────────────────────────────────

/** Look up a user's UID from the `users` collection by email. */
export async function getUserUidByEmail(email: string): Promise<string | null> {
  const results = await queryByField<{ uid: string }>('users', 'email', email.toLowerCase().trim());
  return results[0]?.uid ?? null;
}

/** Create a role assignment document using the {uid}_{ROLE} pattern. */
export async function assignRole(params: {
  uid: string;
  role: string;
  scopeType: string;
  scopeId: string;
  createdBy: string;
}): Promise<void> {
  assertFirebaseConfigured();
  const docId = `${params.uid}_${params.role}`;
  await setDoc(doc(db, 'roleAssignments', docId), {
    uid: params.uid,
    role: params.role,
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    createdBy: params.createdBy,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/** Revoke a role assignment by setting active = false. */
export async function revokeRole(uid: string, role: string): Promise<void> {
  assertFirebaseConfigured();
  const docId = `${uid}_${role}`;
  await updateDoc(doc(db, 'roleAssignments', docId), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}
