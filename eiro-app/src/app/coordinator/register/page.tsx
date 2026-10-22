'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Select, Input, Badge, CategoryBadge, Modal, Textarea } from '@/components/ui';
import { Plus, Minus, Trash2, ChevronRight, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import type { CategoryCode } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import toast from 'react-hot-toast';

const CATEGORIES: CategoryCode[] = ['SUMO', 'MAZE', 'WALL', 'ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'];

interface Member { id: string; name: string; grade: string; section: string; }

export default function RegisterTeamPage() {
  const [category, setCategory] = useState<CategoryCode | ''>('');
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [members, setMembers] = useState<Member[]>([{ id: '1', name: '', grade: '', section: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const needsProject = ['ECO_CITY', 'NEXTGEN_FACTORY', 'INNOVATOR_JUNIOR', 'INNOVATOR_SENIOR'].includes(category);

  const addMember = () => {
    if (members.length < 6) setMembers(m => [...m, { id: Date.now().toString(), name: '', grade: '', section: '' }]);
  };
  const removeMember = (id: string) => {
    if (members.length > 1) setMembers(m => m.filter(x => x.id !== id));
  };
  const updateMember = (id: string, field: keyof Member, value: string) => {
    setMembers(m => m.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Please select a category';
    if (!teamName.trim()) e.teamName = 'Team name is required';
    if (needsProject && !projectTitle.trim()) e.projectTitle = 'Project title is required for this category';
    members.forEach((m, i) => {
      if (!m.name.trim()) e[`name_${i}`] = 'Student name required';
      if (!m.grade.trim()) e[`grade_${i}`] = 'Grade required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) { toast.error('Please fix the errors before submitting'); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setSubmitted(true);
    toast.success('Registration submitted for review!');
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Team Submitted!</h2>
          <p className="text-gray-400 mb-2">Your registration is now under review.</p>
          <p className="text-sm text-gray-500 mb-6">You'll be notified once it's approved or if corrections are needed.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setSubmitted(false)}>Register Another</Button>
            <Button onClick={() => window.location.href = '/coordinator/registrations'}>View Registrations</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <PageHeader title="Register Team" subtitle="S05 — Add a new team manually" />

      {/* Season context */}
      <div className="p-4 rounded-2xl bg-indigo-900/20 border border-indigo-500/20 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">EIRO 2026 · District Preliminaries</p>
          <p className="text-xs text-gray-400">DAV Public School · Chennai District</p>
        </div>
        <Badge variant="success">Registration Open</Badge>
      </div>

      {/* Category Selection */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Select Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setErrors(e => ({ ...e, category: '' })); }}
              className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                category === c
                  ? 'border-indigo-500 bg-indigo-600/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-indigo-500/40 hover:text-white'
              }`}
            >
              <div className="text-sm font-semibold mb-0.5">{CATEGORY_LABELS[c]}</div>
              <div className="text-[10px] font-mono text-gray-600">{c}</div>
            </button>
          ))}
        </div>
        {errors.category && <p className="text-xs text-red-400 mt-2">{errors.category}</p>}
      </Card>

      {/* Team Details */}
      <Card>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          Team Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Team Name *</label>
            <input type="text" className={`eiro-input ${errors.teamName ? 'border-red-500/60' : ''}`}
              placeholder="e.g. Robo Warriors" value={teamName} onChange={e => { setTeamName(e.target.value); setErrors(ex => ({ ...ex, teamName: '' })); }} />
            {errors.teamName && <p className="text-xs text-red-400 mt-1">{errors.teamName}</p>}
          </div>

          {needsProject && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Title *</label>
              <input type="text" className={`eiro-input ${errors.projectTitle ? 'border-red-500/60' : ''}`}
                placeholder="e.g. Smart Waste Management Bot" value={projectTitle}
                onChange={e => { setProjectTitle(e.target.value); setErrors(ex => ({ ...ex, projectTitle: '' })); }} />
              {errors.projectTitle && <p className="text-xs text-red-400 mt-1">{errors.projectTitle}</p>}
            </div>
          )}
        </div>
      </Card>

      {/* Members */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Team Members
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={members.length >= 2 ? 'success' : 'danger'}>{members.length} student{members.length !== 1 ? 's' : ''}</Badge>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addMember} disabled={members.length >= 6}>Add</Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Minimum and maximum team sizes are configured per category. Check Category Directory for limits.
        </p>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Student {i + 1}
                </span>
                {members.length > 1 && (
                  <button onClick={() => removeMember(m.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <input
                    className={`eiro-input text-sm ${errors[`name_${i}`] ? 'border-red-500/60' : ''}`}
                    placeholder="Full name"
                    value={m.name}
                    onChange={e => { updateMember(m.id, 'name', e.target.value); setErrors(ex => ({ ...ex, [`name_${i}`]: '' })); }}
                  />
                  {errors[`name_${i}`] && <p className="text-xs text-red-400 mt-1">{errors[`name_${i}`]}</p>}
                </div>
                <div>
                  <select
                    className={`eiro-input text-sm ${errors[`grade_${i}`] ? 'border-red-500/60' : ''}`}
                    value={m.grade}
                    onChange={e => { updateMember(m.id, 'grade', e.target.value); setErrors(ex => ({ ...ex, [`grade_${i}`]: '' })); }}
                  >
                    <option value="">Grade</option>
                    {['6','7','8','9','10','11','12'].map(g => <option key={g} value={g} className="bg-gray-900">Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <input className="eiro-input text-sm" placeholder="Section" value={m.section}
                    onChange={e => updateMember(m.id, 'section', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-4">
        <Button variant="secondary">Save Draft</Button>
        <Button icon={ChevronRight} iconPosition="right" onClick={handleSubmit}>
          Review & Submit
        </Button>
      </div>

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Registration"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>Submit Registration</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-gray-400">Category</span>
              {category && <CategoryBadge code={category as CategoryCode} />}
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-gray-400">Team Name</span>
              <span className="text-white font-medium">{teamName}</span>
            </div>
            {needsProject && (
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-gray-400">Project</span>
                <span className="text-white font-medium">{projectTitle}</span>
              </div>
            )}
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-400">Students</span>
              <span className="text-white font-medium">{members.filter(m => m.name).length}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">After submission, an admin will review your registration. If a fee is required, payment instructions will be shown in the Fee Status page.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
