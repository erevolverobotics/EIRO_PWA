'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.name);
      toast.success('Account created! Please complete your school profile.');
      router.push('/coordinator');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('email-already-in-use')) setError('This email is already registered. Please sign in.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg glow-accent">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EIRO Platform</h1>
              <p className="text-xs text-indigo-400">School Coordinator Registration</p>
            </div>
          </Link>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
          <p className="text-gray-400 text-sm mb-6">Register as a School Coordinator to manage your teams</p>

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className="eiro-input"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
              <input
                id="signup-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="coordinator@school.edu.in"
                className="eiro-input"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="eiro-input"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="eiro-input pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{strengthLabel} password</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  className="eiro-input pr-10"
                />
                {form.confirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirm
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              By registering, you agree to EIRO platform terms and acknowledge that your account will be verified before full access is granted.
            </p>

            <button
              type="submit"
              disabled={loading}
              id="create-account-btn"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
