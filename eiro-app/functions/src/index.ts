import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type DocumentReference,
  Timestamp,
  type Transaction,
} from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

initializeApp();

const db = getFirestore();
const REGION = "us-central1";
const MAX_BATCH_SIZE = 200;
setGlobalOptions({ region: REGION });

type Data = Record<string, unknown>;
type Scope = {
  eventId?: string;
  seasonId?: string;
  districtId?: string;
  schoolId?: string;
  venueId?: string;
  categoryCode?: string;
};

function fail(code: "invalid-argument" | "failed-precondition" | "permission-denied", message: string): never {
  throw new HttpsError(code, message);
}

async function requireScoringAccess(uid: string, eventId: string): Promise<void> {
  const scope = await getEventScope(eventId);
  const roleAssignments = await db.collection("roleAssignments").where("uid", "==", uid).get();
  const activeAssignments = roleAssignments.docs.map((doc) => doc.data())
    .filter((assignment) => assignmentCovers(assignment, scope));
  if (activeAssignments.some((assignment) =>
    ["SUPER_ADMIN", "DISTRICT_ADMIN", "HEAD_JUDGE"].includes(String(assignment.role)))) return;
  if (!activeAssignments.some((assignment) => assignment.role === "JUDGE")) {
    return fail("permission-denied", "An active scoped judge or head-judge assignment is required.");
  }
  const assignments = await db.collection("judgeAssignments")
    .where("uid", "==", uid)
    .get();
  if (!assignments.docs.some((doc) => doc.data().eventId === eventId && doc.data().active === true)) {
    return fail("permission-denied", "An active judge assignment for this event is required.");
  }
}

function asData(value: unknown): Data {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("invalid-argument", "Request data must be an object.");
  }
  return value as Data;
}

function requiredString(data: Data, key: string, maxLength = 200): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    return fail("invalid-argument", `${key} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalString(data: Data, key: string, maxLength = 500): string | undefined {
  const value = data[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    return fail("invalid-argument", `${key} must be a string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function requiredInteger(data: Data, key: string, min: number, max: number): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    return fail("invalid-argument", `${key} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function requiredNumber(data: Data, key: string, min: number, max: number): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return fail("invalid-argument", `${key} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function requireAuth(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) return fail("permission-denied", "Authentication is required.");
  return uid;
}

function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function ref(collection: string, id: string): DocumentReference<DocumentData> {
  return db.collection(collection).doc(id);
}

async function getEventScope(eventId: string): Promise<Scope> {
  const snapshot = await ref("events", eventId).get();
  if (!snapshot.exists) return fail("failed-precondition", "The event does not exist.");
  const event = snapshot.data()!;
  return {
    eventId,
    seasonId: typeof event.seasonId === "string" ? event.seasonId : undefined,
    districtId: typeof event.districtId === "string" ? event.districtId : undefined,
    venueId: typeof event.venueId === "string" ? event.venueId : undefined,
    categoryCode: typeof event.categoryCode === "string" ? event.categoryCode : undefined,
  };
}

function assignmentCovers(assignment: DocumentData, scope: Scope): boolean {
  if (assignment.active !== true) return false;
  const scopeType = assignment.scopeType;
  const scopeId = assignment.scopeId;
  if (scopeType === "GLOBAL") return scopeId === "*" || scopeId === "GLOBAL" || scopeId === "global";
  const target: Partial<Record<string, string | undefined>> = {
    EVENT: scope.eventId,
    SEASON: scope.seasonId,
    DISTRICT: scope.districtId,
    SCHOOL: scope.schoolId,
    VENUE: scope.venueId,
    CATEGORY: scope.categoryCode,
  };
  return typeof scopeId === "string" && target[scopeType] !== undefined && target[scopeType] === scopeId;
}

async function requireRole(uid: string, roles: string[], scope: Scope): Promise<string> {
  const assignments = await db.collection("roleAssignments").where("uid", "==", uid).get();
  const matches = assignments.docs.filter((doc) => {
    const assignment = doc.data();
    return roles.includes(String(assignment.role)) && assignmentCovers(assignment, scope);
  });
  if (matches.length === 0) {
    return fail("permission-denied", `An active scoped assignment is required (${roles.join(", ")}).`);
  }
  return String(matches[0].data().role);
}

async function requireRoleForEvent(uid: string, roles: string[], eventId: string): Promise<Scope> {
  const scope = await getEventScope(eventId);
  await requireRole(uid, roles, scope);
  return scope;
}

function audit(
  transaction: Transaction,
  uid: string,
  action: string,
  entityType: string,
  entityId: string,
  before?: Data,
  after?: Data,
): void {
  const auditRef = db.collection("auditLogs").doc();
  transaction.create(auditRef, {
    actorUid: uid,
    action,
    entityType,
    entityId,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    timestamp: FieldValue.serverTimestamp(),
  });
}

function assertOneOf(value: unknown, allowed: readonly string[], field: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return fail("invalid-argument", `${field} has an unsupported value.`);
  }
  return value;
}

function makeCallable<T extends Data, R extends Data>(
  handler: (uid: string, data: T) => Promise<R>,
  operation = "callable",
  invoker?: "public" | "private",
) {
  return onCall({ ...(invoker ? { invoker } : {}) }, async (request) => {
    const uid = requireAuth(request);
    try {
      return await handler(uid, asData(request.data) as T);
    } catch (error) {
      logger.error("Callable handler failed", {
        operation,
        uid,
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
      });
      throw error;
    }
  });
}

export const markNotificationRead = makeCallable(async (uid, data) => {
  const notificationId = requiredString(data, "notificationId", 150);
  const notificationRef = ref("notifications", notificationId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(notificationRef);
    if (!snapshot.exists) return fail("failed-precondition", "The notification does not exist.");
    const notification = snapshot.data()!;
    if (notification.recipientUid !== uid) return fail("permission-denied", "Only the notification recipient can mark it read.");
    if (notification.read === true) return;
    transaction.update(notificationRef, { read: true, readAt: FieldValue.serverTimestamp() });
    audit(transaction, uid, "NOTIFICATION_MARKED_READ", "notification", notificationId, { read: false }, { read: true });
  });
  return { notificationId, read: true };
});

export const submitSchoolApplication = makeCallable(async (uid, data) => {
  let stage = "validating request";
  try {
    const schoolName = requiredString(data, "schoolName", 200);
    const districtId = requiredString(data, "districtId", 150);
    const address = optionalString(data, "address", 500) ?? "";
    const phone = optionalString(data, "phone", 40) ?? "";
    const email = optionalString(data, "email", 254)?.toLowerCase() ?? "";
    const website = optionalString(data, "website", 200) ?? "";

    stage = "checking district";
    const districtSnapshot = await ref("districts", districtId).get();
    if (!districtSnapshot.exists) return fail("invalid-argument", "The selected district does not exist.");

    stage = "checking coordinator assignment and existing application";
    const applicationRef = ref("schoolApplications", uid);
    const assignmentRef = ref("roleAssignments", `${uid}_SCHOOL_COORDINATOR`);
    const [applicationSnapshot, assignmentSnapshot, userSnapshot] = await Promise.all([
      applicationRef.get(),
      assignmentRef.get(),
      ref("users", uid).get(),
    ]);
    if (!assignmentSnapshot.exists || assignmentSnapshot.data()!.role !== "SCHOOL_COORDINATOR" ||
        assignmentSnapshot.data()!.active !== true || assignmentSnapshot.data()!.scopeId !== "unassigned") {
      return fail("failed-precondition", "Only an unassigned school coordinator can submit a school application.");
    }
    if (applicationSnapshot.exists && applicationSnapshot.data()!.status !== "REJECTED") {
      return fail("failed-precondition", "A school application is already pending or approved.");
    }

    stage = "saving application";
    await applicationRef.set({
      applicantUid: uid,
      applicantName: typeof userSnapshot.data()?.displayName === "string" ? userSnapshot.data()!.displayName : "",
      applicantEmail: typeof userSnapshot.data()?.email === "string" ? userSnapshot.data()!.email : "",
      schoolName,
      districtId,
      address,
      phone,
      email,
      website,
      status: "PENDING",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(applicationSnapshot.exists ? { previousDecision: applicationSnapshot.data()!.status } : {}),
    });
    return { status: "PENDING" };
  } catch (error) {
    logger.error("School application submission failed", {
      operation: "submitSchoolApplication",
      stage,
      uid,
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
    });
    throw error;
  }
}, "submitSchoolApplication", "public");

export const reviewSchoolApplication = makeCallable(async (uid, data) => {
  const applicantUid = requiredString(data, "applicantUid", 150);
  const decision = assertOneOf(data.decision, ["APPROVE", "REJECT"], "decision");
  const rejectionReason = decision === "REJECT"
    ? requiredString(data, "rejectionReason", 500)
    : undefined;
  const applicationRef = ref("schoolApplications", applicantUid);
  const applicationSnapshot = await applicationRef.get();
  if (!applicationSnapshot.exists) return fail("failed-precondition", "The school application does not exist.");
  const application = applicationSnapshot.data()!;
  const districtId = requiredString(application, "districtId", 150);
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], { districtId });

  const assignmentRef = ref("roleAssignments", `${applicantUid}_SCHOOL_COORDINATOR`);
  const schoolRef = db.collection("schools").doc();
  await db.runTransaction(async (transaction) => {
    const [currentApplication, assignmentSnapshot] = await Promise.all([
      transaction.get(applicationRef),
      transaction.get(assignmentRef),
    ]);
    if (!currentApplication.exists || currentApplication.data()!.status !== "PENDING") {
      return fail("failed-precondition", "Only pending school applications can be reviewed.");
    }
    if (!assignmentSnapshot.exists || assignmentSnapshot.data()!.role !== "SCHOOL_COORDINATOR" ||
        assignmentSnapshot.data()!.active !== true || assignmentSnapshot.data()!.scopeId !== "unassigned") {
      return fail("failed-precondition", "The applicant no longer has an unassigned school coordinator account.");
    }

    if (decision === "REJECT") {
      transaction.update(applicationRef, {
        status: "REJECTED",
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
        rejectionReason,
        updatedAt: FieldValue.serverTimestamp(),
      });
      audit(transaction, uid, "SCHOOL_APPLICATION_REJECTED", "schoolApplication", applicantUid,
        { status: "PENDING" }, { status: "REJECTED", rejectionReason });
      return;
    }

    const current = currentApplication.data()!;
    transaction.create(schoolRef, {
      name: requiredString(current, "schoolName", 200),
      schoolCode: `EIRO-${schoolRef.id.slice(0, 8).toUpperCase()}`,
      districtId,
      address: typeof current.address === "string" ? current.address : "",
      phone: typeof current.phone === "string" ? current.phone : "",
      email: typeof current.email === "string" ? current.email : "",
      website: typeof current.website === "string" ? current.website : "",
      verificationStatus: "VERIFIED",
      createdBy: applicantUid,
      verifiedBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(assignmentRef, {
      scopeId: schoolRef.id,
      updatedAt: FieldValue.serverTimestamp(),
      assignedBy: uid,
    });
    transaction.update(applicationRef, {
      status: "APPROVED",
      schoolId: schoolRef.id,
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "SCHOOL_APPLICATION_APPROVED", "schoolApplication", applicantUid,
      { status: "PENDING" }, { status: "APPROVED", schoolId: schoolRef.id, districtId });
  });
  return { applicantUid, status: decision === "APPROVE" ? "APPROVED" : "REJECTED" };
}, "reviewSchoolApplication", "public");

export const submitRegistration = makeCallable(async (uid, data) => {
  let stage = "validating request";
  try {
    const seasonId = requiredString(data, "seasonId", 150);
    const categoryCode = assertOneOf(
      data.categoryCode,
      ["SUMO", "MAZE", "WALL", "ECO_CITY", "NEXTGEN_FACTORY", "INNOVATOR_JUNIOR", "INNOVATOR_SENIOR"],
      "categoryCode",
    );
    const teamName = requiredString(data, "teamName", 120);
    const projectTitle = optionalString(data, "projectTitle", 300);
    const state = assertOneOf(data.state, ["DRAFT", "SUBMITTED"], "state");
    if (!Array.isArray(data.members) || data.members.length === 0 || data.members.length > 400) {
      return fail("invalid-argument", "members must contain between 1 and 400 students.");
    }
    const members = data.members.map((value) => {
      const member = asData(value);
      return {
        name: requiredString(member, "name", 120),
        grade: requiredString(member, "grade", 40),
        ...(optionalString(member, "section", 40) ? { section: optionalString(member, "section", 40) } : {}),
      };
    });

    stage = "reading coordinator, season, and category records";
    const assignmentRef = ref("roleAssignments", `${uid}_SCHOOL_COORDINATOR`);
    const [assignmentSnapshot, seasonSnapshot, categoryConfigSnapshot] = await Promise.all([
      assignmentRef.get(),
      ref("seasons", seasonId).get(),
      ref("config", "categories").get(),
    ]);
    if (!assignmentSnapshot.exists) return fail("permission-denied", "An active school coordinator assignment is required.");
    const assignment = assignmentSnapshot.data()!;
    if (assignment.uid !== uid || assignment.role !== "SCHOOL_COORDINATOR" || assignment.active !== true ||
        typeof assignment.scopeId !== "string" || assignment.scopeId.trim() === "") {
      return fail("permission-denied", "The school coordinator assignment is invalid or inactive.");
    }
    const schoolId = assignment.scopeId;
    if (!seasonSnapshot.exists || seasonSnapshot.data()!.phase !== "REGISTRATION_OPEN") {
      return fail("failed-precondition", "The selected season is not open for registration.");
    }
    const season = seasonSnapshot.data()!;
    const now = Date.now();
    for (const key of ["registrationWindowStart", "registrationWindowEnd"] as const) {
      const date = season[key];
      if (date == null) continue;
      const millis = date instanceof Timestamp
        ? date.toMillis()
        : date instanceof Date
          ? date.getTime()
          : undefined;
      if (millis === undefined) return fail("failed-precondition", `Season ${key} is not a valid Firestore timestamp.`);
      if (key === "registrationWindowStart" && now < millis) {
        return fail("failed-precondition", "The registration window has not started.");
      }
      if (key === "registrationWindowEnd" && now > millis) {
        return fail("failed-precondition", "The registration window has closed.");
      }
    }
    if (!categoryConfigSnapshot.exists) return fail("failed-precondition", "Category registration settings are not configured.");
    const categorySettings = categoryConfigSnapshot.data()![categoryCode];
    if (!categorySettings || typeof categorySettings !== "object" || Array.isArray(categorySettings)) {
      return fail("failed-precondition", "This category has no saved registration configuration.");
    }
    const settings = categorySettings as Data;
    if (!Number.isSafeInteger(settings.minTeam) || !Number.isSafeInteger(settings.maxTeam) ||
        (settings.minTeam as number) < 1 || (settings.maxTeam as number) < (settings.minTeam as number) ||
        (settings.maxTeam as number) > 400 || typeof settings.hasFee !== "boolean") {
      return fail("failed-precondition", "The saved category team-size or fee configuration is invalid.");
    }
    if (members.length < (settings.minTeam as number) || members.length > (settings.maxTeam as number)) {
      return fail("invalid-argument", `The category requires between ${settings.minTeam} and ${settings.maxTeam} students.`);
    }

    stage = "checking assigned school";
    const schoolSnapshot = await ref("schools", schoolId).get();
    if (!schoolSnapshot.exists) return fail("failed-precondition", "The assigned school does not exist.");

    stage = "saving team, students, registration, and audit record";
    const teamRef = db.collection("teams").doc();
    const registrationRef = db.collection("registrations").doc();
    const studentRefs = members.map(() => db.collection("students").doc());
    const batch = db.batch();
    batch.create(teamRef, {
      id: teamRef.id,
      seasonId,
      schoolId,
      categoryCode,
      teamName,
      ...(projectTitle ? { projectTitle } : {}),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    studentRefs.forEach((studentRef, index) => {
      batch.create(studentRef, {
        id: studentRef.id,
        schoolId,
        teamId: teamRef.id,
        ...members[index],
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    batch.create(registrationRef, {
      id: registrationRef.id,
      teamId: teamRef.id,
      schoolId,
      seasonId,
      categoryCode,
      state,
      eligibilitySnapshot: {
        memberCount: members.length,
        minTeam: settings.minTeam,
        maxTeam: settings.maxTeam,
      },
      feeStatus: settings.hasFee ? "PENDING" : "NOT_REQUIRED",
      ...(state === "SUBMITTED" ? { submittedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.create(db.collection("auditLogs").doc(), {
      actorUid: uid,
      action: state === "SUBMITTED" ? "REGISTRATION_SUBMITTED" : "REGISTRATION_DRAFT_CREATED",
      entityType: "registration",
      entityId: registrationRef.id,
      timestamp: FieldValue.serverTimestamp(),
      after: { teamId: teamRef.id, schoolId, seasonId, categoryCode, state },
    });
    await batch.commit();
    return { teamId: teamRef.id, registrationId: registrationRef.id };
  } catch (error) {
    logger.error("Team registration submission failed", {
      operation: "submitRegistration",
      stage,
      uid,
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
    });
    throw error;
  }
}, "submitRegistration");

export const recordManualPayment = makeCallable(async (uid, data) => {
  const invoiceId = requiredString(data, "invoiceId", 150);
  const amountMinorUnits = requiredInteger(data, "amountMinorUnits", 1, 1_000_000_000);
  const method = assertOneOf(data.method, ["CASH", "BANK_TRANSFER", "UPI", "OTHER"], "method");
  const idempotencyKey = requiredString(data, "idempotencyKey", 150);
  const externalReference = optionalString(data, "externalReference", 200);
  const proofStoragePath = optionalString(data, "proofStoragePath", 500);
  const notes = optionalString(data, "notes", 1000);
  const invoiceRef = ref("invoices", invoiceId);
  const id = hashId(`${uid}:${invoiceId}:${idempotencyKey}`);
  const paymentRef = ref("payments", id);

  const invoiceSnapshot = await invoiceRef.get();
  if (!invoiceSnapshot.exists) return fail("failed-precondition", "The invoice does not exist.");
  const invoice = invoiceSnapshot.data()!;
  const scope: Scope = {
    eventId: typeof invoice.eventId === "string" ? invoice.eventId : undefined,
    seasonId: typeof invoice.seasonId === "string" ? invoice.seasonId : undefined,
    districtId: typeof invoice.districtId === "string" ? invoice.districtId : undefined,
    schoolId: typeof invoice.schoolId === "string" ? invoice.schoolId : undefined,
    venueId: typeof invoice.venueId === "string" ? invoice.venueId : undefined,
    categoryCode: typeof invoice.categoryCode === "string" ? invoice.categoryCode : undefined,
  };
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR"], scope);
  const total = invoice.totalMinorUnits;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total <= 0) {
    return fail("failed-precondition", "The invoice has no valid totalMinorUnits.");
  }
  const paymentId = id;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(paymentRef);
    const currentInvoice = await transaction.get(invoiceRef);
    const paymentsSnapshot = await transaction.get(db.collection("payments").where("invoiceId", "==", invoiceId));
    const referenceSnapshot = externalReference
      ? await transaction.get(db.collection("payments").where("externalReference", "==", externalReference))
      : undefined;
    if (existing.exists) return;
    if (!currentInvoice.exists || currentInvoice.data()!.status === "VOIDED") {
      return fail("failed-precondition", "The invoice is unavailable or voided.");
    }
    const currentInvoiceData = currentInvoice.data()!;
    for (const field of ["eventId", "seasonId", "districtId", "schoolId", "venueId", "categoryCode"]) {
      if (currentInvoiceData[field] !== invoice[field]) {
        return fail("failed-precondition", "The invoice scope changed while the payment was being recorded.");
      }
    }
    const priorAmount = paymentsSnapshot.docs.reduce((sum, payment) => {
      const record = payment.data();
      return ["PENDING", "PARTIAL", "VERIFIED"].includes(String(record.status)) &&
        typeof record.amountMinorUnits === "number" ? sum + record.amountMinorUnits : sum;
    }, 0);
    const currentTotal = currentInvoice.data()!.totalMinorUnits;
    if (typeof currentTotal !== "number" || !Number.isSafeInteger(currentTotal) || amountMinorUnits > currentTotal - priorAmount) {
      return fail("failed-precondition", "The payment exceeds the invoice's remaining balance.");
    }
    if (referenceSnapshot?.docs.some((payment) => payment.id !== paymentId)) {
      return fail("failed-precondition", "The external reference has already been recorded.");
    }
    transaction.create(paymentRef, {
      id: paymentId,
      invoiceId,
      ...(typeof invoice.eventId === "string" ? { eventId: invoice.eventId } : {}),
      schoolId: requiredString(invoice, "schoolId", 150),
      ...(typeof invoice.teamId === "string" ? { teamId: invoice.teamId } : {}),
      amountMinorUnits,
      method,
      ...(externalReference ? { externalReference } : {}),
      ...(proofStoragePath ? { proofStoragePath } : {}),
      status: "PENDING",
      ...(notes ? { notes } : {}),
      idempotencyKey,
      receivedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      createdByUid: uid,
    });
    audit(transaction, uid, "MANUAL_PAYMENT_RECORDED", "payment", paymentId, undefined, {
      invoiceId,
      amountMinorUnits,
      method,
      status: "PENDING",
    });
  });
  return { paymentId, status: "PENDING" };
});

export const verifyManualPayment = makeCallable(async (uid, data) => {
  const invoiceId = requiredString(data, "invoiceId", 150);
  const amountMinorUnits = requiredInteger(data, "amountMinorUnits", 1, 1_000_000_000);
  const method = assertOneOf(data.method, ["CASH", "BANK_TRANSFER", "UPI", "OTHER"], "method");
  const idempotencyKey = requiredString(data, "idempotencyKey", 150);
  const externalReference = optionalString(data, "externalReference", 200);
  const notes = optionalString(data, "notes", 1000);
  const invoiceRef = ref("invoices", invoiceId);
  const invoiceSnapshot = await invoiceRef.get();
  if (!invoiceSnapshot.exists) return fail("failed-precondition", "The invoice does not exist.");
  const invoice = invoiceSnapshot.data()!;
  const scope: Scope = {
    eventId: typeof invoice.eventId === "string" ? invoice.eventId : undefined,
    seasonId: typeof invoice.seasonId === "string" ? invoice.seasonId : undefined,
    districtId: typeof invoice.districtId === "string" ? invoice.districtId : undefined,
    schoolId: typeof invoice.schoolId === "string" ? invoice.schoolId : undefined,
    venueId: typeof invoice.venueId === "string" ? invoice.venueId : undefined,
    categoryCode: typeof invoice.categoryCode === "string" ? invoice.categoryCode : undefined,
  };
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR"], scope);
  const totalMinorUnits = invoice.totalMinorUnits;
  if (typeof totalMinorUnits !== "number" || !Number.isSafeInteger(totalMinorUnits) || totalMinorUnits <= 0) {
    return fail("failed-precondition", "The invoice has no valid totalMinorUnits.");
  }
  const paymentId = hashId(`${uid}:${invoiceId}:${idempotencyKey}`);
  const paymentRef = ref("payments", paymentId);

  await db.runTransaction(async (transaction) => {
    const existingPayment = await transaction.get(paymentRef);
    if (existingPayment.exists) {
      if (existingPayment.data()!.status !== "VERIFIED") {
        return fail("failed-precondition", "This idempotency key already belongs to a payment that is not verified.");
      }
      return;
    }
    const currentInvoice = await transaction.get(invoiceRef);
    const paymentsSnapshot = await transaction.get(
      db.collection("payments").where("invoiceId", "==", invoiceId),
    );
    if (!currentInvoice.exists || currentInvoice.data()!.status === "VOIDED") {
      return fail("failed-precondition", "The invoice is unavailable or voided.");
    }
    const currentInvoiceData = currentInvoice.data()!;
    if (currentInvoiceData.totalMinorUnits !== totalMinorUnits ||
        currentInvoiceData.schoolId !== invoice.schoolId) {
      return fail("failed-precondition", "The invoice changed while verification was in progress.");
    }
    const pendingPayments = paymentsSnapshot.docs.filter((payment) => payment.data().status === "PENDING");
    if (pendingPayments.length > 1) {
      return fail("failed-precondition", "More than one pending payment exists. Resolve the pending payments before verifying.");
    }
    const pendingPayment = pendingPayments[0];
    const verifiedAmount = paymentsSnapshot.docs.reduce((sum, payment) => {
      const record = payment.data();
      return record.status === "VERIFIED" && typeof record.amountMinorUnits === "number"
        ? sum + record.amountMinorUnits
        : sum;
    }, 0);
    const currentPendingAmount = pendingPayment?.data().amountMinorUnits;
    if (pendingPayment && currentPendingAmount !== amountMinorUnits) {
      return fail("failed-precondition", "The amount must match the pending payment record.");
    }
    if (!pendingPayment && amountMinorUnits > totalMinorUnits - verifiedAmount) {
      return fail("failed-precondition", "The payment exceeds the invoice's remaining balance.");
    }
    if (externalReference && paymentsSnapshot.docs.some((payment) =>
      payment.id !== pendingPayment?.id && payment.data().externalReference === externalReference)) {
      return fail("failed-precondition", "The external reference has already been recorded.");
    }
    if (pendingPayment) {
      transaction.update(pendingPayment.ref, {
        status: "VERIFIED",
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedByUid: uid,
        method,
        ...(externalReference ? { externalReference } : {}),
        ...(notes ? { notes } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.create(paymentRef, {
        id: paymentId,
        invoiceId,
        ...(typeof invoice.eventId === "string" ? { eventId: invoice.eventId } : {}),
        schoolId: requiredString(invoice, "schoolId", 150),
        ...(typeof invoice.teamId === "string" ? { teamId: invoice.teamId } : {}),
        amountMinorUnits,
        method,
        ...(externalReference ? { externalReference } : {}),
        status: "VERIFIED",
        ...(notes ? { notes } : {}),
        idempotencyKey,
        receivedAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedByUid: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    const paidAmountMinorUnits = verifiedAmount + amountMinorUnits;
    transaction.update(invoiceRef, {
      paidAmountMinorUnits,
      status: paidAmountMinorUnits >= totalMinorUnits ? "VERIFIED" : "PARTIAL",
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "MANUAL_PAYMENT_VERIFIED", "payment", pendingPayment?.id ?? paymentId, {
      invoiceId,
      status: pendingPayment ? "PENDING" : undefined,
    }, {
      invoiceId,
      amountMinorUnits,
      method,
      status: "VERIFIED",
      verifiedByUid: uid,
    });
  });
  return { paymentId, status: "VERIFIED" };
});

export const reviewRegistration = makeCallable(async (uid, data) => {
  const registrationId = requiredString(data, "registrationId", 150);
  const requestedDecision = data.decision;
  const nextState = requestedDecision === undefined
    ? assertOneOf(data.state, ["APPROVED", "REJECTED", "CORRECTION_REQUIRED"], "state")
    : ({
      APPROVE: "APPROVED",
      REJECT: "REJECTED",
      REQUEST_CORRECTION: "CORRECTION_REQUIRED",
    } as const)[assertOneOf(requestedDecision, ["APPROVE", "REJECT", "REQUEST_CORRECTION"], "decision") as
      "APPROVE" | "REJECT" | "REQUEST_CORRECTION"];
  const reason = optionalString(data, "reason", 1000) ?? optionalString(data, "correctionNote", 1000);
  if (nextState === "CORRECTION_REQUIRED" && !reason) {
    return fail("invalid-argument", "A correction note is required when requesting corrections.");
  }
  const registrationRef = ref("registrations", registrationId);
  const initial = await registrationRef.get();
  if (!initial.exists) return fail("failed-precondition", "The registration does not exist.");
  const registration = initial.data()!;
  if (typeof registration.schoolId !== "string" || typeof registration.seasonId !== "string") {
    return fail("failed-precondition", "The registration is missing its school or season scope.");
  }
  const schoolSnapshot = await ref("schools", registration.schoolId).get();
  if (!schoolSnapshot.exists) return fail("failed-precondition", "The registration school does not exist.");
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], {
    schoolId: registration.schoolId,
    seasonId: registration.seasonId,
    districtId: typeof schoolSnapshot.data()!.districtId === "string" ? schoolSnapshot.data()!.districtId : undefined,
  });
  await db.runTransaction(async (transaction) => {
    const [current, currentSchool] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(ref("schools", registration.schoolId)),
    ]);
    if (!current.exists || !currentSchool.exists) return fail("failed-precondition", "The registration or school no longer exists.");
    const before = current.data()!;
    if (before.schoolId !== registration.schoolId || before.seasonId !== registration.seasonId ||
        currentSchool.data()!.districtId !== schoolSnapshot.data()!.districtId) {
      return fail("failed-precondition", "The registration scope changed during review.");
    }
    const allowedSources = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED"];
    if (!allowedSources.includes(String(before.state))) {
      return fail("failed-precondition", "Only submitted or reviewable registrations can be changed.");
    }
    if (before.state === "CORRECTION_REQUIRED" && nextState === "CORRECTION_REQUIRED") {
      return fail("failed-precondition", "The registration already requires correction.");
    }
    if (nextState === "APPROVED" && !["NOT_REQUIRED", "VERIFIED", "WAIVED"].includes(String(before.feeStatus))) {
      return fail("failed-precondition", "A registration with an outstanding fee cannot be approved.");
    }
    const after: Data = {
      state: nextState,
      approvalActor: uid,
      reviewedByUid: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (nextState === "APPROVED") after.approvedAt = FieldValue.serverTimestamp();
    if (nextState === "REJECTED" && reason) after.rejectionReason = reason;
    if (nextState === "CORRECTION_REQUIRED") after.correctionReason = reason;
    transaction.update(registrationRef, after);
    audit(transaction, uid, "REGISTRATION_REVIEWED", "registration", registrationId, {
      state: before.state,
    }, {
      state: nextState,
      ...(reason ? { reason } : {}),
      seasonId: registration.seasonId,
    });
  });
  return { registrationId, state: nextState };
});

export const stopArena = makeCallable(async (uid, data) => {
  const arenaId = requiredString(data, "arenaId", 150);
  const reason = optionalString(data, "reason", 1000);
  const arenaRef = ref("arenas", arenaId);
  const arenaSnapshot = await arenaRef.get();
  if (!arenaSnapshot.exists) return fail("failed-precondition", "The arena does not exist.");
  const arena = arenaSnapshot.data()!;
  if (typeof arena.venueId !== "string") return fail("failed-precondition", "The arena has no venue assignment.");
  const venueSnapshot = await ref("venues", arena.venueId).get();
  if (!venueSnapshot.exists) return fail("failed-precondition", "The arena venue does not exist.");
  const venue = venueSnapshot.data()!;
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR"], {
    venueId: arena.venueId,
    districtId: typeof venue.districtId === "string" ? venue.districtId : undefined,
  });
  await db.runTransaction(async (transaction) => {
    const [current, currentVenue] = await Promise.all([
      transaction.get(arenaRef),
      transaction.get(ref("venues", arena.venueId)),
    ]);
    if (!current.exists || !currentVenue.exists || current.data()!.venueId !== arena.venueId ||
        currentVenue.data()!.districtId !== venue.districtId) {
      return fail("failed-precondition", "The arena or its venue assignment changed.");
    }
    const before = current.data()!;
    if (before.status === "STOPPED") return;
    transaction.update(arenaRef, {
      status: "STOPPED",
      stoppedAt: FieldValue.serverTimestamp(),
      stoppedByUid: uid,
      ...(reason ? { stopReason: reason } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "ARENA_STOPPED", "arena", arenaId, {
      status: before.status ?? null,
    }, { status: "STOPPED", venueId: arena.venueId, ...(reason ? { reason } : {}) });
  });
  return { arenaId, status: "STOPPED" };
});

export const requestTeamAdjustment = makeCallable(async (uid, data) => {
  const type = assertOneOf(data.type, ["MERGE_TEAMS", "TRANSFER_MEMBERS"], "type");
  const sourceEntryId = requiredString(data, "sourceEntryId", 150);
  const targetEntryId = requiredString(data, "targetEntryId", 150);
  const reason = requiredString(data, "reason", 1000);
  if (sourceEntryId === targetEntryId) return fail("invalid-argument", "Source and target entries must differ.");
  if (!Array.isArray(data.studentIds) || data.studentIds.length < 1 || data.studentIds.length > 50) {
    return fail("invalid-argument", "studentIds must contain between 1 and 50 student IDs.");
  }
  const studentIds = data.studentIds.map((value) => {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 150) {
      return fail("invalid-argument", "Each student ID must be a non-empty string.");
    }
    return value.trim();
  });
  if (new Set(studentIds).size !== studentIds.length) return fail("invalid-argument", "studentIds must be unique.");

  const sourceRef = ref("stageEntries", sourceEntryId);
  const targetRef = ref("stageEntries", targetEntryId);
  const [sourceSnap, targetSnap] = await Promise.all([sourceRef.get(), targetRef.get()]);
  if (!sourceSnap.exists || !targetSnap.exists) return fail("failed-precondition", "Both stage entries must exist.");
  const source = sourceSnap.data()!;
  const target = targetSnap.data()!;
  if (source.eventId !== target.eventId || source.teamId === target.teamId) {
    return fail("failed-precondition", "Entries must belong to different teams in the same event.");
  }
  if (!["APPROVED", "CHECKED_IN"].includes(String(source.entryStatus)) ||
      !["APPROVED", "CHECKED_IN"].includes(String(target.entryStatus))) {
    return fail("failed-precondition", "Both teams must have approved, active stage entries.");
  }
  if (source.competitionStarted === true || target.competitionStarted === true) {
    return fail("failed-precondition", "Team adjustments are unavailable after competition begins.");
  }
  const [sourceTeamSnap, targetTeamSnap] = await Promise.all([
    ref("teams", String(source.teamId)).get(),
    ref("teams", String(target.teamId)).get(),
  ]);
  if (!sourceTeamSnap.exists || !targetTeamSnap.exists) return fail("failed-precondition", "Entry teams must exist.");
  const sourceTeam = sourceTeamSnap.data()!;
  const targetTeam = targetTeamSnap.data()!;
  if (sourceTeam.schoolId !== targetTeam.schoolId) {
    return fail("failed-precondition", "Cross-school adjustments are not supported without the required consent schema.");
  }
  for (const studentId of studentIds) {
    await verifyStudentOnEntry(studentId, String(source.teamId));
  }
  const scope = await getEventScope(String(source.eventId));
  scope.schoolId = String(sourceTeam.schoolId);
  await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR", "SCHOOL_COORDINATOR"], scope);
  const requestRef = db.collection("teamAdjustmentRequests").doc();
  const auditRef = db.collection("auditLogs").doc();
  const batch = db.batch();
  batch.create(requestRef, {
    id: requestRef.id,
    type,
    sourceEntryId,
    targetEntryId,
    studentIds,
    schoolId: sourceTeam.schoolId,
    reason,
    requestedBy: uid,
    acknowledgements: [],
    status: "PENDING_ACKNOWLEDGEMENT",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.create(auditRef, {
    actorUid: uid,
    action: "TEAM_ADJUSTMENT_REQUESTED",
    entityType: "teamAdjustmentRequest",
    entityId: requestRef.id,
    timestamp: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { requestId: requestRef.id, status: "PENDING_ACKNOWLEDGEMENT" };
});

export const approveTeamAdjustment = makeCallable(async (uid, data) => {
  const requestId = requiredString(data, "requestId", 150);
  const decision = assertOneOf(data.decision, ["APPROVE", "REJECT"], "decision");
  const reason = optionalString(data, "reason", 1000);
  if (decision === "REJECT" && !reason) return fail("invalid-argument", "A rejection reason is required.");
  const requestRef = ref("teamAdjustmentRequests", requestId);
  const snapshot = await requestRef.get();
  if (!snapshot.exists) return fail("failed-precondition", "The adjustment request does not exist.");
  const request = snapshot.data()!;
  const sourceEntry = await ref("stageEntries", String(request.sourceEntryId)).get();
  if (!sourceEntry.exists) return fail("failed-precondition", "The source stage entry does not exist.");
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], String(sourceEntry.data()!.eventId));
  if (decision === "APPROVE") {
    return fail(
      "failed-precondition",
      "Approval is disabled until the acknowledgement contract, roster mutation rules, and eligibility limits are defined.",
    );
  }
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(requestRef);
    if (!current.exists || current.data()!.status !== request.status) {
      return fail("failed-precondition", "The adjustment request changed during review.");
    }
    if (!["PENDING_ACKNOWLEDGEMENT", "PENDING_REVIEW"].includes(String(request.status))) {
      return fail("failed-precondition", "Only pending adjustment requests can be rejected.");
    }
    transaction.update(requestRef, {
      status: "REJECTED",
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });
    audit(transaction, uid, "TEAM_ADJUSTMENT_REJECTED", "teamAdjustmentRequest", requestId, {
      status: request.status,
    }, { status: "REJECTED", reason });
  });
  return { requestId, status: "REJECTED" };
});

export const commitTeamImport = makeCallable(async (uid, data) => {
  if (typeof data.jobId === "string") {
    const jobId = requiredString(data, "jobId", 150);
    const jobRef = ref("importJobs", jobId);
    const snapshot = await jobRef.get();
    if (!snapshot.exists) return fail("failed-precondition", "The import job does not exist.");
    const job = snapshot.data()!;
    if (job.uploaderUid !== uid) {
      const scope: Scope = { schoolId: typeof job.schoolId === "string" ? job.schoolId : undefined };
      await requireRole(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], scope);
    } else {
      await requireRole(uid, ["SCHOOL_COORDINATOR"], {
        schoolId: typeof job.schoolId === "string" ? job.schoolId : undefined,
      });
    }
    if (job.status !== "VALIDATED") return fail("failed-precondition", "Only a validated import can be committed.");
  } else {
    const schoolId = requiredString(data, "schoolId", 150);
    requiredString(data, "seasonId", 150);
    requiredString(data, "idempotencyKey", 150);
    if (!Array.isArray(data.rows) || data.rows.length === 0 || data.rows.length > 400) {
      return fail("invalid-argument", "rows must contain between 1 and 400 import rows.");
    }
    const assignment = await ref("roleAssignments", `${uid}_SCHOOL_COORDINATOR`).get();
    if (!assignment.exists || assignment.data()!.active !== true ||
        assignment.data()!.role !== "SCHOOL_COORDINATOR" || assignment.data()!.scopeId !== schoolId) {
      return fail("permission-denied", "The import school must match the authenticated coordinator's active assignment.");
    }
  }
  return fail(
    "failed-precondition",
    "The import workflow has no server-owned validated-row snapshot and complete idempotent job contract; raw client preview rows cannot be committed safely.",
  );
});

export const approveQualifiers = makeCallable(async (uid, data) => {
  const eventId = requiredString(data, "eventId", 150);
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], eventId);
  return fail(
    "failed-precondition",
    "Qualification cannot be approved until the official ranking policy, quota, and immutable qualifier-preview schema are defined.",
  );
});

export const publishResults = makeCallable(async (uid, data) => {
  const resultIds = data.resultId !== undefined
    ? [requiredString(data, "resultId", 150)]
    : Array.isArray(data.resultIds)
      ? data.resultIds.map((id) => {
        if (typeof id !== "string" || id.trim() === "" || id.length > 150) {
          return fail("invalid-argument", "Each result ID must be a non-empty string.");
        }
        return id.trim();
      })
      : [];
  if (resultIds.length === 0 || resultIds.length > MAX_BATCH_SIZE) {
    return fail("invalid-argument", `Provide a resultId or between 1 and ${MAX_BATCH_SIZE} resultIds.`);
  }
  if (new Set(resultIds).size !== resultIds.length) return fail("invalid-argument", "resultIds must be unique.");
  const resultRefs = resultIds.map((id) => ref("results", id));
  const snapshots = await db.getAll(...resultRefs);
  for (const snapshot of snapshots) {
    if (!snapshot.exists || typeof snapshot.data()!.eventId !== "string" ||
        typeof snapshot.data()!.entryId !== "string" || typeof snapshot.data()!.rank !== "number") {
      return fail("failed-precondition", "Every result must have an event, entry, and computed rank.");
    }
    await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], snapshot.data()!.eventId as string);
    const cards = await db.collection("scorecards").where("entryId", "==", snapshot.data()!.entryId).get();
    if (cards.empty || cards.docs.some((card) => card.data().status !== "LOCKED")) {
      return fail("failed-precondition", "Every result must have scorecards and all related scorecards must be locked.");
    }
  }
  for (let offset = 0; offset < resultRefs.length; offset += MAX_BATCH_SIZE) {
    const refs = resultRefs.slice(offset, offset + MAX_BATCH_SIZE);
    await db.runTransaction(async (transaction) => {
      const current = await Promise.all(refs.map((resultRef) => transaction.get(resultRef)));
      current.forEach((snapshot, index) => {
        const result = snapshot.data();
        if (!snapshot.exists || typeof result?.eventId !== "string" ||
            typeof result.entryId !== "string" || typeof result.rank !== "number") {
          return fail("failed-precondition", "A result changed or is no longer publishable.");
        }
        if (result.publishedAt == null) {
          transaction.update(refs[index], {
            publishedAt: FieldValue.serverTimestamp(),
            publishedByUid: uid,
          });
          audit(transaction, uid, "RESULT_PUBLISHED", "result", refs[index].id, undefined, {
            eventId: result.eventId,
            rank: result.rank,
          });
        }
      });
    });
  }
  return { publishedCount: resultIds.length, resultIds };
});

export const issueCertificate = makeCallable(async (uid, data) => {
  const resultId = requiredString(data, "resultId", 150);
  const recipientType = data.recipientType === undefined
    ? "TEAM"
    : assertOneOf(data.recipientType, ["TEAM", "STUDENT"], "recipientType");
  const studentId = recipientType === "STUDENT" ? requiredString(data, "studentId", 150) : undefined;
  const resultRef = ref("results", resultId);
  const resultSnapshot = await resultRef.get();
  if (!resultSnapshot.exists) return fail("failed-precondition", "The result does not exist.");
  const result = resultSnapshot.data()!;
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN"], String(result.eventId));
  if (result.publishedAt == null || typeof result.entryId !== "string") {
    return fail("failed-precondition", "A certificate requires a published result with an entry.");
  }
  const entrySnapshot = await ref("stageEntries", result.entryId).get();
  if (!entrySnapshot.exists) return fail("failed-precondition", "The result's stage entry does not exist.");
  const entry = entrySnapshot.data()!;
  if (studentId) {
    const [studentSnapshot, teamSnapshot] = await Promise.all([
      ref("students", studentId).get(),
      ref("teams", String(entry.teamId)).get(),
    ]);
    if (!studentSnapshot.exists) return fail("failed-precondition", "The student does not exist.");
    if (!teamSnapshot.exists) return fail("failed-precondition", "The result team does not exist.");
    const student = studentSnapshot.data()!;
    const memberships = await db.collection("teamMemberships").where("studentId", "==", studentId).get();
    const activeMembership = memberships.docs.some((doc) => {
      const membership = doc.data();
      return membership.status !== "INACTIVE" && membership.validTo == null;
    });
    if (student.schoolId !== teamSnapshot.data()!.schoolId ||
        (student.teamId !== entry.teamId && !activeMembership)) {
      return fail("failed-precondition", "The student is not associated with the result team.");
    }
  }
  const certificateId = hashId(`${resultId}:${recipientType}:${studentId ?? "team"}`);
  const certificateRef = ref("certificates", certificateId);
  const publicVerificationCode = randomBytes(24).toString("base64url");
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(certificateRef);
    if (existing.exists) return;
    transaction.create(certificateRef, {
      id: certificateId,
      resultId,
      eventId: result.eventId,
      entryId: result.entryId,
      teamId: entry.teamId,
      ...(studentId ? { studentId } : {}),
      recipientType,
      publicVerificationCode,
      status: "ACTIVE",
      issuedAt: FieldValue.serverTimestamp(),
      issuedByUid: uid,
    });
    audit(transaction, uid, "CERTIFICATE_ISSUED", "certificate", certificateId, undefined, {
      resultId,
      recipientType,
    });
  });
  return { certificateId };
});

export const checkInTeam = makeCallable(async (uid, data) => {
  const entryId = requiredString(data, "entryId", 150);
  const entryRef = ref("stageEntries", entryId);
  const entrySnapshot = await entryRef.get();
  if (!entrySnapshot.exists) return fail("failed-precondition", "The stage entry does not exist.");
  const entry = entrySnapshot.data()!;
  if (data.eventId !== undefined && data.eventId !== entry.eventId) {
    return fail("failed-precondition", "The supplied event does not match the stage entry.");
  }
  if (data.teamId !== undefined && data.teamId !== entry.teamId) {
    return fail("failed-precondition", "The supplied team does not match the stage entry.");
  }
  const scope = await requireRoleForEvent(
    uid,
    ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR", "CHECKIN_VOLUNTEER"],
    String(entry.eventId),
  );
  const eventRef = ref("events", String(entry.eventId));
  const eventSnapshot = await eventRef.get();
  if (eventSnapshot.data()?.state !== "ACTIVE") return fail("failed-precondition", "Only active events allow team check-in.");
  await db.runTransaction(async (transaction) => {
    const [current, currentEvent] = await Promise.all([
      transaction.get(entryRef),
      transaction.get(eventRef),
    ]);
    if (!current.exists || !currentEvent.exists) return fail("failed-precondition", "The stage entry or event no longer exists.");
    const currentEntry = current.data()!;
    const event = currentEvent.data()!;
    if (currentEntry.eventId !== entry.eventId || currentEntry.teamId !== entry.teamId ||
        event.state !== "ACTIVE" || event.districtId !== scope.districtId ||
        event.venueId !== scope.venueId || event.categoryCode !== scope.categoryCode) {
      return fail("failed-precondition", "The event or entry scope changed before check-in.");
    }
    if (currentEntry.entryStatus === "CHECKED_IN") return;
    if (currentEntry.entryStatus !== "APPROVED") return fail("failed-precondition", "Only approved entries can be checked in.");
    if (currentEntry.competitionStarted === true) return fail("failed-precondition", "Competition has already started for this entry.");
    transaction.update(entryRef, {
      entryStatus: "CHECKED_IN",
      checkedInAt: FieldValue.serverTimestamp(),
      checkedInByUid: uid,
    });
    audit(transaction, uid, "TEAM_CHECKED_IN", "stageEntry", entryId, {
      entryStatus: "APPROVED",
    }, { entryStatus: "CHECKED_IN", eventId: scope.eventId });
  });
  return { entryId, entryStatus: "CHECKED_IN" };
});

async function verifyStudentOnEntry(studentId: string, teamId: string): Promise<void> {
  const studentSnapshot = await ref("students", studentId).get();
  if (!studentSnapshot.exists) return fail("failed-precondition", "The student does not exist.");
  const student = studentSnapshot.data()!;
  const memberships = await db.collection("teamMemberships").where("studentId", "==", studentId).get();
  if (!studentBelongsToTeam(student, memberships.docs.map((doc) => doc.data()), teamId)) {
    return fail("failed-precondition", "The student is not on the entry's active roster.");
  }
}

function studentBelongsToTeam(student: DocumentData, memberships: DocumentData[], teamId: string): boolean {
  return student.teamId === teamId || memberships.some((membership) =>
    membership.teamId === teamId && membership.status !== "INACTIVE" && membership.validTo == null);
}

export const recordStudentAttendance = makeCallable(async (uid, data) => {
  const eventId = requiredString(data, "eventId", 150);
  const entryId = requiredString(data, "entryId", 150);
  const studentId = requiredString(data, "studentId", 150);
  const status = assertOneOf(data.status, ["PRESENT", "ABSENT"], "status");
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR", "CHECKIN_VOLUNTEER"], eventId);
  const entryRef = ref("stageEntries", entryId);
  const entrySnapshot = await entryRef.get();
  if (!entrySnapshot.exists || entrySnapshot.data()!.eventId !== eventId) {
    return fail("failed-precondition", "The entry must belong to the requested event.");
  }
  const entry = entrySnapshot.data()!;
  if (!["APPROVED", "CHECKED_IN", "COMPETING"].includes(String(entry.entryStatus))) {
    return fail("failed-precondition", "The entry is not eligible for attendance.");
  }
  await verifyStudentOnEntry(studentId, String(entry.teamId));
  const attendanceRef = ref("studentAttendance", hashId(`${eventId}:${entryId}:${studentId}`));
  await db.runTransaction(async (transaction) => {
    const [existing, currentEntry, studentSnapshot, memberships] = await Promise.all([
      transaction.get(attendanceRef),
      transaction.get(entryRef),
      transaction.get(ref("students", studentId)),
      transaction.get(db.collection("teamMemberships").where("studentId", "==", studentId)),
    ]);
    if (!currentEntry.exists || currentEntry.data()!.eventId !== eventId ||
        currentEntry.data()!.teamId !== entry.teamId) {
      return fail("failed-precondition", "The stage entry scope changed before attendance was recorded.");
    }
    if (!studentSnapshot.exists || !studentBelongsToTeam(studentSnapshot.data()!, memberships.docs.map((doc) => doc.data()), String(entry.teamId))) {
      return fail("failed-precondition", "The student is no longer on the entry's active roster.");
    }
    if (existing.exists) {
      if (existing.data()!.status === status) return;
      return fail("failed-precondition", "Attendance has already been recorded with a different status.");
    }
    transaction.create(attendanceRef, {
      eventId,
      entryId,
      teamId: entry.teamId,
      studentId,
      status,
      actorUid: uid,
      recordedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "STUDENT_ATTENDANCE_RECORDED", "studentAttendance", attendanceRef.id, undefined, {
      eventId, entryId, studentId, status,
    });
  });
  return { attendanceId: attendanceRef.id, status };
});

async function trainingContext(
  uid: string,
  sessionId: string,
  entryId: string,
  studentId: string,
  roles: string[],
) {
  const [sessionSnapshot, entrySnapshot] = await Promise.all([
    ref("trainingSessions", sessionId).get(),
    ref("stageEntries", entryId).get(),
  ]);
  if (!sessionSnapshot.exists || !entrySnapshot.exists) return fail("failed-precondition", "The session and stage entry must exist.");
  const session = sessionSnapshot.data()!;
  const entry = entrySnapshot.data()!;
  if (session.eventId !== entry.eventId || ![1, 2].includes(session.dayNumber)) {
    return fail("failed-precondition", "Session and entry must belong to the same event and configured training day.");
  }
  const eventScope = await getEventScope(String(session.eventId));
  await requireRole(uid, roles, { ...eventScope, venueId: String(session.venueId) });
  await verifyStudentOnEntry(studentId, String(entry.teamId));
  return { session, entry };
}

export const markTrainingAttendance = makeCallable(async (uid, data) => {
  const sessionId = requiredString(data, "sessionId", 150);
  const entryId = requiredString(data, "entryId", 150);
  const studentId = requiredString(data, "studentId", 150);
  const status = assertOneOf(data.status, ["PRESENT", "ABSENT"], "status");
  const { session, entry } = await trainingContext(
    uid,
    sessionId,
    entryId,
    studentId,
    ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR"],
  );
  if (data.eventId !== undefined && data.eventId !== session.eventId) {
    return fail("failed-precondition", "The supplied event does not match the training session.");
  }
  if (data.teamId !== undefined && data.teamId !== entry.teamId) {
    return fail("failed-precondition", "The supplied team does not match the stage entry.");
  }
  if (data.dayNumber !== undefined && data.dayNumber !== session.dayNumber) {
    return fail("failed-precondition", "The supplied day number does not match the training session.");
  }
  const attendanceRef = ref("trainingAttendance", hashId(`${sessionId}:${studentId}`));
  await db.runTransaction(async (transaction) => {
    const [existing, currentSession, currentEntry, studentSnapshot, memberships] = await Promise.all([
      transaction.get(attendanceRef),
      transaction.get(ref("trainingSessions", sessionId)),
      transaction.get(ref("stageEntries", entryId)),
      transaction.get(ref("students", studentId)),
      transaction.get(db.collection("teamMemberships").where("studentId", "==", studentId)),
    ]);
    if (!currentSession.exists || !currentEntry.exists ||
        currentSession.data()!.eventId !== session.eventId ||
        currentSession.data()!.venueId !== session.venueId ||
        currentSession.data()!.dayNumber !== session.dayNumber ||
        currentEntry.data()!.eventId !== session.eventId ||
        currentEntry.data()!.teamId !== entry.teamId) {
      return fail("failed-precondition", "The training session or entry scope changed before attendance was marked.");
    }
    if (!studentSnapshot.exists ||
        !studentBelongsToTeam(studentSnapshot.data()!, memberships.docs.map((doc) => doc.data()), String(entry.teamId))) {
      return fail("failed-precondition", "The student is no longer on the entry's active roster.");
    }
    if (existing.exists) {
      if (existing.data()!.status === status) return;
      return fail("failed-precondition", "Training attendance is already marked; use the correction operation.");
    }
    transaction.create(attendanceRef, {
      id: attendanceRef.id,
      sessionId,
      eventId: session.eventId,
      entryId,
      teamId: entry.teamId,
      studentId,
      dayNumber: session.dayNumber,
      status,
      markedAt: FieldValue.serverTimestamp(),
      markedByUid: uid,
      revision: 1,
    });
    audit(transaction, uid, "TRAINING_ATTENDANCE_MARKED", "trainingAttendance", attendanceRef.id, undefined, {
      sessionId, studentId, status, dayNumber: session.dayNumber,
    });
  });
  return { attendanceId: attendanceRef.id, status };
});

export const correctTrainingAttendance = makeCallable(async (uid, data) => {
  const requestedAttendanceId = optionalString(data, "attendanceId", 150);
  let sessionId = optionalString(data, "sessionId", 150);
  let studentId = optionalString(data, "studentId", 150);
  const status = assertOneOf(data.status, ["PRESENT", "ABSENT"], "status");
  const reason = optionalString(data, "reason", 1000) ?? optionalString(data, "correctionReason", 1000);
  if (!reason) return fail("invalid-argument", "A correction reason is required.");
  if (!requestedAttendanceId && (!sessionId || !studentId)) {
    return fail("invalid-argument", "Provide attendanceId or both sessionId and studentId.");
  }
  const attendanceRef = requestedAttendanceId
    ? ref("trainingAttendance", requestedAttendanceId)
    : ref("trainingAttendance", hashId(`${sessionId}:${studentId}`));
  const initial = await attendanceRef.get();
  if (!initial.exists) return fail("failed-precondition", "A marked training attendance record is required before correction.");
  const record = initial.data()!;
  sessionId ??= typeof record.sessionId === "string" ? record.sessionId : undefined;
  studentId ??= typeof record.studentId === "string" ? record.studentId : undefined;
  if (!sessionId || !studentId || record.sessionId !== sessionId || record.studentId !== studentId) {
    return fail("failed-precondition", "The attendance ID does not match the supplied session and student.");
  }
  const { session } = await trainingContext(
    uid,
    sessionId,
    String(record.entryId),
    studentId,
    ["SUPER_ADMIN", "DISTRICT_ADMIN", "VENUE_COORDINATOR"],
  );
  await db.runTransaction(async (transaction) => {
    const [current, currentSession, currentEntry] = await Promise.all([
      transaction.get(attendanceRef),
      transaction.get(ref("trainingSessions", sessionId)),
      transaction.get(ref("stageEntries", String(record.entryId))),
    ]);
    if (!current.exists || !currentSession.exists || !currentEntry.exists) {
      return fail("failed-precondition", "The attendance record, session, or entry no longer exists.");
    }
    const before = current.data()!;
    if (before.sessionId !== sessionId || before.studentId !== studentId || before.status === status ||
        currentSession.data()!.eventId !== session.eventId ||
        currentSession.data()!.venueId !== session.venueId ||
        currentSession.data()!.dayNumber !== session.dayNumber ||
        currentEntry.data()!.eventId !== session.eventId ||
        currentEntry.data()!.teamId !== record.teamId) {
      return fail("failed-precondition", "The attendance record changed or already has the requested status.");
    }
    if (typeof before.revision !== "number" || !Number.isSafeInteger(before.revision) || before.revision < 1) {
      return fail("failed-precondition", "The attendance record has no valid revision.");
    }
    const revision = before.revision + 1;
    transaction.update(attendanceRef, {
      status,
      correctionReason: reason,
      markedAt: FieldValue.serverTimestamp(),
      markedByUid: uid,
      revision,
    });
    audit(transaction, uid, "TRAINING_ATTENDANCE_CORRECTED", "trainingAttendance", attendanceRef.id, {
      status: before.status,
      revision: before.revision,
    }, { status, revision, reason, dayNumber: session.dayNumber });
  });
  return { attendanceId: attendanceRef.id, status };
});

export const recordMatchBout = makeCallable(async (uid, data) => {
  const matchId = requiredString(data, "matchId", 150);
  const boutNumber = requiredInteger(data, "boutNumber", 1, 1_000_000);
  const winnerInput = optionalString(data, "winner", 150);
  const outcome = winnerInput
    ? (winnerInput === "DRAW" ? "DRAW" : "WIN")
    : assertOneOf(data.outcome, ["WIN", "DRAW", "FORFEIT", "DISQUALIFICATION", "NO_CONTEST"], "outcome");
  const durationMs = data.durationMs !== undefined
    ? requiredInteger(data, "durationMs", 0, 86_400_000)
    : Math.round(requiredNumber(data, "durationSeconds", 0, 86_400) * 1000);
  const penaltyCount = data.penaltyCount === undefined ? 0 : requiredInteger(data, "penaltyCount", 0, 1000);
  const penaltyNote = optionalString(data, "penaltyNote", 1000);
  const matchRef = ref("matches", matchId);
  const initial = await matchRef.get();
  if (!initial.exists) return fail("failed-precondition", "The match does not exist.");
  const match = initial.data()!;
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "HEAD_JUDGE", "JUDGE"], String(match.eventId));
  await requireScoringAccess(uid, String(match.eventId));
  const allowedEntries = [match.entryAId, match.entryBId].filter((value) => typeof value === "string");
  let winnerId = optionalString(data, "winnerId", 150);
  if (winnerInput === "TEAM_A") winnerId = typeof match.entryAId === "string" ? match.entryAId : undefined;
  if (winnerInput === "TEAM_B") winnerId = typeof match.entryBId === "string" ? match.entryBId : undefined;
  if (winnerInput && !["TEAM_A", "TEAM_B", "DRAW"].includes(winnerInput)) {
    return fail("invalid-argument", "winner must be TEAM_A, TEAM_B, or DRAW.");
  }
  if (winnerId && !allowedEntries.includes(winnerId)) return fail("invalid-argument", "winnerId must be one of the match entries.");
  if ((outcome === "WIN" || outcome === "FORFEIT") !== Boolean(winnerId)) {
    return fail("invalid-argument", "A winner is required only for WIN or FORFEIT outcomes.");
  }
  const boutRef = ref("matchBouts", hashId(`${matchId}:${boutNumber}`));
  await db.runTransaction(async (transaction) => {
    const [currentMatch, existingBout] = await Promise.all([
      transaction.get(matchRef),
      transaction.get(boutRef),
    ]);
    if (!currentMatch.exists || currentMatch.data()!.status === "COMPLETED") {
      return fail("failed-precondition", "The match is unavailable or already completed.");
    }
    if (existingBout.exists) return fail("failed-precondition", "This bout number has already been recorded.");
    const bout = {
      id: boutRef.id,
      matchId,
      boutNumber,
      ...(winnerId ? { winnerId } : {}),
      ...(winnerInput ? { winner: winnerInput } : {}),
      outcome,
      durationMs,
      penaltyCount,
      ...(penaltyNote ? { penaltyNote } : {}),
      ...(data.durationSeconds !== undefined ? { durationSeconds: durationMs / 1000 } : {}),
      refereeUid: uid,
      recordedAt: FieldValue.serverTimestamp(),
    };
    transaction.create(boutRef, bout);
    transaction.update(matchRef, {
      updatedVersion: (typeof currentMatch.data()!.updatedVersion === "number" ? currentMatch.data()!.updatedVersion : 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "MATCH_BOUT_RECORDED", "matchBout", boutRef.id, undefined, {
      matchId, boutNumber, outcome, winnerId: winnerId ?? null,
    });
  });
  return { boutId: boutRef.id };
});

export const recordTimedRun = makeCallable(async (uid, data) => {
  const entryId = requiredString(data, "entryId", 150);
  const attemptIndex = data.attemptIndex === undefined
    ? undefined
    : requiredInteger(data, "attemptIndex", 1, 1_000_000);
  const elapsedSource = data.elapsedMs === undefined ? "elapsedMilliseconds" : "elapsedMs";
  const elapsedMs = requiredInteger(data, elapsedSource, 0, 86_400_000);
  const completed = data.completed === undefined ? true : data.completed;
  if (typeof completed !== "boolean") return fail("invalid-argument", "completed must be a boolean.");
  const checkpoints = data.checkpoints ?? [];
  const violations = data.violations ?? [];
  const strings = (value: unknown, field: string) => {
    if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== "string" || item.length > 100)) {
      return fail("invalid-argument", `${field} must be an array of at most 100 short strings.`);
    }
    return value as string[];
  };
  const checkpointIds = strings(checkpoints, "checkpoints");
  const violationCodes = strings(violations, "violations");
  const entryRef = ref("stageEntries", entryId);
  const entrySnapshot = await entryRef.get();
  if (!entrySnapshot.exists) return fail("failed-precondition", "The stage entry does not exist.");
  const entry = entrySnapshot.data()!;
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "HEAD_JUDGE", "JUDGE"], String(entry.eventId));
  await requireScoringAccess(uid, String(entry.eventId));
  let createdRunId = "";
  await db.runTransaction(async (transaction) => {
    const existingRuns = await transaction.get(db.collection("timedRuns").where("entryId", "==", entryId));
    const selectedAttempt = attemptIndex ?? (existingRuns.docs.reduce((maximum, run) => {
      const value = run.data().attemptIndex;
      return typeof value === "number" && Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
    }, 0) + 1);
    if (selectedAttempt > 1_000_000) return fail("failed-precondition", "The safe attempt index range is exhausted.");
    if (existingRuns.docs.some((run) => run.data().attemptIndex === selectedAttempt)) {
      return fail("failed-precondition", "This attempt has already been recorded.");
    }
    const runRef = ref("timedRuns", hashId(`${entryId}:${selectedAttempt}`));
    createdRunId = runRef.id;
    transaction.create(runRef, {
      id: runRef.id,
      entryId,
      eventId: entry.eventId,
      attemptIndex: selectedAttempt,
      elapsedMs,
      elapsedMilliseconds: elapsedMs,
      checkpoints: checkpointIds,
      violations: violationCodes,
      completed,
      status: "RECORDED",
      state: "SUBMITTED",
      judgeUid: uid,
      submittedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "TIMED_RUN_RECORDED", "timedRun", runRef.id, undefined, {
      entryId, attemptIndex: selectedAttempt, elapsedMs, completed,
    });
  });
  return { runId: createdRunId, entryId, status: "RECORDED" };
});

type SubmittedRubricItem = { criterionId: string; score: number; comment?: string };

export const submitScorecard = makeCallable(async (uid, data) => {
  const scorecardId = requiredString(data, "scorecardId", 150);
  const scorecardRef = ref("scorecards", scorecardId);
  const scorecardSnapshot = await scorecardRef.get();
  if (!scorecardSnapshot.exists) return fail("failed-precondition", "The scorecard does not exist.");
  const scorecard = scorecardSnapshot.data()!;
  if (scorecard.judgeUid !== uid) return fail("permission-denied", "Only the assigned judge can submit this scorecard.");
  const expectedRevision = data.expectedRevision === undefined
    ? scorecard.revision
    : requiredInteger(data, "expectedRevision", 0, 1_000_000);
  if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return fail("failed-precondition", "The draft scorecard has no valid revision.");
  }
  const rawItems = data.rubricItems === undefined ? scorecard.rubricItems : data.rubricItems;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 100) {
    return fail("invalid-argument", "The draft must contain between 1 and 100 rubric items.");
  }
  const submittedItems: SubmittedRubricItem[] = rawItems.map((value) => {
    const item = asData(value);
    return {
      criterionId: requiredString(item, "criterionId", 150),
      score: requiredNumber(item, "score", 0, 1_000_000),
      ...(optionalString(item, "comment", 1000) ? { comment: optionalString(item, "comment", 1000) } : {}),
    };
  });
  if (new Set(submittedItems.map((item) => item.criterionId)).size !== submittedItems.length) {
    return fail("invalid-argument", "Rubric criterion IDs must be unique.");
  }
  const entryRef = ref("stageEntries", String(scorecard.entryId));
  const [entrySnapshot, ruleSnapshot] = await Promise.all([
    entryRef.get(),
    ref("ruleVersions", String(scorecard.ruleVersionId)).get(),
  ]);
  if (!entrySnapshot.exists || !ruleSnapshot.exists) return fail("failed-precondition", "The scorecard entry and rule version must exist.");
  const entry = entrySnapshot.data()!;
  await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "HEAD_JUDGE", "JUDGE"], String(entry.eventId));
  await requireScoringAccess(uid, String(entry.eventId));
  const ruleData = ruleSnapshot.data()!;
  const scoringSchema = ruleData.scoringSchema !== null && typeof ruleData.scoringSchema === "object"
    ? ruleData.scoringSchema as Data
    : {};
  const rubricSchema = ruleData.rubricItems ?? ruleData.criteria ??
    scoringSchema.rubricItems ?? scoringSchema.criteria;
  if (!Array.isArray(rubricSchema) || ruleSnapshot.data()!.status !== "PUBLISHED") {
    return fail("failed-precondition", "The published rule version has no supported rubricItems schema.");
  }
  if (rubricSchema.length !== submittedItems.length) return fail("invalid-argument", "All configured rubric criteria must be scored exactly once.");
  const rubricItems = submittedItems.map((submitted) => {
    const criterion = rubricSchema.find((candidate: unknown) => {
      return candidate !== null && typeof candidate === "object" &&
        ((candidate as Data).criterionId ?? (candidate as Data).id) === submitted.criterionId;
    }) as Data | undefined;
    const maxPoints = criterion?.maxPoints ?? criterion?.max;
    if (!criterion || typeof maxPoints !== "number" || !Number.isFinite(maxPoints) || maxPoints < 0) {
      return fail("failed-precondition", "The rubric schema contains an invalid criterion.");
    }
    if (submitted.score > maxPoints) return fail("invalid-argument", "A criterion score exceeds its configured maximum.");
    return {
      criterionId: submitted.criterionId,
      label: typeof criterion.label === "string"
        ? criterion.label
        : typeof criterion.name === "string" ? criterion.name : submitted.criterionId,
      maxPoints,
      score: submitted.score,
      ...(submitted.comment ? { comment: submitted.comment } : {}),
    };
  });
  const computedTotal = rubricItems.reduce((total, item) => total + item.score, 0);
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(scorecardRef);
    if (!current.exists) return fail("failed-precondition", "The scorecard no longer exists.");
    const currentData = current.data()!;
    if (currentData.status !== "DRAFT" || currentData.revision !== expectedRevision) {
      return fail("failed-precondition", "The scorecard is not a matching draft revision.");
    }
    transaction.update(scorecardRef, {
      rubricItems,
      computedTotal,
      status: "SUBMITTED",
      revision: expectedRevision + 1,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(transaction, uid, "SCORECARD_SUBMITTED", "scorecard", scorecardId, {
      status: currentData.status, revision: currentData.revision,
    }, { status: "SUBMITTED", revision: expectedRevision + 1, computedTotal });
  });
  return { scorecardId, status: "SUBMITTED", computedTotal, revision: expectedRevision + 1 };
});

export const verifyAndLockScores = makeCallable(async (uid, data) => {
  const action = assertOneOf(data.action ?? "LOCK", ["VERIFY", "LOCK"], "action");
  const scorecardIds = data.scorecardIds === undefined
    ? [requiredString(data, "scorecardId", 150)]
    : (() => {
      if (!Array.isArray(data.scorecardIds) || data.scorecardIds.length === 0 || data.scorecardIds.length > MAX_BATCH_SIZE) {
        return fail("invalid-argument", `scorecardIds must contain between 1 and ${MAX_BATCH_SIZE} IDs.`);
      }
      return data.scorecardIds.map((value) => {
        if (typeof value !== "string" || value.trim() === "" || value.length > 150) {
          return fail("invalid-argument", "Each scorecard ID must be a non-empty string.");
        }
        return value.trim();
      });
    })();
  if (new Set(scorecardIds).size !== scorecardIds.length) return fail("invalid-argument", "scorecardIds must be unique.");
  const reason = optionalString(data, "reason", 1000);
  const scorecardRefs = scorecardIds.map((id) => ref("scorecards", id));
  const initialCards = await db.getAll(...scorecardRefs);
  for (const card of initialCards) {
    if (!card.exists || typeof card.data()!.entryId !== "string") {
      return fail("failed-precondition", "Every scorecard must exist and reference a stage entry.");
    }
    const entrySnapshot = await ref("stageEntries", card.data()!.entryId as string).get();
    if (!entrySnapshot.exists || typeof entrySnapshot.data()!.eventId !== "string") {
      return fail("failed-precondition", "Every scorecard must reference an existing event entry.");
    }
    await requireRoleForEvent(uid, ["SUPER_ADMIN", "DISTRICT_ADMIN", "HEAD_JUDGE"], entrySnapshot.data()!.eventId as string);
  }
  let changedCount = 0;
  await db.runTransaction(async (transaction) => {
    changedCount = 0;
    const currentCards = await Promise.all(scorecardRefs.map((scorecardRef) => transaction.get(scorecardRef)));
    currentCards.forEach((current, index) => {
      if (!current.exists) return fail("failed-precondition", "A scorecard no longer exists.");
      const before = current.data()!;
      const targetStatus = action === "VERIFY" ? "VERIFIED" : "LOCKED";
      const alreadyComplete = before.status === targetStatus ||
        (action === "VERIFY" && before.status === "LOCKED");
      if (alreadyComplete) return;
      if (action === "VERIFY" && !["SUBMITTED", "UNDER_REVIEW"].includes(String(before.status))) {
        return fail("failed-precondition", "Only submitted scorecards can be verified.");
      }
      if (action === "LOCK" && before.status !== "VERIFIED") {
        return fail("failed-precondition", "Only verified scorecards can be locked.");
      }
      if (typeof before.revision !== "number" || !Number.isSafeInteger(before.revision)) {
        return fail("failed-precondition", "A scorecard has no valid revision.");
      }
      const after: Data = {
        status: targetStatus,
        revision: before.revision + 1,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (action === "LOCK") {
        after.lockedAt = FieldValue.serverTimestamp();
        after.lockedByUid = uid;
        if (reason) after.lockReason = reason;
      } else {
        after.verifiedAt = FieldValue.serverTimestamp();
        after.verifiedByUid = uid;
      }
      transaction.update(scorecardRefs[index], after);
      audit(transaction, uid, action === "VERIFY" ? "SCORECARD_VERIFIED" : "SCORECARD_LOCKED",
        "scorecard", scorecardRefs[index].id, {
          status: before.status,
          revision: before.revision,
        }, {
          status: targetStatus,
          revision: before.revision + 1,
          ...(reason ? { reason } : {}),
        });
      changedCount += 1;
    });
  });
  return { scorecardIds, status: action === "VERIFY" ? "VERIFIED" : "LOCKED", changedCount };
});
