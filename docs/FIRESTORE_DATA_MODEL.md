# STEM Academy — Firestore Data Model Proposal

**Status:** Design proposal only — not deployed and not yet approved for production  
**Baseline:** STEM Academy Master Specification v1.1.0  
**Scope:** AJK Board Physics LMS, one academy, one teacher/administrator, fewer than 50 students, Grades 9 and 10  
**Architecture:** Firebase Authentication + Cloud Firestore Spark + trusted Node.js serverless API using Firebase Admin SDK

## 1. Non-negotiable design rules

1. Firestore browser rules remain deny-all. The browser must call the server API; it must not read or write application collections directly.
2. Every API route independently authenticates and authorizes the caller. Firebase Admin SDK bypasses Firestore Rules.
3. The Firebase Auth UID is the account identity. The trusted `users/{uid}` document determines the role and active status; client-provided roles are never trusted.
4. Class access comes from trusted class-access records, not from a class ID supplied by the browser.
5. Students may retrieve only their own records and released results. Teachers may retrieve records only for classes assigned to them. Admin-only operations require the admin role.
6. Assessment answer keys and unpublished scores must never be returned by student-facing API responses.
7. Keep records small and queryable. Use stable document IDs, server timestamps, bounded queries and cursor pagination.
8. No file uploads, Firebase Storage, Cloud Functions, background jobs, scheduled tasks, realtime listeners or paid services are introduced by this proposal.
9. Do not put passwords, tokens, private keys, home addresses, identity scans, photographs or unnecessary sensitive details in Firestore or audit logs.
10. Archive/deactivate operational records rather than deleting history. No automatic data purge is proposed.

## 2. Proposed collections

| Collection | Document ID | Purpose and key fields |
|---|---|---|
| `users` | Firebase Auth UID | `role`, `active`, `displayName` (student full name), `email`, `studentId` (academy-generated for students), `createdAt`, `updatedAt`; avoid collecting extra profile fields unless a documented need is approved |
| `classes` | Stable class ID | `name`, `grade`, `academicSessionId`, `active`, timestamps |
| `classAccess` | Deterministic class/user ID | `classId`, `userUid`, `accessType` (teacher or student), `active`, timestamps |
| `academicSessions` | Stable session ID | `name`, `startsOn`, `endsOn`, `active` |
| `subjects` | Stable subject ID | `name`, `board`, `grade`, `active`, display order |
| `topics` | Stable topic ID | `subjectId`, `chapterName`, `name`, `order`, `active` |
| `assignments` | Stable assignment ID | `classIds`, `type` (physical task or online activity), instructions, due date, publication state, creator UID, timestamps |
| `assignmentRecords` | Deterministic assignment/student ID | `assignmentId`, `studentUid`, `classId`, status, teacher review, feedback, timestamps |
| `assessments` | Stable assessment ID | title, subject/topic references, class IDs, publication state, attempt policy, result-release state, creator UID |
| `assessmentVersions` | Immutable version ID | assessment reference, version number, question content without answer keys, created-by and created-at |
| `assessmentAnswerKeys` | Same immutable version ID | server-only answer key and grading configuration |
| `assessmentAttempts` | Unique attempt ID | assessment/version references, student UID, answers, attempt number, submitted-at, grading state |
| `assessmentResults` | Attempt ID | student UID, assessment ID, score, approval state, approved-by/time, released-at |
| `attendanceRecords` | Deterministic class/date/student ID | `classId`, `studentUid`, local attendance date, status, marked-by, correction history reference |
| `notices` | Stable notice ID | title, body, target class IDs/roles, publication state, creator, timestamps |
| `noticeStates` | Deterministic notice/user ID | `noticeId`, `userUid`, read-at and acknowledgement-at (separate states) |
| `auditLogs` | Generated event ID | actor UID/role, action, target type/ID, timestamp, safe metadata; append-only through application routes |
| `academySettings` | Fixed setting key | approved academy-level configuration only; never store secrets |

Deterministic IDs should use an unambiguous encoding or a stable hash of the component IDs. Do not build IDs by joining arbitrary user-entered strings.

## 3. Identity, roles and class authorization

- Firebase Authentication proves who signed in; it does not determine their application role.
- On each protected request, verify the Firebase ID token (including revocation where supported), load `users/{uid}`, and reject missing, inactive or invalid-role accounts.
- For a teacher request scoped to a class, verify an active `classAccess` record with `accessType: "teacher"` for that UID and class.
- For a student request, verify an active `classAccess` record with `accessType: "student"`; then constrain all student data reads to the authenticated UID.
- Never accept `role`, `studentUid`, `teacherUid`, approval identity or audit actor identity as authoritative from request bodies. Derive them from the verified session.
- Only an admin may create/deactivate users, assign roles, create classes or change class access. The last active admin must not be deactivated or demoted.
- A teacher must not gain access to another class by changing a URL, query parameter or request body.

## 4. Account password recovery

- **CONFIRMED — Recovery method:** Password recovery is admin-assisted. A student contacts the teacher/admin, who verifies the student's identity through an appropriate in-person or otherwise pre-established trusted process before initiating recovery.
- Recovery must use a secure, admin-only Firebase Authentication recovery flow. Do not ask an admin to view, choose, or store a student's permanent password; do not store passwords or reset secrets in Firestore, application logs or audit metadata.
- Because email delivery is excluded from the current scope, the exact secure hand-off of a Firebase-generated password-reset action link/code must be designed and tested before implementation. Do not send it through an unapproved channel or expose it in logs.
- Record the recovery action, initiating admin and timestamp in the audit log, without recording the reset link/code or password.

## 5. Sensitive assessment workflow

1. An assessment version is immutable once used by an attempt. Changes create a new version.
2. Answer keys are stored separately from student-visible question content.
3. The API returns only the version fields needed by the student. It never serializes answer-key documents into student responses.
4. A student can submit only an attempt belonging to their own UID and an assessment assigned to their active class.
5. **CONFIRMED — Retake policy:** A student receives one initial attempt. Every additional attempt requires explicit teacher/admin approval before it is available. Store the approval actor and timestamp for each approved retake.
6. Teacher/admin approval of a calculated result and publication to students are separate actions. Approval alone does not make marks visible.
7. Results remain hidden until an authorized teacher/admin performs the separate publish/release action. Student result endpoints return only the authenticated student's published results.
8. Never trust a score, pass/fail flag, approval state or answer key sent by the browser; calculate and approve on the server.

The attempt count, retake approval details and result-release workflow must be covered by automated tests before real use.

## 6. Assignment workflow

- Physical task assignments record teacher review/completion; students do not upload files.
- Online activity assignments may reference a short assessment (maximum 10 questions) and an adjustable passing threshold (proposed default 70%, subject to the approved specification).
- **CONFIRMED — Completion approval:** Passing an online activity does not automatically complete the assignment. A teacher/admin must review and explicitly approve completion before the assignment is marked complete. This decision was confirmed by the project owner on 8 November 2026.
- Opening an external resource is not proof that it was read or watched.
- Assignment records are per student, even when the assignment is distributed to a whole class.

## 7. Attendance and dates

- Store the attendance date as a date-only value in the academy's approved timezone, not as a browser-local timestamp.
- Store server-generated `createdAt`/`updatedAt` timestamps separately from the attendance date.
- One student should have at most one effective attendance record per class/date. Corrections update the current value and preserve who changed it, when, and the prior value.
- Attendance calculations must exclude non-attendance days.
- **CONFIRMED — Academy timezone:** Use Pakistan Standard Time, IANA timezone `Asia/Karachi` (UTC+05:00), for attendance dates, assignment deadlines and assessment schedules. Store absolute event timestamps consistently (UTC/server timestamps) and interpret/display academy calendar dates and times in `Asia/Karachi`.

## 8. Audit and privacy

Audit critical account, class, attendance, assignment, assessment, result-release and settings changes. Logs must be append-only through application code and must not contain passwords, bearer tokens, private keys, full assessment answer payloads or unnecessary personal details. Record enough safe metadata to identify the actor, action, target and time. Define retention and backup procedures before production; do not configure automatic deletion.

## 9. Indexes and query strategy

The current `firestore.indexes.json` is intentionally empty. Add composite indexes only when implemented API queries require them. Likely query patterns include:
- active class access by `userUid + accessType + active`;
- class assignments by `classId + publicationState + dueDate`;
- student assignment records by `studentUid + status + updatedAt`;
- attendance by `classId + attendanceDate` and by `studentUid + attendanceDate`;
- assessments by `classId + publicationState + scheduledAt`;
- released results by `studentUid + releasedAt`;
- audit logs by `targetType + targetId + createdAt` or `actorUid + createdAt`.

These are candidate query patterns, not a final index list. Validate each index against actual queries and Firestore emulator tests. Keep result sets bounded and paginate.

## 10. API authorization checklist

Every endpoint must specify:
- authentication required or public;
- allowed role(s);
- class-scope check where applicable;
- ownership check for student records;
- allowed fields and validation limits;
- whether the operation writes an audit event;
- whether the response contains private, unpublished or answer-key data.

The current API contains only health and authenticated-session routes. This document does not imply that the collections, workflows or endpoint authorization have been implemented.

## 11. Decisions still required before database setup

The following must be confirmed or explicitly accepted as launch blockers:
1. **CONFIRMED — Result visibility:** Students may see assessment marks only after a teacher/admin separately publishes/releases the result. Teacher approval alone is not sufficient. This decision was confirmed by the project owner on 8 November 2026.
2. **CONFIRMED — Assignment completion:** Passing an online activity does not automatically change the assignment to complete; teacher/admin review and explicit approval are required.
3. **CONFIRMED — Assessment retakes:** One initial attempt is allowed; every additional attempt requires explicit teacher/admin approval.
4. **CONFIRMED — Password recovery:** Admin-assisted recovery. The student contacts the teacher/admin, who verifies identity and initiates a secure admin-only recovery process. The no-email constraint means the safe reset-link/code hand-off still needs to be designed and tested before implementation.
5. **CONFIRMED — Academy timezone:** Pakistan Standard Time (`Asia/Karachi`, UTC+05:00). Calendar dates and scheduled times use this academy timezone; store absolute timestamps consistently using UTC/server timestamps.
6. **CONFIRMED — Academic sessions:** Annual sessions named by calendar year (for example, `2026`, `2027`), with separate Grade 9 and Grade 10 classes in each session. The student promotion and archival process still needs to be defined.
7. **CONFIRMED — Student identifier:** Generate an academy ID in the format `SA-YYYY-NNN` (for example, `SA-2026-001`) on the trusted server. IDs must be unique academy-wide, non-editable by students and must not be based on national identity numbers.
8. **CONFIRMED — Minimum student profile:** Full name, academy-generated Student ID, email address, grade/class association and active/inactive status only. Grade/class association is maintained through trusted class records/access. No guardian details, phone numbers, home addresses, identity numbers, photographs or other extra personal fields by default.
8. **CONFIRMED — Backup approach:** Manual admin-initiated data export. The export format, scope, frequency, secure storage location and restore procedure must be defined and tested before production.
9. Data-retention period and account closure/archive procedure.
10. Hosting provider, free-tier terms, eligibility and serverless runtime compatibility.
11. Any required at-risk indicator thresholds; no opaque or automatic disciplinary decisions.

Do not create a production Firebase project, enable student access, import real records or deploy this schema until the relevant decisions and provider constraints are reviewed.

## 12. Implementation sequence after approval

1. Confirm the open decisions and finalize this model.
2. Add schema validation helpers and role/class authorization helpers.
3. Add API routes one module at a time, with tests for allowed and denied cases.
4. Add Firestore Emulator configuration and rules/API integration tests.
5. Add indexes only for verified query patterns.
6. Review privacy, backup, retention and recovery procedures.
7. Only then configure a separate test Firebase project; production setup remains a later, explicit milestone.
