'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, Modal } from '@/components/ui';
import { Star, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ECO_CITY rubric (configurable — loaded from ruleVersions in production)
const RUBRIC = [
  { id: 'innovation', label: 'Innovation & Creativity', max: 20, hint: 'Originality of the waste management solution' },
  { id: 'implementation', label: 'Technical Implementation', max: 25, hint: 'Quality of build, code and engineering' },
  { id: 'prototype', label: 'Working Prototype', max: 25, hint: 'Demonstrates functional waste sorting/processing' },
  { id: 'impact', label: 'Environmental & Practical Impact', max: 20, hint: 'Real-world relevance and scalability' },
  { id: 'presentation', label: 'Presentation', max: 10, hint: 'Clarity, confidence and team involvement' },
];

export default function RubricScoringPage() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const total = RUBRIC.reduce((s, r) => s + (scores[r.id] ?? 0), 0);
  const maxTotal = RUBRIC.reduce((s, r) => s + r.max, 0);
  const allScored = RUBRIC.every(r => scores[r.id] !== undefined);
  const pct = Math.round((total / maxTotal) * 100);

  const handleConfirm = () => {
    setConfirmOpen(false);
    setSubmitted(true);
    toast.success('Scorecard submitted!');
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Scorecard Submitted</h3>
          <div className="text-5xl font-black gradient-text mb-2">{total}/{maxTotal}</div>
          <p className="text-gray-400 mb-6">Awaiting verification by Head Judge</p>
          <Button onClick={() => { setSubmitted(false); setScores({}); setComments({}); }}>Score Another Team</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="Rubric Scoring — Eco City"
        subtitle="Eco Innovators · KV No.1 Chennai · Presentation Hall C · 11:00 AM"
      />

      {/* Score summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Score</p>
            <div className="text-4xl font-black text-white">{total} <span className="text-gray-600 text-2xl">/ {maxTotal}</span></div>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#1e2a3d" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke={pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#6366f1'}
                strokeWidth="3"
                strokeDasharray={`${(pct / 100) * 100.53} 100.53`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{pct}%</span>
            </div>
          </div>
        </div>

        {!allScored && (
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-400">
            <AlertCircle className="w-3 h-3" />
            Score all criteria before submitting
          </div>
        )}
      </Card>

      {/* Rubric criteria */}
      {RUBRIC.map(criterion => {
        const score = scores[criterion.id];
        const scored = score !== undefined;

        return (
          <Card key={criterion.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{criterion.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{criterion.hint}</p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${scored ? 'gradient-text' : 'text-gray-700'}`}>
                  {scored ? score : '—'}
                </span>
                <span className="text-gray-600 text-sm"> /{criterion.max}</span>
              </div>
            </div>

            {/* Score slider */}
            <input
              type="range"
              min={0}
              max={criterion.max}
              value={score ?? 0}
              onChange={e => setScores(s => ({ ...s, [criterion.id]: Number(e.target.value) }))}
              className="w-full h-2 rounded-full appearance-none bg-white/10 accent-indigo-500 cursor-pointer mb-3"
            />

            {/* Quick score buttons */}
            <div className="flex gap-1 flex-wrap mb-3">
              {Array.from({ length: criterion.max + 1 }, (_, i) => i).filter(v => v % 5 === 0 || v === criterion.max).map(v => (
                <button
                  key={v}
                  onClick={() => setScores(s => ({ ...s, [criterion.id]: v }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                    score === v ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Comment */}
            {activeComment === criterion.id ? (
              <div>
                <textarea
                  rows={2}
                  placeholder={`Comment for ${criterion.label}…`}
                  value={comments[criterion.id] ?? ''}
                  onChange={e => setComments(c => ({ ...c, [criterion.id]: e.target.value }))}
                  className="eiro-input resize-none text-xs"
                />
                <Button size="sm" variant="ghost" onClick={() => setActiveComment(null)} className="mt-1">Done</Button>
              </div>
            ) : (
              <button
                onClick={() => setActiveComment(criterion.id)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-400 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                {comments[criterion.id] ? 'Edit comment' : 'Add comment'}
                {comments[criterion.id] && <span className="text-gray-500 ml-1">— "{comments[criterion.id].slice(0, 30)}…"</span>}
              </button>
            )}
          </Card>
        );
      })}

      <div className="flex gap-3 justify-end pb-4">
        <Button variant="secondary">Save Draft</Button>
        <Button
          icon={Star}
          disabled={!allScored}
          onClick={() => setConfirmOpen(true)}
        >
          Submit Scorecard ({total}/{maxTotal})
        </Button>
      </div>

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Scorecard"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>Submit Score</Button>
          </>
        }
      >
        <div className="space-y-2 mb-4">
          {RUBRIC.map(r => (
            <div key={r.id} className="flex justify-between text-sm py-1.5 border-b border-white/5">
              <span className="text-gray-400">{r.label}</span>
              <span className="text-white font-medium">{scores[r.id] ?? 0} / {r.max}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold py-2">
            <span className="text-white">Total</span>
            <span className="gradient-text">{total} / {maxTotal}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600">Once submitted, scores are immutable without Head Judge approval. Ensure all criteria are scored accurately.</p>
      </Modal>
    </div>
  );
}
