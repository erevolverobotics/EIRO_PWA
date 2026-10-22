'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Search, CheckCircle2, XCircle, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

const MOCK_CERTS: Record<string, { valid: boolean; name: string; team: string; event: string; category: string; position: string; issuedOn: string }> = {
  'CERT-2026-EIRO-ABC123': {
    valid: true,
    name: 'Arjun Sharma',
    team: 'Robo Warriors',
    event: 'EIRO 2026 District Preliminary — Chennai',
    category: 'Sumo Wrestling',
    position: '1st Place — District',
    issuedOn: 'November 1, 2026',
  },
  'CERT-2026-EIRO-DEF456': {
    valid: true,
    name: 'Pooja Nair',
    team: 'Maze Masters',
    event: 'EIRO 2026 District Preliminary — Chennai',
    category: 'Maze Solver',
    position: '2nd Place — District',
    issuedOn: 'November 1, 2026',
  },
};

export default function VerifyPage() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'revoked'>('idle');
  const [result, setResult] = useState<(typeof MOCK_CERTS)[string] | null>(null);

  const handleVerify = () => {
    if (!code.trim()) return;
    setState('loading');
    setTimeout(() => {
      const found = MOCK_CERTS[code.trim()];
      if (found) {
        setResult(found);
        setState('found');
      } else {
        setState('notfound');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen animated-bg flex flex-col">
      <nav className="glass border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">EIRO 2026</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/events" className="text-sm text-gray-400 hover:text-white">Events</Link>
          <Link href="/results" className="text-sm text-gray-400 hover:text-white">Results</Link>
          <Link href="/login" className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Certificate Verification</h1>
            <p className="text-gray-400 text-sm">
              Enter the unique verification code printed on your EIRO certificate to verify its authenticity.
            </p>
          </div>

          {/* Search */}
          <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setState('idle'); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="e.g. CERT-2026-EIRO-ABC123"
                className="eiro-input flex-1 font-mono text-sm"
              />
              <Button icon={state === 'loading' ? Loader2 : Search} onClick={handleVerify} disabled={state === 'loading'}>
                Verify
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Try demo codes: <button onClick={() => setCode('CERT-2026-EIRO-ABC123')} className="text-indigo-400 hover:underline font-mono">CERT-2026-EIRO-ABC123</button>
              {' '}or{' '}
              <button onClick={() => setCode('CERT-2026-EIRO-DEF456')} className="text-indigo-400 hover:underline font-mono">CERT-2026-EIRO-DEF456</button>
            </p>
          </div>

          {/* Result */}
          {state === 'found' && result && (
            <div className="glass rounded-2xl border border-green-500/30 bg-green-500/5 p-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-400">Certificate is Valid</p>
                  <p className="text-xs text-gray-500">Verified against EIRO 2026 official records</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Participant', value: result.name },
                  { label: 'Team', value: result.team },
                  { label: 'Event', value: result.event },
                  { label: 'Category', value: result.category },
                  { label: 'Achievement', value: result.position },
                  { label: 'Issued On', value: result.issuedOn },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 border-b border-white/5 text-sm last:border-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-white font-medium text-right">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500">Verification code: <span className="font-mono text-indigo-400">{code}</span></p>
              </div>
            </div>
          )}

          {state === 'notfound' && (
            <div className="glass rounded-2xl border border-red-500/30 bg-red-500/5 p-6 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <XCircle className="w-7 h-7 text-red-400" />
                <div>
                  <p className="font-bold text-red-400">Certificate Not Found</p>
                  <p className="text-sm text-gray-400 mt-1">No EIRO certificate matches this code. Please check the code and try again.</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  If you believe this is an error, contact your school coordinator or the EIRO organizing team.
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-600 mt-8">
            Only approved minimum data is shown. EIRO certificate verification is provided by Evolve Robotics.
          </p>
        </div>
      </div>
    </div>
  );
}
