'use client';

import {
  PageHeader,
  Card,
} from '@/components/ui';

import {
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';


/* =========================================
   FLOATING BACKGROUND BUBBLES
========================================= */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];


/* =========================================
   ELIGIBILITY PAGE
========================================= */

export default function EligibilityPage() {

  return (

    <main className="eligibility-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="eligibility-ambient"
        aria-hidden="true"
      >

        {/* BACKGROUND GRID */}

        <div className="eligibility-grid" />


        {/* GLOWING ORBS */}

        <div className="eligibility-orb eligibility-orb-one" />

        <div className="eligibility-orb eligibility-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="eligibility-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`eligibility-bubble ${bubble.tone}`}
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


      {/* =====================================
          PAGE CONTENT
      ===================================== */}

      <div className="eligibility-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader

          title="Eligibility Check"

          subtitle="Review team eligibility and inspection workflow availability"

        />


        {/* =====================================
            ELIGIBILITY STATUS
        ===================================== */}

        <Card className="eligibility-glass-card">

          <div className="flex items-start gap-4">

            {/* ICON */}

            <div className="eligibility-icon-box">

              <ShieldCheck className="w-6 h-6 text-violet-300" />

            </div>


            {/* INFORMATION */}

            <div className="min-w-0">

              <h2 className="text-lg font-semibold text-white">

                Eligibility Inspection

              </h2>

              <p className="text-sm text-gray-400 mt-2 leading-relaxed">

                Eligibility inspection records are not available from the configured client schema.

              </p>

            </div>

          </div>

        </Card>


        {/* =====================================
            WORKFLOW UNAVAILABLE
        ===================================== */}

        <Card className="eligibility-glass-card eligibility-warning-card">

          <div className="flex items-start gap-4">

            {/* WARNING ICON */}

            <div className="eligibility-warning-icon">

              <AlertCircle className="w-5 h-5 text-yellow-400" />

            </div>


            {/* WARNING INFORMATION */}

            <div className="min-w-0 flex-1">

              <h3 className="font-semibold text-white text-base">

                Eligibility workflow unavailable

              </h3>


              <p className="text-sm text-gray-400 mt-2 leading-relaxed">

                No eligibility-check collection, published inspection checklist schema, or supported callable is defined in the current Firestore rules and types.

              </p>


              <div className="eligibility-notice mt-5">

                <p className="text-xs text-gray-400 leading-relaxed">

                  No sample results or disqualification actions are shown.

                </p>

              </div>

            </div>

          </div>

        </Card>


      </div>


      {/* =====================================
          PROFESSIONAL ANIMATED BACKGROUND
          STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .eligibility-page {

          position: relative;
          isolation: isolate;

          width: 100%;
          max-width: none;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

        }


        .eligibility-page * {

          box-sizing: border-box;

        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .eligibility-ambient {

          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;

          pointer-events: none;

          background: transparent !important;

        }


        /* BACKGROUND GRID */

        .eligibility-grid {

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

        .eligibility-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .eligibility-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .eligibility-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* BUBBLE CONTAINER */

        .eligibility-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        /* FLOATING BUBBLES */

        .eligibility-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: eligibility-float linear infinite;

        }


        .eligibility-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .eligibility-bubble.rose {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );

        }


        /* BUBBLE ANIMATION */

        @keyframes eligibility-float {

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


        /* PAGE CONTENT */

        .eligibility-content {

          position: relative;
          z-index: 10;

          display: block;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 36px;

          margin: 0;

          background: transparent !important;

          box-shadow: none !important;

        }


        /* GLASS CARDS */

        .eligibility-page .eligibility-glass-card {

          display: block;

          width: 100%;
          max-width: none;

          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18) !important;

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;

        }


        .eligibility-page .eligibility-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* MAIN ICON */

        .eligibility-icon-box {

          width: 48px;
          height: 48px;

          flex-shrink: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background: rgba(139, 92, 246, 0.13);

          border: 1px solid rgba(139, 92, 246, 0.22);

        }


        /* WARNING CARD */

        .eligibility-warning-card {

          border-color: rgba(234, 179, 8, 0.20) !important;

        }


        /* WARNING ICON */

        .eligibility-warning-icon {

          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: rgba(234, 179, 8, 0.08);

          border: 1px solid rgba(234, 179, 8, 0.17);

        }


        /* INFORMATION NOTICE */

        .eligibility-notice {

          padding: 13px 15px;

          border-radius: 10px;

          background: rgba(234, 179, 8, 0.045);

          border: 1px solid rgba(234, 179, 8, 0.13);

        }


        /* RESPONSIVE */

        @media (max-width: 768px) {

          .eligibility-content {

            padding: 18px 14px 28px;

          }

        }


        @media (max-width: 480px) {

          .eligibility-content {

            padding: 16px 10px 24px;

          }

        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {

          .eligibility-bubble {

            animation: none;

          }

          .eligibility-glass-card {

            transition: none;

          }

        }

      `}</style>

    </main>

  );

}
