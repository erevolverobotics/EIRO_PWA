'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Search, CheckCircle2, XCircle, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { getOne } from '@/lib/firebase/firestore';

type Certificate = {
  id: string;
  status?: string;
  participantName?: string;
  name?: string;
  teamName?: string;
  eventName?: string;
  categoryName?: string;
  categoryCode?: string;
  achievement?: string;
  position?: string;
  issuedAt?: { toDate?: () => Date } | string;
};

type VerificationState = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

export default function VerifyPage() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<VerificationState>('idle');
  const [result, setResult] = useState<Certificate | null>(null);

  const handleVerify = async () => {
    const verificationCode = code.trim();
    if (!verificationCode) return;
    setState('loading');
    setResult(null);
    try {
      const certificate = await getOne<Certificate>('certificates', verificationCode);
      if (certificate?.status === 'ACTIVE') {
        setResult(certificate);
        setState('found');
      } else {
        setState('notfound');
      }
    } catch {
      setState('error');
    }
  };

  const issuedDate = result?.issuedAt
    ? (typeof result.issuedAt === 'string' ? new Date(result.issuedAt) : result.issuedAt.toDate?.())?.toLocaleDateString()
    : undefined;

  return (
    <div className="min-h-screen animated-bg flex flex-col">
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="font-bold text-white">EIRO</span></Link>
        <div className="flex gap-4 items-center"><Link href="/events" className="text-sm text-gray-400 hover:text-white">Events</Link><Link href="/results" className="text-sm text-gray-400 hover:text-white">Results</Link><Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white">Sign In</Link></div>
      </nav>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-indigo-400" /></div>
            <h1 className="text-3xl font-black text-white mb-2">Certificate Verification</h1>
            <p className="text-gray-400 text-sm">Enter the verification code printed on the certificate.</p>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
            <label htmlFor="certificate-code" className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
            <div className="flex gap-3">
              <input id="certificate-code" value={code} onChange={event => { setCode(event.target.value); setState('idle'); }} onKeyDown={event => event.key === 'Enter' && void handleVerify()} placeholder="Enter certificate code" className="eiro-input flex-1 font-mono text-sm" />
              <Button icon={state === 'loading' ? Loader2 : Search} onClick={() => void handleVerify()} disabled={state === 'loading'}>Verify</Button>
            </div>
          </div>
          {state === 'loading' && <p className="text-center text-gray-400 py-6" role="status">Checking certificate…</p>}
          {state === 'error' && <div role="alert" className="glass rounded-2xl border border-red-500/30 p-6 text-red-400">Certificate verification is temporarily unavailable. Please try again.</div>}
          {state === 'notfound' && <div className="glass rounded-2xl border border-red-500/30 bg-red-500/5 p-6"><div className="flex items-center gap-3"><XCircle className="w-7 h-7 text-red-400" /><div><p className="font-bold text-red-400">Certificate Not Found</p><p className="text-sm text-gray-400 mt-1">No active certificate matches this code.</p></div></div><p className="text-xs text-gray-500 mt-4 flex gap-1"><AlertCircle className="w-3 h-3" />Check the code or contact the EIRO organizing team.</p></div>}
          {state === 'found' && result && <div className="glass rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
            <div className="flex items-center gap-3 mb-5"><CheckCircle2 className="w-7 h-7 text-green-400" /><div><p className="font-bold text-green-400">Certificate is Valid</p><p className="text-xs text-gray-500">Verified against active certificate records</p></div></div>
            <div className="space-y-3">{[
              ['Participant', result.participantName ?? result.name],
              ['Team', result.teamName],
              ['Event', result.eventName],
              ['Category', result.categoryName ?? result.categoryCode],
              ['Achievement', result.achievement ?? result.position],
              ['Issued On', issuedDate],
            ].filter((row): row is [string, string] => Boolean(row[1])).map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2 border-b border-white/5 text-sm last:border-0"><span className="text-gray-500">{label}</span><span className="text-white font-medium text-right">{value}</span></div>)}</div>
            <p className="text-xs text-gray-500 mt-4">Verification code: <span className="font-mono text-indigo-400">{code.trim()}</span></p>
          </div>}
          <p className="text-center text-xs text-gray-600 mt-8">Only certificate fields permitted by the public verification rules are shown.</p>
        </div>
      </main>
    </div>
  );
}
