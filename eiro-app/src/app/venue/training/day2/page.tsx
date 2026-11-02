
'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  PageHeader,
  Card,
  Button,
} from '@/components/ui';

import { Save } from 'lucide-react';

import type { AttendanceStatus } from '@/lib/types';

import { getAll } from '@/lib/firebase/firestore';
import { callEiroFunction } from '@/lib/firebase/functions';

import toast from 'react-hot-toast';


/* =========================================
   TYPES
========================================= */

type Session = {
  id: string;
  eventId: string;
  dayNumber: 1 | 2;
  title: string;
};

type Entry = {
  id: string;
  eventId: string;
  teamId: string;
  mergedIntoEntryId?: string;
};

type Team = {
  id: string;
  teamName: string;
  displayTeamCode: string;
};

type Member = {
  teamId: string;
  studentId: string;
  status?: string;
};

type TrainingRecord = {
  id: string;
  sessionId: string;
  entryId: string;
  teamId: string;
  studentId: string;
  dayNumber: number;
  status: AttendanceStatus;
};


/* =========================================
   FLOATING BACKGROUND BUBBLES
========================================= */

const AMBIENT_BUBBLES = [
  { left: '7%', size: 42, duration: 25, delay: -5, tone: 'violet' },
  { left: '19%', size: 22, duration: 19, delay: -12, tone: 'rose' },
  { left: '34%', size: 58, duration: 30, delay: -18, tone: 'violet' },
  { left: '51%', size: 30, duration: 23, delay: -8, tone: 'rose' },
  { left: '68%', size: 48, duration: 28, delay: -16, tone: 'violet' },
  { left: '83%', size: 26, duration: 21, delay: -10, tone: 'rose' },
  { left: '94%', size: 54, duration: 32, delay: -22, tone: 'violet' },
];


/* =========================================
   TRAINING DAY 2 PAGE
========================================= */

export default function TrainingDay2Page() {

  /* =========================================
     STATE
  ========================================= */

  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);

  const [sessionId, setSessionId] = useState('');

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [correctionReason, setCorrectionReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');


  /* =========================================
     LOAD FIRESTORE DATA
  ========================================= */

  useEffect(() => {

    Promise.all([
      getAll<Session>('trainingSessions'),
      getAll<Entry>('stageEntries'),
      getAll<Team>('teams'),
      getAll<Member>('teamMemberships'),
      getAll<TrainingRecord>('trainingAttendance'),
    ])

      .then(([sessionRows, entryRows, teamRows, memberRows, attendanceRows]) => {

        const daySessions = sessionRows.filter(
          session => session.dayNumber === 2
        );

        setSessions(daySessions);
        setSessionId(daySessions[0]?.id ?? '');

        setEntries(entryRows);
        setTeams(teamRows);
        setMembers(memberRows);
        setRecords(attendanceRows);

      })

      .catch(() => {
        setError('Training attendance could not be loaded.');
      })

      .finally(() => {
        setLoading(false);
      });

  }, []);


  /* =========================================
     SELECTED SESSION
  ========================================= */

  const session = sessions.find(
    item => item.id === sessionId
  );


  /* =========================================
     BUILD STUDENT ROSTER
  ========================================= */

  const roster = useMemo(

    () =>

      session

        ? entries

            .filter(
              entry =>
                entry.eventId === session.eventId &&
                !entry.mergedIntoEntryId
            )

            .flatMap(entry => {

              const team = teams.find(
                item => item.id === entry.teamId
              );

              return members

                .filter(
                  member =>
                    member.teamId === entry.teamId &&
                    member.status !== 'INACTIVE'
                )

                .map(member => ({
                  entry,
                  team,
                  member,
                }));

            })

        : [],

    [session, entries, teams, members]

  );


  /* =========================================
     GET DAY 2 ATTENDANCE STATUS
  ========================================= */

  const statusFor = (studentId: string): AttendanceStatus => {

    return (
      attendance[studentId] ??

      records.find(
        item =>
          item.sessionId === session?.id &&
          item.studentId === studentId
      )?.status ??

      'NOT_MARKED'
    );

  };


  /* =========================================
     SAVE ATTENDANCE
  ========================================= */

  const save = async () => {

    if (!session) return;

    const corrections = roster.filter(({ member }) => {

      const existing = records.find(
        item =>
          item.sessionId === session.id &&
          item.studentId === member.studentId
      );

      return (
        existing &&
        existing.status !== statusFor(member.studentId)
      );

    });


    if (corrections.length && !correctionReason.trim()) {

      toast.error(
        'Provide a reason to correct existing attendance.'
      );

      return;
    }


    setSaving(true);

    try {

      for (const { entry, member } of roster) {

        const status = statusFor(member.studentId);

        const existing = records.find(
          item =>
            item.sessionId === session.id &&
            item.studentId === member.studentId
        );


        if (existing && existing.status !== status) {

          await callEiroFunction<
            Record<string, unknown>,
            unknown
          >(
            'correctTrainingAttendance',
            {
              attendanceId: existing.id,
              status,
              correctionReason: correctionReason.trim(),
            }
          );

        } else if (!existing && status !== 'NOT_MARKED') {

          await callEiroFunction<
            Record<string, unknown>,
            unknown
          >(
            'markTrainingAttendance',
            {
              sessionId: session.id,
              eventId: session.eventId,
              entryId: entry.id,
              teamId: entry.teamId,
              studentId: member.studentId,
              dayNumber: 2,
              status,
            }
          );

        }

      }


      toast.success('Training attendance recorded.');

      setCorrectionReason('');

    } catch {

      toast.error(
        'Training attendance could not be saved. Refresh to confirm persisted records.'
      );

    } finally {

      setSaving(false);

    }

  };


  /* =========================================
     PAGE UI
  ========================================= */

  return (

    <main className="training-page relative isolate min-h-screen w-full">


      {/* =====================================
          FULL SCREEN ANIMATED BACKGROUND
      ===================================== */}

      <div
        className="training-ambient"
        aria-hidden="true"
      >

        {/* GRID */}

        <div className="training-grid" />


        {/* GLOWING ORBS */}

        <div className="training-orb training-orb-one" />

        <div className="training-orb training-orb-two" />


        {/* FLOATING BUBBLES */}

        <div className="training-bubbles">

          {AMBIENT_BUBBLES.map((bubble, index) => (

            <span
              key={index}
              className={`training-bubble ${bubble.tone}`}

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

      </div>


      {/* =====================================
          FULL WIDTH PAGE CONTENT
      ===================================== */}

      <div className="training-content relative z-10 w-full max-w-none space-y-6 animate-fade-in-up">


        {/* HEADER */}

        <PageHeader
          title="Training Day 2 Attendance"
          subtitle="Firestore training session and roster records"

          actions={

            <Button
              icon={Save}
              onClick={() => void save()}
              loading={saving}
              disabled={!session}
            >
              Save Attendance
            </Button>

          }
        />


        {/* LOADING */}

        {loading ? (

          <Card className="training-glass-card text-center py-12 text-gray-400">

            Loading training roster…

          </Card>

        ) : error ? (

          /* ERROR */

          <Card className="training-glass-card text-red-400">

            {error}

          </Card>

        ) : sessions.length === 0 ? (

          /* NO SESSION */

          <Card className="training-glass-card text-center py-12 text-gray-400">

            No Day 2 training session has been configured.

          </Card>

        ) : (

          <>

            {/* =================================
                TRAINING SESSION SELECTOR
            ================================= */}

            <Card className="training-glass-card">

              <label className="block text-sm text-gray-300">

                Training session

                <select
                  className="eiro-input mt-2"
                  value={sessionId}

                  onChange={event => {
                    setSessionId(event.target.value);
                    setAttendance({});
                  }}
                >

                  {sessions.map(item => (

                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.title} · {item.id}
                    </option>

                  ))}

                </select>

              </label>

            </Card>


            {/* =================================
                STUDENT ROSTER
            ================================= */}

            {roster.length === 0 ? (

              <Card className="training-glass-card text-center py-10 text-gray-400">

                No active entry roster is associated with this session.

              </Card>

            ) : (

              <div className="space-y-3">

                {roster.map(({ entry, team, member }) => {

                  const day1Status = records.find(
                    record =>
                      record.dayNumber === 1 &&
                      record.teamId === entry.teamId &&
                      record.studentId === member.studentId
                  )?.status ?? 'NOT_MARKED';


                  return (

                    <Card
                      key={`${entry.id}-${member.studentId}`}
                      className="training-glass-card training-student-card"
                    >

                      <div className="flex flex-wrap items-center justify-between gap-4">


                        {/* STUDENT INFORMATION */}

                        <div>

                          <p className="font-medium text-white">

                            {member.studentId}

                          </p>

                          <p className="text-xs text-gray-400 mt-1">

                            {team?.teamName ?? entry.teamId}

                            {' · Day 1: '}

                            {day1Status}

                          </p>

                        </div>


                        {/* ATTENDANCE BUTTONS */}

                        <div className="flex flex-wrap gap-2">

                          {(
                            ['PRESENT', 'ABSENT', 'NOT_MARKED'] as AttendanceStatus[]
                          ).map(status => (

                            <button
                              key={status}

                              onClick={() =>
                                setAttendance(old => ({
                                  ...old,
                                  [member.studentId]: status,
                                }))
                              }

                              className={`px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
                                statusFor(member.studentId) === status

                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'

                                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >

                              {status}

                            </button>

                          ))}

                        </div>

                      </div>

                    </Card>

                  );

                })}

              </div>

            )}


            {/* =================================
                CORRECTION REASON
            ================================= */}

            {records.some(
              record => record.sessionId === session?.id
            ) && (

              <Card className="training-glass-card">

                <label className="block text-sm text-gray-300">

                  Correction reason

                  <span className="text-gray-500 text-xs ml-2">

                    (Required when changing an existing record)

                  </span>

                  <input
                    value={correctionReason}

                    onChange={event =>
                      setCorrectionReason(event.target.value)
                    }

                    className="eiro-input mt-2"

                    placeholder="Enter reason for attendance correction..."
                  />

                </label>

              </Card>

            )}

          </>

        )}

      </div>


      {/* =====================================
          BACKGROUND AND PAGE STYLES
      ===================================== */}

      <style jsx global>{`

        /* MAIN PAGE */

        .training-page {
          position: relative;
          isolation: isolate;

          width: 100%;
          max-width: none;
          min-height: 100vh;

          background: transparent !important;

          color: #f5f6fb;

          font-family: Roboto, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .training-page * {
          box-sizing: border-box;
        }


        /* FULL SCREEN ANIMATED BACKGROUND */

        .training-ambient {
          position: fixed;
          inset: 0;

          z-index: 0;

          overflow: hidden;
          pointer-events: none;

          background: transparent !important;
        }


        /* GRID */

        .training-grid {
          position: absolute;
          inset: 0;

          opacity: 0.08;

          background-image:
            linear-gradient(
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.12) 1px,
              transparent 1px
            );

          background-size: 58px 58px;

          mask-image:
            radial-gradient(
              ellipse 80% 65% at 50% 22%,
              #000,
              transparent
            );
        }


        /* GLOWING ORBS */

        .training-orb {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(110px);

          opacity: 0.12;
        }

        .training-orb-one {
          top: -260px;
          left: -180px;

          background: #7c3aed;
        }

        .training-orb-two {
          top: 280px;
          right: -300px;

          background: #b24bb2;
        }


        /* BUBBLE CONTAINER */

        .training-bubbles {
          position: absolute;
          inset: 0;

          overflow: hidden;
        }


        /* FLOATING BUBBLES */

        .training-bubble {
          position: absolute;

          bottom: -90px;

          display: block;

          border-radius: 50%;

          opacity: 0;

          filter: blur(1px);

          animation: training-float linear infinite;
        }

        .training-bubble.violet {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(168, 85, 247, 0.2),
              transparent 72%
            );
        }

        .training-bubble.rose {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(221, 143, 224, 0.16),
              transparent 72%
            );
        }


        /* BUBBLE ANIMATION */

        @keyframes training-float {

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


        /* FULL WIDTH CONTENT */

        .training-content {
          position: relative;
          z-index: 10;

          display: block;

          width: 100%;
          max-width: none;

          min-height: 100vh;

          padding: 24px 24px 32px;

          margin: 0;

          background: transparent !important;

          box-shadow: none !important;
        }


        /* TRANSPARENT GLASS CARDS */

        .training-page .training-glass-card {

          display: block;

          width: 100%;
          max-width: none;

          background: rgba(17, 24, 39, 0.30) !important;

          border: 1px solid rgba(148, 163, 184, 0.18) !important;

          border-radius: 16px;

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          box-shadow: none !important;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }


        .training-page .training-glass-card:hover {

          border-color: rgba(168, 85, 247, 0.30) !important;

        }


        /* STUDENT CARDS */

        .training-student-card {

          width: 100%;

          transition:
            border-color 0.2s ease,
            background 0.2s ease;

        }


        /* INPUTS */

        .training-page .eiro-input {

          background: rgba(17, 24, 39, 0.45);

          border-color: rgba(148, 163, 184, 0.2);

          color: #f5f6fb;

        }

        .training-page .eiro-input:focus {

          border-color: rgba(168, 85, 247, 0.6);

          outline: none;

        }


        /* RESPONSIVE */

        @media (max-width: 768px) {

          .training-content {
            padding: 18px 14px 28px;
          }

        }

        @media (max-width: 480px) {

          .training-content {
            padding: 16px 10px 24px;
          }

        }


        /* REDUCED MOTION */

        @media (prefers-reduced-motion: reduce) {

          .training-bubble {
            animation: none;
          }

          .training-glass-card {
            transition: none;
          }

        }

      `}</style>

    </main>

  );
}
