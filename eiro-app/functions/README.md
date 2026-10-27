# EIRO Cloud Functions

This project exports Firebase Functions v2 callable endpoints in `us-central1`.
Run `npm install`, `npm run build`, and deploy with `npm run deploy` from this
directory. The matching Node.js runtime is configured in the root
`firebase.json`.

The callable layer verifies Firebase Authentication, active role assignments,
resource scopes, request shapes, and state transitions before using the Admin
SDK. Sensitive writes and their audit events are committed together where the
schema permits.

## Schema-dependent operations

These callables deliberately return `failed-precondition` rather than guessing
at missing product rules or trusting caller-supplied decisions:

- `commitTeamImport`: import jobs do not define a trusted validated-row
  snapshot format from which canonical team, student, and membership records
  can be created.
- `approveTeamAdjustment`: acknowledgement semantics, eligibility limits, and
  the canonical roster-version mutation contract are not defined.
- `approveQualifiers`: the official ranking policy, qualifying quotas, and
  immutable qualifier-preview schema are not defined.

`issueCertificate` creates an active verification record; PDF rendering and
Storage delivery are not included because no renderer or storage-path contract
is defined. `recordManualPayment` records offline receipts as pending; payment
verification is a separate action and is intentionally not inferred from
recording. A `verifyManualPayment` callable is not part of this requested API;
the admin payments UI must not treat `recordManualPayment` as verification.
