import Link from 'next/link';
import { Bot, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
          <Bot className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-7xl font-black gradient-text mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-indigo-500/30 transition-all text-sm font-medium">
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link href="/login" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
