'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  PageHeader,
  Card,
  Button,
  Badge,
} from '@/components/ui';

import {
  Swords,
  Trophy,
  RefreshCw,
  Clock,
  ShieldCheck,
  History,
} from 'lucide-react';

import { getAll } from '@/lib/firebase/firestore';

import { callEiroFunction } from '@/lib/firebase/functions';

import toast from 'react-hot-toast';


/* =========================================
   TYPES
========================================= */

type Match = {
  id: string;
  eventId?: string;
  entryAId?: string;
  entryBId?: string;
  teamAName?: string;
  teamBName?: string;
  teamA?: string;
  teamB?: string;
  status?: string;
  round?: string;
  arena?: string;
  categoryCode?: string;
};

type Bout = {
  id: string;
  matchId: string;
  boutNumber?: number;
  winner?: string;
  durationSeconds?: number;
  penaltyNote?: string;
};


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
   MATCH PAGE CONTENT
========================================= */

function MatchesPageContent() {

  const params = useSearchParams();

  const [matches, setMatches] = useState<Match[]>([]);

  const [bouts, setBouts] = useState<Bout[]>([]);

  const [matchId, setMatchId] = useState(
    params.get('matchId') ?? ''
  );

  const [duration, setDuration] = useState('60');

  const [penalty, setPenalty] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const requestedMatchId = params.get('matchId');


  /* =========================================
     LOAD MATCH RECORDS
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  const load = useCallback(() => {

    setLoading(true);

    Promise.all([
      getAll<Match>('matches'),
      getAll<Bout>('matchBouts'),
    ])

      .then(([matchRows, boutRows]) => {

        setMatches(matchRows);

        setBouts(boutRows);

        setMatchId(current =>
          matchRows.some(item => item.id === current)
            ? current
            : requestedMatchId && matchRows.some(item => item.id === requestedMatchId)
              ? requestedMatchId
              : matchRows[0]?.id ?? ''
        );

        setError('');

      })

      .catch(loadError => {

        console.error(loadError);

        setError(
          'Match records could not be loaded.'
        );

      })

      .finally(() => {

        setLoading(false);

      });

  }, [requestedMatchId]);


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {

    load();

  }, [load]);


  /* =========================================
     SELECTED MATCH
  ========================================= */

  const match = matches.find(
    item => item.id === matchId
  );


  /* =========================================
     MATCH BOUTS
  ========================================= */

  const matchBouts = useMemo(

    () =>

      bouts

        .filter(bout => bout.matchId === matchId)

        .sort(
          (a, b) =>
            (a.boutNumber ?? 0) -
            (b.boutNumber ?? 0)
        ),

    [bouts, matchId]

  );


  /* =========================================
     NEXT BOUT NUMBER
  ========================================= */

  const nextBout =

    Math.max(
      0,
      ...matchBouts.map(
        bout => bout.boutNumber ?? 0
      )
    ) + 1;


  /* =========================================
     TEAM NAMES
  ========================================= */

  const teamAName =
    match?.teamAName ??
    match?.teamA ??
    match?.entryAId ??
    'Team A';

  const teamBName =
    match?.teamBName ??
    match?.teamB ??
    match?.entryBId ??
    'Team B';


  /* =========================================
     RECORD BOUT
     ORIGINAL SCORING SERVICE PRESERVED
  ========================================= */

  const record = async (winner: string) => {

    if (!match) return;

    if (
      !Number.isFinite(Number(duration)) ||
      Number(duration) < 1
    ) {
      toast.error('Enter a valid bout duration.');

      return;
    }

    setSaving(true);

    try {

      await callEiroFunction<
        Record<string, unknown>,
        unknown
      >(
        'recordMatchBout',
        {
          matchId: match.id,
          boutNumber: nextBout,
          winner,
          durationSeconds: Number(duration),
          penaltyNote: penalty.trim(),
        }
      );

      toast.success('Bout result recorded.');

      setPenalty('');

      load();

    } catch (error) {

      console.error(error);

      toast.error(
        'Bout result was not accepted by the scoring service.'
      );

    } finally {

      setSaving(false);

    }

  };


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="matches-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="matches-ambient"
        aria-hidden="true"
      >

        {/* GRID */}

        <div className="matches-grid" />


        {/* GLOWING ORBS */}

        <div className="matches-orb matches-orb-one" />

        <div className="matches-orb matches-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="matches-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`matches-bubble ${bubble.tone}`}
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

      <div className="matches-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader

          title="Match Bout Recording"

          subtitle="Manage match outcomes and record individual bout results"

          actions={

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={load}
              disabled={loading || saving}
            >
              Refresh
            </Button>

          }

        />


        {/* =====================================
            LOADING
        ===================================== */}

        {loading ? (

          <Card className="matches-glass-card text-center py-12 text-gray-400">

            Loading match records…

          </Card>

        ) : error ? (

          /* =====================================
             ERROR
          ===================================== */

          <Card className="matches-glass-card text-red-400">

            {error}

          </Card>

        ) : matches.length === 0 ? (

          /* =====================================
             EMPTY STATE
          ===================================== */

          <Card className="matches-glass-card text-center py-16">

            <Swords className="w-10 h-10 text-gray-500 mx-auto mb-4" />

            <h3 className="text-white font-semibold">

              No matches available

            </h3>

            <p className="text-sm text-gray-400 mt-2">

              No match assignments are available for recording.

            </p>

          </Card>

        ) : (

          <>

            {/* =====================================
                MATCH SELECTION
            ===================================== */}

            <Card className="matches-glass-card">

              <div className="flex items-center gap-3 mb-4">

                <div className="matches-icon-box">

                  <Swords className="w-5 h-5 text-violet-300" />

                </div>

                <div>

                  <h2 className="text-white font-semibold">

                    Select Match

                  </h2>

                  <p className="text-xs text-gray-400 mt-1">

                    Choose the match you want to manage.

                  </p>

                </div>

              </div>


              <label className="block text-sm text-gray-300">

                Match

                <select

                  className="eiro-input matches-select mt-2"

                  value={matchId}

                  onChange={event =>
                    setMatchId(event.target.value)
                  }

                >

                  {matches.map(item => (

                    <option
                      key={item.id}
                      value={item.id}
                    >

                      {item.teamAName ??
                        item.teamA ??
                        item.entryAId ??
                        'Team A'}

                      {' vs '}

                      {item.teamBName ??
                        item.teamB ??
                        item.entryBId ??
                        'Team B'}

                      {' · '}

                      {item.id}

                    </option>

                  ))}

                </select>

              </label>

            </Card>


            {match && (

              <>

                {/* =====================================
                    MATCH INFORMATION
                ===================================== */}

                <Card className="matches-glass-card matches-main-card">

                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">

                    <div className="flex items-center gap-3">

                      <div className="matches-icon-box">

                        <Trophy className="w-5 h-5 text-violet-300" />

                      </div>

                      <div>

                        <p className="text-xs uppercase tracking-widest text-gray-400">

                          Current Match

                        </p>

                        <p className="text-sm text-white font-semibold mt-1">

                          {match.categoryCode ?? 'Match Event'}

                        </p>

                      </div>

                    </div>


                    <Badge variant="info">

                      {match.status ?? '—'}

                    </Badge>

                  </div>


                  {/* TEAM COMPARISON */}

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

                    <div className="matches-team-panel text-center">

                      <span className="text-xs uppercase tracking-wider text-gray-400">

                        Team A

                      </span>

                      <h2 className="text-white font-bold text-lg mt-2 break-words">

                        {teamAName}

                      </h2>

                    </div>


                    <div className="matches-vs">

                      VS

                    </div>


                    <div className="matches-team-panel text-center">

                      <span className="text-xs uppercase tracking-wider text-gray-400">

                        Team B

                      </span>

                      <h2 className="text-white font-bold text-lg mt-2 break-words">

                        {teamBName}

                      </h2>

                    </div>

                  </div>


                  {/* MATCH DETAILS */}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">

                    <div className="matches-detail">

                      <span>Round</span>

                      <p>{match.round ?? '—'}</p>

                    </div>

                    <div className="matches-detail">

                      <span>Arena</span>

                      <p>{match.arena ?? '—'}</p>

                    </div>

                    <div className="matches-detail">

                      <span>Match ID</span>

                      <p className="truncate">{match.id}</p>

                    </div>

                  </div>

                </Card>


                {/* =====================================
                    BOUT RECORDING
                ===================================== */}

                <Card className="matches-glass-card">

                  <div className="flex items-center justify-between gap-3 mb-5">

                    <div className="flex items-center gap-3">

                      <div className="matches-icon-box">

                        <Clock className="w-5 h-5 text-violet-300" />

                      </div>

                      <div>

                        <h2 className="font-semibold text-white">

                          Record Bout

                        </h2>

                        <p className="text-xs text-gray-400 mt-1">

                          Enter bout details and submit the outcome.

                        </p>

                      </div>

                    </div>


                    <div className="matches-bout-number">

                      Bout {nextBout}

                    </div>

                  </div>


                  {/* DURATION */}

                  <label className="block text-sm text-gray-300">

                    Duration (seconds)

                    <input

                      type="number"

                      min="1"

                      value={duration}

                      onChange={event =>
                        setDuration(event.target.value)
                      }

                      className="eiro-input matches-select mt-2"

                    />

                  </label>


                  {/* PENALTY */}

                  <label className="block text-sm text-gray-300 mt-4">

                    Penalty note

                    <span className="text-gray-500 text-xs ml-2">

                      Optional

                    </span>

                    <input

                      value={penalty}

                      onChange={event =>
                        setPenalty(event.target.value)
                      }

                      placeholder="Enter penalty details if applicable"

                      className="eiro-input matches-select mt-2"

                    />

                  </label>


                  {/* WINNER SELECTION */}

                  <div className="mt-6">

                    <div className="flex items-center gap-2 mb-3">

                      <ShieldCheck className="w-4 h-4 text-violet-300" />

                      <p className="text-sm font-medium text-gray-200">

                        Select Bout Outcome

                      </p>

                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                      <button

                        type="button"

                        disabled={saving}

                        onClick={() => void record('TEAM_A')}

                        className="matches-result-btn team-a-btn"

                      >

                        <Trophy className="w-5 h-5 mx-auto mb-2" />

                        <span className="block text-sm font-semibold">

                          {teamAName}

                        </span>

                        <span className="block text-xs opacity-60 mt-1">

                          Team A Wins

                        </span>

                      </button>


                      <button

                        type="button"

                        disabled={saving}

                        onClick={() => void record('DRAW')}

                        className="matches-result-btn draw-btn"

                      >

                        <Swords className="w-5 h-5 mx-auto mb-2" />

                        <span className="block text-sm font-semibold">

                          Draw

                        </span>

                        <span className="block text-xs opacity-60 mt-1">

                          Equal Outcome

                        </span>

                      </button>


                      <button

                        type="button"

                        disabled={saving}

                        onClick={() => void record('TEAM_B')}

                        className="matches-result-btn team-b-btn"

                      >

                        <Trophy className="w-5 h-5 mx-auto mb-2" />

                        <span className="block text-sm font-semibold">

                          {teamBName}

                        </span>

                        <span className="block text-xs opacity-60 mt-1">

                          Team B Wins

                        </span>

                      </button>

                    </div>


                    {saving && (

                      <p
                        role="status"
                        className="text-center text-sm text-violet-300 mt-4"
                      >

                        Submitting bout result…

                      </p>

                    )}

                  </div>


                  {/* SCORING INFORMATION */}

                  <div className="matches-info mt-5">

                    <ShieldCheck className="w-4 h-4 flex-shrink-0 text-violet-300" />

                    <p className="text-xs text-gray-400">

                      Bout limit, tie-break, and match completion policy are validated by the scoring service.

                    </p>

                  </div>

                </Card>


                {/* =====================================
                    RECORDED BOUTS
                ===================================== */}

                {matchBouts.length > 0 && (

                  <Card className="matches-glass-card">

                    <div className="flex items-center gap-3 mb-4">

                      <div className="matches-icon-box">

                        <History className="w-5 h-5 text-violet-300" />

                      </div>

                      <div>

                        <h2 className="font-semibold text-white">

                          Recorded Bouts

                        </h2>

                        <p className="text-xs text-gray-400 mt-1">

                          Previous outcomes for this match.

                        </p>

                      </div>

                    </div>


                    <div className="space-y-2">

                      {matchBouts.map(bout => (

                        <div

                          key={bout.id}

                          className="matches-bout-row flex flex-wrap items-center justify-between gap-3"

                        >

                          <div>

                            <p className="text-sm font-medium text-white">

                              Bout {bout.boutNumber ?? '—'}

                            </p>

                            <p className="text-xs text-gray-400 mt-1">

                              {bout.winner ?? 'Outcome unavailable'}

                            </p>

                            {bout.penaltyNote && (

                              <p className="text-xs text-gray-500 mt-1">

                                Penalty: {bout.penaltyNote}

                              </p>

                            )}

                          </div>


                          <div className="text-right">

                            <p className="text-sm text-violet-300 font-semibold">

                              {bout.durationSeconds ?? '—'}s

                            </p>

                          </div>

                        </div>

                      ))}

                    </div>

                  </Card>

                )}

              </>

            )}

          </>

        )}

      </div>


      {/* =====================================
          PROFESSIONAL ANIMATED BACKGROUND
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .matches-page {

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


        .matches-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN BACKGROUND */

        .matches-ambient {

          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;

        }


        /* GRID */

        .matches-grid {

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

        .matches-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .matches-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .matches-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* BUBBLES */

        .matches-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        .matches-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: matches-float linear infinite;

        }


        .matches-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .matches-bubble.rose {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );

        }


        /* FLOAT ANIMATION */

        @keyframes matches-float {

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

        .matches-content {

          position: relative;
          z-index: 10;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 36px;

          margin: 0;

          background: transparent !important;

          box-shadow: none !important;

        }


        /* GLASS CARDS */

        .matches-page .matches-glass-card {

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


        .matches-page .matches-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* ICON BOX */

        .matches-icon-box {

          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.20);

        }


        /* SELECT INPUT */

        .matches-select {

          width: 100%;

          min-height: 44px;

          background: rgba(15, 23, 42, 0.65) !important;

          border: 1px solid rgba(148, 163, 184, 0.22) !important;

          border-radius: 10px;

          color: #f9fafb !important;

          outline: none;

          transition: border-color 0.2s ease;

        }


        .matches-select:focus {

          border-color: rgba(167, 139, 250, 0.75) !important;

          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.10);

        }


        .matches-select option {

          background: #111827;

          color: white;

        }


        /* TEAM PANELS */

        .matches-team-panel {

          min-width: 0;

          padding: 22px 12px;

          border-radius: 14px;

          background: rgba(15, 23, 42, 0.38);

          border: 1px solid rgba(148, 163, 184, 0.13);

        }


        /* VS */

        .matches-vs {

          display: flex;
          align-items: center;
          justify-content: center;

          width: 42px;
          height: 42px;

          border-radius: 50%;

          background: rgba(139, 92, 246, 0.15);

          border: 1px solid rgba(167, 139, 250, 0.25);

          color: #c4b5fd;

          font-size: 11px;

          font-weight: 800;

          letter-spacing: 1px;

        }


        /* MATCH DETAILS */

        .matches-detail {

          min-width: 0;

          padding: 12px;

          border-radius: 10px;

          background: rgba(15, 23, 42, 0.30);

          border: 1px solid rgba(148, 163, 184, 0.10);

        }


        .matches-detail span {

          display: block;

          font-size: 11px;

          color: #9ca3af;

          margin-bottom: 5px;

        }


        .matches-detail p {

          color: #f3f4f6;

          font-size: 13px;

          font-weight: 600;

        }


        /* BOUT NUMBER */

        .matches-bout-number {

          padding: 8px 13px;

          border-radius: 9px;

          background: rgba(139, 92, 246, 0.13);

          border: 1px solid rgba(139, 92, 246, 0.25);

          color: #c4b5fd;

          font-size: 12px;

          font-weight: 700;

          white-space: nowrap;

        }


        /* RESULT BUTTONS */

        .matches-result-btn {

          min-width: 0;

          min-height: 112px;

          padding: 16px 10px;

          border-radius: 13px;

          color: white;

          border: 1px solid rgba(148, 163, 184, 0.18);

          background: rgba(15, 23, 42, 0.48);

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            opacity 0.2s ease;

          cursor: pointer;

        }


        .matches-result-btn:hover:not(:disabled) {

          transform: translateY(-3px);

        }


        .matches-result-btn:disabled {

          opacity: 0.45;

          cursor: not-allowed;

        }


        .team-a-btn:hover:not(:disabled) {

          background: rgba(79, 70, 229, 0.18);

          border-color: rgba(129, 140, 248, 0.55);

        }


        .draw-btn:hover:not(:disabled) {

          background: rgba(148, 163, 184, 0.12);

          border-color: rgba(203, 213, 225, 0.45);

        }


        .team-b-btn:hover:not(:disabled) {

          background: rgba(190, 24, 93, 0.16);

          border-color: rgba(244, 114, 182, 0.45);

        }


        /* INFO */

        .matches-info {

          display: flex;

          align-items: flex-start;

          gap: 10px;

          padding: 13px;

          border-radius: 10px;

          background: rgba(139, 92, 246, 0.07);

          border: 1px solid rgba(139, 92, 246, 0.15);

        }


        /* BOUT HISTORY */

        .matches-bout-row {

          padding: 15px;

          border-radius: 10px;

          background: rgba(15, 23, 42, 0.30);

          border: 1px solid rgba(148, 163, 184, 0.10);

          transition: background 0.2s ease;

        }


        .matches-bout-row:hover {

          background: rgba(139, 92, 246, 0.08);

        }


        /* RESPONSIVE */

        @media (max-width: 768px) {

          .matches-content {

            padding: 18px 14px 28px;

          }

        }


        @media (max-width: 480px) {

          .matches-content {

            padding: 16px 10px 24px;

          }

          .matches-team-panel {

            padding: 16px 7px;

          }

          .matches-team-panel h2 {

            font-size: 14px;

          }

          .matches-vs {

            width: 34px;
            height: 34px;

          }

        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {

          .matches-bubble {

            animation: none;

          }

          .matches-glass-card,
          .matches-result-btn,
          .matches-bout-row {

            transition: none;

          }

          .matches-result-btn:hover {

            transform: none;

          }

        }

      `}</style>

    </main>

  );

}


/* =========================================
   SUSPENSE WRAPPER
========================================= */

export default function MatchesPage() {

  return (

    <Suspense

      fallback={

        <div className="min-h-screen flex items-center justify-center text-gray-400">

          Loading matches…

        </div>

      }

    >

      <MatchesPageContent />

    </Suspense>

  );

}
