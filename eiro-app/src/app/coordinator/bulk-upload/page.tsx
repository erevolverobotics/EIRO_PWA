'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Select } from '@/components/ui';
import {
  Upload, Download, CheckCircle2, AlertCircle, XCircle,
  FileSpreadsheet, ChevronRight, RefreshCw, Loader2, Info
} from 'lucide-react';
import type { CategoryCode } from '@/lib/types';

type ImportStep = 'idle' | 'uploading' | 'validating' | 'preview' | 'committing' | 'done';

interface ParsedRow {
  rowNum: number;
  teamRef: string;
  teamName: string;
  category: CategoryCode | '';
  studentName: string;
  grade: string;
  section: string;
  projectTitle: string;
  valid: boolean;
  errors: string[];
}

const SAMPLE_CSV = `team_reference,team_name,category_code,student_name,grade,section,project_title,coordinator_name,coordinator_phone
T001,Robo Warriors,SUMO,Arjun Sharma,7,A,,Mrs. Priya,9876543210
T001,Robo Warriors,SUMO,Riya Patel,7,B,,Mrs. Priya,9876543210
T002,Eco Innovators,ECO_CITY,Aditya Kumar,8,A,Smart Waste Bin,Mrs. Priya,9876543210
T002,Eco Innovators,ECO_CITY,Sneha Rao,8,B,Smart Waste Bin,Mrs. Priya,9876543210
T002,Eco Innovators,ECO_CITY,Vikram Singh,8,A,Smart Waste Bin,Mrs. Priya,9876543210
T003,Maze Masters,MAZE,Pooja Nair,9,A,,Mrs. Priya,9876543210
T003,Maze Masters,MAZE,Rahul Gupta,9,B,,Mrs. Priya,9876543210
T004,BadCategory,INVALID,Student X,7,A,,Mrs. Priya,9876543210`;

// Simulated parse result
const MOCK_PARSED: ParsedRow[] = [
  { rowNum: 2, teamRef: 'T001', teamName: 'Robo Warriors', category: 'SUMO', studentName: 'Arjun Sharma', grade: '7', section: 'A', projectTitle: '', valid: true, errors: [] },
  { rowNum: 3, teamRef: 'T001', teamName: 'Robo Warriors', category: 'SUMO', studentName: 'Riya Patel', grade: '7', section: 'B', projectTitle: '', valid: true, errors: [] },
  { rowNum: 4, teamRef: 'T002', teamName: 'Eco Innovators', category: 'ECO_CITY', studentName: 'Aditya Kumar', grade: '8', section: 'A', projectTitle: 'Smart Waste Bin', valid: true, errors: [] },
  { rowNum: 5, teamRef: 'T002', teamName: 'Eco Innovators', category: 'ECO_CITY', studentName: 'Sneha Rao', grade: '8', section: 'B', projectTitle: 'Smart Waste Bin', valid: true, errors: [] },
  { rowNum: 6, teamRef: 'T002', teamName: 'Eco Innovators', category: 'ECO_CITY', studentName: 'Vikram Singh', grade: '8', section: 'A', projectTitle: 'Smart Waste Bin', valid: true, errors: [] },
  { rowNum: 7, teamRef: 'T003', teamName: 'Maze Masters', category: 'MAZE', studentName: 'Pooja Nair', grade: '9', section: 'A', projectTitle: '', valid: true, errors: [] },
  { rowNum: 8, teamRef: 'T003', teamName: 'Maze Masters', category: 'MAZE', studentName: 'Rahul Gupta', grade: '9', section: 'B', projectTitle: '', valid: true, errors: [] },
  { rowNum: 9, teamRef: 'T004', teamName: 'BadCategory', category: '', studentName: 'Student X', grade: '7', section: 'A', projectTitle: '', valid: false, errors: ['Invalid category code "INVALID". Allowed: SUMO, MAZE, WALL, ECO_CITY, NEXTGEN_FACTORY, INNOVATOR_JUNIOR, INNOVATOR_SENIOR'] },
];

// Group parsed rows into teams
function groupTeams(rows: ParsedRow[]) {
  const teams: Record<string, { ref: string; name: string; category: CategoryCode | ''; members: ParsedRow[]; valid: boolean }> = {};
  for (const row of rows) {
    if (!teams[row.teamRef]) {
      teams[row.teamRef] = { ref: row.teamRef, name: row.teamName, category: row.category, members: [], valid: true };
    }
    teams[row.teamRef].members.push(row);
    if (!row.valid) teams[row.teamRef].valid = false;
  }
  return Object.values(teams);
}

export default function BulkUploadPage() {
  const [step, setStep] = useState<ImportStep>('idle');
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [errorRows, setErrorRows] = useState<ParsedRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [jobId, setJobId] = useState('JOB-XXXXXX');
  useEffect(() => {
    setJobId('JOB-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  }, []);

  const teams = groupTeams(MOCK_PARSED);
  const validTeams = teams.filter(t => t.valid);
  const invalidTeams = teams.filter(t => !t.valid);
  const allErrors = MOCK_PARSED.filter(r => !r.valid);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { alert('Please upload a .csv file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File size must be under 5MB'); return; }
    setFileName(file.name);
    setStep('uploading');
    setTimeout(() => {
      setStep('validating');
      setTimeout(() => {
        setErrorRows(allErrors);
        setStep('preview');
      }, 1500);
    }, 1000);
  }, [allErrors]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleCommit = () => {
    setConfirmOpen(false);
    setStep('committing');
    setTimeout(() => setStep('done'), 2000);
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'eiro_team_template.csv'; a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl">
      <PageHeader
        title="Bulk CSV Team Registration"
        subtitle="S05B — Upload a CSV to register multiple teams at once"
        actions={
          <Button variant="secondary" size="sm" icon={Download} onClick={downloadTemplate}>
            Download Template
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['Upload', 'Validate', 'Preview', 'Commit', 'Done'] as const).map((label, i) => {
          const stepIdx = ['idle', 'uploading', 'validating', 'preview', 'committing', 'done'].indexOf(step);
          const active = i === stepIdx - (step === 'uploading' ? 1 : 0);
          const done = i < stepIdx;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                done ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                active ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' :
                'bg-white/5 text-gray-600 border border-white/10'
              }`}>
                {done && <CheckCircle2 className="w-3 h-3" />}
                {label}
              </div>
              {i < 4 && <ChevronRight className="w-3 h-3 text-gray-700" />}
            </div>
          );
        })}
      </div>

      {/* Done state */}
      {step === 'done' && (
        <Card className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Import Completed!</h3>
          <p className="text-gray-400 mb-2">Job ID: <span className="font-mono text-indigo-400">{jobId}</span></p>
          <p className="text-gray-400 mb-6">
            <span className="text-green-400 font-semibold">{validTeams.length} teams</span> and{' '}
            <span className="text-green-400 font-semibold">{MOCK_PARSED.filter(r => r.valid).length} students</span> registered successfully.
          </p>
          {invalidTeams.length > 0 && (
            <p className="text-sm text-yellow-400 mb-6">{invalidTeams.length} team(s) were skipped due to errors. Download the error report to fix and re-upload.</p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" icon={Download}>Download Error Report</Button>
            <Button icon={RefreshCw} onClick={() => setStep('idle')}>Upload Another</Button>
          </div>
        </Card>
      )}

      {/* Upload area */}
      {(step === 'idle' || step === 'uploading') && (
        <>
          <Card>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragOver ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 hover:border-indigo-500/40'
              }`}
            >
              {step === 'uploading' ? (
                <div className="space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-400 mx-auto animate-spin" />
                  <p className="text-white font-medium">Uploading {fileName}…</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">Drop your CSV file here</p>
                    <p className="text-sm text-gray-500">or</p>
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors inline-block">
                      Choose CSV File
                    </span>
                    <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                  </label>
                  <p className="text-xs text-gray-600">Max 5MB · UTF-8 encoding · One row per student</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" /> CSV Format Guide
            </h3>
            <div className="overflow-x-auto">
              <table className="eiro-table text-xs">
                <thead><tr>
                  <th>Column</th><th>Required</th><th>Description</th>
                </tr></thead>
                <tbody>
                  {[
                    ['team_reference', '✓', 'Unique ID grouping students into one team (e.g. T001). Same value = same team.'],
                    ['team_name', '✓', 'Display name of the team'],
                    ['category_code', '✓', 'One of: SUMO, MAZE, WALL, ECO_CITY, NEXTGEN_FACTORY, INNOVATOR_JUNIOR, INNOVATOR_SENIOR'],
                    ['student_name', '✓', 'Full name of each student'],
                    ['grade', '✓', 'Grade/class number'],
                    ['section', '', 'Section letter (optional)'],
                    ['project_title', 'For project cats', 'Required for ECO_CITY, NEXTGEN_FACTORY, INNOVATOR_*'],
                    ['coordinator_name', '', 'Team coordinator/teacher name'],
                    ['coordinator_phone', '', 'Contact phone number'],
                  ].map(([col, req, desc]) => (
                    <tr key={col}>
                      <td><code className="font-mono text-indigo-400">{col}</code></td>
                      <td>{req ? <Badge variant="success" size="sm">{req}</Badge> : <span className="text-gray-600">–</span>}</td>
                      <td className="text-gray-500">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Validating */}
      {step === 'validating' && (
        <Card className="text-center py-16">
          <Loader2 className="w-10 h-10 text-indigo-400 mx-auto animate-spin mb-4" />
          <p className="text-white font-semibold">Validating {fileName}…</p>
          <p className="text-sm text-gray-500 mt-1">Checking categories, grades, duplicates and team sizes</p>
        </Card>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="text-2xl font-black text-white mb-1">{MOCK_PARSED.length}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-black text-green-400 mb-1">{MOCK_PARSED.filter(r => r.valid).length}</div>
              <div className="text-xs text-gray-500">Valid Rows</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-black text-red-400 mb-1">{allErrors.length}</div>
              <div className="text-xs text-gray-500">Error Rows</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-black text-indigo-400 mb-1">{teams.length}</div>
              <div className="text-xs text-gray-500">Teams Grouped</div>
            </Card>
          </div>

          {/* Valid teams */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Valid Teams ({validTeams.length})
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {validTeams.map(team => (
                <div key={team.ref} className="px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500">{team.ref}</span>
                      <span className="font-semibold text-white text-sm">{team.name}</span>
                      {team.category && <CategoryBadge code={team.category as CategoryCode} />}
                    </div>
                    <Badge variant="success">{team.members.length} student{team.members.length > 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400">
                        {m.studentName} · Gr {m.grade}{m.section}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Errors */}
          {allErrors.length > 0 && (
            <Card padding="none">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Errors — {allErrors.length} rows skipped
                </h3>
                <Button variant="secondary" size="sm" icon={Download}>Error CSV</Button>
              </div>
              <div className="divide-y divide-white/5">
                {allErrors.map(row => (
                  <div key={row.rowNum} className="px-6 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono text-gray-600 mt-0.5">Row {row.rowNum}</span>
                      <div>
                        <span className="text-sm text-white">{row.teamName} / {row.studentName}</span>
                        {row.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-400 mt-0.5">{e}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setStep('idle')} icon={RefreshCw}>Re-upload</Button>
            <Button variant="secondary" icon={Download}>Download Error Report</Button>
            <Button
              icon={CheckCircle2}
              onClick={() => setConfirmOpen(true)}
              disabled={validTeams.length === 0}
            >
              Commit {validTeams.length} Valid Team{validTeams.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Committing */}
      {step === 'committing' && (
        <Card className="text-center py-16">
          <Loader2 className="w-10 h-10 text-indigo-400 mx-auto animate-spin mb-4" />
          <p className="text-white font-semibold">Committing registrations…</p>
          <p className="text-sm text-gray-500 mt-1">Creating teams and student records. This may take a moment.</p>
        </Card>
      )}

      {/* Confirm modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Import"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleCommit} icon={CheckCircle2}>Confirm & Import</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-sm text-indigo-300 font-medium mb-2">You are about to import:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• {validTeams.length} teams</li>
              <li>• {MOCK_PARSED.filter(r => r.valid).length} students</li>
              {invalidTeams.length > 0 && <li className="text-yellow-400">• {invalidTeams.length} teams will be skipped (errors)</li>}
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <p className="text-xs text-gray-500">
              Import Job ID: <span className="font-mono text-indigo-400">{jobId}</span><br />
              This operation is idempotent — retrying will not create duplicate teams.
              For paid categories, invoices will be generated but payment must be verified by an Event Coordinator.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
