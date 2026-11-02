'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  Input,
} from '@/components/ui';

import {
  Settings,
  Edit3,
  Zap,
  Timer,
  Star,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import type { CategoryCode, ScoringEngine } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ENGINE } from '@/lib/types';

import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import toast from 'react-hot-toast';
import React from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_ICON: Record<ScoringEngine, React.ElementType> = {
  MATCH_TOURNAMENT: Zap,
  TIMED_TECHNICAL: Timer,
  JUDGED_RUBRIC: Star,
  HYBRID: Settings,
};

const ENGINE_LABEL: Record<ScoringEngine, string> = {
  MATCH_TOURNAMENT: 'Match Tournament',
  TIMED_TECHNICAL: 'Timed Technical',
  JUDGED_RUBRIC: 'Judged Rubric',
  HYBRID: 'Hybrid',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

type CatConfig = {
  minTeam: number;
  maxTeam: number;
  feeAmount: number;
  hasFee: boolean;
  rounds: number;
};

type CatConfigForm = {
  minTeam: string;
  maxTeam: string;
  feeAmount: string;
  rounds: string;
};

const EMPTY_FORM: CatConfigForm = {
  minTeam: '',
  maxTeam: '',
  feeAmount: '',
  rounds: '',
};

function isCatConfig(value: unknown): value is CatConfig {
  if (!value || typeof value !== 'object') return false;

  const config = value as Partial<CatConfig>;

  return (
    Number.isInteger(config.minTeam) &&
    Number.isInteger(config.maxTeam) &&
    Number.isFinite(config.feeAmount) &&
    typeof config.hasFee === 'boolean' &&
    Number.isInteger(config.rounds) &&
    (config.minTeam ?? 0) >= 1 &&
    (config.maxTeam ?? 0) >= (config.minTeam ?? 1) &&
    config.feeAmount! >= 0 &&
    (config.rounds ?? 0) >= 1 &&
    config.hasFee === (config.feeAmount! > 0)
  );
}

// ─── Animated Background ─────────────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [config, setConfig] = useState<
    Partial<Record<CategoryCode, CatConfig>>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editCat, setEditCat] = useState<CategoryCode | null>(null);
  const [editForm, setEditForm] = useState<CatConfigForm>(EMPTY_FORM);

  // ── Load category config from Firestore ────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const snap = await getDoc(doc(db, 'config', 'categories'));
      const data = snap.exists() ? snap.data() : {};

      const loaded: Partial<Record<CategoryCode, CatConfig>> = {};

      for (const cat of ALL_CATEGORIES) {
        if (isCatConfig(data[cat])) {
          loaded[cat] = data[cat];
        }
      }

      setConfig(loaded);
      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Category configuration could not be loaded. Check administrator authorization and retry.'
      );

      toast.error('Failed to load category config.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  // ── Open edit modal ─────────────────────────────────────────────────────────

  const openEdit = (cat: CategoryCode) => {
    setEditCat(cat);

    const current = config[cat];

    setEditForm(
      current
        ? {
            minTeam: String(current.minTeam),
            maxTeam: String(current.maxTeam),
            feeAmount: String(current.feeAmount),
            rounds: String(current.rounds),
          }
        : { ...EMPTY_FORM }
    );
  };

  // ── Save category config ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editCat) return;

    const minTeam = Number(editForm.minTeam);
    const maxTeam = Number(editForm.maxTeam);
    const feeAmount = Number(editForm.feeAmount);
    const rounds = Number(editForm.rounds);

    if (
      !editForm.minTeam.trim() ||
      !editForm.maxTeam.trim() ||
      !editForm.feeAmount.trim() ||
      !editForm.rounds.trim() ||
      !Number.isInteger(minTeam) ||
      !Number.isInteger(maxTeam) ||
      !Number.isInteger(rounds) ||
      minTeam < 1 ||
      maxTeam < minTeam ||
      !Number.isFinite(feeAmount) ||
      feeAmount < 0 ||
      rounds < 1
    ) {
      return toast.error(
        'Enter valid team sizes, a non-negative fee, and at least one round.'
      );
    }

    setSaving(true);

    try {
      const savedConfig: CatConfig = {
        minTeam,
        maxTeam,
        feeAmount,
        hasFee: feeAmount > 0,
        rounds,
      };

      const updated = {
        ...config,
        [editCat]: savedConfig,
      };

      await setDoc(
        doc(db, 'config', 'categories'),
        {
          ...updated,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setConfig(updated);

      toast.success(`${CATEGORY_LABELS[editCat]} config saved!`);
      setEditCat(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save category config.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="categories-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND — NO DARK OVERLAY */}

      <div
        className="categories-ambient fixed inset-0 z-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="categories-orb categories-orb-one" />
        <div className="categories-orb categories-orb-two" />
        <div className="categories-orb categories-orb-three" />
        <div className="categories-orb categories-orb-four" />

        <div className="categories-dot-grid absolute inset-0" />

        <div className="categories-ring categories-ring-one" />
        <div className="categories-ring categories-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`categories-particle ${particle}`}
          />
        ))}

        <div className="categories-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`categories-bubble ${bubble.tone}`}
              style={{
                left: bubble.left,
                width: bubble.size,
                height: bubble.size,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="categories-center-glow" />
      </div>

      {/* PAGE CONTENT — TRANSPARENT */}

      <main className="categories-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Categories & Rules"
          subtitle="Configure competition categories, scoring engines, team sizes and fees"
          actions={
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div role="alert">
            <Card className="categories-card text-sm text-red-300">
              <p>{error}</p>

              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {ALL_CATEGORIES.map((cat) => {
              const engine = CATEGORY_ENGINE[cat];
              const cfg = config[cat];
              const Icon = ENGINE_ICON[engine];

              return (
                <Card
                  key={cat}
                  className="categories-card"
                  hover
                >
                  {/* CATEGORY HEADER */}

                  <div className="flex items-start justify-between mb-4 gap-3">

                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-indigo-400" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm">
                          {CATEGORY_LABELS[cat]}
                        </h3>

                        <p className="font-mono text-xs text-gray-500 mt-0.5">
                          {cat}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Edit3}
                      onClick={() => openEdit(cat)}
                    >
                      {cfg ? 'Edit' : 'Configure'}
                    </Button>
                  </div>

                  {/* CONFIGURED CATEGORY */}

                  {cfg ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            Scoring Engine
                          </p>

                          <p className="text-sm font-medium text-white">
                            {ENGINE_LABEL[engine]}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            Team Size
                          </p>

                          <p className="text-sm font-medium text-white">
                            {cfg.minTeam}–{cfg.maxTeam} members
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            Fee per student
                          </p>

                          {cfg.hasFee ? (
                            <p className="text-sm font-bold text-yellow-400">
                              ₹{cfg.feeAmount} / student
                            </p>
                          ) : (
                            <p className="text-sm text-green-400">
                              Free
                            </p>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-xs text-gray-500 mb-1">
                            Rounds / Attempts
                          </p>

                          <p className="text-sm font-medium text-white">
                            {cfg.rounds}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Badge variant="info" size="sm">
                          {engine}
                        </Badge>

                        {cfg.hasFee && (
                          <Badge variant="warning" size="sm">
                            Fee Required
                          </Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                      Not configured. Team size, fee, and rounds are unavailable until saved.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* EDIT MODAL */}

        <Modal
          open={!!editCat}
          onClose={() => setEditCat(null)}
          title={`Edit — ${editCat ? CATEGORY_LABELS[editCat] : ''}`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setEditCat(null)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                icon={saving ? Loader2 : CheckCircle2}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Config'}
              </Button>
            </>
          }
        >
          {editCat && (
            <div className="space-y-4">

              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  Changes apply to future registrations. Existing scored
                  entries retain their original version for audit integrity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Min Team Size"
                  id="min-team"
                  type="number"
                  placeholder="Required"
                  value={editForm.minTeam}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      minTeam: e.target.value,
                    }))
                  }
                />

                <Input
                  label="Max Team Size"
                  id="max-team"
                  type="number"
                  placeholder="Required"
                  value={editForm.maxTeam}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      maxTeam: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Fee per student (₹, 0 = free)"
                  id="fee-amount"
                  type="number"
                  placeholder="Required"
                  value={editForm.feeAmount}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      feeAmount: e.target.value,
                    }))
                  }
                />

                <Input
                  label="Rounds / Attempts"
                  id="rounds"
                  type="number"
                  placeholder="Required"
                  value={editForm.rounds}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      rounds: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}
        </Modal>
      </main>

      {/* BACKGROUND CSS */}

      <style jsx global>{`

        /* TRANSPARENT PAGE — NO SCREEN-SIZED DARK BOX */

        .categories-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: transparent !important;
        }

        .categories-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        .categories-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
        }

        /* GLOWING ORBS */

        .categories-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .categories-orb-one {
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
          animation: categoriesOrbOne 18s ease-in-out infinite alternate;
        }

        .categories-orb-two {
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
          animation: categoriesOrbTwo 22s ease-in-out infinite alternate;
        }

        .categories-orb-three {
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
          animation: categoriesOrbThree 20s ease-in-out infinite alternate;
        }

        .categories-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: categoriesOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .categories-dot-grid {
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
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ROTATING RINGS */

        .categories-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .categories-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: categoriesRingOne 35s linear infinite;
        }

        .categories-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: categoriesRingTwo 28s linear infinite;
        }

        /* FLOATING PARTICLES */

        .categories-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: categoriesParticle 8s ease-in-out infinite alternate;
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

        /* FLOATING BUBBLES */

        .categories-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .categories-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: categoriesBubbleFloat linear infinite;
        }

        .categories-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .categories-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        @keyframes categoriesBubbleFloat {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }

          12% {
            opacity: 0.5;
          }

          88% {
            opacity: 0.3;
          }

          100% {
            transform: translateY(-115vh) scale(1.12);
            opacity: 0;
          }
        }

        /* CENTRAL GLOW */

        .categories-center-glow {
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

        /* CATEGORY CARDS — SUBTLE TRANSPARENCY */

        .categories-page .categories-card {
          background: rgba(18, 12, 29, 0.12) !important;
          border: 1px solid rgba(221, 143, 224, 0.16) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .categories-page .categories-card:hover {
          background: rgba(25, 16, 38, 0.20) !important;
          border-color: rgba(221, 143, 224, 0.28) !important;
        }

        /* ORB ANIMATIONS */

        @keyframes categoriesOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes categoriesOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes categoriesOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes categoriesOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        /* RING ANIMATIONS */

        @keyframes categoriesRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes categoriesRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        /* PARTICLE ANIMATION */

        @keyframes categoriesParticle {
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

        /* MOBILE */

        @media (max-width: 640px) {
          .categories-orb-one {
            width: 320px;
            height: 320px;
          }

          .categories-orb-two {
            width: 360px;
            height: 360px;
          }

          .categories-orb-three {
            width: 340px;
            height: 340px;
          }

          .categories-ring-one {
            width: 300px;
            height: 300px;
          }

          .categories-ring-two {
            width: 240px;
            height: 240px;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .categories-orb,
          .categories-ring,
          .categories-particle,
          .categories-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
