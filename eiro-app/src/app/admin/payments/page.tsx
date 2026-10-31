'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge } from '@/components/ui';
import { CheckCircle2, CreditCard, RefreshCw, XCircle } from 'lucide-react';
import type { CategoryCode, RegistrationState } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

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
  schoolName: string;
  schoolCode: string;
  memberCount: number;
  feePerHeadMinorUnits: number;
  totalMinorUnits: number;
}

const money = (minorUnits: number) =>
  `₹${(minorUnits / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const payableStates = new Set(['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED']);

export default function PaymentsPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRegistrationId, setSavingRegistrationId] = useState('');
  const [search, setSearch] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [error, setError] = useState('');

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
      teamSnap.docs.forEach(snapshot => teams.set(snapshot.id, { id: snapshot.id, ...snapshot.data() } as Team));
      const schools = new Map<string, School>();
      schoolSnap.docs.forEach(snapshot => schools.set(snapshot.id, { id: snapshot.id, ...snapshot.data() } as School));
      const memberCounts = new Map<string, number>();
      studentSnap.docs.forEach(snapshot => {
        const teamId = snapshot.data().teamId;
        if (typeof teamId === 'string') memberCounts.set(teamId, (memberCounts.get(teamId) ?? 0) + 1);
      });
      const categoryConfig = categorySnap.exists() ? categorySnap.data() : {};

      const feeRows = registrationSnap.docs
        .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }) as Registration)
        .filter(registration =>
          payableStates.has(registration.state) &&
          ['PENDING', 'PARTIAL', 'VERIFIED', 'WAIVED'].includes(registration.feeStatus)
        )
        .map(registration => {
          const team = teams.get(registration.teamId);
          const school = schools.get(registration.schoolId);
          const membersFromSnapshot = registration.eligibilitySnapshot?.memberCount;
          const memberCount = Number.isSafeInteger(membersFromSnapshot) && (membersFromSnapshot ?? 0) > 0
            ? membersFromSnapshot!
            : memberCounts.get(registration.teamId) ?? 0;
          const configured = categoryConfig[registration.categoryCode] as CategoryFee | undefined;
          const configFeePerHead = typeof configured?.feeAmount === 'number' && configured.hasFee === true
            ? Math.round(configured.feeAmount * 100)
            : 0;
          const storedFeePerHead = registration.feeAmountPerHeadMinorUnits;
          const feePerHeadMinorUnits = typeof storedFeePerHead === 'number' &&
            Number.isSafeInteger(storedFeePerHead) && storedFeePerHead > 0
            ? storedFeePerHead
            : configFeePerHead;
          const storedFeeTotal = registration.feeTotalMinorUnits;
          const totalMinorUnits = typeof storedFeeTotal === 'number' &&
            Number.isSafeInteger(storedFeeTotal) && storedFeeTotal > 0
            ? storedFeeTotal
            : feePerHeadMinorUnits * memberCount;
          return {
            registration,
            teamName: team?.teamName ?? registration.teamId,
            schoolName: school?.name ?? registration.schoolId,
            schoolCode: school?.schoolCode ?? '',
            memberCount,
            feePerHeadMinorUnits,
            totalMinorUnits,
          };
        })
        .filter(row => row.memberCount > 0 && row.feePerHeadMinorUnits > 0 && row.totalMinorUnits > 0);

      setRows(feeRows);
      setError('');
    } catch (loadError) {
      console.error(loadError);
      setError('Registration fee records could not be loaded. Check administrator authorization and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updatePaymentStatus = async (row: FeeRow, paid: boolean) => {
    setSavingRegistrationId(row.registration.id);
    try {
      await callEiroFunction<
        { registrationId: string; paid: boolean },
        { registrationId: string; feeStatus: string }
      >('setRegistrationPaymentStatus', { registrationId: row.registration.id, paid });
      toast.success(paid ? 'Registration fee marked paid.' : 'Registration fee marked unpaid.');
      await load();
    } catch (updateError) {
      console.error(updateError);
      toast.error(updateError instanceof Error ? updateError.message : 'Could not update registration fee status.');
    } finally {
      setSavingRegistrationId('');
    }
  };

  const filteredRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return rows.filter(row => {
      const isPaid = ['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus);
      if (isPaid !== showPaid) return false;
      if (!searchTerm) return true;
      return row.teamName.toLowerCase().includes(searchTerm) ||
        row.schoolName.toLowerCase().includes(searchTerm) ||
        row.schoolCode.toLowerCase().includes(searchTerm);
    });
  }, [rows, search, showPaid]);

  const unpaidCount = rows.filter(row => !['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus)).length;
  const paidCount = rows.length - unpaidCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registration Fee Status"
        subtitle="Mark team registration fees as paid or unpaid. Fee is calculated per student."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-amber-400 mb-1">{loading ? '—' : unpaidCount}</div>
          <div className="text-xs text-gray-500">Unpaid registrations</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-green-400 mb-1">{loading ? '—' : paidCount}</div>
          <div className="text-xs text-gray-500">Paid registrations</div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          aria-label="Search school or team"
          placeholder="Search school or team…"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <div className="flex gap-2">
          <Button variant={!showPaid ? 'primary' : 'secondary'} onClick={() => setShowPaid(false)}>Unpaid</Button>
          <Button variant={showPaid ? 'primary' : 'secondary'} onClick={() => setShowPaid(true)}>Paid</Button>
        </div>
      </div>

      {error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading registration fees…</Card>
      ) : filteredRows.length === 0 ? (
        <Card className="text-center py-12">
          <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-300">No {showPaid ? 'paid' : 'unpaid'} registration fees found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRows.map(row => {
            const isPaid = ['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus);
            return (
              <Card key={row.registration.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">{row.teamName}</h2>
                      <CategoryBadge code={row.registration.categoryCode} />
                      <StatusBadge status={isPaid ? 'PAID' : 'UNPAID'} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {row.schoolName}{row.schoolCode ? ` (${row.schoolCode})` : ''} · {row.memberCount} student{row.memberCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-sm text-gray-300">
                      {money(row.feePerHeadMinorUnits)} per student × {row.memberCount} = <strong className="text-white">{money(row.totalMinorUnits)}</strong>
                    </p>
                  </div>
                  <Button
                    variant={isPaid ? 'secondary' : 'primary'}
                    icon={isPaid ? XCircle : CheckCircle2}
                    loading={savingRegistrationId === row.registration.id}
                    disabled={Boolean(savingRegistrationId)}
                    onClick={() => void updatePaymentStatus(row, !isPaid)}
                  >
                    Mark {isPaid ? 'Unpaid' : 'Paid'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
