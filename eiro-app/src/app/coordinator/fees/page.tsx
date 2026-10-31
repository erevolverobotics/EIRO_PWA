'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CreditCard, Info, RefreshCw } from 'lucide-react';
import { PageHeader, Card, StatusBadge, CategoryBadge, Button } from '@/components/ui';
import { collection, db, doc, getDoc, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { CategoryCode, RegistrationState } from '@/lib/types';

interface Registration {
  id: string;
  teamId: string;
  schoolId: string;
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
}

interface CategoryFee {
  feeAmount?: number;
  hasFee?: boolean;
}

const money = (minorUnits: number) =>
  `₹${(minorUnits / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function FeesPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberCounts, setMemberCounts] = useState<Map<string, number>>(new Map());
  const [categoryFees, setCategoryFees] = useState<Record<string, CategoryFee>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [registrationSnap, teamSnap, studentSnap, categorySnap] = await Promise.all([
        getDocs(query(collection(db, 'registrations'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
        getDoc(doc(db, 'config', 'categories')),
      ]);
      const counts = new Map<string, number>();
      studentSnap.docs.forEach(snapshot => {
        const teamId = snapshot.data().teamId;
        if (typeof teamId === 'string') counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
      });
      setRegistrations(registrationSnap.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data(),
      }) as Registration));
      setTeams(teamSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }) as Team));
      setMemberCounts(counts);
      setCategoryFees(categorySnap.exists() ? categorySnap.data() as Record<string, CategoryFee> : {});
      setError('');
    } catch (loadError) {
      console.error(loadError);
      setError('Registration fee information could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const feeRows = registrations
    .filter(registration =>
      registration.feeStatus !== 'NOT_REQUIRED' &&
      ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED'].includes(registration.state)
    )
    .map(registration => {
      const snapshotCount = registration.eligibilitySnapshot?.memberCount;
      const memberCount = Number.isSafeInteger(snapshotCount) && (snapshotCount ?? 0) > 0
        ? snapshotCount!
        : memberCounts.get(registration.teamId) ?? 0;
      const configured = categoryFees[registration.categoryCode];
      const feePerHead = registration.feeAmountPerHeadMinorUnits ??
        (configured?.hasFee && typeof configured.feeAmount === 'number'
          ? Math.round(configured.feeAmount * 100)
          : 0);
      const total = registration.feeTotalMinorUnits ?? feePerHead * memberCount;
      return { registration, memberCount, feePerHead, total };
    })
    .filter(row => row.memberCount > 0 && row.feePerHead > 0 && row.total > 0);
  const outstandingTotal = feeRows
    .filter(row => !['VERIFIED', 'WAIVED'].includes(row.registration.feeStatus))
    .reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <PageHeader
        title="Registration Fee Status"
        subtitle="View per-student registration fees and payment status"
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-white">School scope not assigned</p>
            <p className="text-sm text-gray-400 mt-1">Fee records appear after an administrator assigns this coordinator to a school.</p>
          </div>
        </Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading registration fees…</Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">Outstanding registration fees</h2>
            </div>
            <p className="text-3xl font-black text-white">{money(outstandingTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">Per-student fee multiplied by each team&apos;s registered student count.</p>
          </Card>

          {feeRows.length === 0 ? (
            <Card className="text-center py-12">
              <p className="font-medium text-gray-300">No registration fees found</p>
              <p className="text-sm text-gray-500 mt-2">Fees appear here after team registration is submitted.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {feeRows.map(({ registration, memberCount, feePerHead, total }) => {
                const paid = ['VERIFIED', 'WAIVED'].includes(registration.feeStatus);
                const team = teamById.get(registration.teamId);
                return (
                  <Card key={registration.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{team?.teamName || 'Team registration'}</h3>
                        <CategoryBadge code={registration.categoryCode} />
                        <p className="text-xs text-gray-500 mt-2">{memberCount} student{memberCount === 1 ? '' : 's'} · {money(feePerHead)} per student</p>
                        <p className="text-sm font-bold text-white mt-1">Total: {money(total)}</p>
                      </div>
                      <StatusBadge status={paid ? 'PAID' : 'UNPAID'} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="flex items-start gap-3 border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">
              Contact the event administrator to confirm payment. Only an authorized administrator can mark a registration fee paid.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
