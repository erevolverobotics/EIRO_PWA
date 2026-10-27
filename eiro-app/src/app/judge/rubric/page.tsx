'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, Button } from '@/components/ui';
import { Star } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { addItem, getAll, queryByField } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Criterion = { criterionId: string; label: string; maxPoints: number };
type RuleVersion = { id: string; status: string; categoryCode?: string; criteria?: unknown[]; rubricItems?: unknown[]; scoringSchema?: { criteria?: unknown[]; rubricItems?: unknown[] } };
type Entry = { id: string; eventId: string; teamId: string; categoryCode?: string; mergedIntoEntryId?: string };
function toCriteria(values?: unknown[]): Criterion[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    const criterionId = String(value.criterionId ?? value.id ?? '');
    const label = String(value.label ?? value.name ?? '');
    const maxPoints = Number(value.maxPoints ?? value.max ?? Number.NaN);
    return criterionId && label && Number.isFinite(maxPoints) && maxPoints >= 0 ? [{ criterionId, label, maxPoints }] : [];
  });
}
export default function RubricScoringPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RuleVersion[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ruleId, setRuleId] = useState('');
  const [entryId, setEntryId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([queryByField<Omit<RuleVersion, 'id'>>('ruleVersions', 'status', 'PUBLISHED'), getAll<Entry>('stageEntries')])
      .then(([ruleRows, entryRows]) => {
        const published = ruleRows as RuleVersion[];
        setRules(published);
        setRuleId(published[0]?.id ?? '');
        setEntries(entryRows.filter(entry => !entry.mergedIntoEntryId));
        setEntryId(entryRows.find(entry => !entry.mergedIntoEntryId)?.id ?? '');
      }).catch(() => setError('Published rubric configuration could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  const rule = rules.find(item => item.id === ruleId);
  const criteria = useMemo(() => toCriteria(rule?.rubricItems ?? rule?.criteria ?? rule?.scoringSchema?.rubricItems ?? rule?.scoringSchema?.criteria), [rule]);
  const total = criteria.reduce((sum, item) => sum + (scores[item.criterionId] ?? 0), 0);
  const allScored = criteria.length > 0 && criteria.every(item => scores[item.criterionId] !== undefined);
  const save = async (submit: boolean) => {
    if (!user || !entryId || !rule || !allScored) return;
    setSaving(true);
    try {
      const scorecardId = await addItem('scorecards', {
        entryId, judgeUid: user.uid, ruleVersionId: rule.id,
        rubricItems: criteria.map(item => ({ ...item, score: scores[item.criterionId], comment: comments[item.criterionId] ?? '' })),
        computedTotal: total, status: 'DRAFT', revision: 1,
      });
      if (submit) {
        await callEiroFunction<Record<string, unknown>, unknown>('submitScorecard', { scorecardId });
        toast.success('Scorecard submitted.');
      } else toast.success(`Draft saved (${scorecardId}).`);
      setScores({}); setComments({});
    } catch { toast.error('Scorecard could not be saved or submitted.'); }
    finally { setSaving(false); }
  };
  return <div className="max-w-3xl space-y-6 animate-fade-in-up">
    <PageHeader title="Rubric Scoring" subtitle="Criteria and maximums are loaded from published rule versions" />
    {loading ? <p role="status" className="text-center text-gray-400 py-12">Loading published scoring rules…</p> : error ? <div role="alert" className="text-red-400">{error}</div> : <>
      {rules.length === 0 ? <Card className="text-center py-12 text-gray-400">No published rubric rule versions are available.</Card> : <>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm text-gray-400">Published rule version<select className="eiro-input mt-1" value={ruleId} onChange={event => { setRuleId(event.target.value); setScores({}); }}><option value="">Select rules</option>{rules.map(item => <option key={item.id} value={item.id}>{item.categoryCode ?? 'Category'} · {item.id}</option>)}</select></label><label className="text-sm text-gray-400">Stage entry<select className="eiro-input mt-1" value={entryId} onChange={event => setEntryId(event.target.value)}><option value="">Select entry</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.teamId} · {entry.eventId}</option>)}</select></label></div>
        {criteria.length === 0 ? <Card className="text-center py-10 text-yellow-300">The selected published rule has no supported rubric criteria. Scoring is unavailable; no default rubric is substituted.</Card> : <>
          <Card><p className="text-sm text-gray-400">Total score</p><p className="text-3xl font-black text-white">{total}</p></Card>
          {criteria.map(criterion => <Card key={criterion.criterionId}><div className="flex justify-between gap-3 mb-3"><div><h3 className="font-semibold text-white">{criterion.label}</h3><p className="text-xs text-gray-500">Maximum {criterion.maxPoints}</p></div><span className="font-bold text-indigo-300">{scores[criterion.criterionId] ?? '—'}</span></div><input type="number" min={0} max={criterion.maxPoints} value={scores[criterion.criterionId] ?? ''} onChange={event => { const value = Number(event.target.value); if (event.target.value === '' || (value >= 0 && value <= criterion.maxPoints)) setScores(old => { const next = { ...old }; if (event.target.value === '') delete next[criterion.criterionId]; else next[criterion.criterionId] = value; return next; }); }} className="eiro-input" /><textarea rows={2} value={comments[criterion.criterionId] ?? ''} onChange={event => setComments(old => ({ ...old, [criterion.criterionId]: event.target.value }))} placeholder="Optional judge comment" className="eiro-input mt-3" /></Card>)}
          <div className="flex justify-end gap-3"><Button variant="secondary" disabled={!allScored || saving} loading={saving} onClick={() => void save(false)}>Save Draft</Button><Button icon={Star} disabled={!allScored || !entryId || saving} loading={saving} onClick={() => void save(true)}>Submit Scorecard</Button></div>
        </>}
      </>}
    </>}
  </div>;
}
