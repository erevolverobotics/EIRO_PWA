import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GoogleAuth } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount {
  const {
    PRIVATE_FUNCTION_INVOKER_PROJECT_ID,
    PRIVATE_FUNCTION_INVOKER_CLIENT_EMAIL,
    PRIVATE_FUNCTION_INVOKER_PRIVATE_KEY,
  } = process.env;
  if (!PRIVATE_FUNCTION_INVOKER_PROJECT_ID ||
      !PRIVATE_FUNCTION_INVOKER_CLIENT_EMAIL ||
      !PRIVATE_FUNCTION_INVOKER_PRIVATE_KEY) {
    throw new Error('Private function invoker credentials are not configured.');
  }
  if (PRIVATE_FUNCTION_INVOKER_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error('Private function invoker project does not match the Firebase client project.');
  }
  return {
    project_id: PRIVATE_FUNCTION_INVOKER_PROJECT_ID,
    client_email: PRIVATE_FUNCTION_INVOKER_CLIENT_EMAIL,
    private_key: PRIVATE_FUNCTION_INVOKER_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

function getAdminApp() {
  const serviceAccount = getServiceAccount();
  return getApps().find(app => app.name === 'student-delete-proxy') ??
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    }, 'student-delete-proxy');
}

function validateRunUrl(value: string | undefined): string {
  if (!value) throw new Error('Private student deletion function URL is not configured.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.run.app') || url.pathname !== '/') {
    throw new Error('Private student deletion function URL must be an HTTPS Cloud Run service URL.');
  }
  return url.origin;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const idToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'A valid studentId and optional destinationTeamId are required.' }, { status: 400 });
  }
  const requestData = body as Record<string, unknown>;
  const studentId = requestData.studentId;
  const destinationTeamId = requestData.destinationTeamId;
  if (
    typeof studentId !== 'string' || studentId.trim().length === 0 || studentId.length > 150 ||
    (destinationTeamId !== undefined &&
      (typeof destinationTeamId !== 'string' || destinationTeamId.trim().length === 0 || destinationTeamId.length > 150))
  ) {
    return NextResponse.json({ error: 'A valid studentId and optional destinationTeamId are required.' }, { status: 400 });
  }

  try {
    const serviceAccount = getServiceAccount();
    const adminApp = getAdminApp();
    try {
      await getAuth(adminApp).verifyIdToken(idToken);
    } catch (error) {
      console.warn('Rejected invalid Firebase ID token for student deletion', error);
      return NextResponse.json({ error: 'Your sign-in has expired. Sign in again and retry.' }, { status: 401 });
    }

    const serviceUrl = validateRunUrl(process.env.DELETE_REGISTERED_STUDENT_RUN_URL);
    const googleAuth = new GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      projectId: serviceAccount.project_id,
    });
    const idTokenClient = await googleAuth.getIdTokenClient(serviceUrl);
    const iamHeaders = await idTokenClient.getRequestHeaders();
    const iamAuthorization = iamHeaders.get('authorization');
    if (!iamAuthorization) throw new Error('Could not create Cloud Run invocation credentials.');

    const upstreamHeaders = new Headers({
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      'X-Serverless-Authorization': iamAuthorization,
    });
    const appCheckToken = request.headers.get('x-firebase-appcheck');
    if (appCheckToken) upstreamHeaders.set('X-Firebase-AppCheck', appCheckToken);

    const upstream = await fetch(serviceUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify({ data: body }),
      cache: 'no-store',
    });
    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch (error) {
      console.error('Private student deletion function returned invalid JSON', error);
      return NextResponse.json({ error: 'The student deletion service returned an invalid response.' }, { status: 502 });
    }

    const callablePayload = payload as {
      result?: unknown;
      error?: { message?: unknown };
    };
    if (!upstream.ok || callablePayload.error) {
      const message = typeof callablePayload.error?.message === 'string'
        ? callablePayload.error.message
        : 'The student deletion service could not complete the request.';
      return NextResponse.json({ error: message }, { status: upstream.status });
    }
    return NextResponse.json({ data: callablePayload.result });
  } catch (error) {
    console.error('Private student deletion proxy failed', error);
    return NextResponse.json(
      { error: 'Student deletion could not be securely authorized. Check server configuration and retry.' },
      { status: 500 },
    );
  }
}
