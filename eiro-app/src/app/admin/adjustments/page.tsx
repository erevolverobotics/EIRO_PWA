'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Badge, StatusBadge, CategoryBadge, Modal, Textarea } from '@/components/ui';
import { Shuffle, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import type { CategoryCode } from '@/lib/types';

interface Adjustment {
  id: string;
  type?: string;
  status?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  studentIds?: string[];
  reason?: string;
  requestedBy?: string;
  createdAt?: unknown;
}
interface Entry { id: string; teamId?: string }
interface Team { id: string; teamName?: string; displayTeamCode?: string; categoryCode?: string; schoolId?: string }
interface School { id: string; name?: string; schoolCode?: string }
interface Student { id: string; name?: string }

function displayDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }
  if (value instanceof Date) return value.toLocaleString();
  return typeof value === 'string' ? value : '—';
}

export default function AdjustmentsPage() {
  const [requests, setRequests] = useState<Adjustment[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<{ request: Adjustment; decision: 'APPROVE' | 'REJECT' } | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [requestData, entryData, teamData, schoolData, studentData] = await Promise.all([
        getAll<Adjustment>('teamAdjustmentRequests'),
        getAll<Entry>('stageEntries'),
        getAll<Team>('teams'),
        getAll<School>('schools'),
        getAll<Student>('students'),
      ]);
      setRequests(requestData);
      setEntries(entryData);
      setTeams(teamData);
      setSchools(schoolData);
      setStudents(studentData);
    } catch (e) {
      console.error(e);
      setError('Could not load adjustment requests or related records. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const refresh = () => { setLoading(true); setError(''); void load(); };

  const teamForEntry = (entryId?: string) => {
    const teamId = entries.find(entry => entry.id === entryId)?.teamId;
    return teams.find(team => team.id === teamId);
  };
  const schoolName = (schoolId?: string) => {
    const school = schools.find(item => item.id === schoolId);
    return school?.name || school?.schoolCode || schoolId || '—';
  };
  const submit = async () => {
    if (!modal || busy) return;
    if (modal.decision === 'REJECT' && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await callEiroFunction<{ requestId: string; decision: 'APPROVE' | 'REJECT'; reason?: string }, unknown>(
        'approveTeamAdjustment',
        { requestId: modal.request.id, decision: modal.decision, ...(reason.trim() ? { reason: reason.trim() } : {}) }
      );
      setMessage(`Adjustment ${modal.decision === 'APPROVE' ? 'approved' : 'rejected'}.`);
      setModal(null);
      setReason('');
      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);
      setError('The adjustment action was not completed. The callable may be unavailable or the request may no longer be actionable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Team Adjustment Approvals" subtitle="A15 — Review and authorize merge/transfer requests"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</Button>} />

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300 mb-1">Safety Rules</p>
          <p className="text-xs text-yellow-600">Approval and rejection are submitted to the trusted Cloud Function; eligibility and roster changes are determined server-side.</p>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-green-400">{message}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div> :
        requests.length === 0 ? <Card className="text-center text-gray-400">No adjustment requests found.</Card> :
          <div className="space-y-4">{requests.map(req => {
            const source = teamForEntry(req.sourceEntryId);
            const target = teamForEntry(req.targetEntryId);
            const actionable = req.status === 'PENDING_REVIEW';
            return <Card key={req.id} padding="none">
              <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{req.id}</span>
                      <Badge variant={req.type === 'MERGE_TEAMS' ? 'danger' : 'info'}>{req.type || 'Adjustment'}</Badge>
                      <StatusBadge status={req.status || 'UNKNOWN'} />
                      {source?.categoryCode && <CategoryBadge code={source.categoryCode as CategoryCode} />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Requested by {req.requestedBy || '—'} · {displayDate(req.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[['Source', source, req.sourceEntryId], ['Target', target, req.targetEntryId]].map(([label, team, id]) => {
                    const item = team as Team | undefined;
                    return <div key={String(label)} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-xs text-gray-500 mb-1">{String(label)}</p>
                      <p className="font-semibold text-white text-sm">{item?.teamName || item?.displayTeamCode || 'Team details unavailable'}</p>
                      <p className="text-xs text-gray-500">{schoolName(item?.schoolId)}</p>
                      <p className="font-mono text-[10px] text-gray-600">{item?.displayTeamCode || String(id || '—')}</p>
                    </div>;
                  })}
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Reason</p><p className="text-sm text-gray-300">{req.reason || '—'}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(req.studentIds || []).map(id => <span key={id} className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300">{students.find(student => student.id === id)?.name || id}</span>)}
                </div>
                {actionable && <div className="flex gap-3 justify-end">
                  <Button variant="danger" size="sm" icon={XCircle} onClick={() => { setReason(''); setModal({ request: req, decision: 'REJECT' }); }}>Reject</Button>
                  <Button size="sm" icon={CheckCircle2} onClick={() => { setReason(''); setModal({ request: req, decision: 'APPROVE' }); }}>Approve & Apply</Button>
                </div>}
              </div>
            </Card>;
          })}</div>}

      <Modal open={Boolean(modal)} onClose={() => !busy && setModal(null)}
        title={modal?.decision === 'APPROVE' ? 'Approve Adjustment' : 'Reject Request'}
        footer={<>
          <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</Button>
          <Button variant={modal?.decision === 'APPROVE' ? 'primary' : 'danger'} loading={busy} onClick={() => void submit()}>
            {modal?.decision === 'APPROVE' ? 'Approve & Apply' : 'Reject Request'}
          </Button>
        </>}>
        {modal?.decision === 'APPROVE'
          ? <Textarea label="Authorization note (optional)" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
          : <Textarea label="Rejection reason *" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request is rejected…" />}
      </Modal>
    </div>
  );
}
