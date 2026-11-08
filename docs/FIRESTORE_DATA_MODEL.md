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
| `users` | Firebase Auth UID | `role`, `active`, `displayName`, optional approved student profile fields, `createdAt`, `updatedAt` |
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

## 4. Sensitive assessment workflow

1. An assessment version is immutable once used by an attempt. Changes create a new version.
2. Answer keys are stored separately from student-visible question content.
3. The API returns only the version fields needed by the student. It never serializes answer-key documents into student responses.
4. A student can submit only an attempt belonging to their own UID and an assessment assigned to their active class.
5. A student receives one initial attempt. A second attempt requires an explicit teacher/admin approval record. The approval actor and timestamp are stored.
6. Teacher/admin approval of a calculated result and publication to students are separate actions. Approval alone does not make marks visible.
7. Results remain hidden until an authorized teacher/admin performs the separate publish/release action. Student result endpoints return only the authenticated student's published results.
8. Never trust a score, pass/fail flag, approval state or answer key sent by the browser; calculate and approve on the server.

The attempt count, retake approval details and result-release workflow must be covered by automated tests before real use.

## 5. Assignment workflow

- Physical task assignments record teacher review/completion; students do not upload files.
- Online activity assignments may reference a short assessment (maximum 10 questions) and an adjustable passing threshold (proposed default 70%, subject to the approved specification).
- Passing an online activity does not automatically complete the assignment. Teacher/admin completion approval is required.
- Opening an external resource is not proof that it was read or watched.
- Assignment records are per student, even when the assignment is distributed to a whole class.

## 6. Attendance and dates

- Store the attendance date as a date-only value in the academy's approved timezone, not as a browser-local timestamp.
- Store server-generated `createdAt`/`updatedAt` timestamps separately from the attendance date.
- One student should have at most one effective attendance record per class/date. Corrections update the current value and preserve who changed it, when, and the prior value.
- Attendance calculations must exclude non-attendance days.
- The academy timezone remains an open decision; do not treat the example `Asia/Karachi` in `.env.example` as an approved final choice until confirmed.

## 7. Audit and privacy

Audit critical account, class, attendance, assignment, assessment, result-release and settings changes. Logs must be append-only through application code and must not contain passwords, bearer tokens, private keys, full assessment answer payloads or unnecessary personal details. Record enough safe metadata to identify the actor, action, target and time. Define retention and backup procedures before production; do not configure automatic deletion.

## 8. Indexes and query strategy

The current `firestore.indexes.json` is intentionally empty. Add composite indexes only when implemented API queries require them. Likely query patterns include:
- active class access by `userUid + accessType + active`;
- class assignments by `classId + publicationState + dueDate`;
- student assignment records by `studentUid + status + updatedAt`;
- attendance by `classId + attendanceDate` and by `studentUid + attendanceDate`;
- assessments by `classId + publicationState + scheduledAt`;
- released results by `studentUid + releasedAt`;
- audit logs by `targetType + targetId + createdAt` or `actorUid + createdAt`.

These are candidate query patterns, not a final index list. Validate each index against actual queries and Firestore emulator tests. Keep result sets bounded and paginate.

## 9. API authorization checklist

Every endpoint must specify:
- authentication required or public;
- allowed role(s);
- class-scope check where applicable;
- ownership check for student records;
- allowed fields and validation limits;
- whether the operation writes an audit event;
- whether the response contains private, unpublished or answer-key data.

The current API contains only health and authenticated-session routes. This document does not imply that the collections, workflows or endpoint authorization have been implemented.

## 10. Decisions still required before database setup

The following must be confirmed or explicitly accepted as launch blockers:
1. **CONFIRMED — Result visibility:** Students may see assessment marks only after a teacher/admin separately publishes/releases the result. Teacher approval alone is not sufficient. This decision was confirmed by the project owner on 8 November 2026.
2. Whether passing an online activity ever changes assignment status automatically; the proposed rule is **no**, teacher approval remains required.
3. Assessment retake policy beyond the initial attempt and approved second attempt.
4. Password recovery method compatible with the no-email/no-paid-service constraint.
5. Academy timezone and date-handling convention.
6. Academic session naming and promotion/archiving process.
7. Student identifier and the minimum profile/contact fields to collect.
8. Backup/export method, frequency and who is responsible.
9. Data-retention period and account closure/archive procedure.
10. Hosting provider, free-tier terms, eligibility and serverless runtime compatibility.
11. Any required at-risk indicator thresholds; no opaque or automatic disciplinary decisions.

Do not create a production Firebase project, enable student access, import real records or deploy this schema until the relevant decisions and provider constraints are reviewed.

## 11. Implementation sequence after approval

1. Confirm the open decisions and finalize this model.
2. Add schema validation helpers and role/class authorization helpers.
3. Add API routes one module at a time, with tests for allowed and denied cases.
4. Add Firestore Emulator configuration and rules/API integration tests.
5. Add indexes only for verified query patterns.
6. Review privacy, backup, retention and recovery procedures.
7. Only then configure a separate test Firebase project; production setup remains a later, explicit milestone.
