// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { PageHeader, Card, Button } from '@/components/ui';
// import { Star } from 'lucide-react';
// import { useAuth } from '@/lib/firebase/auth-context';
// import { addItem, getAll, queryByField } from '@/lib/firebase/firestore';
// import { callEiroFunction } from '@/lib/firebase/functions';
// import toast from 'react-hot-toast';

// type Criterion = { criterionId: string; label: string; maxPoints: number };
// type RuleVersion = { id: string; status: string; categoryCode?: string; criteria?: unknown[]; rubricItems?: unknown[]; scoringSchema?: { criteria?: unknown[]; rubricItems?: unknown[] } };
// type Entry = { id: string; eventId: string; teamId: string; categoryCode?: string; mergedIntoEntryId?: string };
// function toCriteria(values?: unknown[]): Criterion[] {
//   if (!Array.isArray(values)) return [];
//   return values.flatMap(item => {
//     if (!item || typeof item !== 'object') return [];
//     const value = item as Record<string, unknown>;
//     const criterionId = String(value.criterionId ?? value.id ?? '');
//     const label = String(value.label ?? value.name ?? '');
//     const maxPoints = Number(value.maxPoints ?? value.max ?? Number.NaN);
//     return criterionId && label && Number.isFinite(maxPoints) && maxPoints >= 0 ? [{ criterionId, label, maxPoints }] : [];
//   });
// }
// export default function RubricScoringPage() {
//   const { user } = useAuth();
//   const [rules, setRules] = useState<RuleVersion[]>([]);
//   const [entries, setEntries] = useState<Entry[]>([]);
//   const [ruleId, setRuleId] = useState('');
//   const [entryId, setEntryId] = useState('');
//   const [scores, setScores] = useState<Record<string, number>>({});
//   const [comments, setComments] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');
//   useEffect(() => {
//     Promise.all([queryByField<Omit<RuleVersion, 'id'>>('ruleVersions', 'status', 'PUBLISHED'), getAll<Entry>('stageEntries')])
//       .then(([ruleRows, entryRows]) => {
//         const published = ruleRows as RuleVersion[];
//         setRules(published);
//         setRuleId(published[0]?.id ?? '');
//         setEntries(entryRows.filter(entry => !entry.mergedIntoEntryId));
//         setEntryId(entryRows.find(entry => !entry.mergedIntoEntryId)?.id ?? '');
//       }).catch(() => setError('Published rubric configuration could not be loaded.'))
//       .finally(() => setLoading(false));
//   }, []);
//   const rule = rules.find(item => item.id === ruleId);
//   const criteria = useMemo(() => toCriteria(rule?.rubricItems ?? rule?.criteria ?? rule?.scoringSchema?.rubricItems ?? rule?.scoringSchema?.criteria), [rule]);
//   const total = criteria.reduce((sum, item) => sum + (scores[item.criterionId] ?? 0), 0);
//   const allScored = criteria.length > 0 && criteria.every(item => scores[item.criterionId] !== undefined);
//   const save = async (submit: boolean) => {
//     if (!user || !entryId || !rule || !allScored) return;
//     setSaving(true);
//     try {
//       const scorecardId = await addItem('scorecards', {
//         entryId, judgeUid: user.uid, ruleVersionId: rule.id,
//         rubricItems: criteria.map(item => ({ ...item, score: scores[item.criterionId], comment: comments[item.criterionId] ?? '' })),
//         computedTotal: total, status: 'DRAFT', revision: 1,
//       });
//       if (submit) {
//         await callEiroFunction<Record<string, unknown>, unknown>('submitScorecard', { scorecardId });
//         toast.success('Scorecard submitted.');
//       } else toast.success(`Draft saved (${scorecardId}).`);
//       setScores({}); setComments({});
//     } catch { toast.error('Scorecard could not be saved or submitted.'); }
//     finally { setSaving(false); }
//   };
//   return <div className="max-w-3xl space-y-6 animate-fade-in-up">
//     <PageHeader title="Rubric Scoring" subtitle="Criteria and maximums are loaded from published rule versions" />
//     {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading published scoring rules…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : <>
//       {rules.length === 0 ? <Card className="text-center py-12 text-gray-400">No published rubric rule versions are available.</Card> : <>
//         <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm text-gray-400">Published rule version<select className="eiro-input mt-1" value={ruleId} onChange={event => { setRuleId(event.target.value); setScores({}); }}><option value="">Select rules</option>{rules.map(item => <option key={item.id} value={item.id}>{item.categoryCode ?? 'Category'} · {item.id}</option>)}</select></label><label className="text-sm text-gray-400">Stage entry<select className="eiro-input mt-1" value={entryId} onChange={event => setEntryId(event.target.value)}><option value="">Select entry</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.teamId} · {entry.eventId}</option>)}</select></label></div>
//         {criteria.length === 0 ? <Card className="text-center py-10 text-yellow-300">The selected published rule has no supported rubric criteria. Scoring is unavailable; no default rubric is substituted.</Card> : <>
//           <Card><p className="text-sm text-gray-400">Total score</p><p className="text-3xl font-black text-white">{total}</p></Card>
//           {criteria.map(criterion => <Card key={criterion.criterionId}><div className="flex justify-between gap-3 mb-3"><div><h3 className="font-semibold text-white">{criterion.label}</h3><p className="text-xs text-gray-500">Maximum {criterion.maxPoints}</p></div><span className="font-bold text-indigo-300">{scores[criterion.criterionId] ?? '—'}</span></div><input type="number" min={0} max={criterion.maxPoints} value={scores[criterion.criterionId] ?? ''} onChange={event => { const value = Number(event.target.value); if (event.target.value === '' || (value >= 0 && value <= criterion.maxPoints)) setScores(old => { const next = { ...old }; if (event.target.value === '') delete next[criterion.criterionId]; else next[criterion.criterionId] = value; return next; }); }} className="eiro-input" /><textarea rows={2} value={comments[criterion.criterionId] ?? ''} onChange={event => setComments(old => ({ ...old, [criterion.criterionId]: event.target.value }))} placeholder="Optional judge comment" className="eiro-input mt-3" /></Card>)}
//           <div className="flex justify-end gap-3"><Button variant="secondary" disabled={!allScored || saving} loading={saving} onClick={() => void save(false)}>Save Draft</Button><Button icon={Star} disabled={!allScored || !entryId || saving} loading={saving} onClick={() => void save(true)}>Submit Scorecard</Button></div>
//         </>}
//       </>}
//     </>}
//   </div>;
// }



'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  PageHeader,
  Card,
  Button,
} from '@/components/ui';

import {
  Star,
  ClipboardCheck,
  FileCheck2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/lib/firebase/auth-context';

import {
  addItem,
  getAll,
  queryByField,
} from '@/lib/firebase/firestore';

import { callEiroFunction } from '@/lib/firebase/functions';

import toast from 'react-hot-toast';


/* =========================================
   TYPES
========================================= */

type Criterion = {
  criterionId: string;
  label: string;
  maxPoints: number;
};

type RuleVersion = {
  id: string;
  status: string;
  categoryCode?: string;
  criteria?: unknown[];
  rubricItems?: unknown[];
  scoringSchema?: {
    criteria?: unknown[];
    rubricItems?: unknown[];
  };
};

type Entry = {
  id: string;
  eventId: string;
  teamId: string;
  categoryCode?: string;
  mergedIntoEntryId?: string;
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
   CONVERT RUBRIC CRITERIA
========================================= */

function toCriteria(values?: unknown[]): Criterion[] {

  if (!Array.isArray(values)) return [];

  return values.flatMap(item => {

    if (!item || typeof item !== 'object') return [];

    const value = item as Record<string, unknown>;

    const criterionId = String(
      value.criterionId ?? value.id ?? ''
    );

    const label = String(
      value.label ?? value.name ?? ''
    );

    const maxPoints = Number(
      value.maxPoints ?? value.max ?? Number.NaN
    );

    return criterionId &&
      label &&
      Number.isFinite(maxPoints) &&
      maxPoints >= 0

      ? [{
          criterionId,
          label,
          maxPoints,
        }]

      : [];

  });

}


/* =========================================
   RUBRIC SCORING PAGE
========================================= */

export default function RubricScoringPage() {

  const { user } = useAuth();


  /* =========================================
     STATE
  ========================================= */

  const [rules, setRules] = useState<RuleVersion[]>([]);

  const [entries, setEntries] = useState<Entry[]>([]);

  const [ruleId, setRuleId] = useState('');

  const [entryId, setEntryId] = useState('');

  const [scores, setScores] = useState<Record<string, number>>({});

  const [comments, setComments] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');


  /* =========================================
     LOAD PUBLISHED RULES AND ENTRIES
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  useEffect(() => {

    Promise.all([

      queryByField<Omit<RuleVersion, 'id'>>(
        'ruleVersions',
        'status',
        'PUBLISHED'
      ),

      getAll<Entry>('stageEntries'),

    ])

      .then(([ruleRows, entryRows]) => {

        const published = ruleRows as RuleVersion[];

        setRules(published);

        setRuleId(published[0]?.id ?? '');

        const activeEntries = entryRows.filter(
          entry => !entry.mergedIntoEntryId
        );

        setEntries(activeEntries);

        setEntryId(activeEntries[0]?.id ?? '');

      })

      .catch(loadError => {

        console.error(loadError);

        setError(
          'Published rubric configuration could not be loaded.'
        );

      })

      .finally(() => {

        setLoading(false);

      });

  }, []);


  /* =========================================
     SELECTED RULE
  ========================================= */

  const rule = rules.find(
    item => item.id === ruleId
  );


  /* =========================================
     RUBRIC CRITERIA
  ========================================= */

  const criteria = useMemo(

    () => toCriteria(

      rule?.rubricItems ??
      rule?.criteria ??
      rule?.scoringSchema?.rubricItems ??
      rule?.scoringSchema?.criteria

    ),

    [rule]

  );


  /* =========================================
     SCORE CALCULATIONS
  ========================================= */

  const total = criteria.reduce(

    (sum, item) =>

      sum + (scores[item.criterionId] ?? 0),

    0

  );


  const maximumTotal = criteria.reduce(

    (sum, item) => sum + item.maxPoints,

    0

  );


  const allScored =

    criteria.length > 0 &&

    criteria.every(

      item => scores[item.criterionId] !== undefined

    );


  const scoredCount = criteria.filter(

    item => scores[item.criterionId] !== undefined

  ).length;


  const progress = criteria.length > 0

    ? Math.round(
        (scoredCount / criteria.length) * 100
      )

    : 0;


  /* =========================================
     SELECTED ENTRY
  ========================================= */

  const selectedEntry = entries.find(
    entry => entry.id === entryId
  );


  /* =========================================
     RESET SCORES WHEN RULE CHANGES
  ========================================= */

  const changeRule = (nextRuleId: string) => {

    setRuleId(nextRuleId);

    setScores({});

    setComments({});

  };


  /* =========================================
     SAVE / SUBMIT SCORECARD
     ORIGINAL FIREBASE LOGIC PRESERVED
  ========================================= */

  const save = async (submit: boolean) => {

    if (!user || !entryId || !rule || !allScored) return;

    setSaving(true);

    try {

      const scorecardId = await addItem(
        'scorecards',
        {

          entryId,

          judgeUid: user.uid,

          ruleVersionId: rule.id,

          rubricItems: criteria.map(item => ({

            ...item,

            score: scores[item.criterionId],

            comment: comments[item.criterionId] ?? '',

          })),

          computedTotal: total,

          status: 'DRAFT',

          revision: 1,

        }
      );


      if (submit) {

        await callEiroFunction<
          Record<string, unknown>,
          unknown
        >(
          'submitScorecard',
          { scorecardId }
        );

        toast.success('Scorecard submitted.');

      } else {

        toast.success(
          `Draft saved (${scorecardId}).`
        );

      }


      setScores({});

      setComments({});

    } catch (saveError) {

      console.error(saveError);

      toast.error(
        'Scorecard could not be saved or submitted.'
      );

    } finally {

      setSaving(false);

    }

  };


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="rubric-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="rubric-ambient"
        aria-hidden="true"
      >

        {/* GRID */}

        <div className="rubric-grid" />


        {/* GLOWING ORBS */}

        <div className="rubric-orb rubric-orb-one" />

        <div className="rubric-orb rubric-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="rubric-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`rubric-bubble ${bubble.tone}`}
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

      <div className="rubric-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader

          title="Rubric Scoring"

          subtitle="Evaluate teams using criteria from published scoring rules"

        />


        {/* =====================================
            LOADING STATE
        ===================================== */}

        {loading ? (

          <Card className="rubric-glass-card text-center py-12 text-gray-400">

            Loading published scoring rules…

          </Card>

        ) : error ? (

          /* ERROR */

          <Card className="rubric-glass-card text-red-400">

            {error}

          </Card>

        ) : (

          <>


            {/* =====================================
                NO PUBLISHED RULES
            ===================================== */}

            {rules.length === 0 ? (

              <Card className="rubric-glass-card text-center py-12">

                <ClipboardCheck className="w-10 h-10 text-gray-500 mx-auto mb-4" />

                <h3 className="text-white font-semibold">

                  No published rubric rules

                </h3>

                <p className="text-sm text-gray-400 mt-2">

                  Published rubric configurations will appear here when available.

                </p>

              </Card>

            ) : (

              <>


                {/* =====================================
                    RULE AND ENTRY SELECTION
                ===================================== */}

                <Card className="rubric-glass-card">

                  <div className="flex items-center gap-3 mb-5">

                    <div className="rubric-icon-box">

                      <ClipboardCheck className="w-5 h-5 text-violet-300" />

                    </div>

                    <div>

                      <h2 className="text-white font-semibold">

                        Scoring Configuration

                      </h2>

                      <p className="text-xs text-gray-400 mt-1">

                        Select the published rules and stage entry.

                      </p>

                    </div>

                  </div>


                  <div className="grid sm:grid-cols-2 gap-4">


                    {/* RULE SELECTION */}

                    <label className="block text-sm text-gray-300">

                      Published Rule Version

                      <select

                        className="eiro-input rubric-input mt-2"

                        value={ruleId}

                        onChange={event =>
                          changeRule(event.target.value)
                        }

                      >

                        <option value="">

                          Select rules

                        </option>

                        {rules.map(item => (

                          <option
                            key={item.id}
                            value={item.id}
                          >

                            {item.categoryCode ?? 'Category'}
                            {' · '}
                            {item.id}

                          </option>

                        ))}

                      </select>

                    </label>


                    {/* ENTRY SELECTION */}

                    <label className="block text-sm text-gray-300">

                      Stage Entry

                      <select

                        className="eiro-input rubric-input mt-2"

                        value={entryId}

                        onChange={event =>
                          setEntryId(event.target.value)
                        }

                      >

                        <option value="">

                          Select entry

                        </option>

                        {entries.map(entry => (

                          <option
                            key={entry.id}
                            value={entry.id}
                          >

                            {entry.teamId}
                            {' · '}
                            {entry.eventId}

                          </option>

                        ))}

                      </select>

                    </label>

                  </div>


                  {/* SELECTED CATEGORY */}

                  {rule && (

                    <div className="rubric-info mt-4">

                      <ShieldCheck className="w-4 h-4 text-violet-300 flex-shrink-0" />

                      <p className="text-xs text-gray-400">

                        Active published configuration:

                        <span className="text-violet-300 font-semibold ml-1">

                          {rule.categoryCode ?? 'General Category'}

                        </span>

                      </p>

                    </div>

                  )}

                </Card>


                {/* =====================================
                    NO SUPPORTED CRITERIA
                ===================================== */}

                {criteria.length === 0 ? (

                  <Card className="rubric-glass-card text-center py-10">

                    <ClipboardCheck className="w-9 h-9 text-yellow-400 mx-auto mb-3" />

                    <p className="text-yellow-300 font-medium">

                      No supported rubric criteria

                    </p>

                    <p className="text-sm text-gray-400 mt-2">

                      The selected published rule has no supported rubric criteria. Scoring is unavailable; no default rubric is substituted.

                    </p>

                  </Card>

                ) : (

                  <>


                    {/* =====================================
                        SCORE SUMMARY
                    ===================================== */}

                    <Card className="rubric-glass-card rubric-summary-card">

                      <div className="flex flex-wrap justify-between items-center gap-4">


                        <div>

                          <div className="flex items-center gap-2 mb-2">

                            <Star className="w-5 h-5 text-violet-300" />

                            <p className="text-sm text-gray-300 font-medium">

                              Total Score

                            </p>

                          </div>

                          <div className="flex items-baseline gap-2">

                            <span className="text-4xl font-black text-white">

                              {total}

                            </span>

                            <span className="text-gray-400 text-sm">

                              / {maximumTotal}

                            </span>

                          </div>

                        </div>


                        <div className="text-right">

                          <p className="text-xs text-gray-400 mb-2">

                            Scoring Progress

                          </p>

                          <p className="text-2xl font-bold text-violet-300">

                            {progress}%

                          </p>

                          <p className="text-xs text-gray-500 mt-1">

                            {scoredCount} of {criteria.length} completed

                          </p>

                        </div>

                      </div>


                      {/* PROGRESS BAR */}

                      <div className="rubric-progress-track mt-5">

                        <div

                          className="rubric-progress-fill"

                          style={{
                            width: `${progress}%`,
                          }}

                        />

                      </div>

                    </Card>


                    {/* =====================================
                        SCORING CRITERIA
                    ===================================== */}

                    <div className="space-y-4">


                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <h2 className="text-lg font-semibold text-white">

                            Evaluation Criteria

                          </h2>

                          <p className="text-xs text-gray-400 mt-1">

                            Enter a score for each criterion.

                          </p>

                        </div>


                        <span className="text-xs text-violet-300">

                          {criteria.length} Criteria

                        </span>

                      </div>


                      {criteria.map((criterion, index) => (

                        <Card

                          key={criterion.criterionId}

                          className="rubric-glass-card rubric-criterion-card"

                        >

                          {/* CRITERION HEADER */}

                          <div className="flex justify-between items-start gap-4 mb-4">


                            <div className="flex items-start gap-3 min-w-0">

                              <div className="rubric-number">

                                {String(index + 1).padStart(2, '0')}

                              </div>

                              <div className="min-w-0">

                                <h3 className="font-semibold text-white">

                                  {criterion.label}

                                </h3>

                                <p className="text-xs text-gray-400 mt-1">

                                  Maximum score: {criterion.maxPoints} points

                                </p>

                              </div>

                            </div>


                            <div className="rubric-score-display">

                              {scores[criterion.criterionId] ?? '—'}

                            </div>

                          </div>


                          {/* SCORE INPUT */}

                          <label className="block text-sm text-gray-300">

                            Score

                            <input

                              type="number"

                              min={0}

                              max={criterion.maxPoints}

                              step="any"

                              value={
                                scores[criterion.criterionId] ?? ''
                              }

                              placeholder={`0 - ${criterion.maxPoints}`}

                              onChange={event => {

                                const rawValue = event.target.value;

                                const value = Number(rawValue);

                                if (

                                  rawValue === '' ||

                                  (

                                    Number.isFinite(value) &&

                                    value >= 0 &&

                                    value <= criterion.maxPoints

                                  )

                                ) {

                                  setScores(old => {

                                    const next = { ...old };

                                    if (rawValue === '') {

                                      delete next[criterion.criterionId];

                                    } else {

                                      next[criterion.criterionId] = value;

                                    }

                                    return next;

                                  });

                                }

                              }}

                              className="eiro-input rubric-input mt-2"

                            />

                          </label>


                          {/* COMMENTS */}

                          <label className="block text-sm text-gray-300 mt-4">

                            <span className="flex items-center gap-2">

                              <MessageSquare className="w-4 h-4 text-violet-300" />

                              Judge Comments

                              <span className="text-gray-500 text-xs">

                                Optional

                              </span>

                            </span>

                            <textarea

                              rows={2}

                              value={
                                comments[criterion.criterionId] ?? ''
                              }

                              onChange={event =>

                                setComments(old => ({

                                  ...old,

                                  [criterion.criterionId]:
                                    event.target.value,

                                }))

                              }

                              placeholder="Add observations or feedback for this criterion..."

                              className="eiro-input rubric-input rubric-textarea mt-2"

                            />

                          </label>

                        </Card>

                      ))}

                    </div>


                    {/* =====================================
                        ACTION BUTTONS
                    ===================================== */}

                    <Card className="rubric-glass-card">

                      <div className="flex flex-wrap items-center justify-between gap-4">


                        <div>

                          <p className="font-semibold text-white">

                            Complete Evaluation

                          </p>

                          <p className="text-xs text-gray-400 mt-1">

                            {allScored

                              ? 'All criteria have been scored.'

                              : `Complete ${criteria.length - scoredCount} remaining criteria.`

                            }

                          </p>

                        </div>


                        <div className="flex flex-wrap gap-3">

                          <Button

                            variant="secondary"

                            disabled={
                              !allScored ||
                              !entryId ||
                              saving
                            }

                            loading={saving}

                            onClick={() => void save(false)}

                          >

                            Save Draft

                          </Button>


                          <Button

                            icon={Star}

                            disabled={
                              !allScored ||
                              !entryId ||
                              saving
                            }

                            loading={saving}

                            onClick={() => void save(true)}

                          >

                            Submit Scorecard

                          </Button>

                        </div>

                      </div>

                    </Card>


                  </>

                )}

              </>

            )}

          </>

        )}

      </div>


      {/* =====================================
          ANIMATED BACKGROUND STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .rubric-page {

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


        .rubric-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .rubric-ambient {

          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;

        }


        /* GRID */

        .rubric-grid {

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

        .rubric-orb {

          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;

        }


        .rubric-orb-one {

          top: -260px;
          left: -180px;

          background: #7c3aed;

        }


        .rubric-orb-two {

          top: 280px;
          right: -300px;

          background: #b24bb2;

        }


        /* BUBBLE CONTAINER */

        .rubric-bubbles {

          position: absolute;
          inset: 0;

          overflow: hidden;

        }


        /* FLOATING BUBBLES */

        .rubric-bubble {

          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: rubric-float linear infinite;

        }


        .rubric-bubble.violet {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );

        }


        .rubric-bubble.rose {

          background:

            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );

        }


        /* BUBBLE ANIMATION */

        @keyframes rubric-float {

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

        .rubric-content {

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

        .rubric-page .rubric-glass-card {

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


        .rubric-page .rubric-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* ICON BOX */

        .rubric-icon-box {

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


        /* INPUTS */

        .rubric-input {

          width: 100%;

          min-height: 44px;

          background: rgba(15, 23, 42, 0.65) !important;

          border: 1px solid rgba(148, 163, 184, 0.22) !important;

          border-radius: 10px;

          color: #f9fafb !important;

          outline: none;

          transition: border-color 0.2s ease;

        }


        .rubric-input:focus {

          border-color: rgba(167, 139, 250, 0.75) !important;

          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.10);

        }


        .rubric-input option {

          background: #111827;

          color: white;

        }


        .rubric-textarea {

          resize: vertical;

          min-height: 75px;

          padding-top: 12px;

        }


        /* INFO */

        .rubric-info {

          display: flex;

          align-items: center;

          gap: 10px;

          padding: 12px;

          border-radius: 10px;

          background: rgba(139, 92, 246, 0.07);

          border: 1px solid rgba(139, 92, 246, 0.15);

        }


        /* SCORE SUMMARY */

        .rubric-summary-card {

          position: relative;

          overflow: hidden;

        }


        .rubric-progress-track {

          width: 100%;

          height: 7px;

          border-radius: 20px;

          overflow: hidden;

          background: rgba(148, 163, 184, 0.13);

        }


        .rubric-progress-fill {

          height: 100%;

          border-radius: inherit;

          background: linear-gradient(
            90deg,
            #7c3aed,
            #c084fc
          );

          transition: width 0.3s ease;

        }


        /* CRITERION CARD */

        .rubric-criterion-card {

          transition:
            border-color 0.2s ease,
            background 0.2s ease;

        }


        /* CRITERION NUMBER */

        .rubric-number {

          width: 36px;
          height: 36px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.20);

          color: #c4b5fd;

          font-size: 12px;

          font-weight: 800;

        }


        /* SCORE DISPLAY */

        .rubric-score-display {

          min-width: 42px;

          text-align: center;

          padding: 7px 10px;

          border-radius: 9px;

          background: rgba(139, 92, 246, 0.12);

          border: 1px solid rgba(139, 92, 246, 0.20);

          color: #c4b5fd;

          font-size: 15px;

          font-weight: 800;

        }


        /* RESPONSIVE */

        @media (max-width: 768px) {

          .rubric-content {

            padding: 18px 14px 28px;

          }

        }


        @media (max-width: 480px) {

          .rubric-content {

            padding: 16px 10px 24px;

          }

          .rubric-number {

            width: 32px;
            height: 32px;

          }

        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {

          .rubric-bubble {

            animation: none;

          }

          .rubric-glass-card,
          .rubric-progress-fill {

            transition: none;

          }

        }

      `}</style>

    </main>

  );

}
