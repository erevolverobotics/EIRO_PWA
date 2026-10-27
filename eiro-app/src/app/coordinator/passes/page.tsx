'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, QrCode, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, StatusBadge, CategoryBadge } from '@/components/ui';
import { collection, db, getDocs, query, where } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { CategoryCode, RegistrationState } from '@/lib/types';

interface Team {
  id: string;
  schoolId: string;
  teamName?: string;
  displayTeamCode?: string;
  categoryCode?: CategoryCode;
}

interface Registration {
  id: string;
  schoolId: string;
  teamId: string;
  state: RegistrationState;
  seasonId?: string;
}

export default function TeamPassesPage() {
  const { roles } = useAuth();
  const schoolId = roles.find(role => role.role === 'SCHOOL_COORDINATOR' && role.active)?.scopeId;
  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || schoolId === 'unassigned') return;
    try {
      const [teamSnap, registrationSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'registrations'), where('schoolId', '==', schoolId))),
      ]);
      setError('');
      setTeams(teamSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) })));
      setRegistrations(registrationSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Registration, 'id'>) })));
    } catch (loadError) {
      console.error(loadError);
      setError('Approved registration information could not be loaded. Check your school assignment and Firestore permissions, then retry.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const approved = registrations.filter(registration => registration.state === 'APPROVED');
  const approvedTeams = approved.map(registration => ({ registration, team: teamById.get(registration.teamId) })).filter(item => item.team);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Team Passes" subtitle="Approved team registrations and pass availability" actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">Team passes require an approved event entry. The current Firestore rules do not grant school coordinators access to stage-entry records, so this page never fabricates a QR code or pass identifier.</p>
      </div>

      {!schoolId || schoolId === 'unassigned' ? (
        <Card className="text-center py-12"><p className="font-medium text-gray-300">School scope not assigned</p><p className="text-sm text-gray-500 mt-2">Approved team passes are available after an administrator assigns this account to a school.</p></Card>
      ) : error ? (
        <div role="alert"><Card className="text-sm text-red-300">{error}</Card></div>
      ) : loading ? (
        <Card className="text-center text-gray-400">Loading registrations…</Card>
      ) : approvedTeams.length === 0 ? (
        <Card className="text-center py-14">
          <QrCode className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-300">No approved team entries found</p>
          <p className="text-sm text-gray-500 mt-2">Team passes appear after the registration and event-entry approval process.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvedTeams.map(({ registration, team }) => (
            <Card key={registration.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">{team?.teamName || team?.displayTeamCode || 'Registered team'}</h2>
                  {team?.categoryCode && <CategoryBadge code={team.categoryCode} />}
                  <p className="text-xs font-mono text-gray-500 mt-2">{team?.displayTeamCode || team?.id}</p>
                </div>
                <StatusBadge status={registration.state} />
              </div>
              <p className="text-xs text-gray-500 mt-4">An event entry and approved pass have not been made available to this school scope.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
