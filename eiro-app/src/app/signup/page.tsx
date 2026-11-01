'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) setError('');
  };

  const passwordStrength = (password: string) => {
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  };

  const strength = passwordStrength(form.password);

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const strengthColors = [
    'bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-emerald-500',
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signUp(
        form.email.trim(),
        form.password,
        form.name.trim()
      );

      toast.success('Account created successfully!');
      router.replace('/coordinator');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';

      if (message.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in.');
      } else if (message.includes('weak-password')) {
        setError('Please choose a stronger password.');
      } else if (message.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#100b1a]/90 px-4 py-3 text-sm text-[#f5f0fd] placeholder:text-[#81768f] outline-none transition-all duration-300 hover:border-fuchsia-400/50 focus:border-fuchsia-400 focus:bg-[#140d20] focus:ring-4 focus:ring-purple-500/15';

  return (
    <main className="eiro-signup relative min-h-screen overflow-hidden bg-[#050308] px-4 py-7 sm:px-6 sm:py-9">

      {/* Animated background */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Main gradient lights */}
        <div className="eiro-orb eiro-orb-one" />
        <div className="eiro-orb eiro-orb-two" />
        <div className="eiro-orb eiro-orb-three" />
        <div className="eiro-orb eiro-orb-four" />

        {/* Subtle dot grid */}
        <div className="eiro-dot-grid absolute inset-0" />

        {/* Moving decorative rings */}
        <div className="eiro-ring eiro-ring-one" />
        <div className="eiro-ring eiro-ring-two" />

        {/* Floating particles */}
        <div className="eiro-particle particle-one" />
        <div className="eiro-particle particle-two" />
        <div className="eiro-particle particle-three" />
        <div className="eiro-particle particle-four" />
        <div className="eiro-particle particle-five" />
        <div className="eiro-particle particle-six" />

        {/* Soft central glow */}
        <div className="eiro-center-glow" />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto w-full max-w-[600px]">

        {/* Logo and heading at the top */}
        <header className="mb-6 flex flex-col items-center text-center sm:mb-7">
          <Link
            href="/"
            aria-label="EIRO home"
            className="eiro-brand group flex flex-col items-center"
          >
            <div className="eiro-logo-wrap relative mb-2.5 flex h-[76px] w-[76px] items-center justify-center rounded-[23px] border border-white/10 bg-[rgba(255,255,255,0.06)] shadow-[0_10px_38px_rgba(178,75,178,0.18)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-1 sm:h-[82px] sm:w-[82px]">
              <Image
                src="/IMAGES/image-removebg-preview%20(8).png"
                alt="EIRO Robotics logo"
                width={74}
                height={74}
                priority
                className="h-[70px] w-[70px] object-contain sm:h-[76px] sm:w-[76px]"
              />
              <span className="eiro-logo-shine" />
            </div>

            <h1 className="text-[25px] font-extrabold tracking-tight text-[#f5f0fd] sm:text-[27px]">
              EIRO <span className="eiro-gradient-text">Platform</span>
            </h1>

            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium tracking-wide text-violet-300 sm:text-sm">
              {/* <Sparkles className="h-3.5 w-3.5" /> */}
              School Coordinator Registration
            </p>
          </Link>

          <div className="eiro-accent-line mt-3 h-1 w-14 rounded-full" />
        </header>

        {/* Wider registration card */}
        <section className="eiro-card relative overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(18,12,29,0.88)] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:rounded-[30px] sm:p-9">

          {/* Fine decorative top edge */}
          <div className="eiro-card-top-line absolute left-0 right-0 top-0 h-[3px]" />

          {/* Centered Create Account heading */}
          <div className="mb-6 text-center">
            <h2 className="text-[27px] font-extrabold tracking-tight text-[#f5f0fd] sm:text-[30px]">
              Create Account
            </h2>

            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gradient-to-r from-[#92278f] to-violet-500" />

            <p className="mx-auto mt-3 max-w-[450px] text-sm leading-6 text-[#bdb3d8]">
              Create a School Coordinator account, then submit your school details
              for administrator approval before registering teams.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3.5"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm leading-5 text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
              >
                Full Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
              >
                Email Address
              </label>

              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="coordinator@school.edu.in"
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
              >
                Phone Number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </div>





           {/* Password and Confirm Password — Side by Side */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

  {/* Password */}
  <div className="min-w-0">
    <label
      htmlFor="signup-password"
      className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
    >
      Password
    </label>

    <div className="relative">
      <input
        id="signup-password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        minLength={8}
        required
        value={form.password}
        onChange={(e) => updateField('password', e.target.value)}
        placeholder="Enter password"
        className={`${inputClass} pr-10`}
      />

      <button
        type="button"
        onClick={() => setShowPassword((previous) => !previous)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9b90aa] transition-colors hover:text-[#f0b4ef] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
      >
        {showPassword
          ? <EyeOff className="h-4 w-4" />
          : <Eye className="h-4 w-4" />}
      </button>
    </div>

    {form.password && (
      <div className="mt-2.5">
        <div className="mb-1.5 flex gap-1">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                item <= strength
                  ? strengthColors[strength]
                  : 'bg-slate-700/70'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
          <span className="text-[#9b90aa]">Strength</span>
          <span
            className={`font-semibold ${
              strength <= 1
                ? 'text-rose-500'
                : strength === 2
                  ? 'text-amber-400'
                  : strength === 3
                    ? 'text-violet-300'
                    : 'text-emerald-400'
            }`}
          >
            {strengthLabels[strength]}
          </span>
        </div>
      </div>
    )}
  </div>

  {/* Confirm Password */}
  <div className="min-w-0">
    <label
      htmlFor="confirm"
      className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
    >
      Confirm Password
    </label>

    <div className="relative">
      <input
        id="confirm"
        name="confirm"
        type={showConfirm ? 'text' : 'password'}
        autoComplete="new-password"
        required
        value={form.confirm}
        onChange={(e) => updateField('confirm', e.target.value)}
        placeholder="Confirm password"
        aria-invalid={Boolean(
          form.confirm && form.password !== form.confirm
        )}
        className={`${inputClass} pr-10`}
      />

      <button
        type="button"
        onClick={() => setShowConfirm((previous) => !previous)}
        aria-label={
          showConfirm
            ? 'Hide confirmation password'
            : 'Show confirmation password'
        }
        aria-pressed={showConfirm}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9b90aa] transition-colors hover:text-[#f0b4ef] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
      >
        {showConfirm
          ? <EyeOff className="h-4 w-4" />
          : <Eye className="h-4 w-4" />}
      </button>
    </div>

    {form.confirm && (
      <p
        className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
          form.password === form.confirm
            ? 'text-emerald-400'
            : 'text-rose-500'
        }`}
      >
        {form.password === form.confirm
          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}

        {form.password === form.confirm
          ? 'Passwords match'
          : 'Passwords do not match'}
      </p>
    )}
  </div>

</div>
            {/* <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9b90aa] transition-colors hover:text-[#f0b4ef] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {form.password && (
                <div className="mt-2.5">
                  <div className="mb-1.5 flex gap-1.5">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          item <= strength
                            ? strengthColors[strength]
                            : 'bg-slate-700/70'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9b90aa]">
                      Password strength
                    </span>

                    <span
                      className={`font-semibold ${
                        strength <= 1
                          ? 'text-rose-500'
                          : strength === 2
                            ? 'text-amber-400'
                            : strength === 3
                              ? 'text-violet-300'
                              : 'text-emerald-400'
                      }`}
                    >
                      {strengthLabels[strength]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            
            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-sm font-semibold text-[#e2d7f5]"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirm}
                  onChange={(e) => updateField('confirm', e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={Boolean(
                    form.confirm && form.password !== form.confirm
                  )}
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirm((previous) => !previous)}
                  aria-label={
                    showConfirm
                      ? 'Hide confirmation password'
                      : 'Show confirmation password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9b90aa] transition-colors hover:text-[#f0b4ef] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  {showConfirm
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {form.confirm && (
                <p
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                    form.password === form.confirm
                      ? 'text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {form.password === form.confirm
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <AlertCircle className="h-3.5 w-3.5" />}

                  {form.password === form.confirm
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </p>
              )}
            </div> */}

            {/* Terms */}
            <p className="text-xs leading-[1.6] text-[#bdb3d8]">
              By registering, you agree to EIRO platform terms and acknowledge
              that your account will be verified before full access is granted.
            </p>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              id="create-account-btn"
              className="eiro-submit group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#92278f] via-[#8036b9] to-[#633bee] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(124,58,237,0.32)] focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Sign in */}
          <p className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-[#bdb3d8]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#dd8fe0] underline-offset-4 transition-colors hover:text-[#f0b4ef] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>

        {/* Footer */}
       <footer className="mt-5 pb-2 text-center"><p className="text-xs text-[#9b90aa]">© 2026 EIRO Platform</p></footer>
      </div>

      {/* Background animation styles */}
      <style jsx global>{`
        .eiro-signup {
          isolation: isolate;
        }

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

        .eiro-logo-wrap {
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
            rgba(255, 255, 255, 0.55),
            transparent
          );
          animation: eiroLogoShine 7s ease-in-out infinite;
        }

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

        .eiro-accent-line,
        .eiro-card-top-line {
          background: linear-gradient(
            90deg,
            #92278f 0%,
            #bd68d5 45%,
            #633bee 100%
          );
        }

        .eiro-card {
          animation: eiroCardEnter 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
          transition: box-shadow 300ms ease, border-color 300ms ease;
        }

        .eiro-card:hover {
          border-color: rgba(216, 180, 254, 0.8);
          box-shadow: 0 30px 100px rgba(79, 42, 120, 0.15);
        }

        .eiro-submit {
          background-size: 180% 100%;
          background-position: 0% center;
        }

        .eiro-submit:hover {
          background-position: 100% center;
        }

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

        @media (prefers-reduced-motion: reduce) {
          .eiro-orb,
          .eiro-ring,
          .eiro-particle,
          .eiro-logo-wrap,
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
          .eiro-logo-wrap {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}

