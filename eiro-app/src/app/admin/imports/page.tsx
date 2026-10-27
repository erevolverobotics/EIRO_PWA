'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import { Upload, CheckCircle2, XCircle, Clock, AlertCircle, FileText, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import type { ImportStatus } from '@/lib/types';

interface ImportJob {
  id: string;
  uploaderUid?: string;
  sourceFilePath?: string;
  status?: ImportStatus | string;
  counts?: { totalRows?: number; validRows?: number; invalidRows?: number; teamsCreated?: number; studentsCreated?: number };
  idempotencyKey?: string;
  createdAt?: unknown;
}

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2, PARTIAL_FAILED: AlertCircle, VALIDATED: CheckCircle2,
  COMMITTING: Clock, VALIDATING: Clock, UPLOADED: Upload, NEEDS_CORRECTION: XCircle,
};

function showDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  return typeof value === 'string' ? value : '—';
}

export default function ImportsPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setJobs(await getAll<ImportJob>('importJobs'));
    } catch (e) {
      console.error(e);
      setError('Could not load import jobs. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const completed = jobs.filter(job => ['COMPLETED', 'PARTIAL_FAILED'].includes(job.status || '')).length;
  const processing = jobs.filter(job => ['VALIDATING', 'COMMITTING'].includes(job.status || '')).length;
  const totalRows = jobs.reduce((sum, job) => sum + (job.counts?.totalRows || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Import Monitoring" subtitle="Monitor CSV bulk import jobs"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Jobs" value={jobs.length} icon={Upload} color="indigo" />
        <KpiCard title="Completed / Partial" value={completed} icon={CheckCircle2} color="green" />
        <KpiCard title="Processing" value={processing} icon={Clock} color="yellow" />
        <KpiCard title="Total Rows" value={totalRows} icon={BarChart3} color="blue" />
      </div>
      <p className="text-xs text-gray-500">Commit is unavailable from this monitor: the callable requires the validated rows, school, season, and idempotency key, which are not stored in import job records.</p>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        jobs.length === 0 ? <Card className="text-center text-gray-400">No import jobs found.</Card> :
          <Card padding="none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">All Import Jobs</h3>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>
            </div>
            <div className="overflow-x-auto"><table className="eiro-table">
              <thead><tr><th>Job ID</th><th>File</th><th>Uploader UID</th><th>Rows</th><th>Invalid</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>{jobs.map(job => {
                const status = job.status || 'UNKNOWN';
                const Icon = STATUS_ICON[status] || AlertCircle;
                return <tr key={job.id}>
                  <td><span className="font-mono text-xs text-indigo-400">{job.id}</span></td>
                  <td><div className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-gray-500" /><span className="text-xs text-gray-300">{job.sourceFilePath || '—'}</span></div></td>
                  <td className="text-xs text-gray-400">{job.uploaderUid || '—'}</td>
                  <td><span className="text-white">{job.counts?.totalRows ?? '—'}</span>{job.counts?.validRows !== undefined && <span className="text-xs text-green-400 ml-1">({job.counts.validRows} valid)</span>}</td>
                  <td>{job.counts?.invalidRows ? <Badge variant="danger">{job.counts.invalidRows} invalid</Badge> : <span className="text-xs text-gray-600">—</span>}</td>
                  <td><div className="flex items-center gap-1.5 text-xs text-gray-300"><Icon className="w-3.5 h-3.5" />{status}</div></td>
                  <td className="text-xs text-gray-500">{showDate(job.createdAt)}</td>
                  <td><span className="text-xs text-gray-600">{status === 'VALIDATED' ? 'Source rows unavailable' : '—'}</span></td>
                </tr>;
              })}</tbody>
            </table></div>
          </Card>}
    </div>
  );
}
