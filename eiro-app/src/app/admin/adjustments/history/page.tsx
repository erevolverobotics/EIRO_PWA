'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, KpiCard } from '@/components/ui';
import { History, CheckCircle2, XCircle, Shuffle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';

interface HistoryRecord {
  id: string;
  type?: string;
  status?: string;
  outcome?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  studentIds?: string[];
  requestedBy?: string;
  reviewedBy?: string;
  reviewedAt?: unknown;
  appliedAt?: unknown;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

function showDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  return typeof value === 'string' ? value : '—';
}

export default function AdminAdjustmentHistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await getAll<HistoryRecord>('teamAdjustmentHistory');
      setRecords(result);
    } catch (e) {
      console.error(e);
      setError('Could not load adjustment history. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const outcome = (record: HistoryRecord) => record.outcome || record.status || 'UNKNOWN';
  const approved = records.filter(record => ['APPROVED', 'APPLIED'].includes(outcome(record))).length;
  const rejected = records.filter(record => outcome(record) === 'REJECTED').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Adjustment History" subtitle="Immutable audit log of team adjustment operations"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Operations" value={records.length} icon={History} color="indigo" />
        <KpiCard title="Approved / Applied" value={approved} icon={CheckCircle2} color="green" />
        <KpiCard title="Rejected" value={rejected} icon={XCircle} color="red" />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        records.length === 0 ? <Card className="text-center text-gray-400">No adjustment history records found.</Card> :
          <div className="space-y-4">{records.map(record => {
            const state = outcome(record);
            const isApproved = ['APPROVED', 'APPLIED'].includes(state);
            const isRejected = state === 'REJECTED';
            return <Card key={record.id} className={isRejected ? 'border-red-500/20' : isApproved ? 'border-green-500/20' : ''}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {isRejected ? <XCircle className="w-5 h-5 text-red-400" /> : isApproved ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-indigo-400">{record.id}</span>
                      <Badge variant={record.type === 'MERGE_TEAMS' ? 'danger' : 'info'}>{record.type || 'Adjustment'}</Badge>
                      <Badge variant={isRejected ? 'danger' : isApproved ? 'success' : 'default'}>{state}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{showDate(record.appliedAt || record.reviewedAt)} · {record.reviewedBy || 'Reviewer unavailable'}</p>
                  </div>
                </div>
                <Shuffle className="w-4 h-4 text-purple-400" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-xs text-gray-500">Source entry</p><p className="text-sm text-gray-300">{record.sourceEntryId || '—'}</p></div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-xs text-gray-500">Target entry</p><p className="text-sm text-gray-300">{record.targetEntryId || '—'}</p></div>
              </div>
              {record.studentIds?.length ? <p className="text-xs text-gray-400 mt-3">Students: {record.studentIds.join(', ')}</p> : null}
              {record.reason && <p className="text-sm text-gray-400 mt-3">{record.reason}</p>}
              {(record.before || record.after) && <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {record.before && <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-xs text-gray-500 mb-1">Before snapshot</p><pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">{JSON.stringify(record.before, null, 2)}</pre></div>}
                {record.after && <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-xs text-gray-500 mb-1">After snapshot</p><pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">{JSON.stringify(record.after, null, 2)}</pre></div>}
              </div>}
            </Card>;
          })}</div>}
    </div>
  );
}
