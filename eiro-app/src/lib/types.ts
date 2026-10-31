// EIRO Platform — Shared TypeScript types matching Firestore schema

export type UserRole =
  | 'SUPER_ADMIN'
  | 'DISTRICT_ADMIN'
  | 'VENUE_COORDINATOR'
  | 'SCHOOL_COORDINATOR'
  | 'JUDGE'
  | 'HEAD_JUDGE'
  | 'CHECKIN_VOLUNTEER'
  | 'PUBLIC_VIEWER';

export type ScopeType =
  | 'GLOBAL' | 'SEASON' | 'DISTRICT' | 'EVENT' | 'SCHOOL' | 'CATEGORY' | 'VENUE';

export type CategoryCode =
  | 'SUMO' | 'MAZE' | 'WALL' | 'ECO_CITY'
  | 'NEXTGEN_FACTORY' | 'INNOVATOR_JUNIOR' | 'INNOVATOR_SENIOR';

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  SUMO: 'Sumo Wrestling',
  MAZE: 'Maze Solver',
  WALL: 'Wall Following',
  ECO_CITY: 'Eco City — Smart Waste Management',
  NEXTGEN_FACTORY: 'NextGen Factory — Industrial Automation',
  INNOVATOR_JUNIOR: 'Young Innovator Junior',
  INNOVATOR_SENIOR: 'Young Innovator Senior',
};

export const CATEGORY_COLORS: Record<CategoryCode, string> = {
  SUMO: 'bg-red-500/20 text-red-400 border-red-500/30',
  MAZE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WALL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ECO_CITY: 'bg-green-500/20 text-green-400 border-green-500/30',
  NEXTGEN_FACTORY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  INNOVATOR_JUNIOR: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  INNOVATOR_SENIOR: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

export type ScoringEngine = 'MATCH_TOURNAMENT' | 'TIMED_TECHNICAL' | 'JUDGED_RUBRIC' | 'HYBRID';

export const CATEGORY_ENGINE: Record<CategoryCode, ScoringEngine> = {
  SUMO: 'MATCH_TOURNAMENT',
  MAZE: 'TIMED_TECHNICAL',
  WALL: 'TIMED_TECHNICAL',
  ECO_CITY: 'JUDGED_RUBRIC',
  NEXTGEN_FACTORY: 'HYBRID',
  INNOVATOR_JUNIOR: 'JUDGED_RUBRIC',
  INNOVATOR_SENIOR: 'JUDGED_RUBRIC',
};

export type StageType = 'DISTRICT' | 'STATE_FINALS';
export type SeasonPhase = 'SETUP' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT';
export type FeeStatus = 'NOT_REQUIRED' | 'PENDING' | 'PARTIAL' | 'VERIFIED' | 'WAIVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'VERIFIED' | 'REJECTED' | 'VOIDED';
export type ScoreStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'LOCKED' | 'PUBLISHED';
export type EntryStatus = 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'COMPETING' | 'COMPLETED' | 'MERGED' | 'DISQUALIFIED' | 'WITHDRAWN';
export type RegistrationState = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type AdjustmentStatus = 'DRAFT' | 'PENDING_ACKNOWLEDGEMENT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'APPLIED' | 'FAILED_REQUIRES_REVIEW';
export type ImportStatus = 'UPLOADED' | 'VALIDATING' | 'NEEDS_CORRECTION' | 'VALIDATED' | 'COMMITTING' | 'COMPLETED' | 'PARTIAL_FAILED';
export type EventState = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface RoleAssignment {
  id: string;
  uid: string;
  role: UserRole;
  scopeType: ScopeType;
  scopeId: string;
  createdBy: string;
  active: boolean;
  createdAt: unknown;
}

export interface School {
  id: string;
  schoolCode: string;
  name: string;
  districtId: string;
  address: string;
  coordinatorsSummary: string[];
  verificationStatus: VerificationStatus;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Student {
  id: string;
  schoolId: string;
  teamId?: string;
  name: string;
  grade: string;
  section?: string;
  createdAt: unknown;
}

export interface Season {
  id: string;
  year: number;
  name: string;
  registrationWindowStart: unknown;
  registrationWindowEnd: unknown;
  phase: SeasonPhase;
  publishedSettings: Record<string, unknown>;
  createdAt: unknown;
}

export interface District {
  id: string;
  name: string;
  supportedEventMetadata: Record<string, unknown>;
}

export interface Venue {
  id: string;
  name: string;
  districtId: string;
  address: string;
  capacity: number;
  facilities: string[];
}

export interface Team {
  id: string;
  seasonId: string;
  schoolId: string;
  categoryCode: CategoryCode;
  displayTeamCode: string;
  teamName: string;
  projectTitle?: string;
  createdBy: string;
  createdAt: unknown;
}

export interface Registration {
  id: string;
  teamId: string;
  schoolId: string;
  seasonId: string;
  state: RegistrationState;
  eligibilitySnapshot: Record<string, unknown>;
  feeStatus: FeeStatus;
  feeAmountPerHeadMinorUnits?: number;
  feeTotalMinorUnits?: number;
  feePaidAt?: unknown;
  feePaidByUid?: string;
  approvalActor?: string;
  submittedAt?: unknown;
  approvedAt?: unknown;
  updatedAt: unknown;
}

export interface Notification {
  id: string;
  recipientUid: string;
  channel?: string;
  templateId?: string;
  state?: string;
  read: boolean;
  sentAt?: unknown;
  createdAt: unknown;
}

export interface StageEntry {
  id: string;
  teamId: string;
  eventId: string;
  stageType: StageType;
  entryStatus: EntryStatus;
  activeRosterVersion: number;
  competitionStarted: boolean;
  mergedIntoEntryId?: string;
  sourceQualifierId?: string;
  createdAt: unknown;
}

export interface TrainingSession {
  id: string;
  seasonId: string;
  eventId: string;
  venueId: string;
  dayNumber: 1 | 2;
  sessionDate: unknown;
  title: string;
  startAt: unknown;
  endAt: unknown;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TrainingAttendance {
  id: string;
  sessionId: string;
  eventId: string;
  entryId: string;
  teamId: string;
  studentId: string;
  dayNumber: 1 | 2;
  status: AttendanceStatus;
  markedAt?: unknown;
  markedByUid?: string;
  correctionReason?: string;
  revision: number;
}

export interface Scorecard {
  id: string;
  entryId: string;
  judgeUid: string;
  ruleVersionId: string;
  rubricItems: RubricItem[];
  computedTotal: number;
  status: ScoreStatus;
  revision: number;
  submittedAt?: unknown;
  updatedAt: unknown;
}

export interface RubricItem {
  criterionId: string;
  label: string;
  maxPoints: number;
  score?: number;
  comment?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  eventId?: string;
  schoolId: string;
  teamId?: string;
  amountMinorUnits: number;
  method: PaymentMethod;
  externalReference?: string;
  proofStoragePath?: string;
  status: PaymentStatus;
  receivedAt?: unknown;
  verifiedAt?: unknown;
  verifiedByUid?: string;
  notes?: string;
  idempotencyKey: string;
  createdAt: unknown;
}

export interface TeamAdjustmentRequest {
  id: string;
  type: 'MERGE_TEAMS' | 'TRANSFER_MEMBERS';
  sourceEntryId: string;
  targetEntryId: string;
  studentIds: string[];
  reason: string;
  requestedBy: string;
  acknowledgements: { uid: string; role: string; acknowledgedAt: unknown }[];
  status: AdjustmentStatus;
  reviewedBy?: string;
  reviewedAt?: unknown;
  rejectionReason?: string;
  createdAt: unknown;
}

export interface ImportJob {
  id: string;
  schoolId: string;
  uploaderUid: string;
  seasonId: string;
  sourceFilePath: string;
  status: ImportStatus;
  counts: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    teamsCreated: number;
    studentsCreated: number;
  };
  errorFilePath?: string;
  idempotencyKey: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: unknown;
  correlationId?: string;
}
