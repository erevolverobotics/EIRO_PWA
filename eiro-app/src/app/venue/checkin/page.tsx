'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  PageHeader,
  Card,
  Button,
  Badge,
} from '@/components/ui';

import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  ClipboardCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

import type {
  AttendanceStatus,
  CategoryCode,
} from '@/lib/types';

import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';
import toast from 'react-hot-toast';

type Team = {
  id: string;
  displayTeamCode: string;
  teamName: string;
  schoolId: string;
  categoryCode: CategoryCode;
};

type Entry = {
  id: string;
  teamId: string;
  eventId: string;
  entryStatus: string;
  mergedIntoEntryId?: string;
};

type Membership = {
  id: string;
  teamId: string;
  studentId: string;
  status?: string;
};

type Attendance = {
  entryId: string;
  studentId: string;
  status: AttendanceStatus;
};

/* Animated Background */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];

function CheckInPageContent() {
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get('team') ?? '');
  const [teams, setTeams] = useState<Team[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);

  const [team, setTeam] = useState<Team | null>(null);
  const [entryId, setEntryId] = useState('');

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* Load Check-in Data */

  useEffect(() => {
    Promise.all([
      getAll<Team>('teams'),
      getAll<Entry>('stageEntries'),
      getAll<Membership>('teamMemberships'),
      getAll<Attendance & { id: string }>('studentAttendance'),
    ])
      .then(([teamRows, entryRows, memberRows, attendanceRows]) => {
        setTeams(teamRows);
        setEntries(entryRows);
        setMemberships(memberRows);
        setRecords(attendanceRows);
      })
      .catch(() =>
        setError(
          'Check-in data could not be loaded. Check your venue/check-in role.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedEntry = entries.find(
    entry => entry.id === entryId
  );

  const teamEntries = useMemo(
    () =>
      team
        ? entries.filter(
            item =>
              item.teamId === team.id &&
              !item.mergedIntoEntryId
          )
        : [],
    [team, entries]
  );

  const members = useMemo(
    () =>
      team
        ? memberships.filter(
            member =>
              member.teamId === team.id &&
              member.status !== 'INACTIVE'
          )
        : [],
    [team, memberships]
  );

  const presentCount = members.filter(
    member => attendance[member.studentId] === 'PRESENT'
  ).length;

  const absentCount = members.filter(
    member => attendance[member.studentId] === 'ABSENT'
  ).length;

  const markedCount = presentCount + absentCount;

  const progress = members.length
    ? (markedCount / members.length) * 100
    : 0;

  /* Search Team */

  const findTeam = () => {
    setError('');
    setAttendance({});

    const result = teams.find(
      item =>
        item.displayTeamCode.toLowerCase() ===
        query.trim().toLowerCase()
    );

    setTeam(result ?? null);

    const matchingEntries = result
      ? entries.filter(
          item =>
            item.teamId === result.id &&
            !item.mergedIntoEntryId
        )
      : [];

    const chosen =
      matchingEntries.length === 1
        ? matchingEntries[0]
        : undefined;

    setEntryId(chosen?.id ?? '');

    if (!result) {
      setError('No team matches this display code.');
      return;
    }

    if (matchingEntries.length === 0) {
      setError('No active event entry exists for this team.');
      return;
    }

    if (chosen) {
      const saved: Record<string, AttendanceStatus> = {};

      memberships
        .filter(
          member =>
            member.teamId === result.id &&
            member.status !== 'INACTIVE'
        )
        .forEach(member => {
          saved[member.studentId] = 'NOT_MARKED';
        });

      records
        .filter(record => record.entryId === chosen.id)
        .forEach(record => {
          saved[record.studentId] = record.status;
        });

      setAttendance(saved);
    }
  };

  /* Select Event Entry */

  const selectEntry = (id: string) => {
    setEntryId(id);

    const saved: Record<string, AttendanceStatus> = {};

    memberships
      .filter(
        member =>
          member.teamId === team?.id &&
          member.status !== 'INACTIVE'
      )
      .forEach(member => {
        saved[member.studentId] = 'NOT_MARKED';
      });

    records
      .filter(record => record.entryId === id)
      .forEach(record => {
        saved[record.studentId] = record.status;
      });

    setAttendance(saved);
  };

  /* Update Attendance */

  const markAttendance = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setAttendance(old => ({
      ...old,
      [studentId]: status,
    }));
  };

  /* Save Check-in */

  const save = async () => {
    if (!team || !selectedEntry || members.length === 0) return;

    if (
      members.some(
        member =>
          !['PRESENT', 'ABSENT'].includes(
            attendance[member.studentId]
          )
      )
    ) {
      toast.error('Mark every roster member present or absent.');
      return;
    }

    setSaving(true);

    try {
      await callEiroFunction<
        Record<string, unknown>,
        unknown
      >('checkInTeam', {
        entryId: selectedEntry.id,
        teamId: team.id,
        eventId: selectedEntry.eventId,
      });

      for (const member of members) {
        await callEiroFunction<
          Record<string, unknown>,
          unknown
        >('recordStudentAttendance', {
          entryId: selectedEntry.id,
          teamId: team.id,
          eventId: selectedEntry.eventId,
          studentId: member.studentId,
          status: attendance[member.studentId],
        });
      }

      toast.success('Check-in and attendance recorded.');

      setRecords(old => [
        ...old.filter(
          item => item.entryId !== selectedEntry.id
        ),
        ...members.map(member => ({
          entryId: selectedEntry.id,
          studentId: member.studentId,
          status: attendance[member.studentId],
        })),
      ]);
    } catch {
      toast.error(
        'The check-in or attendance call failed. Refresh to confirm persisted records.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checkin-page">

      {/* Animated Background */}

      <div className="checkin-ambient" aria-hidden="true">

        <div className="checkin-orb checkin-orb-one" />
        <div className="checkin-orb checkin-orb-two" />

        <div className="checkin-bubbles">
          {AMBIENT_BUBBLES.map((bubble, index) => (
            <span
              key={index}
              className={`checkin-bubble checkin-bubble-${bubble.tone}`}
              style={{
                left: bubble.left,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                animationDuration: `${bubble.duration}s`,
                animationDelay: `${bubble.delay}s`,
              }}
            />
          ))}
        </div>

      </div>

      {/* Main Content */}

      <main className="checkin-content">

        <div className="checkin-wrapper">

          {/* Page Header */}

          <PageHeader
            title="Team Check-in"
            subtitle="Manage team registration and record event-day attendance."
          />

          {/* Search Section */}

          <Card className="checkin-card checkin-search-card">

            <div className="checkin-section-heading">

              <div className="checkin-heading-icon">
                <QrCode size={19} />
              </div>

              <div>
                <h3>Find a Team</h3>
                <p>Enter the registered team display code.</p>
              </div>

            </div>

            <div className="checkin-search-row">

              <div className="checkin-input-wrapper">
                <Search size={17} />

                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event =>
                    event.key === 'Enter' && findTeam()
                  }
                  placeholder="e.g. EIRO-TEAM-001"
                  aria-label="Team display code"
                />
              </div>

              <Button
                icon={Search}
                onClick={findTeam}
                disabled={loading || !query.trim()}
              >
                Search Team
              </Button>

            </div>

            {loading && (
              <div className="checkin-loading">
                <span className="checkin-small-loader" />
                Loading team and attendance records...
              </div>
            )}

            {error && (
              <div className="checkin-error" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}

          </Card>

          {/* Selected Team */}

          {team && (

            <div className="checkin-team-section">

              {/* Team Information */}

              <Card className="checkin-card">

                <div className="checkin-section-heading">

                  <div className="checkin-heading-icon">
                    <Users size={19} />
                  </div>

                  <div>
                    <h3>Team Information</h3>
                    <p>Registered team details and event information.</p>
                  </div>

                  <div className="checkin-verified">
                    <CheckCircle2 size={15} />
                    Found
                  </div>

                </div>

                <div className="checkin-team-details">

                  <div className="checkin-team-primary">

                    <div>
                      <span className="checkin-field-label">
                        TEAM NAME
                      </span>

                      <h2>{team.teamName}</h2>
                    </div>

                    <div className="checkin-team-code">
                      <span>TEAM CODE</span>
                      <strong>{team.displayTeamCode}</strong>
                    </div>

                  </div>

                  <div className="checkin-info-grid">

                    <div className="checkin-info-item">
                      <Building2 size={17} />

                      <div>
                        <span>School ID</span>
                        <strong>{team.schoolId}</strong>
                      </div>
                    </div>

                    <div className="checkin-info-item">
                      <ClipboardCheck size={17} />

                      <div>
                        <span>Category</span>
                        <strong>{team.categoryCode}</strong>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Event Entry Selection */}

                {teamEntries.length > 1 && (

                  <div className="checkin-event-select">

                    <label htmlFor="event-entry">
                      Select Event Entry
                    </label>

                    <select
                      id="event-entry"
                      value={entryId}
                      onChange={event =>
                        selectEntry(event.target.value)
                      }
                    >
                      <option value="">Select an event entry</option>

                      {teamEntries.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.eventId} · {item.entryStatus}
                        </option>
                      ))}

                    </select>

                  </div>

                )}

                {!selectedEntry && (

                  <div className="checkin-notice">
                    <AlertCircle size={17} />
                    Select an event entry to continue with attendance.
                  </div>

                )}

              </Card>

              {/* Attendance Section */}

              {selectedEntry && (

                <Card className="checkin-card checkin-attendance-card">

                  {/* Attendance Header */}

                  <div className="checkin-attendance-heading">

                    <div className="checkin-section-heading">

                      <div className="checkin-heading-icon">
                        <UserCheck size={19} />
                      </div>

                      <div>
                        <h3>Member Attendance</h3>
                        <p>Mark each registered member as present or absent.</p>
                      </div>

                    </div>

                    <span className="checkin-entry-status">
                      {selectedEntry.entryStatus}
                    </span>

                  </div>

                  {members.length === 0 ? (

                    <div className="checkin-empty">
                      <Users size={27} />
                      <h4>No Members Found</h4>
                      <p>
                        No active roster membership records were found for this team.
                      </p>
                    </div>

                  ) : (

                    <>

                      {/* Attendance Summary */}

                      <div className="checkin-summary">

                        <div className="checkin-summary-top">

                          <div>
                            <span className="checkin-field-label">
                              ATTENDANCE PROGRESS
                            </span>

                            <div className="checkin-summary-number">
                              {markedCount}
                              <span> / {members.length} members marked</span>
                            </div>
                          </div>

                          <div className="checkin-summary-percent">
                            {Math.round(progress)}%
                          </div>

                        </div>

                        <div className="checkin-progress-track">
                          <div
                            className="checkin-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="checkin-summary-stats">

                          <div>
                            <span className="checkin-dot present-dot" />
                            Present
                            <strong>{presentCount}</strong>
                          </div>

                          <div>
                            <span className="checkin-dot absent-dot" />
                            Absent
                            <strong>{absentCount}</strong>
                          </div>

                          <div>
                            <span className="checkin-dot pending-dot" />
                            Unmarked
                            <strong>{members.length - markedCount}</strong>
                          </div>

                        </div>

                      </div>

                      {/* Member List */}

                      <div className="checkin-roster-heading">
                        <div>
                          <h4>Team Roster</h4>
                          <p>
                            {members.length} registered members
                          </p>
                        </div>

                        <span className="checkin-roster-label">
                          ATTENDANCE STATUS
                        </span>
                      </div>

                      <div className="checkin-member-list">

                        {members.map((member, index) => {

                          const currentStatus =
                            attendance[member.studentId];

                          return (

                            <div
                              key={member.studentId}
                              className="checkin-member-row"
                            >

                              <div className="checkin-member-info">

                                <div className="checkin-member-avatar">
                                  {index + 1}
                                </div>

                                <div>
                                  <strong>
                                    {member.studentId}
                                  </strong>

                                  <span>
                                    Team Member {index + 1}
                                  </span>
                                </div>

                              </div>

                              <div className="checkin-status-controls">

                                <button
                                  type="button"
                                  aria-pressed={currentStatus === 'PRESENT'}
                                  onClick={() =>
                                    markAttendance(
                                      member.studentId,
                                      'PRESENT'
                                    )
                                  }
                                  className={`checkin-status-btn ${
                                    currentStatus === 'PRESENT'
                                      ? 'status-present-active'
                                      : ''
                                  }`}
                                >
                                  <CheckCircle2 size={14} />
                                  Present
                                </button>

                                <button
                                  type="button"
                                  aria-pressed={currentStatus === 'ABSENT'}
                                  onClick={() =>
                                    markAttendance(
                                      member.studentId,
                                      'ABSENT'
                                    )
                                  }
                                  className={`checkin-status-btn ${
                                    currentStatus === 'ABSENT'
                                      ? 'status-absent-active'
                                      : ''
                                  }`}
                                >
                                  <XCircle size={14} />
                                  Absent
                                </button>

                              </div>

                            </div>

                          );

                        })}

                      </div>

                      {/* Save Footer */}

                      <div className="checkin-save-section">

                        <div className="checkin-save-info">

                          {markedCount === members.length ? (
                            <>
                              <CheckCircle2 size={17} />
                              <span>All members have been marked.</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={17} />
                              <span>
                                {members.length - markedCount} members still need attendance.
                              </span>
                            </>
                          )}

                        </div>

                        <Button
                          icon={CheckCircle2}
                          onClick={() => void save()}
                          loading={saving}
                          disabled={
                            loading ||
                            saving ||
                            members.length === 0 ||
                            markedCount !== members.length
                          }
                        >
                          Save Check-in
                        </Button>

                      </div>

                    </>

                  )}

                  {/* QR Information */}

                  <div className="checkin-qr-note">
                    <QrCode size={16} />

                    <span>
                      QR camera scanning is unavailable. Use the printed team display code for manual check-in.
                    </span>
                  </div>

                </Card>

              )}

            </div>

          )}

        </div>

      </main>

      {/* Professional Styling */}

      <style jsx global>{`

        /* =========================
           MAIN PAGE
        ========================= */

        .checkin-page {
          position: relative;
          isolation: isolate;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: transparent !important;
          color: #f8fafc;
        }

        /* =========================
           ANIMATED BACKGROUND
        ========================= */

        .checkin-ambient {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background: transparent !important;
        }

        .checkin-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
        }

        .checkin-orb-one {
          top: -220px;
          left: -160px;
          background: #7c3aed;
        }

        .checkin-orb-two {
          top: 20%;
          right: -260px;
          background: #b24bb2;
        }

        .checkin-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .checkin-bubble {
          position: absolute;
          bottom: -90px;
          display: block;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation-name: checkin-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .checkin-bubble-violet {
          background: radial-gradient(
            circle at 35% 30%,
            rgba(192, 132, 252, 0.24),
            rgba(168, 85, 247, 0.08) 65%,
            transparent 100%
          );
          border: 1px solid rgba(192, 132, 252, 0.10);
        }

        .checkin-bubble-rose {
          background: radial-gradient(
            circle at 35% 30%,
            rgba(251, 182, 206, 0.22),
            rgba(221, 143, 224, 0.07) 65%,
            transparent 100%
          );
          border: 1px solid rgba(251, 182, 206, 0.10);
        }

        @keyframes checkin-float {
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

        /* =========================
           PAGE LAYOUT
        ========================= */

        .checkin-content {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 100vh;
          padding: 28px 30px 45px;
          background: transparent !important;
          box-shadow: none !important;
        }

        .checkin-wrapper {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .checkin-team-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* =========================
           PROFESSIONAL CARDS
        ========================= */

        .checkin-card {
          padding: 23px !important;
          background: rgba(17, 24, 39, 0.42) !important;
          border: 1px solid rgba(148, 163, 184, 0.16) !important;
          border-radius: 14px !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.08) !important;
          overflow: hidden;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .checkin-card:hover {
          border-color: rgba(168, 85, 247, 0.25) !important;
        }

        /* =========================
           SECTION HEADINGS
        ========================= */

        .checkin-section-heading {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .checkin-heading-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border: 1px solid rgba(167, 139, 250, 0.20);
          border-radius: 11px;
          background: rgba(139, 92, 246, 0.10);
          color: #c4b5fd;
        }

        .checkin-section-heading h3 {
          margin: 0;
          color: #f8fafc;
          font-size: 15px;
          font-weight: 650;
          letter-spacing: -0.2px;
        }

        .checkin-section-heading p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
        }

        /* =========================
           SEARCH
        ========================= */

        .checkin-search-card {
          padding: 23px !important;
        }

        .checkin-search-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
        }

        .checkin-input-wrapper {
          display: flex;
          align-items: center;
          gap: 11px;
          flex: 1;
          min-width: 0;
          height: 46px;
          padding: 0 14px;
          border: 1px solid rgba(148, 163, 184, 0.20);
          border-radius: 9px;
          background: rgba(15, 23, 42, 0.50);
          color: #94a3b8;
          transition: border-color 0.2s ease;
        }

        .checkin-input-wrapper:focus-within {
          border-color: rgba(167, 139, 250, 0.70);
        }

        .checkin-input-wrapper input {
          width: 100%;
          min-width: 0;
          height: 100%;
          outline: none;
          border: none;
          background: transparent;
          color: #f8fafc;
          font-size: 13px;
        }

        .checkin-input-wrapper input::placeholder {
          color: #64748b;
        }

        .checkin-search-row > button {
          min-height: 46px;
          border-radius: 9px;
          white-space: nowrap;
        }

        .checkin-loading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 14px;
          color: #94a3b8;
          font-size: 12px;
        }

        .checkin-small-loader {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(167, 139, 250, 0.20);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: checkin-spin 0.8s linear infinite;
        }

        @keyframes checkin-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .checkin-error {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 15px;
          padding: 12px 14px;
          border: 1px solid rgba(248, 113, 113, 0.18);
          border-radius: 9px;
          background: rgba(127, 29, 29, 0.12);
          color: #fca5a5;
          font-size: 12px;
        }

        /* =========================
           TEAM INFORMATION
        ========================= */

        .checkin-team-details {
          margin-top: 22px;
          padding: 19px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.27);
        }

        .checkin-team-primary {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .checkin-field-label {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 0.12em;
        }

        .checkin-team-primary h2 {
          margin: 8px 0 0;
          color: #f8fafc;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .checkin-team-code {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .checkin-team-code span {
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .checkin-team-code strong {
          color: #c4b5fd;
          font-family: monospace;
          font-size: 12px;
        }

        .checkin-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
          margin-top: 20px;
          padding-top: 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .checkin-info-item {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          color: #a78bfa;
        }

        .checkin-info-item > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .checkin-info-item span {
          color: #64748b;
          font-size: 10px;
        }

        .checkin-info-item strong {
          overflow-wrap: anywhere;
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 600;
        }

        .checkin-verified {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding: 6px 10px;
          border: 1px solid rgba(74, 222, 128, 0.17);
          border-radius: 7px;
          background: rgba(22, 163, 74, 0.09);
          color: #86efac;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
        }

        /* Event Selection */

        .checkin-event-select {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 20px;
        }

        .checkin-event-select label {
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 600;
        }

        .checkin-event-select select {
          width: 100%;
          min-height: 43px;
          padding: 0 12px;
          border: 1px solid rgba(148, 163, 184, 0.20);
          border-radius: 8px;
          outline: none;
          background: rgba(15, 23, 42, 0.75);
          color: #f8fafc;
          font-size: 12px;
        }

        .checkin-event-select select:focus {
          border-color: rgba(167, 139, 250, 0.65);
        }

        .checkin-event-select option {
          background: #111827;
          color: white;
        }

        .checkin-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 17px;
          padding: 12px 14px;
          border: 1px solid rgba(251, 191, 36, 0.18);
          border-radius: 9px;
          background: rgba(120, 80, 15, 0.10);
          color: #fcd34d;
          font-size: 12px;
        }

        /* =========================
           ATTENDANCE HEADING
        ========================= */

        .checkin-attendance-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .checkin-entry-status {
          padding: 7px 10px;
          border: 1px solid rgba(167, 139, 250, 0.20);
          border-radius: 7px;
          background: rgba(139, 92, 246, 0.09);
          color: #c4b5fd;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        /* =========================
           ATTENDANCE SUMMARY
        ========================= */

        .checkin-summary {
          margin-top: 23px;
          padding: 18px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.30);
        }

        .checkin-summary-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .checkin-summary-number {
          margin-top: 8px;
          color: #f8fafc;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .checkin-summary-number span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0;
        }

        .checkin-summary-percent {
          color: #c4b5fd;
          font-size: 24px;
          font-weight: 700;
        }

        .checkin-progress-track {
          width: 100%;
          height: 6px;
          margin-top: 17px;
          overflow: hidden;
          border-radius: 20px;
          background: rgba(148, 163, 184, 0.14);
        }

        .checkin-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #8b5cf6,
            #c084fc
          );
          transition: width 0.3s ease;
        }

        .checkin-summary-stats {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 22px;
          margin-top: 16px;
        }

        .checkin-summary-stats > div {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 11px;
        }

        .checkin-summary-stats strong {
          margin-left: 2px;
          color: #e2e8f0;
          font-size: 12px;
        }

        .checkin-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .present-dot {
          background: #4ade80;
        }

        .absent-dot {
          background: #f87171;
        }

        .pending-dot {
          background: #fbbf24;
        }

        /* =========================
           ROSTER
        ========================= */

        .checkin-roster-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin: 25px 0 12px;
        }

        .checkin-roster-heading h4 {
          margin: 0;
          color: #f8fafc;
          font-size: 13px;
          font-weight: 650;
        }

        .checkin-roster-heading p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .checkin-roster-label {
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .checkin-member-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkin-member-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 14px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 9px;
          background: rgba(15, 23, 42, 0.25);
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .checkin-member-row:hover {
          border-color: rgba(168, 85, 247, 0.23);
          background: rgba(139, 92, 246, 0.045);
        }

        .checkin-member-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .checkin-member-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border: 1px solid rgba(167, 139, 250, 0.17);
          border-radius: 9px;
          background: rgba(139, 92, 246, 0.09);
          color: #c4b5fd;
          font-size: 11px;
          font-weight: 700;
        }

        .checkin-member-info > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .checkin-member-info strong {
          overflow-wrap: anywhere;
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 600;
        }

        .checkin-member-info span {
          color: #64748b;
          font-size: 10px;
        }

        /* =========================
           STATUS BUTTONS
        ========================= */

        .checkin-status-controls {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .checkin-status-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 88px;
          padding: 8px 11px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.035);
          color: #94a3b8;
          font-size: 10px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .checkin-status-btn:hover {
          border-color: rgba(167, 139, 250, 0.35);
          color: #e9d5ff;
        }

        .status-present-active {
          border-color: rgba(74, 222, 128, 0.30);
          background: rgba(22, 163, 74, 0.12);
          color: #86efac;
        }

        .status-absent-active {
          border-color: rgba(248, 113, 113, 0.30);
          background: rgba(220, 38, 38, 0.12);
          color: #fca5a5;
        }

        /* =========================
           SAVE SECTION
        ========================= */

        .checkin-save-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .checkin-save-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 11px;
        }

        .checkin-save-info svg {
          flex-shrink: 0;
          color: #a78bfa;
        }

        .checkin-save-section > button {
          min-height: 42px;
          border-radius: 8px;
          white-space: nowrap;
        }

        /* =========================
           QR NOTE
        ========================= */

        .checkin-qr-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: #64748b;
          font-size: 10px;
          line-height: 1.6;
        }

        .checkin-qr-note svg {
          flex-shrink: 0;
          color: #a78bfa;
        }

        /* =========================
           EMPTY STATE
        ========================= */

        .checkin-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 170px;
          text-align: center;
          color: #94a3b8;
        }

        .checkin-empty > svg {
          margin-bottom: 12px;
          color: #a78bfa;
        }

        .checkin-empty h4 {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 650;
        }

        .checkin-empty p {
          max-width: 320px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 768px) {

          .checkin-content {
            padding: 22px 16px 32px;
          }

          .checkin-wrapper {
            gap: 18px;
          }

          .checkin-card {
            padding: 19px !important;
          }

          .checkin-team-section {
            gap: 16px;
          }

        }

        @media (max-width: 520px) {

          .checkin-content {
            padding: 18px 12px 28px;
          }

          .checkin-card {
            padding: 16px !important;
          }

          .checkin-search-row {
            align-items: stretch;
            flex-direction: column;
          }

          .checkin-search-row > button {
            width: 100%;
            justify-content: center;
          }

          .checkin-team-primary {
            flex-direction: column;
            gap: 14px;
          }

          .checkin-team-code {
            align-items: flex-start;
          }

          .checkin-info-grid {
            grid-template-columns: 1fr;
            gap: 13px;
          }

          .checkin-attendance-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .checkin-roster-label {
            display: none;
          }

          .checkin-member-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .checkin-status-controls {
            width: 100%;
          }

          .checkin-status-btn {
            flex: 1;
          }

          .checkin-save-section {
            align-items: stretch;
            flex-direction: column;
          }

          .checkin-save-section > button {
            width: 100%;
            justify-content: center;
          }

          .checkin-summary-stats {
            gap: 12px;
          }

        }

        /* =========================
           ACCESSIBILITY
        ========================= */

        @media (prefers-reduced-motion: reduce) {

          .checkin-bubble,
          .checkin-small-loader {
            animation: none !important;
          }

          .checkin-card,
          .checkin-member-row,
          .checkin-status-btn,
          .checkin-progress-fill {
            transition: none !important;
          }

        }

      `}</style>

    </div>
  );
}

/* Suspense Wrapper */

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Loading check-in...
        </div>
      }
    >
      <CheckInPageContent />
    </Suspense>
  );
}
