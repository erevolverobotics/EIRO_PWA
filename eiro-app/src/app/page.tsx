'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Trophy, Zap, Shield, Users, ChevronRight, Menu, X,
  Bot, Clock, BarChart3, QrCode, FileSpreadsheet, Award
} from 'lucide-react';
import { CATEGORY_LABELS, type CategoryCode } from '@/lib/types';

const CATEGORIES: { code: CategoryCode; icon: string; desc: string }[] = [
  { code: 'SUMO', icon: '🤖', desc: 'Autonomous robot vs robot combat on arena' },
  { code: 'MAZE', icon: '🔵', desc: 'Navigate complex mazes with checkpoints' },
  { code: 'WALL', icon: '🟣', desc: 'Precise wall-following autonomous course' },
  { code: 'ECO_CITY', icon: '♻️', desc: 'Smart waste management innovation project' },
  { code: 'NEXTGEN_FACTORY', icon: '🏭', desc: 'Industrial automation challenge tasks' },
  { code: 'INNOVATOR_JUNIOR', icon: '💡', desc: 'Creative robotics projects for junior students' },
  { code: 'INNOVATOR_SENIOR', icon: '🚀', desc: 'Advanced engineering projects for senior students' },
];

const FEATURES = [
  { icon: <Users className="w-5 h-5" />, title: 'Multi-role Access', desc: 'Admin, Coordinator, Judge, Volunteer — each with scoped permissions' },
  { icon: <FileSpreadsheet className="w-5 h-5" />, title: 'Bulk CSV Import', desc: 'Register hundreds of teams at once with validation and error reporting' },
  { icon: <QrCode className="w-5 h-5" />, title: 'QR Check-in', desc: 'Camera-based QR scanning for fast, secure team check-in' },
  { icon: <BarChart3 className="w-5 h-5" />, title: 'Live Scoring', desc: 'Category-specific engines: timed, rubric, match tournament, hybrid' },
  { icon: <Shield className="w-5 h-5" />, title: 'Secure Payments', desc: 'Coordinator-verified manual payments with full audit trail' },
  { icon: <Award className="w-5 h-5" />, title: 'Certificates', desc: 'Verifiable PDF certificates with public verification portal' },
  { icon: <Clock className="w-5 h-5" />, title: 'Training Attendance', desc: 'Independent Day 1 & Day 2 training attendance tracking' },
  { icon: <Zap className="w-5 h-5" />, title: 'District → Finals', desc: 'Qualification pipeline from district prelims to state finals' },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen animated-bg">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-lg leading-none">EIRO</span>
                <p className="text-[10px] text-indigo-400 leading-none">Evolve Robotics</p>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/events" className="text-sm text-gray-400 hover:text-white transition-colors">Events</Link>
              <Link href="/results" className="text-sm text-gray-400 hover:text-white transition-colors">Results</Link>
              <Link href="/verify" className="text-sm text-gray-400 hover:text-white transition-colors">Verify Certificate</Link>
              <Link href="/login" className="text-sm px-4 py-2 rounded-lg border border-indigo-500/40 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200">
                Sign In
              </Link>
              <Link href="/signup" className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 font-medium">
                Register School
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-4 space-y-3 animate-fade-in-up">
            <Link href="/events" className="block text-sm text-gray-400 py-2 hover:text-white">Events</Link>
            <Link href="/results" className="block text-sm text-gray-400 py-2 hover:text-white">Results</Link>
            <Link href="/verify" className="block text-sm text-gray-400 py-2 hover:text-white">Verify Certificate</Link>
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm py-2 rounded-lg border border-indigo-500/40 text-indigo-400">Sign In</Link>
              <Link href="/signup" className="flex-1 text-center text-sm py-2 rounded-lg bg-indigo-600 text-white font-medium">Register</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-indigo-500/30 text-indigo-400 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="pulse-dot"></span>
            EIRO 2026 Season — Registration Open
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            The Official<br />
            <span className="gradient-text">EIRO Robotics</span><br />
            Competition Platform
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            One secure platform for school registration, team management, QR check-in,
            category-specific scoring, district qualification, and state finals — from
            District Preliminaries to State Finals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-lg transition-all duration-200 glow-accent hover:scale-105"
            >
              Register Your School
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/events"
              className="flex items-center gap-2 px-8 py-4 glass border border-white/10 hover:border-indigo-500/40 text-white font-medium rounded-xl text-lg transition-all duration-200 hover:scale-105"
            >
              <Trophy className="w-5 h-5 text-indigo-400" />
              View Events
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { label: 'Categories', value: '7' },
              { label: 'Competition Stages', value: '2' },
              { label: 'Scoring Engines', value: '4' },
              { label: 'Roles Supported', value: '8' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:scale-105">
                <div className="text-3xl font-black gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competition Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Competition Categories</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Seven categories across autonomous robotics, project innovation, and industrial automation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.code}
                className="glass rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:scale-105 cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-2 group-hover:text-indigo-300 transition-colors">
                  {CATEGORY_LABELS[cat.code]}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{cat.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs text-indigo-400 font-medium">
                  <span className="font-mono text-xs text-gray-600">{cat.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A complete, auditable system replacing spreadsheets, messaging, and manual check-ins.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-600/30 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Competition Workflow</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Seamless flow from school registration through district qualifiers to state finals.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-600 via-purple-500 to-transparent hidden sm:block" />

            <div className="space-y-4">
              {[
                { step: '01', title: 'Admin Configures Season', desc: 'Set districts, venues, categories, rules and fee configs', color: 'indigo' },
                { step: '02', title: 'School Registration', desc: 'Manual team entry or bulk CSV upload with validation', color: 'blue' },
                { step: '03', title: 'Payment Verification', desc: 'Event Coordinator verifies manual cash/UPI/bank payments', color: 'violet' },
                { step: '04', title: 'Approval & QR Passes', desc: 'Admin approves registrations; teams receive signed QR passes', color: 'purple' },
                { step: '05', title: 'QR Check-in & Attendance', desc: 'Scan QR codes; record individual student attendance', color: 'pink' },
                { step: '06', title: 'Competition & Scoring', desc: 'Category-specific engines: matches, timed runs, rubric judging', color: 'rose' },
                { step: '07', title: 'District Qualification', desc: 'Rankings, quotas approved; linked finals entries created', color: 'orange' },
                { step: '08', title: 'State Finals & Certificates', desc: 'Finals judging, published rankings, verifiable PDF certificates', color: 'amber' },
              ].map((item, i) => (
                <div key={item.step} className="flex gap-4 sm:gap-8 items-start animate-fade-in-up" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className={`relative flex-shrink-0 w-12 h-12 rounded-full bg-${item.color}-600/20 border-2 border-${item.color}-500/40 flex items-center justify-center z-10`}>
                    <span className="text-xs font-bold text-white">{item.step}</span>
                  </div>
                  <div className="glass rounded-2xl p-4 flex-1 border border-white/5 hover:border-indigo-500/20 transition-all duration-300">
                    <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-10 border border-indigo-500/20 glow-accent">
            <Trophy className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Compete?</h2>
            <p className="text-gray-400 mb-8">
              Register your school today and get access to the full EIRO competition platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
              >
                Register as School Coordinator
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 glass border border-white/10 hover:border-indigo-500/40 text-white font-medium rounded-xl transition-all duration-200"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-white">EIRO Platform</span>
                <p className="text-xs text-gray-500">by Evolve Robotics</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/events" className="hover:text-white transition-colors">Events</Link>
              <Link href="/results" className="hover:text-white transition-colors">Results</Link>
              <Link href="/verify" className="hover:text-white transition-colors">Verify</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
            <p className="text-xs text-gray-600">© 2026 Evolve Robotics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
