'use client';

import { useState, useEffect, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  LockKeyhole,
  Mail,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Full-screen cursor position
  const [cursorPosition, setCursorPosition] = useState({
    x: -1000,
    y: -1000,
  });

  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Track mouse movement across the entire screen
  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    setCursorPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Firebase authentication loading screen
  if (authLoading) {
    return (
      <main className="eiro-login min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#bd68d5]" />
      </main>
    );
  }

  if (user) return null;

  // Login handler - original authentication functionality retained
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      await signIn(email.trim(), password);
      toast.success('Sign In');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to sign in';

      if (
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password') ||
        msg.includes('user-not-found')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#100b1a]/90 py-3.5 pl-11 pr-4 text-sm text-[#f5f0fd] placeholder:text-[#81768f] outline-none transition-all duration-300 hover:border-fuchsia-400/40 focus:border-[#bd68d5] focus:bg-[#140d20] focus:ring-4 focus:ring-purple-500/15';

  return (
    <main
      onMouseMove={handleMouseMove}
      className="eiro-login relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6"
    >
      {/* FULL-SCREEN ANIMATED BACKGROUND */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Animated ambient lights */}
        <div className="eiro-orb eiro-orb-one" />
        <div className="eiro-orb eiro-orb-two" />
        <div className="eiro-orb eiro-orb-three" />
        <div className="eiro-orb eiro-orb-four" />

        {/* Fine dot pattern */}
        <div className="eiro-dot-grid absolute inset-0" />

        {/* Rotating geometric rings */}
        <div className="eiro-ring eiro-ring-one" />
        <div className="eiro-ring eiro-ring-two" />
        <div className="eiro-ring eiro-ring-three" />

        {/* Floating particles */}
        <div className="eiro-particle particle-one" />
        <div className="eiro-particle particle-two" />
        <div className="eiro-particle particle-three" />
        <div className="eiro-particle particle-four" />
        <div className="eiro-particle particle-five" />
        <div className="eiro-particle particle-six" />
        <div className="eiro-particle particle-seven" />
        <div className="eiro-particle particle-eight" />

        {/* Central lighting */}
        <div className="eiro-center-glow" />

        {/* Edge shading */}
        <div className="eiro-vignette" />

        {/* FULL-SCREEN CURSOR FOLLOWING GLOW */}
        <div
          className="eiro-cursor-glow"
          style={{
            background: `radial-gradient(
              500px circle at ${cursorPosition.x}px ${cursorPosition.y}px,
              rgba(189, 104, 213, 0.19),
              rgba(146, 39, 143, 0.09) 35%,
              rgba(99, 59, 238, 0.035) 55%,
              transparent 75%
            )`,
          }}
        />
      </div>

      {/* LOGIN CONTENT */}
      <div className="relative z-10 w-full max-w-[460px]">

        {/* BRANDING */}
        <header className="mb-7 flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="EIRO home"
            className="group flex flex-col items-center"
          >
            <div className="eiro-logo relative mb-3 flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.06)] shadow-[0_10px_40px_rgba(178,75,178,0.18)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-1">
              <Image
                src="/images/eiro-logo.png"
                alt="EIRO Robotics logo"
                width={76}
                height={76}
                priority
                className="h-[76px] w-[76px] object-contain"
              />

              <span className="eiro-logo-shine" />
            </div>

            <h1 className="text-[27px] font-extrabold tracking-tight text-[#f5f0fd]">
              EIRO <span className="eiro-gradient-text">Platform</span>
            </h1>

            <p className="mt-1 text-xs font-medium tracking-[0.18em] text-violet-300 uppercase">
              Evolve Robotics
            </p>
          </Link>

          <div className="eiro-accent-line mt-4 h-1 w-14 rounded-full" />
        </header>

        {/* SQUARE LOGIN CARD WITH INTERNAL SCROLL */}
        <section className="eiro-card relative mx-auto aspect-square w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(18,12,29,0.93)] shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">

          {/* Top gradient border */}
          <div className="eiro-card-top-line absolute left-0 right-0 top-0 z-20 h-[3px]" />

          {/* INTERNAL SCROLL CONTAINER */}
          <div className="eiro-card-scroll h-full w-full overflow-y-auto overscroll-contain p-6 sm:p-9">

            {/* Heading */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-[#d99be8]">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <h2 className="text-[28px] font-extrabold tracking-tight text-[#f5f0fd]">
                Sign In
              </h2>

              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gradient-to-r from-[#92278f] to-violet-500" />

              <p className="mt-3 text-sm leading-6 text-[#bdb3d8]">
                Sign in to access your competition dashboard
                and manage your school activities.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3.5"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <p className="text-sm leading-5 text-rose-300">
                  {error}
                </p>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#e2d7f5]"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    autoComplete="email"
                    placeholder="coordinator@school.edu.in"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#e2d7f5]"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9b90aa] transition-colors hover:bg-purple-500/10 hover:text-[#f0b4ef] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me and forgot password */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="group flex cursor-pointer items-center gap-2.5">
                  <span className="relative flex h-[19px] w-[19px] shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      aria-label="Remember me"
                    />

                    <span className="absolute inset-0 rounded-[6px] border border-white/20 bg-[#100b1a] transition-all duration-200 peer-checked:border-[#bd68d5] peer-checked:bg-gradient-to-br peer-checked:from-[#92278f] peer-checked:to-[#633bee] peer-focus-visible:ring-2 peer-focus-visible:ring-purple-400/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#120c1d]" />

                    <Check className="pointer-events-none relative z-20 h-3 w-3 scale-75 text-white opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100" />
                  </span>

                  <span className="text-sm text-[#bdb3d8] transition-colors group-hover:text-[#f5f0fd]">
                    Remember me
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#dd8fe0] underline-offset-4 transition-colors hover:text-[#f0b4ef] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={formLoading}
                id="sign-in-btn"
                className="eiro-submit group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(124,58,237,0.35)] focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to EIRO
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Register */}
            <p className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-[#bdb3d8]">
              New school?{' '}
              <Link
                href="/signup"
                className="font-bold text-[#dd8fe0] underline-offset-4 transition-colors hover:text-[#f0b4ef] hover:underline"
              >
                Register as Coordinator
              </Link>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-6 text-center">
          <p className="text-xs text-[#9b90aa]">
            © 2026 EIRO Platform. All rights reserved.
          </p>
        </footer>
      </div>

      {/* ANIMATION STYLES */}
      <style jsx global>{`
        .eiro-login {
          isolation: isolate;
          background: #050308;
        }

        /* Ambient orbs */
        .eiro-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(85px);
          opacity: 0.65;
          will-change: transform;
        }

        .eiro-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
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
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
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
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
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
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: eiroOrbFour 17s ease-in-out infinite alternate;
        }

        /* Dot grid */
        .eiro-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.55;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* Rotating rings */
        .eiro-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
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
          border-color: rgba(178, 75, 178, 0.14);
          animation: eiroRingTwo 28s linear infinite;
        }

        .eiro-ring-three {
          width: 650px;
          height: 650px;
          left: 50%;
          top: 50%;
          border-color: rgba(167, 139, 250, 0.045);
          transform: translate(-50%, -50%);
          animation: eiroRingThree 55s linear infinite;
        }

        /* Floating particles */
        .eiro-particle {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #bd68d5;
          box-shadow: 0 0 16px rgba(221, 143, 224, 0.55);
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

        .particle-seven {
          top: 75%;
          left: 32%;
          animation-delay: -3s;
        }

        .particle-eight {
          top: 44%;
          right: 29%;
          animation-delay: -7s;
        }

        /* Center glow */
        .eiro-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 58, 150, 0.10) 0%,
            rgba(126, 58, 150, 0.035) 38%,
            transparent 72%
          );
        }

        /* Vignette */
        .eiro-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 35%,
            rgba(5, 3, 8, 0.55) 100%
          );
        }

        /* Full-screen cursor-following glow */
        .eiro-cursor-glow {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          mix-blend-mode: screen;
          will-change: background;
          transition: background 80ms linear;
        }

        /* Logo */
        .eiro-logo {
          animation: eiroLogoFloat 5s ease-in-out infinite;
        }

        .eiro-logo-shine {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
          pointer-events: none;
        }

        .eiro-logo-shine::after {
          content: '';
          position: absolute;
          top: -100%;
          left: -80%;
          width: 55%;
          height: 300%;
          transform: rotate(25deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.45),
            transparent
          );
          animation: eiroLogoShine 7s ease-in-out infinite;
        }

        .eiro-gradient-text {
          background: linear-gradient(
            110deg,
            #92278f 0%,
            #bd68d5 48%,
            #633bee 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .eiro-accent-line,
        .eiro-card-top-line {
          background: linear-gradient(
            90deg,
            #92278f 0%,
            #bd68d5 45%,
            #633bee 100%
          );
        }

        /* Square card */
        .eiro-card {
          aspect-ratio: 1 / 1;
          width: 100%;
          max-width: 460px;
          margin-inline: auto;
          animation: eiroCardEnter 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
          transition: box-shadow 300ms ease, border-color 300ms ease;
        }

        .eiro-card:hover {
          border-color: rgba(216, 180, 254, 0.24);
          box-shadow: 0 30px 100px rgba(79, 42, 120, 0.15);
        }

        /* Internal card scrollbar */
        .eiro-card-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(189, 104, 213, 0.65) rgba(16, 11, 26, 0.65);
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .eiro-card-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .eiro-card-scroll::-webkit-scrollbar-track {
          margin-block: 14px;
          border-radius: 20px;
          background: rgba(16, 11, 26, 0.65);
        }

        .eiro-card-scroll::-webkit-scrollbar-thumb {
          border-radius: 20px;
          background: linear-gradient(
            180deg,
            #bd68d5,
            #92278f,
            #633bee
          );
        }

        .eiro-card-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            #dd8fe0,
            #bd68d5,
            #8036b9
          );
        }

        /* Gradient submit button */
        .eiro-submit {
          background: linear-gradient(
            110deg,
            #92278f 0%,
            #8036b9 48%,
            #633bee 100%
          );
          background-size: 180% 100%;
          background-position: 0% center;
        }

        .eiro-submit:hover {
          background-position: 100% center;
        }

        /* Animations */
        @keyframes eiroOrbOne {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(120px, 110px, 0) scale(1.12); }
        }

        @keyframes eiroOrbTwo {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-140px, 100px, 0) scale(0.92); }
        }

        @keyframes eiroOrbThree {
          0% { transform: translate3d(0, 0, 0) scale(0.95); }
          100% { transform: translate3d(130px, -100px, 0) scale(1.1); }
        }

        @keyframes eiroOrbFour {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100px, -80px, 0); }
        }

        @keyframes eiroRingOne {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.08); }
        }

        @keyframes eiroRingTwo {
          from { transform: rotate(360deg) scale(1); }
          to { transform: rotate(0deg) scale(1.1); }
        }

        @keyframes eiroRingThree {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes eiroParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        @keyframes eiroLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes eiroLogoShine {
          0%, 65% { left: -80%; }
          85%, 100% { left: 140%; }
        }

        @keyframes eiroCardEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .eiro-orb,
          .eiro-ring,
          .eiro-particle,
          .eiro-logo,
          .eiro-logo-shine::after,
          .eiro-card {
            animation: none !important;
          }

          .eiro-card {
            opacity: 1;
            transform: none;
          }

          .eiro-submit,
          .eiro-card,
          .eiro-logo {
            transition: none !important;
          }
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          .eiro-orb {
            filter: blur(65px);
            opacity: 0.48;
          }

          .eiro-ring-one {
            width: 350px;
            height: 350px;
          }

          .eiro-ring-two {
            width: 250px;
            height: 250px;
          }

          .eiro-ring-three {
            width: 420px;
            height: 420px;
          }

          .eiro-particle {
            width: 4px;
            height: 4px;
          }

          .eiro-cursor-glow {
            mix-blend-mode: normal;
          }
        }
      `}</style>
    </main>
  );
}
