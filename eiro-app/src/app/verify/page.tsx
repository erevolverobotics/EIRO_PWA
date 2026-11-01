'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  AlertCircle,
  ArrowRight,
  Award,
} from 'lucide-react';
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

  const handleVerify = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    const verificationCode = code.trim();
    if (!verificationCode) return;

    setState('loading');
    setResult(null);

    try {
      const certificate = await getOne<Certificate>(
        'certificates',
        verificationCode
      );

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
    ? (
        typeof result.issuedAt === 'string'
          ? new Date(result.issuedAt)
          : result.issuedAt.toDate?.()
      )?.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : undefined;

  const certificateDetails = result
    ? [
        ['Participant', result.participantName ?? result.name],
        ['Team', result.teamName],
        ['Event', result.eventName],
        ['Category', result.categoryName ?? result.categoryCode],
        ['Achievement', result.achievement ?? result.position],
        ['Issued On', issuedDate],
      ].filter((row): row is [string, string] => Boolean(row[1]))
    : [];

  return (
    <main className="eiro-verify relative min-h-screen overflow-hidden bg-[#050308] px-4 py-6 sm:px-6">

      {/* Animated Background */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="eiro-orb eiro-orb-one" />
        <div className="eiro-orb eiro-orb-two" />
        <div className="eiro-orb eiro-orb-three" />
        <div className="eiro-orb eiro-orb-four" />

        <div className="eiro-dot-grid absolute inset-0" />

        <div className="eiro-ring eiro-ring-one" />
        <div className="eiro-ring eiro-ring-two" />

        <div className="eiro-particle particle-one" />
        <div className="eiro-particle particle-two" />
        <div className="eiro-particle particle-three" />
        <div className="eiro-particle particle-four" />
        <div className="eiro-particle particle-five" />
        <div className="eiro-particle particle-six" />

        <div className="eiro-center-glow" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/5 pb-4">

        <Link
          href="/"
          aria-label="EIRO home"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] shadow-[0_5px_20px_rgba(178,75,178,0.15)]">
            <Image
              src="/IMAGES/image-removebg-preview%20(8).png"
              alt="EIRO logo"
              width={38}
              height={38}
              className="h-9 w-9 object-contain"
            />
          </div>

          <span className="text-lg font-extrabold tracking-tight text-[#f5f0fd]">
            EIRO <span className="eiro-gradient-text">Platform</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/events"
            className="text-xs font-medium text-[#a99dbb] transition-colors hover:text-white sm:text-sm"
          >
            Events
          </Link>

          <Link
            href="/results"
            className="text-xs font-medium text-[#a99dbb] transition-colors hover:text-white sm:text-sm"
          >
            Results
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-fuchsia-400/20 bg-gradient-to-r from-[#92278f] to-[#633bee] px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_20px_rgba(124,58,237,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(124,58,237,0.3)] sm:px-5 sm:text-sm"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-110px)] w-full max-w-[650px] flex-col justify-center py-12">

        {/* Heading - Appears First */}
        <header className="eiro-heading mb-8 text-center sm:mb-10">


          <h1 className="text-[27px] font-extrabold tracking-tight text-[#f5f0fd] sm:text-[34px]">
            Certificate <span className="eiro-gradient-text">Verification</span>
          </h1>

          <div className="eiro-accent-line mx-auto mt-3 h-1 w-14 rounded-full" />

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#bdb3d8]">
            Verify the authenticity of your EIRO certificates using the unique
            verification code printed on your certificate.
          </p>
        </header>

        {/* Verification Card - Appears After Heading */}
        <section className="eiro-card relative overflow-hidden rounded-[25px] border border-white/10 bg-[rgba(18,12,29,0.88)] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:rounded-[30px] sm:p-8">

          <div className="eiro-card-top-line absolute left-0 right-0 top-0 h-[3px]" />

          <div className="mb-6 text-center">
          

            <p className="mt-2 text-xs leading-5 text-[#9b90aa] sm:text-sm">
              Enter your certificate verification code below.
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-4">

            <div>
              <label
                htmlFor="certificate-code"
                className="mb-2 block text-sm font-semibold text-[#e2d7f5]"
              >
                Certificate Verification Code
              </label>

              <div className="relative">
                <input
                  id="certificate-code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setState('idle');
                    setResult(null);
                  }}
                  placeholder="Enter your certificate code"
                  autoComplete="off"
                  required
                  className="eiro-input w-full rounded-xl border border-white/10 bg-[#100b1a]/90 px-4 py-3.5 pr-11 font-mono text-sm text-[#f5f0fd] outline-none transition-all duration-300 placeholder:font-sans placeholder:text-[#81768f] hover:border-fuchsia-400/50 focus:border-fuchsia-400 focus:bg-[#140d20] focus:ring-4 focus:ring-purple-500/15"
                />

                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b90aa]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={state === 'loading' || !code.trim()}
              className="eiro-submit group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#92278f] via-[#8036b9] to-[#633bee] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(124,58,237,0.32)] focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Certificate...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Verify Certificate
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Loading State */}
          {state === 'loading' && (
            <div
              role="status"
              className="mt-6 flex flex-col items-center rounded-xl border border-purple-400/15 bg-purple-500/[0.06] p-5"
            >
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-violet-400" />

              <p className="text-sm font-semibold text-[#e2d7f5]">
                Checking Certificate
              </p>

              <p className="mt-1 text-xs text-[#9b90aa]">
                Please wait while we verify your certificate...
              </p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-5"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-7 w-7 shrink-0 text-rose-400" />

                <div>
                  <p className="font-bold text-rose-400">
                    Verification Failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#bdb3d8]">
                    Certificate verification is temporarily unavailable.
                    Please try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Not Found */}
          {state === 'notfound' && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-5"
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 shrink-0 text-rose-400" />

                <div>
                  <p className="font-bold text-rose-400">
                    Certificate Not Found
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#bdb3d8]">
                    No active certificate matches this verification code.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 border-t border-white/5 pt-4">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />

                <p className="text-xs text-[#9b90aa]">
                  Please check your code or contact the EIRO organizing team.
                </p>
              </div>
            </div>
          )}

          {/* Valid Certificate */}
          {state === 'found' && result && (
            <div
              role="status"
              className="eiro-result mt-6 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05]"
            >
              <div className="flex items-center gap-3 border-b border-emerald-400/10 bg-emerald-500/[0.06] p-5">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>

                <div>
                  <p className="font-extrabold text-emerald-400">
                    Certificate is Valid!
                  </p>

                  <p className="mt-1 text-xs text-[#9b90aa]">
                    Successfully verified against active certificate records.
                  </p>
                </div>
              </div>

              <div className="p-5">

                <div className="mb-4 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#bd68d5]" />

                  <h3 className="text-sm font-bold text-[#e2d7f5]">
                    Certificate Details
                  </h3>
                </div>

                <div className="space-y-0">
                  {certificateDetails.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-3 text-sm last:border-0"
                    >
                      <span className="shrink-0 text-[#9b90aa]">
                        {label}
                      </span>

                      <span className="text-right font-semibold text-[#f5f0fd]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-purple-400/15 bg-purple-500/[0.06] p-3">
                  <p className="text-[11px] font-medium text-[#9b90aa]">
                    VERIFICATION CODE
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-semibold text-violet-300">
                    {code.trim()}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400">
                  <Shield className="h-3.5 w-3.5" />
                  Authenticated by EIRO Platform
                </div>
              </div>
            </div>
          )}


        </section>

        {/* Footer */}
        <footer className="mt-7 pb-3 text-center">
          <p className="text-xs text-[#81768f]">
            © 2026 EIRO Platform. All rights reserved.
          </p>

          <p className="mt-1 text-[10px] text-[#655b70]">
            Empowering the next generation of robotics innovators.
          </p>
        </footer>
      </div>

      {/* Background Animation Styles */}
      <style jsx global>{`
        .eiro-verify {
          isolation: isolate;
        }

        /* Background Glows */
        .eiro-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .eiro-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.30),
            rgba(216, 180, 254, 0.06) 70%,
            transparent
          );
          animation: eiroOrbOne 18s ease-in-out infinite alternate;
        }

        .eiro-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.22),
            rgba(196, 181, 253, 0.06) 65%,
            transparent
          );
          animation: eiroOrbTwo 22s ease-in-out infinite alternate;
        }

        .eiro-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.18),
            rgba(232, 121, 249, 0.04) 68%,
            transparent
          );
          animation: eiroOrbThree 20s ease-in-out infinite alternate;
        }

        .eiro-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.19),
            transparent 72%
          );
          animation: eiroOrbFour 17s ease-in-out infinite alternate;
        }

        /* Dot Grid */
        .eiro-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.45;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* Decorative Rings */
        .eiro-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.10);
          border-radius: 50%;
          will-change: transform;
        }

        .eiro-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: eiroRingOne 35s linear infinite;
        }

        .eiro-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.12);
          animation: eiroRingTwo 28s linear infinite;
        }

        /* Floating Particles */
        .eiro-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: eiroParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* Subtle Dark Purple Center Glow */
        .eiro-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* Heading Animation */
        .eiro-heading {
          opacity: 0;
          animation: eiroHeadingEnter 700ms
            cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }

        /* Shield Icon Float */
        .eiro-logo-wrap {
          animation: eiroLogoFloat 5s ease-in-out infinite;
        }

        /* Gradient Text */
        .eiro-gradient-text {
          background: linear-gradient(
            110deg,
            #92278f 0%,
            #8036b9 48%,
            #633bee 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Accent Lines */
        .eiro-accent-line,
        .eiro-card-top-line {
          background: linear-gradient(
            90deg,
            #92278f 0%,
            #bd68d5 45%,
            #633bee 100%
          );
        }

        /* Verification Card Animation - Delayed */
        .eiro-card {
          opacity: 0;
          animation: eiroCardEnter 700ms
            cubic-bezier(0.2, 0.7, 0.2, 1) 900ms forwards;
          transition: box-shadow 300ms ease, border-color 300ms ease;
        }

        .eiro-card:hover {
          border-color: rgba(216, 180, 254, 0.35);
          box-shadow: 0 30px 100px rgba(79, 42, 120, 0.15);
        }

        /* Submit Button */
        .eiro-submit {
          background-size: 180% 100%;
          background-position: 0% center;
        }

        .eiro-submit:hover {
          background-position: 100% center;
        }

        /* Keyframes */
        @keyframes eiroHeadingEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes eiroCardEnter {
          from {
            opacity: 0;
            transform: translateY(22px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes eiroOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes eiroOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes eiroOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }

          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes eiroOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes eiroRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }

          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes eiroRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }

          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes eiroParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }

          50% {
            opacity: 0.9;
          }

          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        @keyframes eiroLogoFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        /* Reduced Motion Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .eiro-orb,
          .eiro-ring,
          .eiro-particle,
          .eiro-logo-wrap,
          .eiro-heading,
          .eiro-card {
            animation: none !important;
          }

          .eiro-heading,
          .eiro-card {
            opacity: 1;
            transform: none;
          }

          .eiro-submit,
          .eiro-card,
          .eiro-logo-wrap {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}

