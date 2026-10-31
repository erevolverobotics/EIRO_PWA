'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge } from '@/components/ui';
import {
  CheckCircle2, CreditCard, RefreshCw, XCircle,
  ChevronDown, ChevronUp, Users, ArrowUpDown,
} from 'lucide-react';
import type { CategoryCode, RegistrationState } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  grade: string;
  section?: string;
}

interface Registration {
  id: string;
  teamId: string;
  schoolId: string;
  seasonId: string;
  categoryCode: CategoryCode;
  state: RegistrationState;
  feeStatus: string;
  feeAmountPerHeadMinorUnits?: number;
  feeTotalMinorUnits?: number;
  eligibilitySnapshot?: { memberCount?: number };
}

interface Team { id: string; teamName?: string; displayTeamCode?: string; categoryCode?: CategoryCode; }
interface School { id: string; name?: string; schoolCode?: string; }
interface CategoryFee { feeAmount?: number; hasFee?: boolean; }

interface FeeRow {
  registration: Registration;
  teamName: string;
  teamCode: string;
  schoolName: string;
  schoolCode: string;
  schoolId: string;
  memberCount: number;
  members: Member[];
  feePerHeadMinorUnits: number;
  totalMinorUnits: number;
}

type SortKey = 'school' | 'category' | 'amount' | 'status';

const money = (n: number) =>
  `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const payableStates = new Set(['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED']);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [rows, setRows]                   = useState<FeeRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [savingId, setSavingId]           = useState('');
  const [error, setError]                 = useState('');

  // Filters
  const [search, setSearch]               = useState('');
  const [showPaid, setShowPaid]           = useState(false);
  const [schoolFilter, setSchoolFilter]   = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortKey, setSortKey]             = useState<SortKey>('school');
  const [sortAsc, setSortAsc]             = useState(true);

  // Expanded member rows
  const [expanded, setExpanded]           = useState<Set<string>>(new Set());

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [registrationSnap, teamSnap, studentSnap, schoolSnap, categorySnap] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'schools')),
        getDoc(doc(db, 'config', 'categories')),
      ]);

      const teams = new Map<string, Team>();
      teamSnap.docs.forEach(d => teams.set(d.id, { id: d.id, ...d.data() } as Team));

      const schools = new Map<string, School>();
      schoolSnap.docs.forEach(d => schools.set(d.id, { id: d.id, ...d.data() } as School));

      // Per-team member list + count
      const membersByTeam = new Map<string, Member[]>();
      studentSnap.docs.forEach(d => {
        const s = d.data();
        const teamId = s.teamId as string | undefined;
        if (!teamId) return;
        const list = membersByTeam.get(teamId) ?? [];
        list.push({
          id: d.id,
          name: (s.name ?? s.studentName ?? s.fullName ?? '—') as string,
          grade: (s.grade ?? s.class ?? '') as string,
          section: (s.section ?? '') as string,
        });
        membersByTeam.set(teamId, list);
      });

      const categoryConfig = categorySnap.exists() ? categorySnap.data() : {};

      const feeRows = registrationSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as Registration)
        .filter(r =>
          payableStates.has(r.state) &&
          ['PENDING', 'PARTIAL', 'VERIFIED', 'WAIVED'].includes(r.feeStatus)
        )
        .map(r => {
          const team   = teams.get(r.teamId);
          const school = schools.get(r.schoolId);
          const members = membersByTeam.get(r.teamId) ?? [];
          const snapCount = r.eligibilitySnapshot?.memberCount;
          const memberCount =
            Number.isSafeInteger(snapCount) && (snapCount ?? 0) > 0
              ? snapCount!
              : members.length;

          const configured = categoryConfig[r.categoryCode] as CategoryFee | undefined;
          const configFeePerHead =
            typeof configured?.feeAmount === 'number' && configured.hasFee === true
              ? Math.round(configured.feeAmount * 100)
              : 0;
          const storedPerHead = r.feeAmountPerHeadMinorUnits;
          const feePerHead =
            typeof storedPerHead === 'number' && Number.isSafeInteger(storedPerHead) && storedPerHead > 0
              ? storedPerHead
              : configFeePerHead;
          const storedTotal = r.feeTotalMinorUnits;
          const total =
            typeof storedTotal === 'number' && Number.isSafeInteger(storedTotal) && storedTotal > 0
              ? storedTotal
              : feePerHead * memberCount;

          return {
            registration: r,
            teamName: team?.teamName ?? r.teamId,
            teamCode: team?.displayTeamCode ?? '',
            schoolName: school?.name ?? r.schoolId,
            schoolCode: school?.schoolCode ?? '',
            schoolId: r.schoolId,
            memberCount,
            members,
            feePerHeadMinorUnits: feePerHead,
            totalMinorUnits: total,
          } satisfies FeeRow;
        })
        .filter(row => row.feePerHeadMinorUnits > 0 && row.totalMinorUnits > 0);

      setRows(feeRows);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Fee records could not be loaded. Check administrator authorisation and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // ── Action ──────────────────────────────────────────────────────────────────

  const togglePaid = async (row: FeeRow, paid: boolean) => {
    setSavingId(row.registration.id);
    try {
      await callEiroFunction<{ registrationId: string; paid: boolean }, { registrationId: string; feeStatus: string }>(
        'setRegistrationPaymentStatus',
        { registrationId: row.registration.id, paid }
      );
      toast.success(paid ? 'Fee marked as paid ✅' : 'Fee marked as unpaid.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update fee status.');
    } finally {
      setSavingId('');
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Unique schools + categories for filter dropdowns
  const uniqueSchools = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => map.set(r.schoolId, r.schoolName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const uniqueCategories = useMemo(() =>
    [...new Set(rows.map(r => r.registration.categoryCode))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows.filter(row => {
      const isPaid = ['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus);
      if (isPaid !== showPaid) return false;
      if (schoolFilter !== 'ALL' && row.schoolId !== schoolFilter) return false;
      if (categoryFilter !== 'ALL' && row.registration.categoryCode !== categoryFilter) return false;
      if (term) {
        return (
          row.teamName.toLowerCase().includes(term) ||
          row.schoolName.toLowerCase().includes(term) ||
          row.schoolCode.toLowerCase().includes(term) ||
          row.teamCode.toLowerCase().includes(term) ||
          row.members.some(m => m.name.toLowerCase().includes(term))
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'school':   cmp = a.schoolName.localeCompare(b.schoolName); break;
        case 'category': cmp = a.registration.categoryCode.localeCompare(b.registration.categoryCode); break;
        case 'amount':   cmp = a.totalMinorUnits - b.totalMinorUnits; break;
        case 'status':   cmp = a.registration.feeStatus.localeCompare(b.registration.feeStatus); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [rows, search, showPaid, schoolFilter, categoryFilter, sortKey, sortAsc]);

  const unpaidCount = rows.filter(r => !['VERIFIED', 'WAIVED'].includes(r.registration.feeStatus)).length;
  const paidCount   = rows.length - unpaidCount;
  const unpaidTotal = rows
    .filter(r => !['VERIFIED', 'WAIVED'].includes(r.registration.feeStatus))
    .reduce((sum, r) => sum + r.totalMinorUnits, 0);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => cycleSort(k)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        sortKey === k ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
      {sortKey === k && <span className="text-[10px]">{sortAsc ? '↑' : '↓'}</span>}
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Verification"
        subtitle="Verify team registration fees. Click a card to see member details."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <div className="text-2xl font-black text-amber-400 mb-1">{loading ? '—' : unpaidCount}</div>
          <div className="text-xs text-gray-500">Pending payment</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-black text-green-400 mb-1">{loading ? '—' : paidCount}</div>
          <div className="text-xs text-gray-500">Paid</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-lg font-black text-indigo-400 mb-1">{loading ? '—' : money(unpaidTotal)}</div>
          <div className="text-xs text-gray-500">Outstanding</div>
        </Card>
      </div>

      {/* Filters row */}
      <div className="space-y-3">
        {/* Search + paid/unpaid toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            aria-label="Search"
            placeholder="Search team, school, student name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <div className="flex gap-2">
            <Button variant={!showPaid ? 'primary' : 'secondary'} onClick={() => setShowPaid(false)}>
              Unpaid ({unpaidCount})
            </Button>
            <Button variant={showPaid ? 'primary' : 'secondary'} onClick={() => setShowPaid(true)}>
              Paid ({paidCount})
            </Button>
          </div>
        </div>

        {/* School + Category dropdowns + Sort buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* School filter */}
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">All Schools</option>
            {uniqueSchools.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">All Categories</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>

          <div className="flex gap-2 flex-wrap ml-auto">
            <span className="text-xs text-gray-600 self-center">Sort:</span>
            <SortBtn k="school"   label="School"   />
            <SortBtn k="category" label="Category" />
            <SortBtn k="amount"   label="Amount"   />
            <SortBtn k="status"   label="Status"   />
          </div>
        </div>
      </div>

      {/* List */}
      {error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400 py-12">Loading registration fees…</Card>
      ) : filteredRows.length === 0 ? (
        <Card className="text-center py-12">
          <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-300">No {showPaid ? 'paid' : 'unpaid'} registrations found</p>
          <p className="text-xs text-gray-500 mt-1">Try adjusting the school or category filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRows.map(row => {
            const isPaid    = ['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus);
            const isExpanded = expanded.has(row.registration.id);
            const isSaving  = savingId === row.registration.id;

            return (
              <Card key={row.registration.id}>
                {/* Main row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Team name + badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">{row.teamName}</h2>
                      {row.teamCode && (
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                          {row.teamCode}
                        </span>
                      )}
                      <CategoryBadge code={row.registration.categoryCode} />
                      <StatusBadge status={isPaid ? 'VERIFIED' : row.registration.feeStatus} />
                    </div>

                    {/* School + member count */}
                    <p className="text-xs text-gray-400">
                      {row.schoolName}{row.schoolCode ? ` (${row.schoolCode})` : ''}
                      {' · '}
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {row.memberCount} student{row.memberCount !== 1 ? 's' : ''}
                      </span>
                    </p>

                    {/* Member names inline (collapsed) */}
                    {!isExpanded && row.members.length > 0 && (
                      <p className="text-xs text-gray-600 truncate max-w-sm">
                        {row.members.map(m => m.name).join(', ')}
                      </p>
                    )}

                    {/* Fee breakdown */}
                    <p className="text-sm text-gray-300">
                      {money(row.feePerHeadMinorUnits)} × {row.memberCount} ={' '}
                      <strong className="text-white text-base">{money(row.totalMinorUnits)}</strong>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap shrink-0">
                    {row.members.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={isExpanded ? ChevronUp : ChevronDown}
                        onClick={() => toggleExpand(row.registration.id)}
                      >
                        {isExpanded ? 'Hide' : 'Students'}
                      </Button>
                    )}
                    <Button
                      variant={isPaid ? 'secondary' : 'primary'}
                      icon={isPaid ? XCircle : CheckCircle2}
                      disabled={Boolean(savingId)}
                      onClick={() => void togglePaid(row, !isPaid)}
                    >
                      {isSaving ? 'Saving…' : isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </Button>
                  </div>
                </div>

                {/* Expanded member list */}
                {isExpanded && row.members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                      Team Members ({row.members.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {row.members.map((m, i) => (
                        <div key={m.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{m.name}</p>
                            <p className="text-gray-500 text-xs">
                              Grade {m.grade}{m.section ? ` — Section ${m.section}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
