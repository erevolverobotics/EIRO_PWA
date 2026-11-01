'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';

import {
  PageHeader,
  Card,
  Button,
  Badge,
  CategoryBadge,
  Select,
} from '@/components/ui';

import {
  collection,
  db,
  getDocs,
  query,
  where,
} from '@/lib/firebase/firestore';

import { callEiroFunction } from '@/lib/firebase/functions';
import { useAuth } from '@/lib/firebase/auth-context';

import {
  CATEGORY_LABELS,
  type CategoryCode,
  type ImportStatus,
} from '@/lib/types';


/* =========================================
   TYPES
========================================= */

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

interface Season {
  id: string;
  name?: string;
  year?: number;
  phase?: string;
}

interface ImportJob {
  id: string;
  seasonId?: string;
  status?: ImportStatus;
  counts?: {
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
    teamsCreated?: number;
    studentsCreated?: number;
  };
  createdAt?: {
    toDate?: () => Date;
  } | string;
}


/* =========================================
   CONSTANTS
========================================= */

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryCode[];

const MAX_IMPORT_ROWS = 99;

const TEMPLATE = [
  'team_reference,team_name,category_code,student_name,grade,section,project_title,coordinator_name,coordinator_phone',
  '# team_name is optional — if blank, team_reference is used as the team name',
  'T001,Robo Warriors,SUMO,Student One,7,A,,,',
  'T001,Robo Warriors,SUMO,Student Two,7,B,,,',
  'T002,,MAZE,Student Three,8,A,,,',
].join('\n');

const REQUIRED_HEADERS = [
  'team_reference',
  'category_code',
  'student_name',
  'grade',
];


/* =========================================
   ANIMATED BACKGROUND BUBBLES
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
   GROUP ROWS
========================================= */

function groupRows(rows: ParsedRow[]) {
  const groups = new Map<string, ParsedRow[]>();

  rows.forEach(row => {
    const group = groups.get(row.teamReference) || [];
    group.push(row);
    groups.set(row.teamReference, group);
  });

  return [...groups.entries()].map(([reference, members]) => ({
    reference,
    name: members[0]?.teamName || reference || 'Unnamed',
    category: members[0]?.categoryCode || '',
    members,
    valid: members.every(member => member.valid),
  }));
}


/* =========================================
   DOWNLOAD CSV
========================================= */

function downloadCsv(
  filename: string,
  rows: Record<string, string>[]
) {
  const blob = new Blob(
    [Papa.unparse(rows)],
    { type: 'text/csv;charset=utf-8' }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}


/* =========================================
   BULK UPLOAD PAGE
========================================= */

export default function BulkUploadPage() {
  const { user, roles } = useAuth();

  const schoolId = roles.find(
    role => role.role === 'SCHOOL_COORDINATOR' && role.active
  )?.scopeId;

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


  /* =========================================
     LOAD SEASONS AND IMPORT JOBS
     FIREBASE LOGIC UNCHANGED
  ========================================= */

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned' || !user) return;

    try {
      const [seasonSnap, jobSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'seasons'),
            where('phase', '==', 'REGISTRATION_OPEN')
          )
        ),

        getDocs(
          query(
            collection(db, 'importJobs'),
            where('uploaderUid', '==', user.uid)
          )
        ),
      ]);

      const activeSeasons = seasonSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Season, 'id'>),
      }));

      setError('');
      setSeasons(activeSeasons);

      setSeasonId(current =>
        activeSeasons.some(season => season.id === current)
          ? current
          : activeSeasons.length === 1
            ? activeSeasons[0].id
            : ''
      );

      setJobs(
        jobSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<ImportJob, 'id'>),
        }))
      );

    } catch (loadError) {
      console.error(loadError);

      setError(
        'Import setup could not be loaded. Check your school assignment and Firestore permissions, then retry.'
      );

    } finally {
      setLoading(false);
    }
  }, [schoolId, user]);


  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);


  /* =========================================
     DERIVED DATA
  ========================================= */

  const groups = useMemo(
    () => groupRows(rows),
    [rows]
  );

  const validGroups = groups.filter(group => group.valid);

  const invalidRows = rows.filter(row => !row.valid);

  const committableRows = validGroups.flatMap(
    group => group.members
  );


  /* =========================================
     HANDLE CSV FILE
     PARSING LOGIC UNCHANGED
  ========================================= */

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

      const parsed = Papa.parse<Record<string, string>>(
        text,
        {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: header => header.trim().toLowerCase(),
          transform: value => value.trim(),
        }
      );

      const headers = parsed.meta.fields || [];

      const missingHeaders = REQUIRED_HEADERS.filter(
        header => !headers.includes(header)
      );

      if (missingHeaders.length > 0) {
        setError(
          `Missing required CSV column(s): ${missingHeaders.join(', ')}`
        );
        return;
      }

      if (parsed.errors.length > 0) {
        setError(
          `CSV could not be parsed: ${parsed.errors[0].message}`
        );
        return;
      }

      const parsedRows: ParsedRow[] = parsed.data.map(
        (data, index) => {
          const categoryValue =
            data.category_code?.toUpperCase() || '';

          const categoryCode = CATEGORIES.includes(
            categoryValue as CategoryCode
          )
            ? categoryValue as CategoryCode
            : '';

          const teamRef = data.team_reference?.trim() || '';

          const teamName = data.team_name?.trim() || teamRef;

          const row: ParsedRow = {
            rowNum: index + 2,
            teamReference: teamRef,
            teamName,
            categoryCode,
            studentName: data.student_name || '',
            grade: data.grade || '',
            section: data.section || '',
            projectTitle: data.project_title || '',
            valid: true,
            errors: [],
          };

          if (!row.teamReference) {
            row.errors.push('team_reference is required');
          }

          if (!row.categoryCode) {
            row.errors.push(
              `Unknown category code "${categoryValue}"`
            );
          }

          if (!row.studentName) {
            row.errors.push('student_name is required');
          }

          if (!row.grade) {
            row.errors.push('grade is required');
          }

          row.valid = row.errors.length === 0;

          return row;
        }
      );


      /* VALIDATE GROUPS */

      const references = new Map<string, ParsedRow[]>();

      parsedRows.forEach(row => {
        if (!row.teamReference) return;

        const group = references.get(row.teamReference) || [];

        group.push(row);
        references.set(row.teamReference, group);
      });

      references.forEach(group => {
        const distinctCategories = new Set(
          group.map(row => row.categoryCode)
        );

        const distinctNames = new Set(
          group.map(row => row.teamName.toLowerCase())
        );

        if (
          distinctCategories.size > 1 ||
          distinctNames.size > 1
        ) {
          group.forEach(row => {
            row.valid = false;

            row.errors.push(
              'Rows sharing a team_reference must use the same team name and category'
            );
          });
        }
      });


      if (parsedRows.length === 0) {
        setError('The CSV contains no student rows.');
        return;
      }

      if (parsedRows.length > MAX_IMPORT_ROWS) {
        setError(
          `CSV imports are limited to ${MAX_IMPORT_ROWS} student rows per upload. Split this file into smaller CSVs.`
        );
        return;
      }

      setRows(parsedRows);
      setStep('preview');

    } catch (parseError) {
      console.error(parseError);

      setError(
        'The CSV file could not be read. Save it as UTF-8 and retry.'
      );
    }
  };


  /* =========================================
     COMMIT IMPORT
     CLOUD FUNCTION UNCHANGED
  ========================================= */

  const commit = async () => {
    if (
      !schoolId ||
      !user ||
      !seasonId ||
      !idempotencyKey ||
      committableRows.length === 0
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setStep('committing');

    try {
      const response = await callEiroFunction<
        {
          schoolId: string;
          seasonId: string;
          rows: Omit<
            ParsedRow,
            'valid' | 'errors' | 'rowNum'
          >[];
          idempotencyKey: string;
        },
        {
          jobId?: string;
          importJobId?: string;
          status?: string;
        }
      >(
        'commitTeamImport',
        {
          schoolId,
          seasonId,

          rows: committableRows.map(
            ({
              teamReference,
              teamName,
              categoryCode,
              studentName,
              grade,
              section,
              projectTitle,
            }) => ({
              teamReference,
              teamName,
              categoryCode,
              studentName,
              grade,
              section,
              projectTitle,
            })
          ),

          idempotencyKey,
        }
      );

      setJobId(
        response.jobId ||
        response.importJobId ||
        'Submitted'
      );

      setStep('done');

      await load();

    } catch (commitError) {
      console.error(commitError);

      setError(
        commitError instanceof Error
          ? commitError.message
          : 'Import could not be committed. Verify that commitTeamImport is deployed and accepts this request.'
      );

      setStep('preview');

    } finally {
      setSaving(false);
    }
  };


  /* =========================================
     DOWNLOAD TEMPLATE
  ========================================= */

  const downloadTemplate = () => {
    const blob = new Blob(
      [TEMPLATE],
      { type: 'text/csv;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'eiro_team_template.csv';
    anchor.click();

    URL.revokeObjectURL(url);
  };


  /* =========================================
     DOWNLOAD ERROR CSV
  ========================================= */

  const downloadErrors = () =>
    downloadCsv(
      'eiro_import_errors.csv',
      invalidRows.map(row => ({
        row_number: String(row.rowNum),
        team_reference: row.teamReference,
        team_name: row.teamName,
        category_code: row.categoryCode,
        student_name: row.studentName,
        grade: row.grade,
        errors: row.errors.join('; '),
      }))
    );


  /* =========================================
     DRAG AND DROP
  ========================================= */

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];

    if (file) {
      void handleFile(file);
    }
  };


  /* =========================================
     PAGE UI
  ========================================= */

  return (
    <main className="bulk-upload-page relative isolate min-h-screen w-full">

      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div className="bu-ambient" aria-hidden="true">

        <div className="bu-grid" />

        <div className="bu-orb bu-orb-one" />

        <div className="bu-orb bu-orb-two" />

        <div className="bu-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`bu-bubble ${bubble.tone}`}
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

      <div className="bu-content relative z-10 w-full max-w-none space-y-6">

        <PageHeader
          title="Bulk CSV Team Registration"
          subtitle="Parse a CSV, review the rows and submit a confirmed import"
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
          }
        />


        {!schoolId || schoolId === 'unassigned' ? (

          <Card className="bu-glass-card flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-400" />

            <div>
              <p className="font-medium text-white">
                School scope not assigned
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Ask an administrator to assign this account to a school
                before uploading registrations.
              </p>
            </div>
          </Card>

        ) : error && step !== 'preview' ? (

          <>
            <div role="alert">
              <Card className="bu-glass-card text-sm text-red-300">
                {error}
              </Card>
            </div>

            {step === 'idle' && (
              <UploadPanel
                dragOver={dragOver}
                onDragOver={() => setDragOver(true)}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onFile={file => void handleFile(file)}
              />
            )}
          </>

        ) : loading ? (

          <Card className="bu-glass-card text-center text-gray-400">
            Loading import setup…
          </Card>

        ) : (

          <>

            {error && (
              <div role="alert">
                <Card className="bu-glass-card text-sm text-red-300">
                  {error}
                </Card>
              </div>
            )}


            {/* REGISTRATION SEASON */}

            {seasons.length === 0 ? (

              <Card className="bu-glass-card py-10 text-center">
                <p className="font-medium text-gray-300">
                  Registration is not open for a season
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  An active registration season is required before
                  an import can be submitted.
                </p>
              </Card>

            ) : seasons.length > 1 ? (

              <Card className="bu-glass-card">
                <Select
                  label="Registration season"
                  id="season"
                  value={seasonId}
                  onChange={event => setSeasonId(event.target.value)}
                  options={[
                    {
                      value: '',
                      label: '— Select season —',
                    },
                    ...seasons.map(season => ({
                      value: season.id,
                      label:
                        season.name ||
                        String(season.year || season.id),
                    })),
                  ]}
                />
              </Card>

            ) : null}


            {/* UPLOAD PANEL */}

            {step === 'idle' && (
              <UploadPanel
                dragOver={dragOver}
                onDragOver={() => setDragOver(true)}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onFile={file => void handleFile(file)}
              />
            )}


            {/* CSV PREVIEW */}

            {step === 'preview' && (

              <div className="space-y-4">

                <Card className="bu-glass-card flex flex-wrap items-center justify-between gap-3">

                  <div>
                    <p className="font-semibold text-white">
                      {fileName}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {rows.length} parsed student rows · maximum {MAX_IMPORT_ROWS} per upload
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={() => {
                      setStep('idle');
                      setRows([]);
                      setError('');
                    }}
                  >
                    Choose another CSV
                  </Button>

                </Card>


                {/* SUMMARY */}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <Summary title="Rows" value={rows.length} />

                  <Summary
                    title="Ready rows"
                    value={committableRows.length}
                  />

                  <Summary
                    title="Needs correction"
                    value={invalidRows.length}
                  />

                  <Summary
                    title="Teams"
                    value={groups.length}
                  />

                </div>


                {/* TEAM PREVIEW */}

                <Card className="bu-glass-card" padding="none">

                  <div className="border-b border-white/5 px-5 py-4">
                    <h2 className="font-semibold text-white">
                      Team preview ({groups.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-white/5">

                    {groups.map(group => (

                      <div
                        key={group.reference || group.name}
                        className="px-5 py-4"
                      >

                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                          <div className="flex items-center gap-2">

                            <span className="font-mono text-xs text-gray-500">
                              {group.reference || 'No team reference'}
                            </span>

                            <span className="font-semibold text-white">
                              {group.name}
                            </span>

                            {group.category && (
                              <CategoryBadge
                                code={group.category as CategoryCode}
                              />
                            )}

                          </div>

                          <Badge
                            variant={group.valid ? 'success' : 'danger'}
                          >
                            {group.members.length} student
                            {group.members.length === 1 ? '' : 's'}
                          </Badge>

                        </div>

                        <div className="space-y-1">

                          {group.members.map(row => (

                            <p
                              key={row.rowNum}
                              className={`text-xs ${
                                row.valid
                                  ? 'text-gray-400'
                                  : 'text-red-300'
                              }`}
                            >
                              Row {row.rowNum}: {row.studentName || 'Unnamed student'}
                              {' · '}
                              Grade {row.grade || '—'}

                              {row.errors.length
                                ? ` — ${row.errors.join('; ')}`
                                : ''}
                            </p>

                          ))}

                        </div>

                      </div>

                    ))}

                  </div>

                </Card>


                {/* ERROR DOWNLOAD */}

                {invalidRows.length > 0 && (
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={downloadErrors}
                  >
                    Download error CSV
                  </Button>
                )}


                {/* COMMIT BUTTON */}

                <div className="flex justify-end">

                  <Button
                    icon={CheckCircle2}
                    onClick={() => void commit()}
                    loading={saving}
                    disabled={
                      !seasonId ||
                      !idempotencyKey ||
                      validGroups.length === 0
                    }
                  >
                    Commit {validGroups.length} valid team
                    {validGroups.length === 1 ? '' : 's'}
                  </Button>

                </div>

              </div>

            )}


            {/* COMMITTING */}

            {step === 'committing' && (

              <Card className="bu-glass-card py-12 text-center">

                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-400" />

                <p className="font-semibold text-white">
                  Submitting import…
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  The trusted backend validates and commits the registrations.
                </p>

              </Card>

            )}


            {/* SUCCESS */}

            {step === 'done' && (

              <Card className="bu-glass-card py-10 text-center">

                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-400" />

                <h2 className="text-xl font-bold text-white">
                  Import submitted
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  Job:{' '}
                  <span className="font-mono text-indigo-300">
                    {jobId}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {validGroups.length} teams · {committableRows.length} student rows submitted.
                </p>

                <Button
                  className="mt-5"
                  onClick={() => {
                    setRows([]);
                    setFileName('');
                    setJobId('');
                    setIdempotencyKey('');
                    setStep('idle');
                  }}
                >
                  Upload another CSV
                </Button>

              </Card>

            )}


            {/* RECENT IMPORTS */}

            <Card className="bu-glass-card">

              <h2 className="mb-3 font-semibold text-white">
                Recent imports
              </h2>

              {jobs.length === 0 ? (

                <p className="text-sm text-gray-500">
                  No prior import jobs.
                </p>

              ) : (

                <div className="divide-y divide-white/5">

                  {jobs.map(job => (

                    <div
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >

                      <div>

                        <p className="font-mono text-sm text-indigo-300">
                          {job.id}
                        </p>

                        <p className="text-xs text-gray-500">
                          {job.counts?.teamsCreated ?? 0} teams · {job.counts?.studentsCreated ?? 0} students
                        </p>

                      </div>

                      <Badge
                        variant={
                          job.status === 'COMPLETED'
                            ? 'success'
                            : job.status === 'NEEDS_CORRECTION' ||
                              job.status === 'PARTIAL_FAILED'
                              ? 'danger'
                              : 'info'
                        }
                      >
                        {job.status || 'UNKNOWN'}
                      </Badge>

                    </div>

                  ))}

                </div>

              )}

            </Card>

          </>

        )}

      </div>


      {/* =====================================
          ANIMATED BACKGROUND STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .bulk-upload-page {
          position: relative;
          isolation: isolate;

          width: 100%;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .bulk-upload-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN BACKGROUND */

        .bu-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .bu-grid {
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

        .bu-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .bu-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .bu-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .bu-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .bu-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: bu-float linear infinite;
        }

        .bu-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .bu-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes bu-float {
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

        .bu-content {
          position: relative;
          z-index: 10;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* TRANSPARENT GLASS CARDS */

        .bulk-upload-page .bu-glass-card {
          width: 100%;

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

        .bulk-upload-page .bu-glass-card:hover {
          border-color: rgba(168, 85, 247, 0.30) !important;
        }


        /* UPLOAD PANEL */

        .bulk-upload-page .bu-glass-card input {
          color: #f8fafc;
        }


        /* RESPONSIVE */

        @media (max-width: 768px) {
          .bu-content {
            padding: 18px 14px 28px;
          }
        }

        @media (max-width: 480px) {
          .bu-content {
            padding: 16px 10px 24px;
          }
        }


        /* REDUCED MOTION ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .bu-bubble {
            animation: none;
          }

          .bu-glass-card {
            transition: none;
          }
        }

      `}</style>

    </main>
  );
}


/* =========================================
   UPLOAD PANEL
========================================= */

function UploadPanel({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
}: {
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onFile: (file: File) => void;
}) {
  return (

    <Card className="bu-glass-card">

      <div
        onDragOver={event => {
          event.preventDefault();
          onDragOver();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center ${
          dragOver
            ? 'border-indigo-500 bg-indigo-600/10'
            : 'border-white/10'
        }`}
      >

        <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-indigo-400" />

        <p className="font-semibold text-white">
          Drop your CSV file here
        </p>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm text-white">

          <Upload className="h-4 w-4" />

          Choose CSV

          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];

              if (file) {
                onFile(file);
              }

              event.target.value = '';
            }}
          />

        </label>

        <p className="mt-3 text-xs text-gray-500">
          UTF-8 · maximum 5MB · one row per student
        </p>

      </div>

    </Card>
  );
}


/* =========================================
   SUMMARY CARD
========================================= */

function Summary({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (

    <Card className="bu-glass-card text-center">

      <p className="text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {title}
      </p>

    </Card>
  );
}
