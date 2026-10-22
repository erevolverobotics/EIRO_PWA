// EIRO Platform — Shared TypeScript types matching Firestore schema
// All enums mirror the spec's named constants

// ─────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────
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
  | 'GLOBAL'
  | 'SEASON'
  | 'DISTRICT'
  | 'EVENT'
  | 'SCHOOL'
  | 'CATEGORY'
  | 'VENUE';

// ─────────────────────────────────────────────
// Competition categories
// ─────────────────────────────────────────────
export type CategoryCode =
  | 'SUMO'
  | 'MAZE'
  | 'WALL'
  | 'ECO_CITY'
  | 'NEXTGEN_FACTORY'
  | 'INNOVATOR_JUNIOR'
  | 'INNOVATOR_SENIOR';

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  SUMO: 'Sumo Wrestling',
  MAZE: 'Maze Solver',
  WALL: 'Wall Following',
  ECO_CITY: 'Eco City — Smart Waste Management System',
  NEXTGEN_FACTORY: 'NextGen Factory — Industrial Automation Challenge',
  INNOVATOR_JUNIOR: 'Young Innovator Junior',
  INNOVATOR_SENIOR: 'Young Innovator Senior',
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

// ─────────────────────────────────────────────
// Stage / event types
// ─────────────────────────────────────────────
export type StageType = 'DISTRICT' | 'STATE_FINALS';

// ─────────────────────────────────────────────
// Users & Roles
// ─────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt: unknown; // Firestore Timestamp
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

// ─────────────────────────────────────────────
// Schools & Students
// ─────────────────────────────────────────────
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

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
  name: string;
  grade: string;
  section?: string;
  consentMetadata?: Record<string, unknown>;
  createdAt: unknown;
}

// ─────────────────────────────────────────────
// Seasons & Categories
// ─────────────────────────────────────────────
export type SeasonPhase = 'SETUP' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

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

export interface SeasonCategory {
  id: string;
  seasonId: string;
  categoryCode: CategoryCode;
  enabled: boolean;
  teamSizeMin: number;
  teamSizeMax: number;
  eligibleGrades: string[];
  feeConfigRef?: string;
}

// ─────────────────────────────────────────────
// Districts & Venues
// ─────────────────────────────────────────────
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

export interface Arena {
  id: string;
  venueId: string;
  identifier: string;
  type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE';
}

// ─────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────
export type EventState = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface EiroEvent {
  id: string;
  seasonId: string;
  stageType: StageType;
  categoryCode: CategoryCode;
  districtId?: string;
  venueId?: string;
  state: EventState;
  startAt: unknown;
  endAt: unknown;
}

// ─────────────────────────────────────────────
// Teams & Registrations
// ─────────────────────────────────────────────
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

export interface TeamMembership {
  id: string;
  teamId: string;
  studentId: string;
  validFrom: unknown;
  validTo?: unknown;
  sourceAdjustmentId?: string;
  role: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'REMOVED';
}

export type RegistrationState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface Registration {
  id: string;
  teamId: string;
  seasonId: string;
  state: RegistrationState;
  eligibilitySnapshot: Record<string, unknown>;
  feeStatus: FeeStatus;
  approvalActor?: string;
  submittedAt?: unknown;
  approvedAt?: unknown;
  updatedAt: unknown;
}

export type EntryStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CHECKED_IN'
  | 'COMPETING'
  | 'COMPLETED'
  | 'MERGED'
  | 'DISQUALIFIED'
  | 'WITHDRAWN';

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

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────
export type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT';

export interface StudentAttendance {
  id: string;
  eventId: string;
  entryId: string;
  studentId: string;
  status: AttendanceStatus;
  actor: string;
  recordedAt: unknown;
}

// ─────────────────────────────────────────────
// Training Attendance
// ─────────────────────────────────────────────
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
  id: string; // deterministic key: sessionId_studentId
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

// ─────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────
export type ScoreStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'LOCKED' | 'PUBLISHED';

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

export interface TimedRun {
  id: string;
  entryId: string;
  attemptIndex: number;
  elapsedMs: number;
  adjustedMs: number;
  checkpoints: Checkpoint[];
  penalties: Penalty[];
  state: 'IN_PROGRESS' | 'COMPLETED' | 'INVALID' | 'VOID';
}

export interface Checkpoint {
  index: number;
  reachedAt?: number; // ms
  reached: boolean;
}

export interface Penalty {
  type: string;
  description: string;
  timeAddedMs?: number;
  pointsDeducted?: number;
}

export interface Match {
  id: string;
  eventId: string;
  round: number;
  entryAId: string;
  entryBId: string;
  outcome?: 'A_WINS' | 'B_WINS' | 'DRAW' | 'VOID';
  winnerId?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'VOID';
  updatedVersion: number;
}

export interface MatchBout {
  id: string;
  matchId: string;
  boutNumber: number;
  winnerId?: string;
  outcome: 'A_WINS' | 'B_WINS' | 'DRAW' | 'PENALTY';
  penaltyInfo?: string;
  durationMs: number;
}

// ─────────────────────────────────────────────
// Payments (No gateway)
// ─────────────────────────────────────────────
export type FeeStatus = 'NOT_REQUIRED' | 'PENDING' | 'PARTIAL' | 'VERIFIED' | 'WAIVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'VERIFIED' | 'REJECTED' | 'VOIDED';

export interface Invoice {
  id: string;
  schoolId: string;
  registrationRef?: string;
  entryRef?: string;
  lineItems: InvoiceLineItem[];
  totalMinorUnits: number;
  currency: 'INR';
  status: FeeStatus;
  createdAt: unknown;
}

export interface InvoiceLineItem {
  description: string;
  amountMinorUnits: number;
  categoryCode?: CategoryCode;
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

// ─────────────────────────────────────────────
// Team Adjustments
// ─────────────────────────────────────────────
export type AdjustmentType = 'MERGE_TEAMS' | 'TRANSFER_MEMBERS';
export type AdjustmentStatus =
  | 'DRAFT'
  | 'PENDING_ACKNOWLEDGEMENT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'APPLIED'
  | 'FAILED_REQUIRES_REVIEW';

export interface TeamAdjustmentRequest {
  id: string;
  type: AdjustmentType;
  sourceEntryId: string;
  targetEntryId: string;
  studentIds: string[];
  reason: string;
  requestedBy: string;
  acknowledgements: Acknowledgement[];
  status: AdjustmentStatus;
  reviewedBy?: string;
  reviewedAt?: unknown;
  rejectionReason?: string;
  createdAt: unknown;
}

export interface Acknowledgement {
  uid: string;
  role: string;
  acknowledgedAt: unknown;
}

// ─────────────────────────────────────────────
// CSV Import
// ─────────────────────────────────────────────
export type ImportStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'NEEDS_CORRECTION'
  | 'VALIDATED'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'PARTIAL_FAILED';

export interface ImportJob {
  id: string;
  schoolId: string;
  uploaderUid: string;
  seasonId: string;
  sourceFilePath: string;
  status: ImportStatus;
  counts: ImportCounts;
  errorFilePath?: string;
  idempotencyKey: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ImportCounts {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  teamsCreated: number;
  studentsCreated: number;
}

// ─────────────────────────────────────────────
// Results & Qualification
// ─────────────────────────────────────────────
export interface Result {
  id: string;
  eventId: string;
  entryId: string;
  scoreSnapshot: Record<string, unknown>;
  rank?: number;
  approvedAt?: unknown;
  publishedAt?: unknown;
  ruleVersionId: string;
  revision: number;
}

export interface Qualification {
  id: string;
  sourceEntryId: string;
  targetEventId: string;
  finalsEntryId?: string;
  status: 'PROVISIONAL' | 'CONFIRMED' | 'DECLINED' | 'REVOKED';
  approvedBy?: string;
  approvedAt?: unknown;
}

// ─────────────────────────────────────────────
// Certificates
// ─────────────────────────────────────────────
export interface Certificate {
  id: string;
  studentId?: string;
  teamId?: string;
  resultId?: string;
  publicVerificationCode: string;
  storagePath: string;
  status: 'ACTIVE' | 'REVOKED' | 'REISSUED';
  issuedAt: unknown;
}

// ─────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────
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
