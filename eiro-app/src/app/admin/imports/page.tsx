'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard, StatusBadge } from '@/components/ui';
import { Upload, CheckCircle2, XCircle, Clock, AlertCircle, FileText, BarChart3 } from 'lucide-react';

const JOBS = [
  { id: 'JOB-A3B2C1', uploader: 'Priya Kumar (DAV Public)', file: 'teams_dav_batch1.csv', rows: 18, valid: 16, errors: 2, status: 'COMPLETED', at: 'Oct 20 · 14:30', schoolCode: 'DAV-CHN-001' },
  { id: 'JOB-D4E5F6', uploader: 'Rajan Iyer (St. Josephs)', file: 'stjosephs_teams.csv', rows: 6, valid: 6, errors: 0, status: 'COMPLETED', at: 'Oct 19 · 10:15', schoolCode: 'STJ-CHN-002' },
  { id: 'JOB-G7H8I9', uploader: 'Sunita Singh (KV No.1)', file: 'kv_teams_v2.csv', rows: 12, valid: 10, errors: 2, status: 'COMMITTED', at: 'Oct 18 · 09:00', schoolCode: 'KV1-CHN-003' },
  { id: 'JOB-J0K1L2', uploader: 'Admin Bulk Import', file: 'all_schools_prelim.csv', rows: 200, valid: 0, errors: 0, status: 'PROCESSING', at: 'Oct 21 · 08:45', schoolCode: '' },
];

const STATUS_ICON: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle2,
  COMMITTED: CheckCircle2,
  PROCESSING: Clock,
  FAILED: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-green-400',
  COMMITTED: 'text-blue-400',
  PROCESSING: 'text-yellow-400',
  FAILED: 'text-red-400',
};

export default function ImportsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Import Monitoring"
        subtitle="A17 — Monitor all CSV bulk import jobs across all schools"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Jobs" value={JOBS.length} icon={Upload} color="indigo" />
        <KpiCard title="Completed" value={JOBS.filter(j => j.status === 'COMPLETED' || j.status === 'COMMITTED').length} icon={CheckCircle2} color="green" />
        <KpiCard title="Processing" value={JOBS.filter(j => j.status === 'PROCESSING').length} icon={Clock} color="yellow" />
        <KpiCard title="Total Rows" value={JOBS.reduce((s, j) => s + j.rows, 0)} icon={BarChart3} color="blue" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">All Import Jobs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="eiro-table">
            <thead>
              <tr><th>Job ID</th><th>File</th><th>Uploader</th><th>Rows</th><th>Errors</th><th>Status</th><th>Time</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {JOBS.map(job => {
                const Icon = STATUS_ICON[job.status] ?? AlertCircle;
                return (
                  <tr key={job.id}>
                    <td><span className="font-mono text-xs text-indigo-400">{job.id}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-300 truncate max-w-[140px]">{job.file}</span>
                      </div>
                    </td>
                    <td><span className="text-xs text-gray-400 truncate max-w-[120px] block">{job.uploader}</span></td>
                    <td>
                      <div>
                        <span className="text-white">{job.rows}</span>
                        {job.valid > 0 && <span className="text-xs text-green-400 ml-1">({job.valid} ok)</span>}
                      </div>
                    </td>
                    <td>
                      {job.errors > 0
                        ? <Badge variant="danger">{job.errors} errors</Badge>
                        : <span className="text-xs text-gray-600">—</span>
                      }
                    </td>
                    <td>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[job.status]}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {job.status}
                      </div>
                    </td>
                    <td><span className="text-xs text-gray-500">{job.at}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {job.errors > 0 && <Button size="sm" variant="secondary" icon={AlertCircle}>Errors</Button>}
                        <Button size="sm" variant="secondary">Details</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
