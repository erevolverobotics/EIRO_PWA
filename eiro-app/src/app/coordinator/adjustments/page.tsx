'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Shuffle } from 'lucide-react';
import { PageHeader, Card, Button, Badge, Select, Textarea } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import { useAuth } from '@/lib/firebase/auth-context';
import type { AdjustmentStatus, CategoryCode } from '@/lib/types';

interface Team {
  id: string;
  schoolId: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
}

interface AdjustmentRequest {
  id: string;
  type?: string;
  sourceTeamId?: string;
  targetTeamId?: string;
  sourceEntryId?: string;
  targetEntryId?: string;
  reason?: string;
  status?: AdjustmentStatus;
  createdAt?: { toDate?: () => Date } | string;
}

type RequestType = 'MERGE_TEAMS' | 'TRANSFER_MEMBERS';

export default function CoordinatorAdjustmentsPage() {
  const { user, roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [type, setType] = useState<RequestType>('MERGE_TEAMS');
  const [form, setForm] = useState({ sourceTeamId: '', targetTeamId: '', studentIds: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned' || !user) return;
    try {
      const [teamSnap, requestSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'teamAdjustmentRequests'), where('requestedBy', '==', user.uid))),
      ]);
      setError('');
      setTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) })));
      setRequests(requestSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<AdjustmentRequest, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Adjustment data could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamOptions = useMemo(() => [
    { value: '', label: '— Select team —' },
    ...teams.map(team => ({ value: team.id, label: `${team.teamName || team.displayTeamCode || team.id}${team.displayTeamCode ? ` (${team.displayTeamCode})` : ''}` })),
  ], [teams]);

  const submit = async () => {
    if (!schoolId || !user) return;
    if (!form.sourceTeamId || !form.targetTeamId || !form.reason.trim()) {
      setError('Choose both teams and provide a reason.');
      return;
    }
    if (form.sourceTeamId === form.targetTeamId) {
      setError('Source and target teams must be different.');
      return;
    }
    const studentIds = form.studentIds.split(',').map(id => id.trim()).filter(Boolean);
    if (type === 'TRANSFER_MEMBERS' && studentIds.length === 0) {
      setError('Enter at least one student document ID for a member transfer.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await callEiroFunction<
        {
          schoolId: string;
          type: RequestType;
          sourceTeamId: string;
          targetTeamId: string;
          studentIds: string[];
          reason: string;
        },
        { requestId?: string; status?: string }
      >('requestTeamAdjustment', {
        schoolId,
        type,
        sourceTeamId: form.sourceTeamId,
        targetTeamId: form.targetTeamId,
        studentIds,
        reason: form.reason.trim(),
      });
      setSuccess(true);
      setForm({ sourceTeamId: '', targetTeamId: '', studentIds: '', reason: '' });
      await load();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'The adjustment request could not be submitted. Verify that the requestTeamAdjustment backend function is deployed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <PageHeader title="Transfer / Merge Request" subtitle="Request a roster change for teams belonging to your assigned school" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />

      <div className="p-4 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-400 space-y-1">
          <p><strong>Requests require review.</strong> Sending a request does not change a roster; an authorized reviewer must approve it.</p>
          <p>Backend validation must check event scope, student membership, event status and cross-school permissions.</p>
        </div>
      </div>

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-400 mt-0.5" /><div><p className="font-medium text-white">School scope not assigned</p><p className="text-sm text-gray-400 mt-1">Ask an administrator to assign this account to a school before creating or viewing scoped requests.</p></div></Card>
      ) : error && teams.length === 0 && requests.length === 0 ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading teams and requests…</Card>
      ) : (
        <>
          {success && <div role="status"><Card className="flex items-center gap-3 text-green-300"><CheckCircle2 className="w-5 h-5" />Request sent for authorized review.</Card></div>}
          {error && <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>}
          {teams.length === 0 ? (
            <Card className="text-center py-10"><p className="font-medium text-gray-300">No teams found for this school</p><p className="text-sm text-gray-500 mt-2">Requests can be started after teams are registered.</p></Card>
          ) : (
            <Card>
              <div className="flex gap-3 mb-5">
                {(['MERGE_TEAMS', 'TRANSFER_MEMBERS'] as const).map(requestType => (
                  <button key={requestType} type="button" onClick={() => { setType(requestType); setError(''); }}
                    className={`flex-1 p-4 rounded-xl border text-left ${type === requestType ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 bg-white/[0.03]'}`}>
                    <Shuffle className={`w-5 h-5 mb-2 ${type === requestType ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <span className="block font-semibold text-white text-sm">{requestType === 'MERGE_TEAMS' ? 'Team merge' : 'Member transfer'}</span>
                    <span className="block text-xs text-gray-500 mt-1">{requestType === 'MERGE_TEAMS' ? 'Request review of two team entries' : 'Request moving listed students between teams'}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                <Select label="Source team" id="source-team" value={form.sourceTeamId} onChange={event => setForm(current => ({ ...current, sourceTeamId: event.target.value }))} options={teamOptions} />
                <Select label="Target team" id="target-team" value={form.targetTeamId} onChange={event => setForm(current => ({ ...current, targetTeamId: event.target.value }))} options={teamOptions} />
                {type === 'TRANSFER_MEMBERS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="student-ids">Student document ID(s)</label>
                    <input id="student-ids" className="eiro-input" value={form.studentIds} onChange={event => setForm(current => ({ ...current, studentIds: event.target.value }))} placeholder="Paste student IDs, separated by commas" />
                    <p className="text-xs text-gray-500 mt-1">Student-to-team membership is not readable under the current school rules; the callable must verify membership before accepting this request.</p>
                  </div>
                )}
                <Textarea label="Reason" id="adjustment-reason" rows={3} value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} placeholder="Explain why the roster adjustment is requested…" />
                <Button icon={Shuffle} className="w-full" onClick={() => void submit()} loading={submitting}>Submit for review</Button>
              </div>
            </Card>
          )}
          <Card>
            <h2 className="font-semibold text-white mb-3">Your requests</h2>
            {requests.length === 0 ? <p className="text-sm text-gray-500">No adjustment requests have been submitted.</p> : (
              <div className="divide-y divide-white/5">
                {requests.map(request => (
                  <div key={request.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-sm text-white">{request.type === 'MERGE_TEAMS' ? 'Team merge' : request.type === 'TRANSFER_MEMBERS' ? 'Member transfer' : request.type || 'Adjustment'} · {request.id}</p><p className="text-xs text-gray-500 mt-1">{request.reason || 'No reason recorded'}</p></div>
                    <Badge variant={request.status === 'APPROVED' || request.status === 'APPLIED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'}>{request.status || 'PENDING'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
