import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { assertFirebaseConfigured } from './config';

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
