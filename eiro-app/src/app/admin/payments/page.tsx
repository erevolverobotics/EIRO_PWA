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

interface Team {
  id: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
}

interface School {
  id: string;
  name?: string;
  schoolCode?: string;
}

interface CategoryFee {
  feeAmount?: number;
  hasFee?: boolean;
}

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

const payableStates = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'APPROVED',
]);

// ─── Animated Background ──────────────────────────────────────────────────────

const ADMIN_PARTICLES = [
  'particle-one',
  'particle-two',
  'particle-three',
  'particle-four',
  'particle-five',
  'particle-six',
];

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('school');
  const [sortAsc, setSortAsc] = useState(true);

  // Expanded member rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        registrationSnap,
        teamSnap,
        studentSnap,
        schoolSnap,
        categorySnap,
      ] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'schools')),
        getDoc(doc(db, 'config', 'categories')),
      ]);

      const teams = new Map<string, Team>();

      teamSnap.docs.forEach((d) => {
        teams.set(d.id, { id: d.id, ...d.data() } as Team);
      });

      const schools = new Map<string, School>();

      schoolSnap.docs.forEach((d) => {
        schools.set(d.id, { id: d.id, ...d.data() } as School);
      });

      // Per-team member list + count
      const membersByTeam = new Map<string, Member[]>();

      studentSnap.docs.forEach((d) => {
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

      const categoryConfig = categorySnap.exists()
        ? categorySnap.data()
        : {};

      const feeRows = registrationSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Registration)
        .filter((r) =>
          payableStates.has(r.state) &&
          ['PENDING', 'PARTIAL', 'VERIFIED', 'WAIVED'].includes(r.feeStatus)
        )
        .map((r) => {
          const team = teams.get(r.teamId);
          const school = schools.get(r.schoolId);
          const members = membersByTeam.get(r.teamId) ?? [];

          const snapCount = r.eligibilitySnapshot?.memberCount;

          const memberCount =
            Number.isSafeInteger(snapCount) && (snapCount ?? 0) > 0
              ? snapCount!
              : members.length;

          const configured = categoryConfig[r.categoryCode] as
            | CategoryFee
            | undefined;

          const configFeePerHead =
            typeof configured?.feeAmount === 'number' &&
            configured.hasFee === true
              ? Math.round(configured.feeAmount * 100)
              : 0;

          const storedPerHead = r.feeAmountPerHeadMinorUnits;

          const feePerHead =
            typeof storedPerHead === 'number' &&
            Number.isSafeInteger(storedPerHead) &&
            storedPerHead > 0
              ? storedPerHead
              : configFeePerHead;

          const storedTotal = r.feeTotalMinorUnits;

          const total =
            typeof storedTotal === 'number' &&
            Number.isSafeInteger(storedTotal) &&
            storedTotal > 0
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
        .filter(
          (row) =>
            row.feePerHeadMinorUnits > 0 &&
            row.totalMinorUnits > 0
        );

      setRows(feeRows);
      setError('');
    } catch (e) {
      console.error(e);

      setError(
        'Fee records could not be loaded. Check administrator authorisation and Firestore permissions, then retry.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(t);
  }, [load]);

  // ── Action ──────────────────────────────────────────────────────────────────

  const togglePaid = async (row: FeeRow, paid: boolean) => {
    setSavingId(row.registration.id);

    try {
      await callEiroFunction<
        { registrationId: string; paid: boolean },
        { registrationId: string; feeStatus: string }
      >(
        'setRegistrationPaymentStatus',
        {
          registrationId: row.registration.id,
          paid,
        }
      );

      toast.success(
        paid ? 'Fee marked as paid ✅' : 'Fee marked as unpaid.'
      );

      await load();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Could not update fee status.'
      );
    } finally {
      setSavingId('');
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const uniqueSchools = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((r) => map.set(r.schoolId, r.schoolName));

    return [...map.entries()].sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [rows]);

  const uniqueCategories = useMemo(
    () =>
      [...new Set(rows.map((r) => r.registration.categoryCode))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = rows.filter((row) => {
      const isPaid = ['VERIFIED', 'WAIVED'].includes(
        row.registration.feeStatus
      );

      if (isPaid !== showPaid) return false;

      if (
        schoolFilter !== 'ALL' &&
        row.schoolId !== schoolFilter
      ) {
        return false;
      }

      if (
        categoryFilter !== 'ALL' &&
        row.registration.categoryCode !== categoryFilter
      ) {
        return false;
      }

      if (term) {
        return (
          row.teamName.toLowerCase().includes(term) ||
          row.schoolName.toLowerCase().includes(term) ||
          row.schoolCode.toLowerCase().includes(term) ||
          row.teamCode.toLowerCase().includes(term) ||
          row.members.some((m) =>
            m.name.toLowerCase().includes(term)
          )
        );
      }

      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case 'school':
          cmp = a.schoolName.localeCompare(b.schoolName);
          break;

        case 'category':
          cmp = a.registration.categoryCode.localeCompare(
            b.registration.categoryCode
          );
          break;

        case 'amount':
          cmp = a.totalMinorUnits - b.totalMinorUnits;
          break;

        case 'status':
          cmp = a.registration.feeStatus.localeCompare(
            b.registration.feeStatus
          );
          break;
      }

      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [
    rows,
    search,
    showPaid,
    schoolFilter,
    categoryFilter,
    sortKey,
    sortAsc,
  ]);

  const unpaidCount = rows.filter(
    (r) =>
      !['VERIFIED', 'WAIVED'].includes(r.registration.feeStatus)
  ).length;

  const paidCount = rows.length - unpaidCount;

  const unpaidTotal = rows
    .filter(
      (r) =>
        !['VERIFIED', 'WAIVED'].includes(r.registration.feeStatus)
    )
    .reduce((sum, r) => sum + r.totalMinorUnits, 0);

  const SortBtn = ({
    k,
    label,
  }: {
    k: SortKey;
    label: string;
  }) => (
    <button
      onClick={() => cycleSort(k)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        sortKey === k
          ? 'bg-indigo-600 text-white'
          : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
      {sortKey === k && (
        <span className="text-[10px]">
          {sortAsc ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="payments-page relative isolate min-h-screen w-full overflow-hidden">

      {/* ANIMATED BACKGROUND */}

      <div
        className="payments-ambient fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="payments-orb payments-orb-one" />
        <div className="payments-orb payments-orb-two" />
        <div className="payments-orb payments-orb-three" />
        <div className="payments-orb payments-orb-four" />

        <div className="payments-dot-grid absolute inset-0" />

        <div className="payments-ring payments-ring-one" />
        <div className="payments-ring payments-ring-two" />

        {ADMIN_PARTICLES.map((particle) => (
          <div
            key={particle}
            className={`payments-particle ${particle}`}
          />
        ))}

        <div className="payments-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`payments-bubble ${bubble.tone}`}
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

        <div className="payments-center-glow" />
      </div>

      {/* PAGE CONTENT */}

      <main className="payments-content relative z-10 w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <PageHeader
          title="Payment Verification"
          subtitle="Verify team registration fees. Click a card to see member details."
          actions={
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />

        {/* KPIs */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Card className="payment-transparent-card text-center py-4">
            <div className="text-2xl font-black text-amber-400 mb-1">
              {loading ? '—' : unpaidCount}
            </div>
            <div className="text-xs text-gray-400">
              Pending payment
            </div>
          </Card>

          <Card className="payment-transparent-card text-center py-4">
            <div className="text-2xl font-black text-green-400 mb-1">
              {loading ? '—' : paidCount}
            </div>
            <div className="text-xs text-gray-400">
              Paid
            </div>
          </Card>

          <Card className="payment-transparent-card text-center py-4">
            <div className="text-lg font-black text-indigo-400 mb-1">
              {loading ? '—' : money(unpaidTotal)}
            </div>
            <div className="text-xs text-gray-400">
              Outstanding
            </div>
          </Card>

        </div>

        {/* FILTERS */}

        <div className="space-y-3">

          <div className="flex flex-col sm:flex-row gap-3">

            <input
              type="search"
              aria-label="Search"
              placeholder="Search team, school, student name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="payment-control flex-1 border rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />

            <div className="flex gap-2">
              <Button
                variant={!showPaid ? 'primary' : 'secondary'}
                onClick={() => setShowPaid(false)}
              >
                Unpaid ({unpaidCount})
              </Button>

              <Button
                variant={showPaid ? 'primary' : 'secondary'}
                onClick={() => setShowPaid(true)}
              >
                Paid ({paidCount})
              </Button>
            </div>

          </div>

          {/* SCHOOL, CATEGORY AND SORT */}

          <div className="flex flex-wrap gap-3 items-center">

            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="payment-control border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">All Schools</option>

              {uniqueSchools.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="payment-control border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">All Categories</option>

              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>

            <div className="flex gap-2 flex-wrap ml-auto items-center">
              <span className="text-xs text-gray-400">
                Sort:
              </span>

              <SortBtn k="school" label="School" />
              <SortBtn k="category" label="Category" />
              <SortBtn k="amount" label="Amount" />
              <SortBtn k="status" label="Status" />
            </div>

          </div>
        </div>

        {/* PAYMENT LIST */}

        {error ? (
          <div role="alert">
            <Card className="payment-transparent-card text-sm text-red-300">
              {error}
            </Card>
          </div>
        ) : loading ? (
          <Card className="payment-transparent-card text-center text-gray-300 py-12">
            Loading registration fees…
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card className="payment-transparent-card text-center py-12">
            <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />

            <p className="font-medium text-gray-200">
              No {showPaid ? 'paid' : 'unpaid'} registrations found
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Try adjusting the school or category filter.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">

            {filteredRows.map((row) => {
              const isPaid = ['VERIFIED', 'WAIVED'].includes(
                row.registration.feeStatus
              );

              const isExpanded = expanded.has(
                row.registration.id
              );

              const isSaving = savingId === row.registration.id;

              return (
                <Card
                  key={row.registration.id}
                  className="payment-transparent-card"
                >

                  {/* MAIN ROW */}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                    <div className="flex-1 min-w-0 space-y-1.5">

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="font-semibold text-white">
                          {row.teamName}
                        </h2>

                        {row.teamCode && (
                          <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                            {row.teamCode}
                          </span>
                        )}

                        <CategoryBadge
                          code={row.registration.categoryCode}
                        />

                        <StatusBadge
                          status={
                            isPaid
                              ? 'VERIFIED'
                              : row.registration.feeStatus
                          }
                        />

                      </div>

                      <p className="text-xs text-gray-300">
                        {row.schoolName}
                        {row.schoolCode
                          ? ` (${row.schoolCode})`
                          : ''}
                        {' · '}

                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />

                          {row.memberCount} student
                          {row.memberCount !== 1 ? 's' : ''}
                        </span>
                      </p>

                      {!isExpanded && row.members.length > 0 && (
                        <p className="text-xs text-gray-400 truncate max-w-sm">
                          {row.members.map((m) => m.name).join(', ')}
                        </p>
                      )}

                      <p className="text-sm text-gray-200">
                        {money(row.feePerHeadMinorUnits)} × {row.memberCount} ={' '}
                        <strong className="text-white text-base">
                          {money(row.totalMinorUnits)}
                        </strong>
                      </p>

                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="flex gap-2 flex-wrap shrink-0">

                      {row.members.length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={isExpanded ? ChevronUp : ChevronDown}
                          onClick={() =>
                            toggleExpand(row.registration.id)
                          }
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
                        {isSaving
                          ? 'Saving…'
                          : isPaid
                            ? 'Mark Unpaid'
                            : 'Mark Paid'}
                      </Button>

                    </div>
                  </div>

                  {/* EXPANDED MEMBER LIST */}

                  {isExpanded && row.members.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">

                      <p className="text-xs text-gray-300 font-semibold uppercase tracking-wider mb-2">
                        Team Members ({row.members.length})
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                        {row.members.map((m, i) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10"
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </div>

                            <div>
                              <p className="text-white text-sm font-medium">
                                {m.name}
                              </p>

                              <p className="text-gray-300 text-xs">
                                Grade {m.grade}
                                {m.section
                                  ? ` — Section ${m.section}`
                                  : ''}
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

      </main>

      {/* BACKGROUND STYLES */}

      <style jsx global>{`

        /* PAGE BASE */

        .payments-page {
          isolation: isolate;
          position: relative;
          min-height: 100vh;
          background: #050308;
        }

        .payments-content {
          position: relative;
          z-index: 10;
          background: transparent !important;
        }

        /* IMPORTANT:
           The background layer does not blur or cover the page.
           It only contains the animated decorations.
        */

        .payments-ambient {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* ORBS */

        .payments-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          opacity: 0.7;
        }

        .payments-orb-one {
          width: 440px;
          height: 440px;
          top: -180px;
          left: -150px;
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.43),
            rgba(216, 180, 254, 0.08) 70%,
            transparent
          );
          animation: paymentsOrbOne 18s ease-in-out infinite alternate;
        }

        .payments-orb-two {
          width: 520px;
          height: 520px;
          top: 8%;
          right: -220px;
          background: radial-gradient(
            circle,
            rgba(129, 140, 248, 0.28),
            rgba(196, 181, 253, 0.08) 65%,
            transparent
          );
          animation: paymentsOrbTwo 22s ease-in-out infinite alternate;
        }

        .payments-orb-three {
          width: 480px;
          height: 480px;
          bottom: -250px;
          left: 5%;
          background: radial-gradient(
            circle,
            rgba(244, 114, 182, 0.23),
            rgba(232, 121, 249, 0.05) 68%,
            transparent
          );
          animation: paymentsOrbThree 20s ease-in-out infinite alternate;
        }

        .payments-orb-four {
          width: 330px;
          height: 330px;
          right: 8%;
          bottom: 2%;
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.24),
            transparent 72%
          );
          animation: paymentsOrbFour 17s ease-in-out infinite alternate;
        }

        /* DOT GRID */

        .payments-dot-grid {
          background-image: radial-gradient(
            rgba(221, 143, 224, 0.10) 0.8px,
            transparent 0.8px
          );
          background-size: 27px 27px;
          opacity: 0.55;
          mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
          );
        }

        /* ROTATING RINGS */

        .payments-ring {
          position: absolute;
          border: 1px solid rgba(221, 143, 224, 0.12);
          border-radius: 50%;
          will-change: transform;
        }

        .payments-ring-one {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -130px;
          animation: paymentsRingOne 35s linear infinite;
        }

        .payments-ring-two {
          width: 340px;
          height: 340px;
          bottom: -120px;
          left: -100px;
          border-color: rgba(178, 75, 178, 0.14);
          animation: paymentsRingTwo 28s linear infinite;
        }

        /* PARTICLES */

        .payments-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 18px rgba(221, 143, 224, 0.42);
          animation: paymentsParticle 8s ease-in-out infinite alternate;
        }

        .particle-one {
          top: 18%;
          left: 13%;
          animation-delay: -1s;
        }

        .particle-two {
          top: 33%;
          right: 12%;
          animation-delay: -3s;
        }

        .particle-three {
          top: 63%;
          left: 8%;
          animation-delay: -5s;
        }

        .particle-four {
          bottom: 17%;
          right: 16%;
          animation-delay: -2s;
        }

        .particle-five {
          top: 12%;
          right: 35%;
          animation-delay: -6s;
        }

        .particle-six {
          bottom: 29%;
          right: 7%;
          animation-delay: -4s;
        }

        /* FLOATING BUBBLES */

        .payments-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .payments-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: paymentsBubbleFloat linear infinite;
        }

        .payments-bubble.violet {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(168, 85, 247, 0.2),
            transparent 72%
          );
        }

        .payments-bubble.rose {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(221, 143, 224, 0.16),
            transparent 72%
          );
        }

        /* CENTER GLOW */

        .payments-center-glow {
          position: absolute;
          width: min(750px, 100vw);
          height: 750px;
          left: 50%;
          top: 45%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse,
            rgba(126, 72, 160, 0.16) 0%,
            rgba(91, 52, 130, 0.09) 38%,
            transparent 72%
          );
        }

        /* TRANSPARENT CARDS
           No dark background fill and no backdrop blur.
           This is the key change that keeps the animation visible.
        */

        .payments-page .payment-transparent-card {
          background: rgba(5, 3, 8, 0.08) !important;
          background-color: rgba(5, 3, 8, 0.08) !important;
          border: 1px solid rgba(221, 143, 224, 0.18) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .payments-page .payment-transparent-card:hover {
          background: rgba(15, 8, 22, 0.14) !important;
          background-color: rgba(15, 8, 22, 0.14) !important;
          border-color: rgba(221, 143, 224, 0.28) !important;
        }

        /* FILTER CONTROLS */

        .payments-page .payment-control {
          background-color: rgba(255, 255, 255, 0.055) !important;
          border-color: rgba(255, 255, 255, 0.13) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .payments-page .payment-control option {
          background: #171020;
          color: #ffffff;
        }

        /* ANIMATIONS */

        @keyframes paymentsOrbOne {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(120px, 110px, 0) scale(1.12);
          }
        }

        @keyframes paymentsOrbTwo {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(-140px, 100px, 0) scale(0.92);
          }
        }

        @keyframes paymentsOrbThree {
          0% {
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          100% {
            transform: translate3d(130px, -100px, 0) scale(1.1);
          }
        }

        @keyframes paymentsOrbFour {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100px, -80px, 0);
          }
        }

        @keyframes paymentsRingOne {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1.08);
          }
        }

        @keyframes paymentsRingTwo {
          from {
            transform: rotate(360deg) scale(1);
          }
          to {
            transform: rotate(0deg) scale(1.1);
          }
        }

        @keyframes paymentsParticle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(18px, -30px, 0) scale(1.25);
            opacity: 0.65;
          }
        }

        @keyframes paymentsBubbleFloat {
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

        /* MOBILE */

        @media (max-width: 640px) {
          .payments-orb-one {
            width: 320px;
            height: 320px;
          }

          .payments-orb-two {
            width: 360px;
            height: 360px;
          }

          .payments-orb-three {
            width: 340px;
            height: 340px;
          }

          .payments-ring-one {
            width: 300px;
            height: 300px;
          }

          .payments-ring-two {
            width: 240px;
            height: 240px;
          }

          .payments-page .payment-transparent-card {
            background: rgba(5, 3, 8, 0.10) !important;
          }
        }

        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {
          .payments-orb,
          .payments-ring,
          .payments-particle,
          .payments-bubble {
            animation: none !important;
          }
        }

      `}</style>
    </div>
  );
}
