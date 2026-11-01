import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { assertFirebaseConfigured, auth } from './config';

const functions = getFunctions(
  app,
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1'
);

export async function callEiroFunction<TRequest extends Record<string, unknown>, TResponse>(
  name: string,
  data: TRequest
): Promise<TResponse> {
  assertFirebaseConfigured();
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const result = await callable(data);
  return result.data;
}

export async function deleteRegisteredStudent<TRequest extends Record<string, unknown>, TResponse>(
  data: TRequest
): Promise<TResponse> {
  assertFirebaseConfigured();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before deleting a student.');

  const idToken = await user.getIdToken();
  const response = await fetch('/api/admin/delete-registered-student', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const result = await response.json() as { data?: TResponse; error?: string };
  if (!response.ok || result.data === undefined) {
    throw new Error(result.error || 'Student deletion could not be completed.');
  }
  return result.data;
}
