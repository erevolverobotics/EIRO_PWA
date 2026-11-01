
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Info,
  RefreshCw,
  Settings,
  Star,
  Timer,
  Users,
  Zap,
} from 'lucide-react';

import {
  PageHeader,
  Card,
  Button,
  Badge,
  CategoryBadge,
} from '@/components/ui';

import {
  CATEGORY_ENGINE,
  CATEGORY_LABELS,
  type CategoryCode,
} from '@/lib/types';

import { db, doc, getDoc } from '@/lib/firebase/firestore';

interface CategoryConfig {
  minTeam?: number;
  maxTeam?: number;
  feeAmount?: number;
  hasFee?: boolean;
  rounds?: number;
}

type CategoryConfigurations = Partial<Record<CategoryCode, CategoryConfig>>;

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

const ENGINE_ICONS: Record<string, typeof Zap> = {
  MATCH_TOURNAMENT: Zap,
  TIMED_TECHNICAL: Timer,
  JUDGED_RUBRIC: Star,
  HYBRID: Settings,
};

/* FLOATING BUBBLES - SAME AS SCHOOL DASHBOARD */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

export default function CategoryDirectoryPage() {
  const [configurations, setConfigurations] =
    useState<CategoryConfigurations | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* LOAD CATEGORY CONFIGURATION */

  const load = useCallback(async () => {
    try {
      const snapshot = await getDoc(doc(db, 'config', 'categories'));

      setError('');

      setConfigurations(
        snapshot.exists()
          ? (snapshot.data() as CategoryConfigurations)
          : {},
      );
    } catch (loadError) {
      console.error(loadError);

      setError(
        'Category configuration could not be loaded from Firestore. Retry or check your access.',
      );
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

  return (
    <main className="category-directory-page relative isolate min-h-screen w-full">

      {/* ANIMATED BACKGROUND */}

      <div className="cd-ambient" aria-hidden="true">
        <div className="cd-grid" />

        <div className="cd-orb cd-orb-one" />

        <div className="cd-orb cd-orb-two" />

        <div className="cd-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`cd-bubble ${bubble.tone}`}
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
      </div>

      {/* MAIN CONTENT */}

      <div className="cd-content relative z-10 mx-auto w-full max-w-none space-y-6 px-1 py-6 sm:px-1.5">

        {/* HEADER */}

        <div className="cd-header-panel">
          <PageHeader
            title="Category Directory"
            subtitle="Configured category team limits, fees and rounds"
            actions={
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                disabled={loading}
              >
                Refresh
              </Button>
            }
          />
        </div>

        {/* INFORMATION NOTICE */}

        <div className="cd-info-notice flex items-start gap-3 rounded-2xl p-4">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />

          <p className="text-sm text-blue-300">
            Team limits and fee requirements come from the Firestore{' '}
            <code>config/categories</code> document. Missing values are shown
            as unconfigured; no default fee is assumed.
          </p>
        </div>

        {/* ERROR, LOADING AND EMPTY STATES */}

        {error ? (
          <div role="alert">
            <Card className="cd-state-card text-sm text-red-300">
              {error}
            </Card>
          </div>
        ) : loading ? (
          <Card className="cd-state-card text-center text-gray-400">
            Loading category configuration…
          </Card>
        ) : !configurations || Object.keys(configurations).length === 0 ? (
          <Card className="cd-state-card py-12 text-center">
            <p className="font-medium text-gray-300">
              Category configuration is unavailable
            </p>

            <p className="mt-2 text-sm text-gray-500">
              The config/categories document has not been set up yet.
            </p>
          </Card>
        ) : (

          /* CATEGORY LIST */

          <div className="grid grid-cols-1 gap-4">
            {ALL_CATEGORIES.map((code) => {
              const config = configurations[code];

              const engine = CATEGORY_ENGINE[code];

              const Icon = ENGINE_ICONS[engine] || Settings;

              const teamSize =
                config?.minTeam !== undefined &&
                config?.maxTeam !== undefined
                  ? `${config.minTeam}–${config.maxTeam} members`
                  : 'Not configured';

              const fee =
                config?.hasFee === false
                  ? 'No fee required'
                  : config?.hasFee === true &&
                      config.feeAmount !== undefined
                    ? `₹${config.feeAmount.toLocaleString('en-IN')}`
                    : 'Fee configuration unavailable';

              return (
                <div className="cd-category-card" key={code}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

                    <div className="flex flex-1 items-start gap-3">

                      {/* CATEGORY ICON */}

                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        <Icon className="h-5 w-5 text-indigo-400" />
                      </div>

                      {/* CATEGORY DETAILS */}

                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white">
                            {CATEGORY_LABELS[code]}
                          </h3>

                          <CategoryBadge code={code} />
                        </div>

                        {/* DETAIL CARDS */}

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                          <Detail
                            label="Team size"
                            value={teamSize}
                            icon={Users}
                          />

                          <Detail
                            label="Fee"
                            value={fee}
                            icon={Info}
                          />

                          <Detail
                            label="Rounds / attempts"
                            value={
                              config?.rounds === undefined
                                ? 'Not configured'
                                : String(config.rounds)
                            }
                            icon={Settings}
                          />

                        </div>
                      </div>
                    </div>

                    {/* ENGINE BADGE */}

                    <Badge variant="info">
                      {engine.replaceAll('_', ' ')}
                    </Badge>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAGE STYLES */}

      <style jsx global>{`

        /* =====================================
           MAIN PAGE - TRANSPARENT
        ===================================== */

        .category-directory-page {
          --cd-text: #f5f6fb;

          position: relative;
          isolation: isolate;

          background: transparent !important;

          color: var(--cd-text);

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .category-directory-page * {
          box-sizing: border-box;
        }


        /* =====================================
           ANIMATED BACKGROUND
        ===================================== */

        .cd-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .cd-grid {
          position: absolute;
          inset: 0;
          opacity: 0.08;

          background-image:
            linear-gradient(
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            );

          background-size: 58px 58px;

          mask-image:
            radial-gradient(
              ellipse 80% 65% at 50% 22%,
              #000,
              transparent
            );
        }


        /* GLOWING ORBS */

        .cd-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .cd-orb-one {
          top: -260px;
          left: -180px;
          background: #7c3aed;
        }

        .cd-orb-two {
          top: 280px;
          right: -300px;
          background: #b24bb2;
        }


        /* FLOATING BUBBLES */

        .cd-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .cd-bubble {
          position: absolute;
          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: cd-float linear infinite;
        }

        .cd-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .cd-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes cd-float {
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


        /* =====================================
           CONTENT - NO BACKGROUND BOX
        ===================================== */

        .cd-content {
          position: relative;
          z-index: 10;

          min-height: 100vh;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* HEADER */

        .cd-header-panel {
          padding: 0;

          border: none !important;
          border-radius: 0;

          background: transparent !important;

          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .cd-header-panel h1 {
          color: #f8fafc !important;
          font-size: 24px !important;
          font-weight: 750 !important;
          letter-spacing: -0.035em;
        }

        .cd-header-panel p {
          color: #9ca3af !important;
        }


        /* =====================================
           INFORMATION NOTICE - GLASS EFFECT
        ===================================== */

        .cd-info-notice {
          background: rgba(17, 24, 39, 0.12) !important;

          border: 1px solid rgba(59, 130, 246, 0.25);

          border-radius: 16px;

          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);

          box-shadow: none !important;
        }


        /* =====================================
           CATEGORY CARDS - TRANSPARENT GLASS
        ===================================== */

        .cd-category-card {
          position: relative;

          padding: 20px;

          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18);

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;

          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .cd-category-card:hover {
          background: rgba(30, 41, 59, 0.38) !important;

          border-color: rgba(168, 85, 247, 0.45);
        }


        /* =====================================
           DETAIL CARDS - TEAM, FEE, ROUNDS
        ===================================== */

        .cd-detail-card {
          background: rgba(255, 255, 255, 0.035) !important;

          border: 1px solid rgba(255, 255, 255, 0.10);

          border-radius: 12px;

          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);

          box-shadow: none !important;
        }


        /* =====================================
           LOADING / ERROR / EMPTY CARDS
        ===================================== */

        .cd-state-card {
          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18) !important;

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;
        }


        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .cd-bubble {
            animation: none;
          }

          .cd-category-card {
            transition: none;
          }
        }


        /* RESPONSIVE */

        @media (max-width: 640px) {
          .cd-content {
            padding: 16px 10px;
          }

          .cd-header-panel h1 {
            font-size: 21px !important;
          }

          .cd-category-card {
            padding: 15px;
          }
        }

      `}</style>
    </main>
  );
}


/* =====================================
   DETAIL COMPONENT
===================================== */

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="cd-detail-card rounded-xl p-2.5">

      <p className="mb-0.5 flex items-center gap-1 text-[10px] text-gray-400">
        <Icon className="h-3 w-3" />
        {label}
      </p>

      <p className="text-xs font-medium text-white">
        {value}
      </p>

    </div>
  );
}
