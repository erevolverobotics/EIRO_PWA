'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Zap, Shield, Users, ChevronRight, ChevronLeft, ArrowRight, Menu, X,
  Bot, Clock, BarChart3, QrCode, FileSpreadsheet, Award, Play,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  IMAGE PATHS (public/IMAGES/) — every image is optional, a styled   */
/*  fallback is shown automatically if the file is missing             */
/* ------------------------------------------------------------------ */

const HERO_IMAGE = '/IMAGES/eiro-hero-1.png';
// header logo — file lives at public/IMAGES/image-removebg-preview (8).png
// (space and brackets are URL-encoded so the browser can always load it)
const LOGO_IMAGE = '/IMAGES/image-removebg-preview%20(8).png';
const FOOTER_IMAGE = '/IMAGES/footer.png';
const ROBOT_IMAGE = '/IMAGES/image1.png';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

type ArtKind = 'sumo' | 'maze' | 'wall' | 'eco' | 'factory' | 'junior' | 'senior';

// Every card has built-in artwork. If you add a real photo at `image`, it is shown on top of the artwork.
const CATEGORIES: { name: string; tag: string; art: ArtKind; image: string; desc: string; hue: string }[] = [
  { name: 'Sumo Wrestling', tag: 'Combat', art: 'sumo', image: '/IMAGES/categories/sumo.jpg', desc: 'Autonomous robot vs robot combat on the arena.', hue: '#b04bb0' },
  { name: 'Maze Solver', tag: 'Navigation', art: 'maze', image: '/IMAGES/categories/maze.jpg', desc: 'Navigate complex mazes with checkpoints.', hue: '#a855f7' },
  { name: 'Wall Following', tag: 'Precision', art: 'wall', image: '/IMAGES/categories/wall.jpg', desc: 'Precise wall-following autonomous course.', hue: '#d27bd0' },
  { name: 'EcoCity', tag: 'Smart Waste Management', art: 'eco', image: '/IMAGES/categories/eco-city.jpg', desc: 'Smart waste management innovation project.', hue: '#a855f7' },
  { name: 'NextGen Factory', tag: 'Industrial Automation', art: 'factory', image: '/IMAGES/categories/nextgen-factory.jpg', desc: 'Industrial automation challenge tasks.', hue: '#b04bb0' },
  { name: 'Young Innovator Junior', tag: 'Junior', art: 'junior', image: '/IMAGES/categories/innovator-junior.jpg', desc: 'Creative robotics projects for junior students.', hue: '#c084fc' },
  { name: 'Young Innovator Senior', tag: 'Senior', art: 'senior', image: '/IMAGES/categories/innovator-senior.jpg', desc: 'Advanced engineering projects for senior students.', hue: '#d27bd0' },
];

type FeatureKind = 'roles' | 'csv' | 'qr' | 'scoring' | 'payments' | 'certificate' | 'attendance' | 'pipeline';

const FEATURES: { icon: ReactNode; title: string; desc: string; art: FeatureKind; acc: string }[] = [
  { icon: <Users size={20} />, title: 'Multi-role Access', desc: 'Admin, Coordinator, Judge, Volunteer — each with scoped permissions.', art: 'roles', acc: '#b04bb0' },
  { icon: <FileSpreadsheet size={20} />, title: 'Bulk CSV Import', desc: 'Register hundreds of teams at once with validation and error reporting.', art: 'csv', acc: '#a855f7' },
  { icon: <QrCode size={20} />, title: 'QR Check-in', desc: 'Camera-based QR scanning for fast, secure team check-in.', art: 'qr', acc: '#d27bd0' },
  { icon: <BarChart3 size={20} />, title: 'Live Scoring', desc: 'Category-specific engines: timed, rubric, match tournament, hybrid.', art: 'scoring', acc: '#c084fc' },
  { icon: <Shield size={20} />, title: 'Secure Payments', desc: 'Coordinator-verified manual payments with a full audit trail.', art: 'payments', acc: '#b04bb0' },
  { icon: <Award size={20} />, title: 'Certificates', desc: 'Verifiable PDF certificates with a public verification portal.', art: 'certificate', acc: '#a855f7' },
  { icon: <Clock size={20} />, title: 'Training Attendance', desc: 'Independent Day 1 & Day 2 training attendance tracking.', art: 'attendance', acc: '#e879f9' },
  { icon: <Zap size={20} />, title: 'District → Finals', desc: 'Qualification pipeline from district prelims to state finals.', art: 'pipeline', acc: '#d27bd0' },
];

// colours run from orange to purple along the workflow line
const WORKFLOW = [
  { step: '01', title: 'Admin Configures Season', desc: 'Set districts, venues, categories, rules and fee configs', color: '#b04bb0' },
  { step: '02', title: 'School Registration', desc: 'Manual team entry or bulk CSV upload with validation', color: '#bb4fb0' },
  { step: '03', title: 'Payment Verification', desc: 'Event Coordinator verifies manual cash/UPI/bank payments', color: '#b04cc0' },
  { step: '04', title: 'Approval & QR Passes', desc: 'Admin approves registrations; teams receive signed QR passes', color: '#a24fd0' },
  { step: '05', title: 'QR Check-in & Attendance', desc: 'Scan QR codes; record individual student attendance', color: '#9355dc' },
  { step: '06', title: 'Competition & Scoring', desc: 'Category-specific engines: matches, timed runs, rubric judging', color: '#8460e4' },
  { step: '07', title: 'District Qualification', desc: 'Rankings, quotas approved; linked finals entries created', color: '#7a58ea' },
  { step: '08', title: 'State Finals & Certificates', desc: 'Finals judging, published rankings, verifiable PDF certificates', color: '#7c3aed' },
];

const STATS = [
  { label: 'Categories', value: '7' },
  { label: 'Competition Stages', value: '2' },
  { label: 'Scoring Engines', value: '4' },
  { label: 'Roles Supported', value: '8' },
];

// static values = no hydration mismatch
const BUBBLES = [
  { left: '6%', size: 46, dur: 26, delay: 0, c: 'o' },
  { left: '15%', size: 20, dur: 20, delay: -8, c: 'p' },
  { left: '27%', size: 64, dur: 32, delay: -14, c: 'p' },
  { left: '38%', size: 28, dur: 22, delay: -4, c: 'o' },
  { left: '50%', size: 52, dur: 30, delay: -18, c: 'p' },
  { left: '62%', size: 22, dur: 19, delay: -10, c: 'o' },
  { left: '72%', size: 70, dur: 34, delay: -22, c: 'p' },
  { left: '83%', size: 34, dur: 24, delay: -6, c: 'o' },
  { left: '92%', size: 48, dur: 28, delay: -16, c: 'p' },
  { left: '44%', size: 16, dur: 18, delay: -12, c: 'o' },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, shown] as const;
}

/** fade = slide up • rise = rises out of the dark (scale + blur) • left/right = slide sideways */
function Reveal({
  children,
  className = '',
  variant = 'fade',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'rise' | 'left' | 'right';
  delay?: number;
}) {
  const [ref, shown] = useInView<HTMLDivElement>(0.12);
  const from =
    variant === 'rise' ? 'translateY(110px) scale(0.9)'
    : variant === 'left' ? 'translateX(-60px)'
    : variant === 'right' ? 'translateX(60px)'
    : 'translateY(40px)';
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : from,
        filter: variant === 'rise' && !shown ? 'blur(10px)' : 'none',
        transition: `opacity 1s ${ease} ${delay}s, transform 1s ${ease} ${delay}s, filter 1s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Logo({ size = 34, onFail }: { size?: number; onFail?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="e-logo-fb" style={{ width: size, height: size }}>
        <Bot size={20} color="#fff" />
      </span>
    );
  }
  return (
    <span className="e-logo-chip">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_IMAGE} alt="Evolve Robotics official logo" style={{ height: size, width: 'auto' }} onError={() => { setFailed(true); onFail?.(); }} />
    </span>
  );
}

function SectionHeader({ kicker, title, accent, subtitle }: { kicker: string; title: string; accent: string; subtitle: string }) {
  return (
    <Reveal className="e-head">
      <span className="e-kicker"><i />{kicker}</span>
      <h2>
        {title} <span className="e-grad">{accent}</span>
      </h2>
      <p>{subtitle}</p>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/*  WELCOME ROBOT + SPLASH                                             */
/* ------------------------------------------------------------------ */

function Robot() {
  return (
    <div className="e-robot" role="img" aria-label="EIRO mascot robot">
      <div className="e-robot-bob">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="m-base" src={ROBOT_IMAGE} alt="" draggable={false} />
      </div>
      <span className="e-robot-shadow" />
    </div>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const fired = useRef(false);

  const enter = () => {
    if (fired.current) return;
    fired.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 700);
  };

  // auto-enter after a few seconds, the button still works any time
  useEffect(() => {
    const t = window.setTimeout(enter, 7000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`e-intro ${leaving ? 'out' : ''}`} role="dialog" aria-label="Welcome to EIRO 2026">
      <div className="e-intro-glow" />
      <div className="e-intro-grid" />
      <div className="e-intro-inner">
        <span className="e-intro-kick"><i />Evolve Robotics India presents</span>
        <h1>
          <span className="w1">Welcome to</span>
          <span className="w2 e-grad">EIRO 2026</span>
        </h1>
        <p className="e-intro-tag">Where young minds build, battle and become champions.</p>
        <Robot />
        <button type="button" className="e-btn e-btn-fire e-intro-btn" onClick={enter}>
          Enter the arena <ArrowRight size={18} />
        </button>
        <span className="e-intro-bar"><i /></span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CATEGORY ARTWORK — rendered-style scenes (metal, glass, depth)     */
/*  Drawn in code, so no image files are needed.                       */
/* ------------------------------------------------------------------ */

function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="ca-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f3fc" /><stop offset=".45" stopColor="#9fc0d4" /><stop offset="1" stopColor="#274a66" />
        </linearGradient>
        <linearGradient id="ca-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f5575" /><stop offset="1" stopColor="#0a1a2b" />
        </linearGradient>
        <linearGradient id="ca-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1c8f0" /><stop offset=".5" stopColor="#b04bb0" /><stop offset="1" stopColor="#4a1450" />
        </linearGradient>
        <linearGradient id="ca-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ddd6fe" /><stop offset=".5" stopColor="#7c3aed" /><stop offset="1" stopColor="#2e1465" />
        </linearGradient>
        <linearGradient id="ca-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ddd6fe" stopOpacity=".6" /><stop offset="1" stopColor="#3b1d7a" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id="ca-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2438" /><stop offset="1" stopColor="#050c14" />
        </linearGradient>
        <linearGradient id="ca-bld" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#245b82" /><stop offset="1" stopColor="#0a1b2e" />
        </linearGradient>
        <linearGradient id="ca-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" /><stop offset=".5" stopColor="#10b981" /><stop offset="1" stopColor="#065f46" />
        </linearGradient>
        <radialGradient id="ca-tire" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#3a3a46" /><stop offset="1" stopColor="#09090d" />
        </radialGradient>
        <radialGradient id="ca-bulb" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff1c9" stopOpacity=".95" /><stop offset=".4" stopColor="#f1c8f0" stopOpacity=".55" /><stop offset="1" stopColor="#b04bb0" stopOpacity="0" />
        </radialGradient>
        <filter id="ca-blur" x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="ca-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  );
}

function Wheel({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r} fill="url(#ca-tire)" />
      <ellipse cx={x} cy={y} rx={r * 0.48} ry={r * 0.48} fill="url(#ca-metal)" />
      <ellipse cx={x} cy={y} rx={r * 0.16} ry={r * 0.16} fill="#111" />
    </g>
  );
}

function SumoBot({ x, y, body, led, flip = false, s = 1 }: { x: number; y: number; body: string; led: string; flip?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="2" cy="27" rx="44" ry="7" fill="#000" opacity=".65" filter="url(#ca-blur)" />
      <Wheel x={-22} y={20} />
      <path d="M-36 16 V-4 Q-36 -12 -28 -12 H14 L42 14 V21 H-32 Q-36 21 -36 16 Z" fill={body} />
      <path d="M-32 -9 H12 L21 0 H-32 Z" fill="#fff" opacity=".3" />
      <path d="M-36 12 H40" stroke="#000" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14 -12 L42 14 V22 L8 22 Z" fill="url(#ca-metal)" />
      <path d="M14 -12 L42 14" stroke="#fff" strokeOpacity=".85" strokeWidth="1.3" />
      <Wheel x={20} y={21} />
      <rect x="-22" y="-6" width="24" height="9" rx="3" fill="#061018" />
      <circle cx="-15" cy="-1.5" r="2.2" fill={led} filter="url(#ca-glow)" />
      <circle cx="-6" cy="-1.5" r="2.2" fill={led} filter="url(#ca-glow)" />
      <rect x="-30" y="4" width="14" height="5" rx="2" fill="#061018" opacity=".55" />
    </g>
  );
}

function Box3D({ x, y, w, h, d = 10, c1, c2, c3 }: { x: number; y: number; w: number; h: number; d?: number; c1: string; c2: string; c3: string }) {
  const k = d * 0.6;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c1} />
      <path d={`M${x} ${y} L${x + d} ${y - k} H${x + w + d} L${x + w} ${y} Z`} fill={c2} />
      <path d={`M${x + w} ${y} L${x + w + d} ${y - k} V${y + h - k} L${x + w} ${y + h} Z`} fill={c3} />
      <rect x={x + w / 2 - 2} y={y} width="4" height={h} fill="#fff" opacity=".22" />
    </g>
  );
}

function CategoryArt({ kind, hue }: { kind: ArtKind; hue: string }) {
  const sid = `sp-${kind}`;
  return (
    <svg className="e-art" viewBox="36 38 228 319" preserveAspectRatio="xMidYMin slice" aria-hidden>
      <defs>
        <radialGradient id={sid} cx="50%" cy="30%" r="75%">
          <stop offset="0" stopColor={hue} stopOpacity=".5" />
          <stop offset="1" stopColor="#050d14" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${sid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="420" fill="#061018" />
      <rect x="0" y="0" width="300" height="420" fill={`url(#${sid})`} />
      <path d="M118 0 L182 0 L246 300 L54 300 Z" fill={`url(#${sid}-beam)`} />

      {kind === 'sumo' && (
        <g>
          <ellipse cx="150" cy="212" rx="118" ry="14" fill="#000" opacity=".6" filter="url(#ca-blur)" />
          <ellipse cx="150" cy="200" rx="112" ry="40" fill="#0a1624" />
          <path d="M38 190 V200 A112 40 0 0 0 262 200 V190 Z" fill="#0a1624" />
          <ellipse cx="150" cy="190" rx="112" ry="40" fill="#0f1d2e" stroke="#f4f1fb" strokeWidth="5" />
          <ellipse cx="150" cy="190" rx="100" ry="34" fill="url(#ca-floor)" />
          <ellipse cx="150" cy="188" rx="96" ry="31" fill="none" stroke="#fff" strokeOpacity=".07" />
          <path d="M142 186 h-10 M158 186 h10" stroke="#d27bd0" strokeWidth="3" strokeLinecap="round" />
          <SumoBot x={100} y={158} body="url(#ca-orange)" led="#fde68a" s={0.92} />
          <SumoBot x={200} y={158} body="url(#ca-purple)" led="#f0abfc" flip s={0.92} />
          <g stroke="#fde68a" strokeWidth="2" strokeLinecap="round" filter="url(#ca-glow)">
            <path d="M150 146 l-7 -11 M150 146 l7 -11 M150 144 v-15 M141 150 l-12 -3 M159 150 l12 -3">
              <animate attributeName="opacity" values="1;.1;1" dur=".7s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      )}

      {kind === 'maze' && (
        <g>
          <path d="M56 252 L244 252 L252 266 L48 266 Z" fill="#000" opacity=".55" filter="url(#ca-blur)" />
          <rect x="52" y="60" width="196" height="200" rx="14" fill="#061018" stroke="#1f4a6e" strokeWidth="2" />
          <rect x="60" y="68" width="180" height="184" rx="8" fill="url(#ca-floor)" />
          {/* walls: shadow, side face, top face */}
          {([
            [56, 64, 188, 8], [56, 244, 188, 8], [56, 64, 8, 188], [236, 64, 8, 188],
            [100, 72, 8, 76], [100, 140, 52, 8], [152, 100, 8, 100], [152, 100, 50, 8],
            [194, 100, 8, 60], [194, 152, 24, 8], [64, 188, 60, 8], [124, 188, 8, 56],
            [166, 192, 48, 8], [166, 192, 8, 52],
          ] as number[][]).map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x + 4} y={y + 6} width={w} height={h} fill="#000" opacity=".55" />
              <rect x={x} y={y + 4} width={w} height={h} fill="#2b1466" />
              <rect x={x} y={y} width={w} height={h} fill="url(#ca-purple)" />
              <rect x={x} y={y} width={w} height="1.6" fill="#fff" opacity=".55" />
            </g>
          ))}
          <path d="M78 96 V168 H130 V84 H226 V226" fill="none" stroke="#d27bd0" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1 9" filter="url(#ca-glow)">
            <animate attributeName="stroke-dashoffset" values="0;-40" dur="1.6s" repeatCount="indefinite" />
          </path>
          {/* line-follower robot (top view) */}
          <g transform="translate(78 92)">
            <ellipse cx="2" cy="4" rx="13" ry="16" fill="#000" opacity=".5" filter="url(#ca-blur)" />
            <rect x="-15" y="-6" width="5" height="14" rx="2" fill="#0b0b10" /><rect x="10" y="-6" width="5" height="14" rx="2" fill="#0b0b10" />
            <rect x="-10" y="-14" width="20" height="28" rx="6" fill="url(#ca-orange)" />
            <rect x="-6" y="-9" width="12" height="9" rx="2" fill="#061018" />
            <circle cx="-4" cy="-17" r="2" fill="#fde68a" filter="url(#ca-glow)" /><circle cx="4" cy="-17" r="2" fill="#fde68a" filter="url(#ca-glow)" />
          </g>
          <g transform="translate(226 226)">
            <circle r="15" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity=".8" filter="url(#ca-glow)" />
            <circle r="8" fill="#fff" opacity=".9" />
            <circle r="3" fill="#7c3aed" />
          </g>
        </g>
      )}

      {kind === 'wall' && (
        <g>
          <path d="M40 40 L130 110 H170 L260 40 Z" fill="#0a1a2c" />
          <path d="M40 40 L130 110 V150 L40 300 Z" fill="url(#ca-purple)" opacity=".85" />
          <path d="M260 40 L170 110 V150 L260 300 Z" fill="url(#ca-purple)" opacity=".55" />
          <path d="M40 300 L130 150 H170 L260 300 Z" fill="url(#ca-floor)" />
          <rect x="130" y="110" width="40" height="40" fill="#d27bd0" opacity=".22" filter="url(#ca-blur)" />
          <rect x="130" y="110" width="40" height="40" fill="#061018" stroke="#d27bd0" strokeOpacity=".5" />
          <g stroke="#000" strokeOpacity=".35" strokeWidth="1.5">
            {[0.25, 0.5, 0.75].map((f) => (
              <g key={f}>
                <line x1="40" y1={40 + f * 260} x2="130" y2={110 + f * 40} />
                <line x1="260" y1={40 + f * 260} x2="170" y2={110 + f * 40} />
              </g>
            ))}
            {[0.3, 0.6, 0.85].map((s) => (
              <g key={s}>
                <line x1={40 + s * 90} y1={40 + s * 70} x2={40 + s * 90} y2={300 - s * 150} />
                <line x1={260 - s * 90} y1={40 + s * 70} x2={260 - s * 90} y2={300 - s * 150} />
              </g>
            ))}
          </g>
          <path d="M40 300 L130 150 M260 300 L170 150" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
          <path d="M150 300 L150 152" stroke="#d27bd0" strokeOpacity=".6" strokeWidth="2.5" strokeDasharray="10 8" />
          {/* ultrasonic beams */}
          <path d="M136 222 L84 190 L84 244 Z" fill="#d27bd0" opacity=".22" />
          <path d="M164 222 L216 190 L216 244 Z" fill="#d27bd0" opacity=".22" />
          <path d="M136 222 L84 190 M136 222 L84 244 M164 222 L216 190 M164 222 L216 244" stroke="#f1c8f0" strokeOpacity=".7" strokeWidth="1" strokeDasharray="3 4" />
          {/* robot */}
          <ellipse cx="150" cy="270" rx="46" ry="8" fill="#000" opacity=".65" filter="url(#ca-blur)" />
          <rect x="108" y="244" width="18" height="30" rx="7" fill="url(#ca-tire)" /><rect x="174" y="244" width="18" height="30" rx="7" fill="url(#ca-tire)" />
          <rect x="116" y="238" width="68" height="30" rx="12" fill="url(#ca-orange)" />
          <rect x="124" y="228" width="52" height="16" rx="6" fill="url(#ca-dark)" stroke="#a855f7" strokeOpacity=".6" />
          <circle cx="136" cy="222" r="9" fill="url(#ca-metal)" /><circle cx="136" cy="222" r="5.5" fill="#061018" /><circle cx="136" cy="222" r="2" fill="#fde68a" filter="url(#ca-glow)" />
          <circle cx="164" cy="222" r="9" fill="url(#ca-metal)" /><circle cx="164" cy="222" r="5.5" fill="#061018" /><circle cx="164" cy="222" r="2" fill="#fde68a" filter="url(#ca-glow)" />
          <path d="M122 242 H178" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {kind === 'eco' && (
        <g>
          <ellipse cx="150" cy="262" rx="126" ry="10" fill="#000" opacity=".6" filter="url(#ca-blur)" />
          <rect x="38" y="236" width="224" height="16" rx="3" fill="url(#ca-dark)" />
          <rect x="38" y="236" width="224" height="2" fill="#fff" opacity=".3" />
          {([[48, 36, 98], [88, 46, 138], [138, 34, 84], [176, 42, 114], [222, 34, 70]] as number[][]).map(([x, w, h], bi) => (
            <g key={bi}>
              <path d={`M${x + w} ${236 - h} L${x + w + 9} ${236 - h - 5} V${231} L${x + w} 236 Z`} fill="#0a1a2c" />
              <rect x={x} y={236 - h} width={w} height={h} fill="url(#ca-bld)" />
              <rect x={x} y={236 - h} width={w} height="3" fill="#fff" opacity=".25" />
              {Array.from({ length: Math.floor(h / 16) }).map((_, r) =>
                Array.from({ length: Math.floor((w - 8) / 12) }).map((__, c) => {
                  const lit = (r * 3 + c * 5 + bi) % 3 !== 0;
                  return <rect key={`${r}-${c}`} x={x + 6 + c * 12} y={236 - h + 8 + r * 16} width="7" height="9" rx="1.5" fill={lit ? ((r + c + bi) % 4 === 0 ? '#c084fc' : '#f1c8f0') : '#15304a'} opacity={lit ? 0.95 : 0.7} />;
                })
              )}
            </g>
          ))}
          <path d="M124 100 V84 M124 84 l-6 -6" stroke="#9fc0d4" strokeWidth="2" /><circle cx="124" cy="82" r="2.5" fill="#d27bd0" filter="url(#ca-glow)" />
          <path d="M184 128 l26 -8 v6 l-26 8 Z" fill="#3b82f6" opacity=".6" />
          {/* trees */}
          {[[60, 244], [250, 244]].map(([x, y]) => (
            <g key={x}>
              <rect x={x - 2} y={y - 4} width="4" height="12" fill="#3b2a1a" />
              <circle cx={x} cy={y - 12} r="11" fill="#059669" /><circle cx={x - 4} cy={y - 16} r="7" fill="#10b981" />
            </g>
          ))}
          {/* smart bin */}
          <ellipse cx="150" cy="262" rx="40" ry="7" fill="#000" opacity=".7" filter="url(#ca-blur)" />
          <path d="M120 204 H180 L173 258 H127 Z" fill="url(#ca-green)" />
          <path d="M120 204 H132 L138 258 H127 Z" fill="#fff" opacity=".2" />
          <rect x="114" y="190" width="72" height="16" rx="6" fill="url(#ca-dark)" stroke="#fff" strokeOpacity=".35" />
          <circle cx="132" cy="198" r="3.2" fill="#d27bd0" filter="url(#ca-glow)" />
          <rect x="144" y="195" width="30" height="6" rx="2" fill="#061018" />
          <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#ca-glow)">
            <path d="M141 238 a11 11 0 0 1 17 -5" /><path d="M158 233 l-1 -8 l-7 3" />
            <path d="M159 242 a11 11 0 0 1 -18 3" opacity=".8" /><path d="M141 245 l1 8 l7 -3" opacity=".8" />
          </g>
          <g fill="none" stroke="#d27bd0" strokeWidth="2.2" strokeLinecap="round">
            <path d="M138 176 a16 16 0 0 1 24 0"><animate attributeName="opacity" values=".1;1;.1" dur="1.6s" repeatCount="indefinite" /></path>
            <path d="M130 168 a28 28 0 0 1 40 0"><animate attributeName="opacity" values=".1;1;.1" dur="1.6s" begin=".3s" repeatCount="indefinite" /></path>
          </g>
        </g>
      )}

      {kind === 'factory' && (
        <g>
          <rect x="30" y="120" width="240" height="2" fill="#a855f7" opacity=".25" />
          <path d="M36 240 H264 L250 262 H50 Z" fill="#0e2236" stroke="#3b82a8" strokeOpacity=".6" />
          {[70, 100, 130, 160, 190, 220].map((x) => <line key={x} x1={x} y1="240" x2={x - 6} y2="262" stroke="#000" strokeOpacity=".5" strokeWidth="2" />)}
          <rect x="50" y="262" width="200" height="14" fill="url(#ca-metal)" opacity=".9" />
          <rect x="60" y="276" width="10" height="28" fill="url(#ca-dark)" /><rect x="230" y="276" width="10" height="28" fill="url(#ca-dark)" />
          <ellipse cx="150" cy="300" rx="120" ry="9" fill="#000" opacity=".55" filter="url(#ca-blur)" />
          <Box3D x={56} y={216} w={34} h={26} c1="url(#ca-orange)" c2="#f1c8f0" c3="#4a1450" />
          <Box3D x={206} y={218} w={30} h={24} c1="url(#ca-purple)" c2="#ddd6fe" c3="#3b1d7a" />
          {/* robot arm */}
          <ellipse cx="130" cy="244" rx="34" ry="8" fill="url(#ca-metal)" />
          <ellipse cx="130" cy="241" rx="30" ry="6.5" fill="#0e2236" />
          <path d="M104 244 l8 -6 M116 247 l8 -6 M128 249 l8 -6 M140 249 l8 -6 M152 247 l8 -6" stroke="#fbbf24" strokeWidth="3" opacity=".85" />
          <rect x="114" y="208" width="32" height="32" rx="6" fill="url(#ca-orange)" />
          <rect x="114" y="208" width="10" height="32" rx="5" fill="#fff" opacity=".22" />
          <g transform="rotate(-18 130 208)"><rect x="121" y="150" width="18" height="62" rx="8" fill="url(#ca-orange)" /><rect x="121" y="150" width="6" height="62" rx="3" fill="#fff" opacity=".25" /></g>
          <circle cx="130" cy="208" r="11" fill="url(#ca-metal)" stroke="#17334d" strokeWidth="2" />
          <g transform="rotate(55 111.5 150)"><rect x="104" y="96" width="15" height="58" rx="7" fill="url(#ca-orange)" /><rect x="104" y="96" width="5" height="58" rx="2.5" fill="#fff" opacity=".25" /></g>
          <circle cx="111.5" cy="150" r="11" fill="url(#ca-metal)" stroke="#17334d" strokeWidth="2" />
          <circle cx="156" cy="118" r="8" fill="url(#ca-metal)" stroke="#17334d" strokeWidth="2" />
          <rect x="150" y="124" width="12" height="9" rx="2" fill="url(#ca-dark)" />
          <rect x="144" y="132" width="5" height="22" rx="2" fill="url(#ca-metal)" /><rect x="163" y="132" width="5" height="22" rx="2" fill="url(#ca-metal)" />
          <Box3D x={149} y={138} w={14} h={14} d={6} c1="url(#ca-purple)" c2="#ddd6fe" c3="#3b1d7a" />
          {/* signal tower */}
          <rect x="250" y="190" width="5" height="52" fill="url(#ca-dark)" />
          <circle cx="252.5" cy="178" r="6" fill="#ef4444" filter="url(#ca-glow)"><animate attributeName="opacity" values="1;.25;1" dur="1.2s" repeatCount="indefinite" /></circle>
          <circle cx="252.5" cy="194" r="6" fill="#d27bd0" filter="url(#ca-glow)" />
          <circle cx="252.5" cy="210" r="6" fill="#22c55e" filter="url(#ca-glow)" />
        </g>
      )}

      {kind === 'junior' && (
        <g>
          <ellipse cx="150" cy="262" rx="108" ry="12" fill="#000" opacity=".6" filter="url(#ca-blur)" />
          <circle cx="150" cy="140" r="86" fill="url(#ca-bulb)" />
          {/* PCB */}
          <path d="M52 270 L248 270 L228 226 L72 226 Z" fill="#2a1a5e" stroke="#7c3aed" strokeWidth="1.5" />
          <path d="M52 270 L248 270 L248 278 L52 278 Z" fill="#0a1b2e" />
          <g stroke="#d27bd0" strokeWidth="1.6" fill="none" opacity=".85">
            <path d="M80 262 H120 L132 244 H176" /><path d="M220 262 H186 L176 250 H150" /><path d="M96 236 H128 L136 250" />
          </g>
          {[[86, 250], [202, 236]].map(([x, y]) => (
            <g key={x}><rect x={x} y={y} width="24" height="12" rx="2" fill="#0a1624" stroke="#9fc0d4" strokeOpacity=".5" /><path d={`M${x + 3} ${y + 12} v3 M${x + 9} ${y + 12} v3 M${x + 15} ${y + 12} v3 M${x + 21} ${y + 12} v3 M${x + 3} ${y} v-3 M${x + 9} ${y} v-3 M${x + 15} ${y} v-3 M${x + 21} ${y} v-3`} stroke="#cfe3ee" strokeWidth="1.5" /></g>
          ))}
          <circle cx="156" cy="258" r="3.2" fill="#f0abfc" filter="url(#ca-glow)" /><circle cx="168" cy="258" r="3.2" fill="#d27bd0" filter="url(#ca-glow)" />
          <rect x="228" y="250" width="9" height="12" rx="3" fill="url(#ca-metal)" />
          {/* bulb */}
          <path d="M150 88 C186 88 206 116 198 148 C193 166 176 172 174 190 H126 C124 172 107 166 102 148 C94 116 114 88 150 88 Z" fill="url(#ca-glass)" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
          <path d="M118 108 C108 120 106 138 112 152" stroke="#fff" strokeOpacity=".75" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M139 190 V164 M161 190 V164" stroke="#9fc0d4" strokeWidth="2.5" />
          <path d="M139 164 L144 150 L150 164 L156 148 L161 164" fill="none" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#ca-glow)" />
          <rect x="124" y="190" width="52" height="30" rx="6" fill="url(#ca-metal)" />
          {[196, 202, 208, 214].map((y) => <rect key={y} x="124" y={y} width="52" height="2.4" fill="#17334d" opacity=".55" />)}
          <path d="M132 220 C130 236 110 232 108 246 M168 220 C170 236 190 232 192 246" stroke="#d27bd0" strokeWidth="2.5" fill="none" />
          <g stroke="#fde68a" strokeWidth="3" strokeLinecap="round">
            <path d="M150 56 v-14 M100 76 l-9 -9 M200 76 l9 -9 M70 130 h-14 M230 130 h14"><animate attributeName="opacity" values=".3;1;.3" dur="1.8s" repeatCount="indefinite" /></path>
          </g>
        </g>
      )}

      {kind === 'senior' && (
        <g>
          <ellipse cx="150" cy="290" rx="86" ry="12" fill="#000" opacity=".6" filter="url(#ca-blur)" />
          {([[86, 126, 0.85], [214, 126, 0.85], [68, 196, 1], [232, 196, 1]] as number[][]).map(([x, y], i) => (
            <path key={`a${i}`} d={`M150 172 L${x} ${y}`} stroke="#17334d" strokeWidth="10" strokeLinecap="round" />
          ))}
          {([[86, 126, 0.85], [214, 126, 0.85], [68, 196, 1], [232, 196, 1]] as number[][]).map(([x, y], i) => (
            <path key={`h${i}`} d={`M150 170 L${x} ${y - 1.5}`} stroke="#5a93b3" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          ))}
          <path d="M150 156 L112 132 M150 156 L188 132" stroke="#a855f7" strokeWidth="1.5" opacity="0" />
          {([[86, 126, 0.85], [214, 126, 0.85], [68, 196, 1], [232, 196, 1]] as number[][]).map(([x, y, s], i) => (
            <g key={`r${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
              <ellipse cx="0" cy="3" rx="42" ry="11" fill="#fff" opacity=".07" />
              <ellipse cx="0" cy="3" rx="42" ry="11" fill="none" stroke="#ddd6fe" strokeOpacity=".4" />
              <g transform="scale(1 .27) translate(0 11)">
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={`${0.5 + i * 0.04}s`} repeatCount="indefinite" />
                  <rect x="-40" y="-2.6" width="80" height="5.2" rx="2.6" fill="#e3f1f8" opacity=".9" />
                </g>
              </g>
              <circle cx="0" cy="0" r="9" fill="url(#ca-metal)" stroke="#0e2236" strokeWidth="2" />
              <circle cx="0" cy="0" r="3" fill="#061018" />
              <circle cx="0" cy="-12" r="2.2" fill={i < 2 ? '#c084fc' : '#d27bd0'} filter="url(#ca-glow)" />
            </g>
          ))}
          <rect x="124" y="150" width="52" height="46" rx="17" fill="url(#ca-dark)" stroke="#6fa8c9" strokeOpacity=".6" />
          <path d="M128 164 H172" stroke="#b04bb0" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="150" cy="156" rx="21" ry="9" fill="url(#ca-metal)" opacity=".85" />
          <circle cx="150" cy="156" r="4" fill="#061018" /><circle cx="150" cy="156" r="1.6" fill="#d27bd0" filter="url(#ca-glow)" />
          <circle cx="138" cy="190" r="2.6" fill="#b04bb0" filter="url(#ca-glow)" /><circle cx="162" cy="190" r="2.6" fill="#a855f7" filter="url(#ca-glow)" />
          <circle cx="150" cy="206" r="12" fill="url(#ca-dark)" stroke="#6fa8c9" strokeOpacity=".7" />
          <circle cx="150" cy="208" r="7" fill="#061018" stroke="#c084fc" strokeWidth="1.5" />
          <circle cx="147" cy="205" r="2.2" fill="#fff" opacity=".85" />
          <g fill="none" stroke="#d27bd0" strokeWidth="2.2" strokeLinecap="round" opacity=".9">
            <path d="M40 60 v-14 h14 M260 60 v-14 h-14 M40 250 v14 h14 M260 250 v14 h-14" />
          </g>
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURE CARD ARTWORK — one unique visual per card                  */
/* ------------------------------------------------------------------ */

const QR_BITS = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  return (r * 7 + c * 13 + r * c) % 3 === 0 || (r + c * 2) % 5 === 0;
});

function FeatureArt({ kind, acc }: { kind: FeatureKind; acc: string }) {
  const T = { fontFamily: 'Roboto, ui-sans-serif, sans-serif', fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 240 120" className="e-fsvg" aria-hidden preserveAspectRatio="xMidYMid meet">
      {kind === 'roles' && (
        <g>
          <path d="M120 10 l30 10 v22 c0 20 -14 34 -30 40 c-16 -6 -30 -20 -30 -40 v-22 Z" fill="none" stroke={acc} strokeOpacity=".35" strokeWidth="2" />
          {[[78, 54, '#b04bb0'], [162, 54, '#a855f7'], [120, 46, '#e879f9']].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle cx="0" cy="-8" r={i === 2 ? 13 : 11} fill={c as string} />
              <path d={`M${i === 2 ? -22 : -18} 22 q${i === 2 ? 22 : 18} -34 ${i === 2 ? 44 : 36} 0 Z`} fill={c as string} opacity=".85" />
            </g>
          ))}
          {([['Admin', 8, '#b04bb0'], ['Coordinator', 52, '#a855f7'], ['Judge', 128, '#e879f9'], ['Volunteer', 170, '#d27bd0']] as [string, number, string][]).map(([t, x, c]) => (
            <g key={t}>
              <rect x={x} y="96" width={t.length * 5 + 12} height="16" rx="8" fill={c} fillOpacity=".2" stroke={c} strokeOpacity=".6" />
              <text x={x + 6} y="107.5" fontSize="8" fill="#f6f2ff" style={T}>{t}</text>
            </g>
          ))}
        </g>
      )}

      {kind === 'csv' && (
        <g>
          <rect x="18" y="14" width="124" height="92" rx="8" fill="#0d1a2a" stroke={acc} strokeOpacity=".5" />
          <rect x="18" y="14" width="124" height="18" rx="8" fill={acc} fillOpacity=".35" />
          <text x="28" y="27" fontSize="9" fill="#fff" style={T}>teams.csv</text>
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <rect x="26" y={40 + r * 15} width="32" height="7" rx="3" fill="#fff" opacity=".18" />
              <rect x="64" y={40 + r * 15} width="38" height="7" rx="3" fill="#fff" opacity=".12" />
              <rect x="108" y={40 + r * 15} width="26" height="7" rx="3" fill={acc} opacity=".5" />
            </g>
          ))}
          <path d="M158 90 V50 M146 62 l12 -14 l12 14" stroke={acc} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" />
          </path>
          <rect x="182" y="28" width="46" height="18" rx="9" fill="#22c55e" fillOpacity=".2" stroke="#22c55e" /><path d="M192 37 l4 4 l8 -8" stroke="#22c55e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="182" y="54" width="46" height="18" rx="9" fill="#22c55e" fillOpacity=".2" stroke="#22c55e" /><path d="M192 63 l4 4 l8 -8" stroke="#22c55e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="182" y="80" width="46" height="18" rx="9" fill="#ef4444" fillOpacity=".2" stroke="#ef4444" /><path d="M194 85 l8 8 M202 85 l-8 8" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      {kind === 'qr' && (
        <g>
          <rect x="82" y="12" width="76" height="76" rx="8" fill="#f6f2ff" />
          {QR_BITS.map((b, i) => {
            const r = Math.floor(i / 9), c = i % 9;
            const finder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
            if (finder) return null;
            return b ? <rect key={i} x={88 + c * 7.4} y={18 + r * 7.4} width="6" height="6" rx="1" fill="#0b1a2e" /> : null;
          })}
          {[[88, 18], [88 + 6 * 7.4, 18], [88, 18 + 6 * 7.4]].map(([x, y], i) => (
            <g key={i}><rect x={x} y={y} width="20.6" height="20.6" rx="3" fill="#0b1a2e" /><rect x={x + 4} y={y + 4} width="12.6" height="12.6" rx="1.5" fill="#f6f2ff" /><rect x={x + 7} y={y + 7} width="6.6" height="6.6" rx="1" fill={acc} /></g>
          ))}
          <rect x="82" y="46" width="76" height="3" fill={acc} filter="url(#ca-glow)">
            <animate attributeName="y" values="16;82;16" dur="2.6s" repeatCount="indefinite" />
          </rect>
          <g stroke={acc} strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M72 30 v-14 h14 M168 30 v-14 h-14 M72 70 v14 h14 M168 70 v14 h-14" transform="translate(0 0)" />
          </g>
          <rect x="82" y="98" width="76" height="16" rx="8" fill={acc} fillOpacity=".2" stroke={acc} />
          <text x="120" y="109.5" fontSize="8.5" textAnchor="middle" fill="#fff" style={T}>PASS VERIFIED ✓</text>
        </g>
      )}

      {kind === 'scoring' && (
        <g>
          {[40, 62, 30, 78, 54].map((h, i) => (
            <rect key={i} x={20 + i * 22} y={106 - h} width="14" height={h} rx="4" fill={i === 3 ? acc : '#a855f7'} opacity={i === 3 ? 1 : 0.55}>
              <animate attributeName="height" values={`${h};${h * 0.55};${h}`} dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${106 - h};${106 - h * 0.55};${106 - h}`} dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
            </rect>
          ))}
          <line x1="14" y1="107" x2="136" y2="107" stroke="#fff" strokeOpacity=".25" />
          <rect x="150" y="14" width="76" height="52" rx="10" fill="#0d1a2a" stroke={acc} strokeOpacity=".6" />
          <text x="188" y="48" fontSize="25" textAnchor="middle" fill="#fff" style={T}>98.5</text>
          <circle cx="162" cy="26" r="3.5" fill="#ef4444"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite" /></circle>
          <text x="170" y="29" fontSize="8" fill="#ef4444" style={T}>LIVE</text>
          {[0, 1, 2].map((i) => (
            <g key={i}><circle cx="160" cy={80 + i * 13} r="4.5" fill={['#fbbf24', '#cbd5e1', '#d97706'][i]} /><rect x="170" y={77 + i * 13} width={52 - i * 14} height="6" rx="3" fill={acc} opacity={0.8 - i * 0.2} /></g>
          ))}
        </g>
      )}

      {kind === 'payments' && (
        <g>
          <g transform="rotate(-8 90 60)">
            <rect x="30" y="22" width="118" height="74" rx="10" fill="#0c2036" stroke={acc} strokeOpacity=".7" />
            <rect x="30" y="38" width="118" height="12" fill="#000" opacity=".5" />
            <rect x="42" y="60" width="20" height="14" rx="3" fill="#fbbf24" opacity=".9" />
            <rect x="42" y="80" width="64" height="6" rx="3" fill="#fff" opacity=".35" />
            <text x="136" y="34" fontSize="9" textAnchor="end" fill={acc} style={T}>EIRO PAY</text>
          </g>
          <g transform="translate(176 60)">
            <circle r="30" fill={acc} fillOpacity=".15" stroke={acc} strokeWidth="2" />
            <circle r="22" fill={acc} fillOpacity=".3" />
            <path d="M-11 0 l8 8 l15 -16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <animate attributeName="stroke-dasharray" values="0 60;60 0" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>
          {['CASH', 'UPI', 'BANK'].map((t, i) => (
            <g key={t}><rect x={22 + i * 44} y="100" width="38" height="14" rx="7" fill="#fff" fillOpacity=".08" stroke="#fff" strokeOpacity=".3" /><text x={41 + i * 44} y="110" fontSize="8" textAnchor="middle" fill="#fff" style={T}>{t}</text></g>
          ))}
        </g>
      )}

      {kind === 'certificate' && (
        <g>
          <rect x="44" y="10" width="152" height="102" rx="6" fill="#f6f2ff" />
          <rect x="52" y="18" width="136" height="86" rx="3" fill="none" stroke={acc} strokeWidth="2" />
          <text x="120" y="38" fontSize="11" textAnchor="middle" fill="#0c2a44" style={T}>CERTIFICATE</text>
          <text x="120" y="49" fontSize="6.5" textAnchor="middle" fill="#5f7a8a" style={T}>OF ACHIEVEMENT • EIRO 2026</text>
          <rect x="76" y="58" width="88" height="5" rx="2.5" fill="#0c2a44" opacity=".35" />
          <rect x="88" y="69" width="64" height="4" rx="2" fill="#0c2a44" opacity=".2" />
          <rect x="62" y="80" width="26" height="22" rx="2" fill="#0c2a44" />
          {QR_BITS.slice(0, 36).map((b, i) => b ? <rect key={i} x={64 + (i % 6) * 3.7} y={82 + Math.floor(i / 6) * 3.4} width="2.8" height="2.6" fill="#f6f2ff" /> : null)}
          <g transform="translate(168 88)">
            <path d="M-8 8 l-4 20 l12 -8 l12 8 l-4 -20 Z" fill="#7a2380" />
            <circle r="16" fill={acc} /><circle r="12" fill="none" stroke="#fff" strokeOpacity=".7" strokeDasharray="2 2.5" />
            <path d="M0 -7 l2.2 4.8 l5.2 .6 l-3.9 3.6 l1.1 5.1 l-4.6 -2.6 l-4.6 2.6 l1.1 -5.1 l-3.9 -3.6 l5.2 -.6 Z" fill="#fff" />
          </g>
        </g>
      )}

      {kind === 'attendance' && (
        <g>
          {['DAY 1', 'DAY 2'].map((d, c) => (
            <g key={d} transform={`translate(${24 + c * 108} 0)`}>
              <rect x="0" y="10" width="96" height="16" rx="8" fill={acc} fillOpacity=".3" stroke={acc} strokeOpacity=".7" />
              <text x="48" y="21.5" fontSize="9" textAnchor="middle" fill="#fff" style={T}>{d}</text>
              {[0, 1, 2].map((r) => {
                const ok = (r + c) % 3 !== 2;
                return (
                  <g key={r} transform={`translate(0 ${34 + r * 26})`}>
                    <rect x="0" y="0" width="96" height="21" rx="6" fill="#fff" fillOpacity=".06" stroke="#fff" strokeOpacity=".12" />
                    <circle cx="13" cy="10.5" r="6" fill={['#b04bb0', '#a855f7', '#e879f9'][(r + c) % 3]} />
                    <rect x="25" y="7.5" width="34" height="6" rx="3" fill="#fff" opacity=".3" />
                    <circle cx="82" cy="10.5" r="7.5" fill={ok ? '#22c55e' : '#ef4444'} fillOpacity=".25" stroke={ok ? '#22c55e' : '#ef4444'} />
                    <path d={ok ? 'M78 10.5 l3 3 l5.5 -6' : 'M79 7.5 l6 6 M85 7.5 l-6 6'} stroke={ok ? '#22c55e' : '#ef4444'} strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      )}

      {kind === 'pipeline' && (
        <g>
          <path d="M44 60 H118 H190" stroke={acc} strokeWidth="3" strokeDasharray="3 8" strokeLinecap="round" fill="none">
            <animate attributeName="stroke-dashoffset" values="0;-44" dur="1.6s" repeatCount="indefinite" />
          </path>
          {([['DISTRICT', 44, '#a855f7'], ['STATE', 118, '#b04bb0']] as [string, number, string][]).map(([t, x, c]) => (
            <g key={t}>
              <circle cx={x} cy="60" r="24" fill={c} fillOpacity=".18" stroke={c} strokeWidth="2" />
              <path d={`M${x} 48 a8 8 0 0 1 8 8 c0 6 -8 14 -8 14 s-8 -8 -8 -14 a8 8 0 0 1 8 -8 Z`} fill={c} />
              <circle cx={x} cy="56" r="3" fill="#061018" />
              <text x={x} y="102" fontSize="9" textAnchor="middle" fill="#fff" style={T}>{t}</text>
            </g>
          ))}
          <g transform="translate(190 60)">
            <circle r="26" fill={acc} fillOpacity=".16" stroke={acc} strokeWidth="2" />
            <path d="M-11 -13 h22 v9 a11 11 0 0 1 -22 0 Z" fill="#fbbf24" />
            <path d="M-11 -10 h-6 a6 6 0 0 0 6 10 M11 -10 h6 a6 6 0 0 1 -6 10" fill="none" stroke="#fbbf24" strokeWidth="2.4" />
            <rect x="-3" y="6" width="6" height="8" fill="#d97706" /><rect x="-9" y="13" width="18" height="4" rx="2" fill="#fbbf24" />
            <text x="0" y="42" fontSize="9" textAnchor="middle" fill="#fff" style={T}>FINALS</text>
          </g>
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  POSTER CAROUSEL (numbered "Top 10" style row)                      */
/* ------------------------------------------------------------------ */

function PosterRow() {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const tilt = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.05)`;
  };
  const untilt = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <div className="e-row" role="region" aria-roledescription="carousel" aria-label="Competition categories">
      <ArtDefs />
      <button type="button" className="e-arrow l" aria-label="Previous categories" onClick={() => go(-1)} disabled={!canL}>
        <ChevronLeft size={26} />
      </button>
      <div className="e-scroller" ref={scroller} onScroll={update}>
        {CATEGORIES.map((c, i) => (
          <div className="e-item" key={c.name}>
            <span className="e-bignum" aria-hidden>{i + 1}</span>
            <article className="e-poster" onMouseMove={tilt} onMouseLeave={untilt} style={{ ['--hue' as string]: c.hue }}>
              <CategoryArt kind={c.art} hue={c.hue} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" loading="lazy" onError={(ev) => (ev.currentTarget.style.display = 'none')} />
              <div className="e-poster-shade" />
              <div className="e-poster-info">
                <span className="e-poster-tag">{c.tag}</span>
                <h3>{c.name}</h3>
                <p>{c.desc}</p>
              </div>
            </article>
          </div>
        ))}
      </div>
      <button type="button" className="e-arrow r" aria-label="Next categories" onClick={() => go(1)} disabled={!canR}>
        <ChevronRight size={26} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HORIZONTAL WORKFLOW — all 8 stages visible at once                 */
/* ------------------------------------------------------------------ */

function Workflow() {
  const [ref, shown] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={`e-hflow ${shown ? 'go' : ''}`}>
      <span className="e-hline" aria-hidden><i /></span>
      {WORKFLOW.map((w, i) => (
        <div key={w.step} className="e-hstep" style={{ ['--c' as string]: w.color, ['--d' as string]: `${0.15 + i * 0.13}s` }}>
          <span className="e-dot">{w.step}</span>
          <div className="e-hcard">
            <h3>{w.title}</h3>
            <p>{w.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [intro, setIntro] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [footLogoFailed, setFootLogoFailed] = useState(false);

  const spot = useRef<HTMLDivElement | null>(null);
  const art = useRef<HTMLDivElement | null>(null);

  // show the intro once per browser session
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('eiro-intro') === '1';
    } catch {
      /* storage blocked */
    }
    setIntro(!seen);
  }, []);

  useEffect(() => {
    document.body.style.overflow = intro ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [intro]);

  const finishIntro = () => {
    try {
      sessionStorage.setItem('eiro-intro', '1');
    } catch {
      /* ignore */
    }
    setIntro(false);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (spot.current) spot.current.style.transform = `translate(${e.clientX - 260}px, ${e.clientY - 260}px)`;
      if (art.current) {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        art.current.style.setProperty('--ry', `${-16 + x * 14}deg`);
        art.current.style.setProperty('--rx', `${6 - y * 10}deg`);
      }
    };
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="eiro">
      <style>{CSS}</style>

      {intro === null && <div className="e-cover" />}
      {intro && <Intro onDone={finishIntro} />}

      <div className="e-progress" style={{ width: `${progress}%` }} />
      <div className="e-spot" ref={spot} />

      {/* floating glow bubbles */}
      <div className="e-bubbles" aria-hidden>
        {BUBBLES.map((b, i) => (
          <span key={i} className={b.c} style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
        ))}
      </div>

      {/* NAV */}
      <header className={`e-nav ${scrolled || menuOpen ? 's' : ''}`}>
        <a href="#top" className="e-brand" onClick={closeMenu}>
          <Logo size={48} onFail={() => setLogoFailed(true)} />
          {logoFailed && (
            <span>
              <b>EIRO</b>
              <small>Evolve Robotics</small>
            </span>
          )}
        </a>

        <nav className="e-links">
          <a href="#categories">Categories</a>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <Link href="/events">Events</Link>
          <Link href="/results">Results</Link>
          <Link href="/verify">Verify Certificate</Link>
        </nav>

        <div className="e-actions">
          <Link href="/login" className="e-btn e-btn-line e-sm e-hide-m">Sign in</Link>
          <Link href="/signup" className="e-btn e-btn-fire e-sm e-hide-m">Register School</Link>
          <button
            type="button"
            className="e-burger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="e-mobile">
          <a href="#categories" onClick={closeMenu}>Categories</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#workflow" onClick={closeMenu}>Workflow</a>
          <Link href="/events" onClick={closeMenu}>Events</Link>
          <Link href="/results" onClick={closeMenu}>Results</Link>
          <Link href="/verify" onClick={closeMenu}>Verify Certificate</Link>
          <div className="e-mrow">
            <Link href="/login" className="e-btn e-btn-line e-sm" onClick={closeMenu}>Sign in</Link>
            <Link href="/signup" className="e-btn e-btn-fire e-sm" onClick={closeMenu}>Register</Link>
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="top" className="e-hero">
        <div className="e-hero-text">
          <span className="e-live"><i />Season registrations open</span>
          <h1>
            <span className="l"><span>The Official</span></span>
            <span className="l"><span className="e-grad">EIRO Robotics</span></span>
            <span className="l"><span>Competition Platform</span></span>
          </h1>
          <p>From school registration to district qualifiers and state finals — one seamless platform for every team.</p>
          <div className="e-cta">
            <Link href="/signup" className="e-btn e-btn-fire">
              <Play size={18} fill="currentColor" /> Register your school
            </Link>
            <Link href="/events" className="e-btn e-btn-glass">
              View Events <ArrowRight size={18} />
            </Link>
          </div>
          <div className="e-stats">
            {STATS.map((s) => (
              <div key={s.label}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="e-hero-art">
          <div className="e-screen" ref={art}>
            <div className="e-screen-fb">
              <i className="r1" />
              <i className="r2" />
              <i className="r3" />
              <Bot size={92} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMAGE} alt="EIRO robotics competition" onError={(ev) => (ev.currentTarget.style.display = 'none')} />
            <div className="e-screen-shade" />
            <div className="e-screen-label">
              <span>EIRO</span>
              <small>Robotics Competition • Season Live</small>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="e-section">
        <SectionHeader kicker="Now streaming" title="Competition" accent="Categories" subtitle="Seven arenas. Pick the challenge that fits your team — swipe through them all." />
        <Reveal variant="rise">
          <PosterRow />
        </Reveal>
      </section>

      {/* FEATURES */}
      <section id="features" className="e-section">
        <SectionHeader kicker="Originals" title="Everything you" accent="need" subtitle="One platform for admins, coordinators, judges and volunteers — built for the whole season." />
        <div className="e-features-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.08} className="e-fwrap">
              <div className="e-feature" style={{ ['--acc' as string]: f.acc }}>
                <div className="e-fart">
                  <FeatureArt kind={f.art} acc={f.acc} />
                </div>
                <div className="e-fbody">
                  <span className="e-ficon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="e-section">
        <SectionHeader kicker="The full story" title="Competition" accent="Workflow" subtitle="Seamless flow from school registration through district qualifiers to state finals." />
        <Workflow />
      </section>

      {/* READY TO COMPETE */}
      <section className="e-section e-final-wrap">
        <Reveal variant="rise">
          <div className="e-final">
            <div className="e-orbit o1" />
            <div className="e-orbit o2" />
            <span className="e-kicker c"><i />Final episode</span>
            <h2>Ready to <span className="e-grad">compete?</span></h2>
            <p>Register your school today or jump straight back into your dashboard.</p>
            <div className="e-cta c">
              <Link href="/signup" className="e-btn e-btn-fire">
                Register as School Coordinator <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="e-btn e-btn-glass">Sign in to Dashboard</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="e-foot">
        <div className="e-foot-in">
          <div className="e-foot-grid">
            <div className="e-foot-brand">
              <a href="#top" className="e-foot-logo" aria-label="Back to top">
                {footLogoFailed ? (
                  <span className="e-foot-wordmark">
                    <b>EIRO</b>
                    <small>Evolve Robotics</small>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={FOOTER_IMAGE}
                    alt="Evolve Robotics - deeply rooted"
                    className="e-foot-logo-img"
                    onError={() => setFootLogoFailed(true)}
                  />
                )}
              </a>
              <p>
                EIRO is the official competition platform by Evolve Robotics — one place for school registration,
                scoring, qualification and certificates, from district prelims to state finals.
              </p>
            </div>

            <nav className="e-foot-col" aria-label="Platform">
              <h4>Platform</h4>
              <Link href="/events">Events</Link>
              <Link href="/results">Results</Link>
              <Link href="/verify">Verify Certificate</Link>
            </nav>

            <nav className="e-foot-col" aria-label="Explore">
              <h4>Explore</h4>
              <a href="#categories">Categories</a>
              <a href="#features">Features</a>
              <a href="#workflow">Workflow</a>
            </nav>

            <nav className="e-foot-col" aria-label="Get started">
              <h4>Get started</h4>
              <Link href="/signup">Register School</Link>
              <Link href="/login">Sign in</Link>
              <a href="https://evolveroboticsindia.com" target="_blank" rel="noopener noreferrer">evolveroboticsindia.com</a>
            </nav>
          </div>

          <div className="e-foot-bar">
            <span>© 2026 Evolve Robotics India • EIRO. All rights reserved.</span>
            <span>Built for young innovators</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                             */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

.eiro{
  --bg:#050308; --bg2:#2c2158; --card:#32245f; --line:rgba(255,255,255,.13);
  --txt:#f5f0fd; --mut:#bdb3d8;
  --o:#b24bb2; --o2:#dd8fe0; --p:#8a2889; --p2:#a78bfa;
  --disp:'Roboto',ui-sans-serif,system-ui,sans-serif;
  background:var(--bg);
  color:var(--txt); min-height:100vh; position:relative; overflow-x:hidden;
  font-family:'Roboto',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; -webkit-font-smoothing:antialiased;
}
.eiro *{box-sizing:border-box}
.eiro a{color:inherit;text-decoration:none}
.eiro button{font-family:inherit}
.e-grad{background:linear-gradient(100deg,#c860c8 0%,#e48ae6 45%,#a78bfa 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:eShine 6s linear infinite}
@keyframes eShine{0%{background-position:0% center}100%{background-position:200% center}}

/* ambient */
.e-progress{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--o),var(--p2));z-index:120;transition:width .1s}
.e-spot{position:fixed;top:0;left:0;width:520px;height:520px;border-radius:50%;pointer-events:none;z-index:1;
  background:radial-gradient(circle,rgba(168,85,247,.16),rgba(249,115,22,.05) 45%,transparent 70%);transition:transform .3s ease-out}
.e-bubbles{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.e-bubbles span{position:absolute;bottom:-100px;border-radius:50%;animation:eRise linear infinite;filter:blur(1px)}
.e-bubbles .o{background:radial-gradient(circle at 30% 30%,rgba(251,146,60,.35),rgba(249,115,22,.04) 70%)}
.e-bubbles .p{background:radial-gradient(circle at 30% 30%,rgba(168,85,247,.35),rgba(124,58,237,.04) 70%)}
@keyframes eRise{0%{transform:translateY(0) scale(.8);opacity:0}10%{opacity:1}90%{opacity:.8}100%{transform:translateY(-115vh) scale(1.15);opacity:0}}

/* intro / welcome splash */
.e-cover{position:fixed;inset:0;background:#000;z-index:199}
.e-intro{position:fixed;inset:0;z-index:200;background:#000;display:grid;place-items:center;overflow:hidden;transition:opacity .7s ease,transform .7s ease}
.e-intro.out{opacity:0;transform:scale(1.1);pointer-events:none}
.e-intro-glow{position:absolute;inset:0;background:radial-gradient(55% 45% at 50% 30%,rgba(124,58,237,.38),transparent 70%),radial-gradient(50% 40% at 50% 100%,rgba(249,115,22,.3),transparent 70%)}
.e-intro-grid{position:absolute;inset:0;opacity:.35;background-image:linear-gradient(rgba(168,85,247,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,.16) 1px,transparent 1px);background-size:56px 56px;
  -webkit-mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent);mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent)}
.e-intro-inner{position:relative;text-align:center;padding:20px;display:flex;flex-direction:column;align-items:center;gap:clamp(8px,1.6vh,16px);max-height:100vh}
.e-intro-kick{display:inline-flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--o2);font-weight:600;animation:eUp .7s both}
.e-intro-kick i{width:26px;height:2px;background:linear-gradient(90deg,var(--o),var(--p2))}
.e-intro h1{margin:0;font-family:var(--disp);font-weight:700;line-height:1;letter-spacing:-.025em}
.e-intro h1 span{display:block}
.e-intro h1 .w1{font-size:clamp(22px,4.4vw,44px);font-weight:500;color:#efe6ff;animation:eUp .8s .15s both}
.e-intro h1 .w2{font-size:clamp(52px,12vw,128px);animation:eUp .9s .3s both,eShine 6s linear infinite}
.e-intro-tag{margin:0;max-width:520px;color:var(--mut);font-size:clamp(14px,1.8vw,18px);line-height:1.55;animation:eUp .8s .55s both}

/* mascot robot (image only, gentle bob) */
.e-robot{position:relative;height:min(36vh,320px);aspect-ratio:198/279;margin:4px 0;
  animation:eRobotIn 1s .5s cubic-bezier(.2,.9,.3,1.2) both;
  filter:drop-shadow(0 18px 40px rgba(178,75,178,.45))}
@keyframes eRobotIn{from{opacity:0;transform:translateY(80px) scale(.85)}to{opacity:1;transform:none}}
.e-robot-bob{position:absolute;inset:0;animation:eBob 3.2s ease-in-out infinite;
  -webkit-mask-image:radial-gradient(ellipse 72% 74% at 50% 50%,#000 60%,transparent 100%);
  mask-image:radial-gradient(ellipse 72% 74% at 50% 50%,#000 60%,transparent 100%)}
@keyframes eBob{50%{transform:translateY(-12px)}}
.e-robot-bob img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;user-select:none;pointer-events:none}
.e-robot-shadow{position:absolute;left:18%;right:18%;bottom:-6px;height:14px;border-radius:50%;
  background:#000;opacity:.5;filter:blur(8px);animation:eShadow 3.2s ease-in-out infinite}
@keyframes eShadow{50%{transform:scale(.8);opacity:.3}}

.e-intro-btn{animation:eUp .8s .9s both}
.e-intro-bar{width:140px;height:3px;border-radius:3px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:4px}
.e-intro-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--o),var(--p2));transform-origin:left;animation:eBar 7s linear forwards}
@keyframes eBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* nav */
.e-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px clamp(16px,4vw,48px);
  transition:background .3s,backdrop-filter .3s,padding .3s;background:linear-gradient(#000c,transparent)}
.e-nav.s{background:rgba(5,3,8,.86);backdrop-filter:blur(14px);padding-top:8px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.e-brand{display:flex;align-items:center;gap:10px}
.e-brand b{display:block;font-family:var(--disp);font-weight:700;font-size:20px;letter-spacing:.06em;line-height:1}
.e-brand small{font-size:10.5px;color:var(--o2)}
.e-logo-chip{display:inline-flex;align-items:center;background:transparent;padding:0;border-radius:0;box-shadow:none}
.e-logo-chip img{display:block;object-fit:contain;filter:drop-shadow(0 2px 10px rgba(178,75,178,.35))}
.e-logo-fb{display:grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,var(--o),var(--p))}
.e-links{display:flex;gap:22px;font-size:14px;color:var(--mut)}
.e-links a{position:relative;transition:color .2s;white-space:nowrap}
.e-links a:hover{color:var(--txt)}
.e-links a::after{content:"";position:absolute;left:0;bottom:-5px;height:2px;width:0;background:var(--o);transition:width .25s}
.e-links a:hover::after{width:100%}
.e-actions{display:flex;align-items:center;gap:10px}
.e-burger{display:none;width:42px;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:var(--txt);cursor:pointer;place-items:center;transition:.2s}
.e-burger:hover{border-color:var(--o);color:var(--o2)}
.e-mobile{position:fixed;top:72px;left:0;right:0;z-index:99;display:flex;flex-direction:column;padding:10px clamp(16px,4vw,48px) 20px;
  background:rgba(5,3,8,.96);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);animation:eUp .3s both}
.e-mobile>a{padding:13px 2px;font-size:15px;color:var(--mut);border-bottom:1px solid var(--line);transition:color .2s}
.e-mobile>a:hover{color:var(--txt)}
.e-mrow{display:flex;gap:10px;margin-top:16px}
.e-mrow .e-btn{flex:1}
@media(max-width:1020px){.e-links{display:none}.e-burger{display:grid}}
@media(max-width:560px){.e-hide-m{display:none}}
@media(min-width:1021px){.e-mobile{display:none}}

/* buttons */
.e-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:15px 28px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;
  border:1.5px solid transparent;transition:transform .25s,box-shadow .25s,background .25s,border-color .25s;position:relative;overflow:hidden}
.e-btn:hover{transform:translateY(-3px) scale(1.02)}
.e-sm{padding:9px 20px;font-size:13.5px}
.e-btn-fire{background:linear-gradient(110deg,#a23aa8,#7a2380);color:#fff;box-shadow:0 12px 34px rgba(162,58,168,.38)}
.e-btn-fire::after{content:"";position:absolute;top:0;left:-120%;width:60%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);transition:left .6s}
.e-btn-fire:hover::after{left:140%}
.e-btn-fire:hover{box-shadow:0 18px 44px rgba(178,75,178,.55)}
.e-btn-glass{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.22);color:var(--txt);backdrop-filter:blur(8px)}
.e-btn-glass:hover{background:rgba(178,75,178,.25);border-color:var(--o)}
.e-btn-line{border-color:rgba(255,255,255,.3);color:var(--txt)}
.e-btn-line:hover{border-color:var(--o);color:var(--o2)}

/* hero */
.e-hero{position:relative;z-index:2;min-height:78vh;max-width:1240px;margin:0 auto;padding:124px clamp(18px,4vw,48px) 40px;display:grid;grid-template-columns:1.1fr .9fr;gap:30px;align-items:center}
@media(max-width:900px){.e-hero{grid-template-columns:1fr;padding-top:110px;min-height:0}}
.e-live{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--o2);animation:eUp .7s both}
.e-live i{width:8px;height:8px;border-radius:50%;background:var(--o);animation:ePulse 1.8s infinite}
@keyframes ePulse{0%{box-shadow:0 0 0 0 rgba(200,96,200,.6)}70%,100%{box-shadow:0 0 0 10px rgba(200,96,200,0)}}
.e-hero h1{font-family:var(--disp);font-weight:900;font-size:clamp(36px,6vw,74px);line-height:1.06;letter-spacing:-.02em;margin:16px 0 18px}
.e-hero h1 .l{display:block;overflow:hidden;padding-bottom:.06em}
.e-hero h1 .l>span{display:inline-block;transform:translateY(112%);animation:eSlide 1s cubic-bezier(.2,.8,.2,1) forwards}
.e-hero h1 .l:nth-child(1)>span{animation-delay:.1s}.e-hero h1 .l:nth-child(2)>span{animation-delay:.24s}.e-hero h1 .l:nth-child(3)>span{animation-delay:.38s}
@keyframes eSlide{to{transform:none}}
@keyframes eUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.e-hero-text>p{color:var(--mut);font-size:clamp(15px,1.8vw,18px);line-height:1.65;max-width:520px;margin:0;animation:eUp .8s .55s both}
.e-cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px;animation:eUp .8s .7s both}
.e-cta.c{justify-content:center}
.e-stats{display:flex;gap:clamp(20px,4vw,44px);flex-wrap:wrap;margin-top:38px;animation:eUp .8s .9s both}
.e-stats b{display:block;font-family:var(--disp);font-weight:700;font-size:30px;letter-spacing:-.01em;color:var(--o2)}
.e-stats span{font-size:12px;color:var(--mut)}

/* hero tilted screen (like the laptop perspective in the reel) */
.e-hero-art{perspective:1400px;animation:eUp 1s .3s both}
.e-screen{--rx:6deg;--ry:-16deg;position:relative;aspect-ratio:4/3.1;border-radius:18px;overflow:hidden;border:1px solid rgba(124,58,237,.25);
  transform:rotateY(var(--ry)) rotateX(var(--rx));transition:transform .35s ease-out;transform-style:preserve-3d;
  background:linear-gradient(135deg,#2a1a5e,#140b33 55%,#0b3b3a);box-shadow:-30px 40px 90px rgba(124,58,237,.3),0 0 0 1px rgba(178,75,178,.1)}
.e-screen>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.e-screen-fb{position:absolute;inset:0;display:grid;place-items:center;color:#c4b5fd}
.e-screen-fb i{position:absolute;border-radius:50%;border:1.5px solid rgba(167,139,250,.5);animation:eSpin 16s linear infinite}
.e-screen-fb i::after{content:"";position:absolute;top:-5px;left:50%;width:9px;height:9px;border-radius:50%;background:var(--o)}
.e-screen-fb .r1{width:42%;aspect-ratio:1}.e-screen-fb .r2{width:66%;aspect-ratio:1;animation-duration:24s;animation-direction:reverse;border-color:rgba(178,75,178,.4)}
.e-screen-fb .r3{width:92%;aspect-ratio:1;animation-duration:34s}
.e-screen-fb svg{filter:drop-shadow(0 0 24px rgba(167,139,250,.7))}
@keyframes eSpin{to{transform:rotate(360deg)}}
.e-screen-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(4,10,16,.9),transparent 55%)}
.e-screen-label{position:absolute;left:22px;bottom:18px;color:#fff}
.e-screen-label span{font-family:var(--disp);font-weight:700;font-size:32px;letter-spacing:.04em;line-height:1}
.e-screen-label small{display:block;font-size:12px;color:#c4b5fd;margin-top:4px}
@media(max-width:900px){.e-screen{--ry:-8deg;--rx:3deg}}

/* sections */
.e-section{position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:110px clamp(18px,4vw,48px) 0}
.e-head{margin-bottom:44px}
.e-head h2,
.e-final h2{font-family:var(--disp);font-weight:900;font-size:clamp(30px,5vw,56px);line-height:1.08;margin:14px 0 12px;letter-spacing:-.02em}
.e-head p{color:var(--mut);max-width:520px;line-height:1.65;margin:0}
.e-kicker{display:inline-flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--o2);font-weight:600}
.e-kicker i{width:30px;height:2px;background:linear-gradient(90deg,var(--o),var(--p2))}
.e-kicker.c{justify-content:center}

/* poster row */
.e-row{position:relative}
.e-scroller{display:flex;gap:clamp(8px,2vw,22px);overflow-x:auto;scroll-snap-type:x mandatory;padding:26px 6px 34px;scrollbar-width:none;-ms-overflow-style:none}
.e-scroller::-webkit-scrollbar{display:none}
.e-item{flex:0 0 auto;display:flex;align-items:flex-end;scroll-snap-align:start}
.e-bignum{font-family:var(--disp);font-weight:700;font-size:clamp(150px,18vw,230px);line-height:.78;margin-right:-34px;color:transparent;position:relative;z-index:0;
  -webkit-text-stroke:3px rgba(210,123,208,.7);user-select:none;transition:-webkit-text-stroke-color .3s}
.e-item:hover .e-bignum{-webkit-text-stroke-color:var(--o)}
.e-poster{--hue:#b04bb0;position:relative;z-index:1;width:clamp(190px,22vw,250px);aspect-ratio:3/4.2;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.12);
  background:#0c1624;transition:transform .3s ease-out,box-shadow .3s,border-color .3s;transform-style:preserve-3d;will-change:transform}
.e-poster:hover{border-color:var(--hue);box-shadow:0 26px 60px color-mix(in srgb,var(--hue) 40%,transparent)}
.e-art{position:absolute;inset:0;width:100%;height:100%}
.e-poster>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s}
.e-poster:hover>img{transform:scale(1.08)}
.e-poster-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(4,10,16,.96) 8%,rgba(4,10,16,.35) 55%,transparent)}
.e-poster-info{position:absolute;left:0;right:0;bottom:0;padding:18px;color:#fff}
.e-poster-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;border-radius:5px;background:var(--hue);color:#061018;margin-bottom:9px}
.e-poster-info h3{font-family:var(--disp);font-weight:700;font-size:20px;line-height:1.12;margin:0 0 6px;text-transform:uppercase;letter-spacing:-.005em}
.e-poster-info p{margin:0;font-size:12.5px;line-height:1.5;color:#c3d4de;max-height:0;opacity:0;overflow:hidden;transition:max-height .4s,opacity .4s}
.e-poster:hover .e-poster-info p{max-height:70px;opacity:1}
@media(hover:none){.e-poster-info p{max-height:70px;opacity:1}}
.e-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.28);cursor:pointer;
  background:rgba(12,6,22,.88);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4);display:grid;place-items:center;backdrop-filter:blur(8px);transition:.25s}
.e-arrow.l{left:-10px}.e-arrow.r{right:-10px}
.e-arrow:hover:not(:disabled){background:var(--o);color:#fff;border-color:var(--o);transform:translateY(-50%) scale(1.1)}
.e-arrow:disabled{opacity:0;pointer-events:none}
@media(max-width:700px){.e-arrow{display:none}}

/* features — every card has its own artwork */
.e-features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
@media(max-width:1000px){.e-features-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.e-features-grid{grid-template-columns:1fr}}
.e-fwrap{height:100%}
.e-feature{--acc:#b04bb0;height:100%;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:linear-gradient(170deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid var(--line);box-shadow:0 10px 30px rgba(10,5,30,.25);
  transition:transform .35s,border-color .35s,box-shadow .35s}
.e-feature:hover{transform:translateY(-8px);border-color:var(--acc);box-shadow:0 24px 50px color-mix(in srgb,var(--acc) 26%,transparent)}
.e-fart{position:relative;height:150px;display:grid;place-items:center;padding:10px 12px;border-bottom:1px solid var(--line);
  background:radial-gradient(90% 120% at 50% 0%,color-mix(in srgb,var(--acc) 30%,transparent),transparent 70%),linear-gradient(180deg,#2a1b5c,#170f3a)}
.e-fsvg{width:100%;height:100%;transition:transform .5s}
.e-feature:hover .e-fsvg{transform:scale(1.07)}
.e-fbody{padding:18px 20px 22px;display:flex;flex-direction:column;gap:6px;position:relative}
.e-ficon{position:absolute;top:-19px;right:18px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;
  background:var(--acc);box-shadow:0 8px 20px color-mix(in srgb,var(--acc) 50%,transparent);transition:transform .35s}
.e-feature:hover .e-ficon{transform:rotate(-10deg) scale(1.1)}
.e-feature h3{margin:0;font-family:var(--disp);font-size:17px;font-weight:700}
.e-feature p{margin:0;font-size:13.5px;line-height:1.6;color:var(--mut)}

/* workflow — horizontal, all 8 stages on one screen */
.e-hflow{position:relative;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:12px}
.e-hline{position:absolute;top:31px;left:calc((100% - 84px) / 16);right:calc((100% - 84px) / 16);height:3px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.e-hline i{display:block;height:100%;width:100%;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,#bb4fb0,#9355dc,#7c3aed);box-shadow:0 0 14px rgba(178,75,178,.55);transition:transform 1.6s cubic-bezier(.4,0,.2,1) .1s}
.e-hflow.go .e-hline i{transform:scaleX(1)}
.e-hstep{--c:#b04bb0;--d:.2s;display:flex;flex-direction:column;align-items:center;gap:16px;opacity:0;transform:translateY(40px);
  transition:opacity .8s ease var(--d),transform .8s cubic-bezier(.2,.8,.2,1) var(--d)}
.e-hflow.go .e-hstep{opacity:1;transform:none}
.e-dot{flex:none;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:20px;
  background:#0a0612;border:2.5px solid var(--c);color:#fff;position:relative;z-index:1;box-shadow:0 0 22px color-mix(in srgb,var(--c) 45%,transparent);transition:background .3s,transform .3s}
.e-hstep:hover .e-dot{background:var(--c);color:#fff;transform:scale(1.14)}
.e-hcard{flex:1;width:100%;padding:16px 12px 18px;border-radius:14px;text-align:center;background:linear-gradient(170deg,rgba(255,255,255,.10),rgba(255,255,255,.03));box-shadow:0 10px 26px rgba(10,5,30,.25);
  border:1px solid var(--line);border-top:3px solid var(--c);transition:transform .3s,box-shadow .3s,border-color .3s}
.e-hstep:hover .e-hcard{transform:translateY(-8px);border-color:var(--c);box-shadow:0 20px 40px color-mix(in srgb,var(--c) 24%,transparent)}
.e-hcard h3{font-family:var(--disp);font-weight:700;font-size:14.5px;line-height:1.25;margin:0 0 8px}
.e-hcard p{margin:0;color:var(--mut);font-size:12px;line-height:1.5}
@media(max-width:1100px){
  .e-hflow{grid-template-columns:repeat(4,minmax(0,1fr));row-gap:24px}
  .e-hline{display:none}
}
@media(max-width:600px){
  .e-hflow{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;row-gap:18px}
  .e-dot{width:48px;height:48px;font-size:16px}
  .e-hstep{gap:10px}
  .e-hcard{padding:12px 10px}
  .e-hcard h3{font-size:13px}
  .e-hcard p{font-size:11.5px}
}

/* final */
.e-final-wrap{padding-bottom:90px}
.e-final{position:relative;overflow:hidden;text-align:center;border-radius:30px;padding:clamp(54px,9vw,110px) 24px;border:1px solid rgba(210,123,208,.35);color:#fff;
  background:radial-gradient(70% 90% at 15% 0%,rgba(167,139,250,.50),transparent 60%),radial-gradient(60% 80% at 90% 100%,rgba(178,75,178,.55),transparent 60%),#2a1b55}
.e-final h2{font-size:clamp(38px,7.4vw,90px);margin:18px 0 10px}
.e-final p{color:#ddd3ff;max-width:460px;margin:0 auto;line-height:1.65}
.e-final .e-cta{margin-top:30px;animation:none}
.e-orbit{position:absolute;border-radius:50%;border:1.5px solid rgba(255,255,255,.1)}
.e-orbit::after{content:"";position:absolute;top:10%;left:50%;width:11px;height:11px;border-radius:50%;background:var(--o);box-shadow:0 0 16px var(--o)}
.e-orbit.o1{width:380px;height:380px;top:-170px;left:-120px;animation:eSpin 20s linear infinite}
.e-orbit.o2{width:520px;height:520px;bottom:-290px;right:-140px;animation:eSpin 28s linear infinite reverse}
.e-orbit.o2::after{background:var(--p2);box-shadow:0 0 16px var(--p2)}

/* footer */
.e-foot{position:relative;z-index:2;margin-top:30px;border-top:1px solid rgba(255,255,255,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(60,20,90,.35));backdrop-filter:blur(6px)}
.e-foot-in{max-width:1240px;margin:0 auto;padding:64px clamp(18px,4vw,48px) 26px}
.e-foot-grid{display:grid;grid-template-columns:1.8fr 1fr 1fr 1.2fr;gap:48px;align-items:start}
.e-foot-brand{display:flex;flex-direction:column;align-items:flex-start}
.e-foot-logo{display:inline-flex;align-items:center;margin-bottom:18px;background:transparent;padding:0;border:none}
.e-foot-logo-img{display:block;width:min(240px,100%);height:auto;object-fit:contain;background:transparent;mix-blend-mode:screen}
.e-foot-wordmark b{display:block;font-family:var(--disp);font-weight:700;font-size:26px;letter-spacing:.08em;line-height:1}
.e-foot-wordmark small{display:block;margin-top:4px;font-size:12px;color:var(--o2)}
.e-foot-brand p{margin:0;max-width:380px;font-size:14px;line-height:1.7;color:#e2d7f5}
.e-foot-col{display:flex;flex-direction:column;gap:12px}
.e-foot-col h4{margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#fff;position:relative;padding-bottom:10px}
.e-foot-col h4::after{content:"";position:absolute;left:0;bottom:0;width:26px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--o),var(--p2))}
.e-foot-col a{font-size:14px;color:#e2d7f5;transition:color .2s,transform .2s;width:fit-content}
.e-foot-col a:hover{color:#fff;transform:translateX(4px)}
.e-foot-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:48px;padding-top:22px;border-top:1px solid rgba(255,255,255,.2);font-size:13px;color:#e2d7f5}
@media(max-width:980px){.e-foot-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:34px}.e-foot-brand{grid-column:1/-1}}
@media(max-width:560px){
  .e-foot-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 20px}
  .e-foot-col:last-child{grid-column:1/-1}
  .e-foot-bar{flex-direction:column;align-items:flex-start}
}

@media (prefers-reduced-motion: reduce){
  .eiro *{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important}
  .e-hero h1 .l>span{transform:none}
}
`;
