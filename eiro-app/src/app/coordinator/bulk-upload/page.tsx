'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { CheckCircle2, Download, FileSpreadsheet, Info, Loader2, RefreshCw, Upload } from 'lucide-react';
import { PageHeader, Card, Button, Badge, CategoryBadge, Select } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import { useAuth } from '@/lib/firebase/auth-context';
import { CATEGORY_LABELS, type CategoryCode, type ImportStatus } from '@/lib/types';

type ImportStep = 'idle' | 'preview' | 'committing' | 'done';

interface ParsedRow {
  rowNum: number;
  teamReference: string;
  teamName: string;
  categoryCode: CategoryCode | '';
  studentName: string;
  grade: string;
  section: string;
  projectTitle: string;
  valid: boolean;
  errors: string[];
}

interface Season { id: string; name?: string; year?: number; phase?: string; }
interface ImportJob {
  id: string;
  seasonId?: string;
  status?: ImportStatus;
  counts?: { totalRows?: number; validRows?: number; invalidRows?: number; teamsCreated?: number; studentsCreated?: number };
  createdAt?: { toDate?: () => Date } | string;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];
const MAX_IMPORT_ROWS = 99;
const TEMPLATE = [
  'team_reference,team_name,category_code,student_name,grade,section,project_title,coordinator_name,coordinator_phone',
  'T001,Example Team,SUMO,Student One,7,A,,,',
  'T001,Example Team,SUMO,Student Two,7,B,,,',
].join('\n');
const REQUIRED_HEADERS = ['team_reference', 'team_name', 'category_code', 'student_name', 'grade'];

function groupRows(rows: ParsedRow[]) {
  const groups = new Map<string, ParsedRow[]>();
  rows.forEach(row => {
    const group = groups.get(row.teamReference) || [];
    group.push(row);
    groups.set(row.teamReference, group);
  });
  return [...groups.entries()].map(([reference, members]) => ({
    reference,
    name: members[0]?.teamName || 'Unnamed team',
    category: members[0]?.categoryCode || '',
    members,
    valid: members.every(member => member.valid),
  }));
}

function downloadCsv(filename: string, rows: Record<string, string>[]) {
  const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadPage() {
  const { user, roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [step, setStep] = useState<ImportStep>('idle');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [jobId, setJobId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned' || !user) return;
    try {
      const [seasonSnap, jobSnap] = await Promise.all([
        getDocs(query(collection(db, 'seasons'), where('phase', '==', 'REGISTRATION_OPEN'))),
        getDocs(query(collection(db, 'importJobs'), where('uploaderUid', '==', user.uid))),
      ]);
      const activeSeasons = seasonSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Season, 'id'>) }));
      setError('');
      setSeasons(activeSeasons);
      setSeasonId(current => activeSeasons.some(season => season.id === current) ? current : activeSeasons.length === 1 ? activeSeasons[0].id : '');
      setJobs(jobSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ImportJob, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Import setup could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const groups = useMemo(() => groupRows(rows), [rows]);
  const validGroups = groups.filter(group => group.valid);
  const invalidRows = rows.filter(row => !row.valid);
  const committableRows = validGroups.flatMap(group => group.members);

  const handleFile = async (file: File) => {
    setError('');
    setStep('idle');
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('CSV must be 5MB or smaller.');
      return;
    }
    setFileName(file.name);
    setIdempotencyKey(crypto.randomUUID());
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: header => header.trim().toLowerCase(),
        transform: value => value.trim(),
      });
      const headers = parsed.meta.fields || [];
      const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setError(`Missing required CSV column(s): ${missingHeaders.join(', ')}`);
        return;
      }
      if (parsed.errors.length > 0) {
        setError(`CSV could not be parsed: ${parsed.errors[0].message}`);
        return;
      }
      const parsedRows: ParsedRow[] = parsed.data.map((data, index) => {
        const categoryValue = data.category_code?.toUpperCase() || '';
        const categoryCode = CATEGORIES.includes(categoryValue as CategoryCode) ? categoryValue as CategoryCode : '';
        const row: ParsedRow = {
          rowNum: index + 2,
          teamReference: data.team_reference || '',
          teamName: data.team_name || '',
          categoryCode,
          studentName: data.student_name || '',
          grade: data.grade || '',
          section: data.section || '',
          projectTitle: data.project_title || '',
          valid: true,
          errors: [],
        };
        if (!row.teamReference) row.errors.push('team_reference is required');
        if (!row.teamName) row.errors.push('team_name is required');
        if (!row.categoryCode) row.errors.push(`Unknown category code "${categoryValue}"`);
        if (!row.studentName) row.errors.push('student_name is required');
        if (!row.grade) row.errors.push('grade is required');
        row.valid = row.errors.length === 0;
        return row;
      });
      const references = new Map<string, ParsedRow[]>();
      parsedRows.forEach(row => {
        if (!row.teamReference) return;
        const group = references.get(row.teamReference) || [];
        group.push(row);
        references.set(row.teamReference, group);
      });
      references.forEach(group => {
        const distinctCategories = new Set(group.map(row => row.categoryCode));
        const distinctNames = new Set(group.map(row => row.teamName.toLowerCase()));
        if (distinctCategories.size > 1 || distinctNames.size > 1) {
          group.forEach(row => {
            row.valid = false;
            row.errors.push('Rows sharing a team_reference must use the same team name and category');
          });
        }
      });
      if (parsedRows.length === 0) {
        setError('The CSV contains no student rows.');
        return;
      }
      if (parsedRows.length > MAX_IMPORT_ROWS) {
        setError(`CSV imports are limited to ${MAX_IMPORT_ROWS} student rows per upload. Split this file into smaller CSVs.`);
        return;
      }
      setRows(parsedRows);
      setStep('preview');
    } catch (parseError) {
      console.error(parseError);
      setError('The CSV file could not be read. Save it as UTF-8 and retry.');
    }
  };

  const commit = async () => {
    if (!schoolId || !user || !seasonId || !idempotencyKey || committableRows.length === 0) return;
    setSaving(true);
    setError('');
    setStep('committing');
    try {
      const response = await callEiroFunction<
        { schoolId: string; seasonId: string; rows: Omit<ParsedRow, 'valid' | 'errors' | 'rowNum'>[]; idempotencyKey: string },
        { jobId?: string; importJobId?: string; status?: string }
      >('commitTeamImport', {
        schoolId,
        seasonId,
        rows: committableRows.map(({ teamReference, teamName, categoryCode, studentName, grade, section, projectTitle }) => ({
          teamReference, teamName, categoryCode, studentName, grade, section, projectTitle,
        })),
        idempotencyKey,
      });
      setJobId(response.jobId || response.importJobId || 'Submitted');
      setStep('done');
      await load();
    } catch (commitError) {
      console.error(commitError);
      setError(commitError instanceof Error ? commitError.message : 'Import could not be committed. Verify that commitTeamImport is deployed and accepts this request.');
      setStep('preview');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eiro_team_template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = () => downloadCsv('eiro_import_errors.csv', invalidRows.map(row => ({
    row_number: String(row.rowNum),
    team_reference: row.teamReference,
    team_name: row.teamName,
    category_code: row.categoryCode,
    student_name: row.studentName,
    grade: row.grade,
    errors: row.errors.join('; '),
  })));

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl">
      <PageHeader title="Bulk CSV Team Registration" subtitle="Parse a CSV, review the rows and submit a confirmed import" actions={<Button variant="secondary" size="sm" icon={Download} onClick={downloadTemplate}>Download Template</Button>} />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Ask an administrator to assign this account to a school before uploading registrations.</p></div></Card>
      ) : error && step !== 'preview' ? (
        <>
          <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
          {step === 'idle' && <UploadPanel dragOver={dragOver} onDragOver={() => setDragOver(true)} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onFile={file => void handleFile(file)} />}
        </>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading import setup…</Card>
      ) : (
        <>
          {error && <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>}
          {seasons.length === 0 ? (
            <Card className="text-center py-10"><p className="font-medium text-gray-300">Registration is not open for a season</p><p className="text-sm text-gray-500 mt-2">An active registration season is required before an import can be submitted.</p></Card>
          ) : seasons.length > 1 ? (
            <Card><Select label="Registration season" id="season" value={seasonId} onChange={event => setSeasonId(event.target.value)} options={[{ value: '', label: '— Select season —' }, ...seasons.map(season => ({ value: season.id, label: season.name || String(season.year || season.id) }))]} /></Card>
          ) : null}

          {step === 'idle' && <UploadPanel dragOver={dragOver} onDragOver={() => setDragOver(true)} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onFile={file => void handleFile(file)} />}
          {step === 'preview' && (
            <div className="space-y-4">
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold text-white">{fileName}</p><p className="text-xs text-gray-500 mt-1">{rows.length} parsed student rows · maximum {MAX_IMPORT_ROWS} per upload</p></div>
                <Button variant="secondary" icon={RefreshCw} onClick={() => { setStep('idle'); setRows([]); setError(''); }}>Choose another CSV</Button>
              </Card>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Summary title="Rows" value={rows.length} />
                <Summary title="Ready rows" value={committableRows.length} />
                <Summary title="Needs correction" value={invalidRows.length} />
                <Summary title="Teams" value={groups.length} />
              </div>
              <Card padding="none">
                <div className="px-5 py-4 border-b border-white/5"><h2 className="font-semibold text-white">Team preview ({groups.length})</h2></div>
                <div className="divide-y divide-white/5">
                  {groups.map(group => (
                    <div key={group.reference || group.name} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2"><span className="font-mono text-xs text-gray-500">{group.reference || 'No team reference'}</span><span className="font-semibold text-white">{group.name}</span>{group.category && <CategoryBadge code={group.category as CategoryCode} />}</div>
                        <Badge variant={group.valid ? 'success' : 'danger'}>{group.members.length} student{group.members.length === 1 ? '' : 's'}</Badge>
                      </div>
                      <div className="space-y-1">
                        {group.members.map(row => <p key={row.rowNum} className={`text-xs ${row.valid ? 'text-gray-400' : 'text-red-300'}`}>Row {row.rowNum}: {row.studentName || 'Unnamed student'} · Grade {row.grade || '—'}{row.errors.length ? ` — ${row.errors.join('; ')}` : ''}</p>)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              {invalidRows.length > 0 && <Button variant="secondary" icon={Download} onClick={downloadErrors}>Download error CSV</Button>}
              <div className="flex justify-end">
                <Button icon={CheckCircle2} onClick={() => void commit()} loading={saving} disabled={!seasonId || !idempotencyKey || validGroups.length === 0}>Commit {validGroups.length} valid team{validGroups.length === 1 ? '' : 's'}</Button>
              </div>
            </div>
          )}
          {step === 'committing' && <Card className="text-center py-12"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" /><p className="font-semibold text-white">Submitting import…</p><p className="text-sm text-gray-500 mt-2">The trusted backend validates and commits the registrations.</p></Card>}
          {step === 'done' && (
            <Card className="text-center py-10">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Import submitted</h2>
              <p className="text-sm text-gray-400 mt-2">Job: <span className="font-mono text-indigo-300">{jobId}</span></p>
              <p className="text-sm text-gray-500 mt-1">{validGroups.length} teams · {committableRows.length} student rows submitted.</p>
              <Button className="mt-5" onClick={() => { setRows([]); setFileName(''); setJobId(''); setIdempotencyKey(''); setStep('idle'); }}>Upload another CSV</Button>
            </Card>
          )}
          <Card>
            <h2 className="font-semibold text-white mb-3">Recent imports</h2>
            {jobs.length === 0 ? <p className="text-sm text-gray-500">No prior import jobs.</p> : (
              <div className="divide-y divide-white/5">
                {jobs.map(job => <div key={job.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-sm font-mono text-indigo-300">{job.id}</p><p className="text-xs text-gray-500">{job.counts?.teamsCreated ?? 0} teams · {job.counts?.studentsCreated ?? 0} students</p></div>
                  <Badge variant={job.status === 'COMPLETED' ? 'success' : job.status === 'NEEDS_CORRECTION' || job.status === 'PARTIAL_FAILED' ? 'danger' : 'info'}>{job.status || 'UNKNOWN'}</Badge>
                </div>)}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function UploadPanel({ dragOver, onDragOver, onDragLeave, onDrop, onFile }: {
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onFile: (file: File) => void;
}) {
  return (
    <Card>
      <div onDragOver={event => { event.preventDefault(); onDragOver(); }} onDragLeave={onDragLeave} onDrop={onDrop} className={`border-2 border-dashed rounded-2xl p-10 text-center ${dragOver ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10'}`}>
        <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <p className="font-semibold text-white">Drop your CSV file here</p>
        <label className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm cursor-pointer"><Upload className="w-4 h-4" />Choose CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ''; }} /></label>
        <p className="text-xs text-gray-500 mt-3">UTF-8 · maximum 5MB · one row per student</p>
      </div>
    </Card>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return <Card className="text-center"><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-gray-500 mt-1">{title}</p></Card>;
}
