// 'use client';

// import { useCallback, useEffect, useRef, useState } from 'react';
// import { PageHeader, Card, Button } from '@/components/ui';
// import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
// import { getAll } from '@/lib/firebase/firestore';
// import { callEiroFunction } from '@/lib/firebase/functions';
// import toast from 'react-hot-toast';

// type Entry = { id: string; eventId: string; teamId: string; entryStatus?: string; mergedIntoEntryId?: string };
// type Run = { id: string; entryId: string; elapsedMilliseconds?: number; status?: string };
// export default function TimedRunsPage() {
//   const [entries, setEntries] = useState<Entry[]>([]);
//   const [runs, setRuns] = useState<Run[]>([]);
//   const [entryId, setEntryId] = useState('');
//   const [running, setRunning] = useState(false);
//   const [elapsed, setElapsed] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');
//   const startedAt = useRef(0);
//   const load = useCallback(() => {
//     Promise.all([getAll<Entry>('stageEntries'), getAll<Run>('timedRuns')])
//       .then(([entryRows, runRows]) => { const active = entryRows.filter(entry => !entry.mergedIntoEntryId); setEntries(active); setRuns(runRows); if (!entryId && active.length) setEntryId(active[0].id); })
//       .catch(() => setError('Timed-run assignments could not be loaded.'))
//       .finally(() => setLoading(false));
//   }, [entryId]);
//   useEffect(() => { load(); }, [load]);
//   useEffect(() => {
//     if (!running) return;
//     const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), 25);
//     return () => clearInterval(timer);
//   }, [running]);
//   const format = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}.${Math.floor(ms % 1000).toString().padStart(3, '0')}`;
//   const submit = async () => {
//     if (!entryId || elapsed <= 0) return;
//     setRunning(false); setSaving(true);
//     try {
//       await callEiroFunction<Record<string, unknown>, unknown>('recordTimedRun', { entryId, elapsedMilliseconds: elapsed });
//       toast.success('Timed-run result recorded.');
//       setElapsed(0);
//       load();
//     } catch { toast.error('Run was not accepted by the scoring service.'); }
//     finally { setSaving(false); }
//   };
//   const entryRuns = runs.filter(run => run.entryId === entryId);
//   return <div className="space-y-6 max-w-3xl animate-fade-in-up">
//     <PageHeader title="Timed Run" subtitle="Record raw elapsed time for a persisted stage entry. Scoring policy is server-validated." />
//     {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading timed-run entries…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : entries.length === 0 ? <Card className="text-center py-12 text-gray-400">No stage entries are available for timed runs.</Card> : <>
//       <label className="block text-sm text-gray-400">Stage entry<select className="eiro-input mt-1" value={entryId} onChange={event => { setEntryId(event.target.value); setElapsed(0); setRunning(false); }}>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.teamId} · {entry.eventId} · {entry.id}</option>)}</select></label>
//       <Card className="text-center py-8"><p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Elapsed Time</p><div className="text-6xl font-black font-mono text-indigo-300">{format(elapsed)}</div><div className="flex justify-center gap-3 mt-6">{!running ? <Button icon={Play} onClick={() => { startedAt.current = Date.now() - elapsed; setRunning(true); }}>{elapsed ? 'Resume' : 'Start'}</Button> : <Button icon={Pause} variant="secondary" onClick={() => setRunning(false)}>Pause</Button>}<Button variant="secondary" icon={RotateCcw} disabled={running || saving} onClick={() => setElapsed(0)}>Reset</Button><Button icon={Flag} disabled={running || elapsed <= 0 || saving} loading={saving} onClick={() => void submit()}>Record Run</Button></div></Card>
//       <Card><h3 className="font-semibold text-white mb-2">Existing run records</h3>{entryRuns.length === 0 ? <p className="text-sm text-gray-400">No runs recorded for this entry.</p> : entryRuns.map(run => <div key={run.id} className="flex justify-between border-t border-white/5 py-2 text-sm"><span className="font-mono text-gray-300">{run.id}</span><span>{run.elapsedMilliseconds !== undefined ? format(run.elapsedMilliseconds) : 'Time unavailable'} · {run.status ?? 'Recorded'}</span></div>)}</Card>
//       <p className="text-xs text-gray-500">No penalty values, checkpoints, attempt limits, or ranking rules are assumed by this page.</p>
//     </>}
//   </div>;
// }



'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PageHeader,
  Card,
  Button,
} from '@/components/ui';

import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Timer,
  History,
  Activity,
  ShieldCheck,
} from 'lucide-react';

import { getAll } from '@/lib/firebase/firestore';

import { callEiroFunction } from '@/lib/firebase/functions';

import toast from 'react-hot-toast';


/* =========================================
   TYPES
========================================= */

type Entry = {
  id: string;
  eventId: string;
  teamId: string;
  entryStatus?: string;
  mergedIntoEntryId?: string;
};

type Run = {
  id: string;
  entryId: string;
  elapsedMilliseconds?: number;
  status?: string;
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
   TIMED RUN PAGE
========================================= */

export default function TimedRunsPage() {

  /* =========================================
     STATE
  ========================================= */

  const [entries, setEntries] = useState<Entry[]>([]);

  const [runs, setRuns] = useState<Run[]>([]);

  const [entryId, setEntryId] = useState('');

  const [running, setRunning] = useState(false);

  const [elapsed, setElapsed] = useState(0);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');


  /* =========================================
     STOPWATCH REFERENCE
  ========================================= */

  const startedAt = useRef(0);


  /* =========================================
     LOAD STAGE ENTRIES AND RUNS
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  const load = useCallback(() => {

    setLoading(true);

    Promise.all([

      getAll<Entry>('stageEntries'),

      getAll<Run>('timedRuns'),

    ])

      .then(([entryRows, runRows]) => {

        const active = entryRows.filter(
          entry => !entry.mergedIntoEntryId
        );

        setEntries(active);

        setRuns(runRows);

        setEntryId(current =>
          active.some(entry => entry.id === current)
            ? current
            : active[0]?.id ?? ''
        );

        setError('');

      })

      .catch(loadError => {

        console.error(loadError);

        setError(
          'Timed-run assignments could not be loaded.'
        );

      })

      .finally(() => {

        setLoading(false);

      });

  }, []);


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {

    load();

  }, [load]);


  /* =========================================
     STOPWATCH INTERVAL
  ========================================= */

  useEffect(() => {

    if (!running) return;

    const timer = window.setInterval(() => {

      setElapsed(
        Date.now() - startedAt.current
      );

    }, 25);

    return () => window.clearInterval(timer);

  }, [running]);


  /* =========================================
     FORMAT TIME
  ========================================= */

  const format = (ms: number) => {

    return (

      `${Math.floor(ms / 60000).toString().padStart(2, '0')}:` +

      `${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}.` +

      `${Math.floor(ms % 1000).toString().padStart(3, '0')}`

    );

  };


  /* =========================================
     SELECTED ENTRY RUNS
  ========================================= */

  const entryRuns = runs.filter(
    run => run.entryId === entryId
  );


  /* =========================================
     STOPWATCH CONTROLS
  ========================================= */

  const startTimer = () => {

    startedAt.current = Date.now() - elapsed;

    setRunning(true);

  };


  const pauseTimer = () => {

    setRunning(false);

  };


  const resetTimer = () => {

    setRunning(false);

    setElapsed(0);

    startedAt.current = 0;

  };


  /* =========================================
     SUBMIT TIMED RUN
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  const submit = async () => {

    if (!entryId || elapsed <= 0 || running) return;

    setSaving(true);

    try {

      await callEiroFunction<
        Record<string, unknown>,
        unknown
      >(
        'recordTimedRun',
        {
          entryId,
          elapsedMilliseconds: elapsed,
        }
      );

      toast.success(
        'Timed-run result recorded.'
      );

      setElapsed(0);

      startedAt.current = 0;

      load();

    } catch (submitError) {

      console.error(submitError);

      toast.error(
        'Run was not accepted by the scoring service.'
      );

    } finally {

      setSaving(false);

    }

  };


  /* =========================================
     SELECTED ENTRY
  ========================================= */

  const selectedEntry = entries.find(
    entry => entry.id === entryId
  );


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="timed-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="timed-ambient"
        aria-hidden="true"
      >

        {/* GRID */}

        <div className="timed-grid" />


        {/* GLOWING ORBS */}

        <div className="timed-orb timed-orb-one" />

        <div className="timed-orb timed-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="timed-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`timed-bubble ${bubble.tone}`}
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

      <div className="timed-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader

          title="Timed Run"

          subtitle="Capture accurate elapsed time for each stage entry and record verified run results."

        />


        {/* =====================================
            LOADING STATE
        ===================================== */}

        {loading ? (

          <Card className="timed-glass-card text-center py-12 text-gray-400">

            Loading timed-run entries…

          </Card>

        ) : error ? (

          /* =====================================
             ERROR STATE
          ===================================== */

          <Card className="timed-glass-card text-red-400">

            {error}

          </Card>

        ) : entries.length === 0 ? (

          /* =====================================
             EMPTY STATE
          ===================================== */

          <Card className="timed-glass-card text-center py-16">

            <Timer className="w-10 h-10 text-gray-500 mx-auto mb-4" />

            <h3 className="font-semibold text-white">

              No stage entries available

            </h3>

            <p className="text-sm text-gray-400 mt-2">

              Stage entries will appear here when they are available for timed runs.

            </p>

          </Card>

        ) : (

          <>


            {/* =====================================
                STAGE ENTRY SELECTION
            ===================================== */}

            <Card className="timed-glass-card">

              <div className="flex items-center gap-3 mb-4">

                <div className="timed-icon-box">

                  <Activity className="w-5 h-5 text-violet-300" />

                </div>

                <div>

                  <h2 className="font-semibold text-white">

                    Stage Entry

                  </h2>

                  <p className="text-xs text-gray-400 mt-1">

                    Select the team participating in the timed run.

                  </p>

                </div>

              </div>


              <label className="block text-sm text-gray-300">

                Select Team / Entry

                <select

                  className="eiro-input timed-select mt-2"

                  value={entryId}

                  disabled={running || saving}

                  onChange={event => {

                    setEntryId(event.target.value);

                    setElapsed(0);

                    setRunning(false);

                    startedAt.current = 0;

                  }}

                >

                  {entries.map(entry => (

                    <option
                      key={entry.id}
                      value={entry.id}
                    >

                      {entry.teamId}

                      {' · '}

                      {entry.eventId}

                      {' · '}

                      {entry.id}

                    </option>

                  ))}

                </select>

              </label>


              {selectedEntry && (

                <div className="timed-entry-details mt-4">

                  <div>

                    <span>Team ID</span>

                    <p>{selectedEntry.teamId}</p>

                  </div>

                  <div>

                    <span>Event ID</span>

                    <p>{selectedEntry.eventId}</p>

                  </div>

                  <div>

                    <span>Entry Status</span>

                    <p>{selectedEntry.entryStatus ?? '—'}</p>

                  </div>

                </div>

              )}

            </Card>


            {/* =====================================
                STOPWATCH CARD
            ===================================== */}

            <Card className="timed-glass-card timed-stopwatch-card">


              {/* STOPWATCH HEADER */}

              <div className="flex items-center justify-center gap-2 mb-6">

                <div className="timed-icon-box">

                  <Timer className="w-5 h-5 text-violet-300" />

                </div>

                <div>

                  <p className="text-xs uppercase tracking-widest text-gray-400">

                    Precision Stopwatch

                  </p>

                  <p className="text-xs text-gray-500 mt-1">

                    Live elapsed time

                  </p>

                </div>

              </div>


              {/* TIME DISPLAY */}

              <div className="timed-display-wrapper">

                <div className={`timed-display ${running ? 'is-running' : ''}`}>

                  {format(elapsed)}

                </div>

                <div className="timed-status">

                  <span className={`timed-status-dot ${running ? 'active' : ''}`} />

                  {running

                    ? 'TIMER RUNNING'

                    : elapsed > 0

                      ? 'TIMER PAUSED'

                      : 'READY TO START'

                  }

                </div>

              </div>


              {/* TIMER CONTROLS */}

              <div className="flex flex-wrap justify-center gap-3 mt-8">


                {!running ? (

                  <Button

                    icon={Play}

                    onClick={startTimer}

                    disabled={saving}

                  >

                    {elapsed > 0 ? 'Resume' : 'Start Run'}

                  </Button>

                ) : (

                  <Button

                    icon={Pause}

                    variant="secondary"

                    onClick={pauseTimer}

                  >

                    Pause

                  </Button>

                )}


                <Button

                  variant="secondary"

                  icon={RotateCcw}

                  disabled={running || saving || elapsed === 0}

                  onClick={resetTimer}

                >

                  Reset

                </Button>


                <Button

                  icon={Flag}

                  disabled={running || elapsed <= 0 || saving}

                  loading={saving}

                  onClick={() => void submit()}

                >

                  Record Run

                </Button>

              </div>


              {/* TIMER INFORMATION */}

              <div className="timed-timer-info mt-7">

                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-violet-300" />

                <p className="text-xs text-gray-400">

                  Pause the timer before recording the result. The elapsed time is submitted to the scoring service for validation.

                </p>

              </div>

            </Card>


            {/* =====================================
                RUN HISTORY
            ===================================== */}

            <Card className="timed-glass-card">

              <div className="flex items-center gap-3 mb-5">

                <div className="timed-icon-box">

                  <History className="w-5 h-5 text-violet-300" />

                </div>

                <div>

                  <h2 className="font-semibold text-white">

                    Existing Run Records

                  </h2>

                  <p className="text-xs text-gray-400 mt-1">

                    Previously recorded runs for this entry.

                  </p>

                </div>

              </div>


              {entryRuns.length === 0 ? (

                <div className="timed-empty-history">

                  <History className="w-7 h-7 text-gray-500 mx-auto mb-2" />

                  <p className="text-sm text-gray-400">

                    No runs recorded for this entry.

                  </p>

                </div>

              ) : (

                <div className="space-y-2">

                  {entryRuns.map(run => (

                    <div
                      key={run.id}
                      className="timed-run-row"
                    >

                      <div className="min-w-0">

                        <p className="text-sm font-medium text-white">

                          Run Record

                        </p>

                        <p className="text-xs text-gray-500 mt-1 truncate">

                          {run.id}

                        </p>

                      </div>


                      <div className="text-right flex-shrink-0">

                        <p className="text-sm font-bold text-violet-300 font-mono">

                          {run.elapsedMilliseconds !== undefined

                            ? format(run.elapsedMilliseconds)

                            : 'Time unavailable'

                          }

                        </p>

                        <p className="text-xs text-gray-400 mt-1">

                          {run.status ?? 'Recorded'}

                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </Card>


            {/* =====================================
                SCORING INFORMATION
            ===================================== */}

            <div className="timed-footer-info">

              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-violet-300" />

              <p className="text-xs text-gray-400">

                No penalty values, checkpoints, attempt limits, or ranking rules are assumed by this page. All scoring policies remain server-validated.

              </p>

            </div>


          </>

        )}

      </div>


      {/* =====================================
          ANIMATED BACKGROUND STYLES
      ===================================== */}

      <style jsx global>{`

        /* =====================================
           MAIN PAGE
        ===================================== */

        .timed-page {

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


        .timed-page * {

          box-sizing: border-box;

        }


        /* =====================================
           FULL SCREEN ANIMATED BACKGROUND
        ===================================== */

        .timed-ambient {

          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;

          pointer-events: none;

          background: transparent !important;

        }


        /* =====================================
           GRID
        ===================================== */

        .timed-grid {

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


        /* =====================================
           GLOWING ORBS
        ===================================== */

        .timed-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .timed-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .timed-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* =====================================
           BUBBLE CONTAINER
        ===================================== */

        .timed-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        /* =====================================
           FLOATING BUBBLES
        ===================================== */

        .timed-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: timed-float linear infinite;

        }


        .timed-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .timed-bubble.rose {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );

        }


        /* =====================================
           BUBBLE ANIMATION
        ===================================== */

        @keyframes timed-float {

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
           PAGE CONTENT
        ===================================== */

        .timed-content {

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


        /* =====================================
           GLASS CARDS
        ===================================== */

        .timed-page .timed-glass-card {

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


        .timed-page .timed-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* =====================================
           ICON BOX
        ===================================== */

        .timed-icon-box {

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


        /* =====================================
           ENTRY SELECTOR
        ===================================== */

        .timed-select {

          width: 100%;

          min-height: 44px;

          background: rgba(15, 23, 42, 0.65) !important;

          border: 1px solid rgba(148, 163, 184, 0.22) !important;

          border-radius: 10px;

          color: #f9fafb !important;

          outline: none;

          transition: border-color 0.2s ease;

        }


        .timed-select:focus {

          border-color: rgba(167, 139, 250, 0.75) !important;

          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.10);

        }


        .timed-select option {

          background: #111827;

          color: white;

        }


        /* =====================================
           ENTRY DETAILS
        ===================================== */

        .timed-entry-details {

          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 10px;

        }


        .timed-entry-details > div {

          min-width: 0;

          padding: 12px;

          border-radius: 10px;

          background: rgba(15, 23, 42, 0.30);

          border: 1px solid rgba(148, 163, 184, 0.10);

        }


        .timed-entry-details span {

          display: block;

          font-size: 11px;

          color: #9ca3af;

          margin-bottom: 5px;

        }


        .timed-entry-details p {

          color: #f3f4f6;

          font-size: 13px;

          font-weight: 600;

          overflow-wrap: anywhere;

        }


        /* =====================================
           STOPWATCH CARD
        ===================================== */

        .timed-stopwatch-card {

          text-align: center;

          padding-top: 38px !important;

          padding-bottom: 34px !important;

        }


        /* TIME DISPLAY */

        .timed-display-wrapper {

          padding: 28px 12px;

          border-radius: 18px;

          background:

            radial-gradient(
              ellipse at center,
              rgba(139, 92, 246, 0.10),
              rgba(15, 23, 42, 0.15) 70%
            );

          border: 1px solid rgba(139, 92, 246, 0.12);

        }


        .timed-display {

          color: #c4b5fd;

          font-size: clamp(38px, 7vw, 76px);

          font-weight: 900;

          letter-spacing: -3px;

          line-height: 1.2;

          font-family:
            "SFMono-Regular",
            Consolas,
            "Liberation Mono",
            monospace;

          font-variant-numeric: tabular-nums;

          text-shadow: 0 0 28px rgba(139, 92, 246, 0.16);

          transition: color 0.2s ease;

        }


        .timed-display.is-running {

          color: #e0d7ff;

          text-shadow: 0 0 32px rgba(168, 85, 247, 0.32);

        }


        /* TIMER STATUS */

        .timed-status {

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 9px;

          margin-top: 16px;

          color: #9ca3af;

          font-size: 10px;

          font-weight: 700;

          letter-spacing: 2px;

        }


        .timed-status-dot {

          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #64748b;

        }


        .timed-status-dot.active {

          background: #a78bfa;

          box-shadow: 0 0 12px rgba(167, 139, 250, 0.8);

          animation: timed-pulse 1.2s ease-in-out infinite;

        }


        @keyframes timed-pulse {

          0%, 100% {

            opacity: 1;

          }

          50% {

            opacity: 0.35;

          }

        }


        /* =====================================
           TIMER INFORMATION
        ===================================== */

        .timed-timer-info {

          display: flex;

          align-items: flex-start;

          gap: 10px;

          padding: 13px;

          border-radius: 10px;

          background: rgba(139, 92, 246, 0.07);

          border: 1px solid rgba(139, 92, 246, 0.15);

          text-align: left;

        }


        /* =====================================
           RUN HISTORY
        ===================================== */

        .timed-run-row {

          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding: 15px;

          border-radius: 10px;

          background: rgba(15, 23, 42, 0.30);

          border: 1px solid rgba(148, 163, 184, 0.10);

          transition: background 0.2s ease;

        }


        .timed-run-row:hover {

          background: rgba(139, 92, 246, 0.08);

        }


        .timed-empty-history {

          padding: 28px 12px;

          text-align: center;

          border: 1px dashed rgba(148, 163, 184, 0.20);

          border-radius: 12px;

          background: rgba(15, 23, 42, 0.18);

        }


        /* =====================================
           FOOTER INFORMATION
        ===================================== */

        .timed-footer-info {

          display: flex;

          align-items: flex-start;

          gap: 10px;

          padding: 14px 16px;

          border-radius: 12px;

          background: rgba(17, 24, 39, 0.25);

          border: 1px solid rgba(148, 163, 184, 0.12);

        }


        /* =====================================
           RESPONSIVE
        ===================================== */

        @media (max-width: 768px) {

          .timed-content {

            padding: 18px 14px 28px;

          }

        }


        @media (max-width: 480px) {

          .timed-content {

            padding: 16px 10px 24px;

          }

          .timed-entry-details {

            grid-template-columns: 1fr;

          }

          .timed-display {

            letter-spacing: -2px;

          }

          .timed-stopwatch-card {

            padding-top: 24px !important;

          }

        }


        /* =====================================
           REDUCED MOTION
        ===================================== */

        @media (prefers-reduced-motion: reduce) {

          .timed-bubble {

            animation: none;

          }

          .timed-status-dot.active {

            animation: none;

          }

          .timed-glass-card,
          .timed-run-row {

            transition: none;

          }

        }

      `}</style>

    </main>

  );

}
