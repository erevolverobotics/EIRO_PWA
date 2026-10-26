'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Button, Input, StatusBadge, CategoryBadge, Badge, Modal, Textarea } from '@/components/ui';
import { Search, CheckCircle2, XCircle, AlertCircle, Eye, Loader2, RefreshCw, School } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  collection, getDocs, doc, updateDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import type { CategoryCode, RegistrationState } from '@/lib/types';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  category: CategoryCode;
  state: RegistrationState;
  members: number;
  feeStatus: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolApprovalsPage() {
  const [teams, setTeams]           = useState<Team[]>([]);
  const [schools, setSchools]       = useState<Record<string, { name: string; code: string }>>({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'correction' | null>(null);
  const [saving, setSaving]         = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load schools index
      const schoolSnap = await getDocs(collection(db, 'schools'));
      const schoolMap: Record<string, { name: string; code: string }> = {};
      schoolSnap.docs.forEach(d => {
        const data = d.data();
        schoolMap[d.id] = { name: data.name ?? d.id, code: data.code ?? '' };
      });
      setSchools(schoolMap);

      // Load teams (registrations that need approval)
      const teamSnap = await getDocs(collection(db, 'teams'));
      const data: Team[] = teamSnap.docs.map(d => ({
        id: d.id,
        name: '',
        category: 'SUMO' as CategoryCode,
        state: 'SUBMITTED' as RegistrationState,
        members: 0,
        feeStatus: 'PENDING',
        schoolId: '',
        ...(d.data() as Partial<Team>),
        schoolName: schoolMap[d.data().schoolId]?.name ?? 'Unknown School',
        schoolCode: schoolMap[d.data().schoolId]?.code ?? '',
      }));

      setTeams(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load registrations. Check Firestore permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  const applyAction = async () => {
    if (!selectedTeam || !actionType) return;
    setSaving(true);

    const stateMap: Record<string, RegistrationState> = {
      approve:    'APPROVED',
      reject:     'REJECTED',
      correction: 'CORRECTION_REQUIRED',
    };

    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        state: stateMap[actionType],
        correctionNote: actionType === 'correction' ? correctionNote : '',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Team ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'sent for correction'}.`);
      setSelectedTeam(null);
      setActionType(null);
      setCorrectionNote('');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update team status.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = teams.filter(t =>
    (statusFilter === 'ALL' || t.state === statusFilter) &&
    (search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.schoolName ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = teams.filter(t => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.state)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="School & Team Approvals"
        subtitle={`${pendingCount} teams pending review`}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Submitted',       count: teams.filter(t => t.state === 'SUBMITTED').length,           color: 'text-blue-400'   },
          { label: 'Under Review',    count: teams.filter(t => t.state === 'UNDER_REVIEW').length,         color: 'text-yellow-400' },
          { label: 'Correction Req.', count: teams.filter(t => t.state === 'CORRECTION_REQUIRED').length,  color: 'text-red-400'    },
          { label: 'Approved',        count: teams.filter(t => t.state === 'APPROVED').length,             color: 'text-green-400'  },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <div className={`text-3xl font-black ${s.color} mb-1`}>{s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Search team or school…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Team list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <School className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No teams found</p>
          <p className="text-gray-600 text-sm mt-1">Try a different filter or wait for school coordinators to register teams.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white">{t.name}</span>
                    <CategoryBadge code={t.category} />
                    <StatusBadge status={t.state} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.schoolName} {t.schoolCode ? `(${t.schoolCode})` : ''} · {t.members} members
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" icon={Eye} onClick={() => setSelectedTeam(t)}>Review</Button>
                  {['SUBMITTED', 'UNDER_REVIEW'].includes(t.state) && (
                    <>
                      <Button size="sm" icon={CheckCircle2}
                        onClick={() => { setSelectedTeam(t); setActionType('approve'); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" icon={AlertCircle}
                        onClick={() => { setSelectedTeam(t); setActionType('correction'); }}>
                        Correction
                      </Button>
                      <Button size="sm" variant="danger" icon={XCircle}
                        onClick={() => { setSelectedTeam(t); setActionType('reject'); }}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action / detail modal */}
      {selectedTeam && (
        <Modal
          open={!!selectedTeam}
          onClose={() => { setSelectedTeam(null); setActionType(null); }}
          title={actionType
            ? `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} — ${selectedTeam.name}`
            : `Team Details — ${selectedTeam.name}`
          }
          footer={actionType ? (
            <>
              <Button variant="secondary" onClick={() => { setSelectedTeam(null); setActionType(null); }} disabled={saving}>
                Cancel
              </Button>
              <Button
                icon={saving ? Loader2 : actionType === 'approve' ? CheckCircle2 : actionType === 'reject' ? XCircle : AlertCircle}
                variant={actionType === 'reject' ? 'danger' : 'primary'}
                onClick={applyAction}
                disabled={saving}
              >
                {saving ? 'Saving…' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
              </Button>
            </>
          ) : undefined}
        >
          <div className="space-y-3 text-sm text-gray-300">
            <p><span className="text-gray-500">Team:</span> {selectedTeam.name}</p>
            <p><span className="text-gray-500">School:</span> {selectedTeam.schoolName}</p>
            <p><span className="text-gray-500">Category:</span> {selectedTeam.category}</p>
            <p><span className="text-gray-500">Members:</span> {selectedTeam.members}</p>
            <p><span className="text-gray-500">Status:</span> <StatusBadge status={selectedTeam.state} /></p>
            <p><span className="text-gray-500">Fee:</span> {selectedTeam.feeStatus}</p>

            {actionType === 'correction' && (
              <div className="pt-2">
                <Textarea
                  label="Correction Note"
                  id="correction-note"
                  placeholder="Describe what needs to be corrected…"
                  value={correctionNote}
                  onChange={e => setCorrectionNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
