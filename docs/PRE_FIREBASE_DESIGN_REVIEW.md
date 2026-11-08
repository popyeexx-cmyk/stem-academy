# STEM Academy — Pre-Firebase Design Review

**Review date:** 8 November 2026  
**Branch:** `build/frontend-foundation`  
**Reviewed artifacts:** `docs/FIRESTORE_DATA_MODEL.md`, `docs/ROLE_PERMISSION_MATRIX.md` and the currently approved project scope/decisions  
**Status:** Review findings only — no Firebase project, production data or deployment was changed.

## 1. Executive assessment

The data model is a useful starting proposal and the owner has confirmed the main operating policies. It is **not yet ready to be treated as an implementation-ready or production-approved schema**.

The current application is still a frontend demonstration plus a small API foundation. The only API routes are health and authenticated-session inspection; Firestore collections and workflows have not been implemented. Firestore rules remain deny-all. The successful GitHub Actions run verifies the checks that were configured, not Firebase integration, browser behaviour, role security or production readiness.

**Recommendation:** Keep working on the development branch. Resolve the launch blockers in Section 4, then implement against a separate test Firebase project and emulator before any real student accounts or records are introduced.

## 2. Confirmed owner decisions

The following are confirmed and should be treated as requirements, not suggestions:

| Area | Confirmed rule |
|---|---|
| Staff accounts and permissions | Separate administrator and teacher accounts. The administrator may assign multiple subjects to the same teacher, across classes/grades if needed; each teacher's access is limited to the exact assigned class/subject combinations. |
| Result visibility | Marks remain hidden until a teacher/admin separately publishes/releases them. |
| Online assignment completion | Passing does not complete the assignment; teacher/admin approval is required. |
| Assessment retakes | One initial attempt; every additional attempt requires teacher/admin approval. |
| Password recovery | Admin-assisted; identity must be checked before recovery. |
| Timezone | `Asia/Karachi` (UTC+05:00). |
| Academic sessions | Annual sessions named by calendar year, with separate Grade 9 and Grade 10 classes. |
| Student ID | Permanent server-generated `SA-YYYY-NNN`; year is first enrollment/ID-issuance year. |
| Student profile | Full name, academy ID, email, grade/class association and active/inactive status only. |
| Backups | Manual admin-initiated export; secure storage and tested restoration required. |
| Retention | Retain records indefinitely by default; archive inactive students and preserve history, subject to applicable privacy/legal requirements. |
| Hosting | Netlify Free is provisionally selected, not yet approved for production. |
| Student support indicators | Teacher-defined attendance and assessment thresholds; flags are advisory and require teacher review. |

## 3. Review findings and design corrections

### 3.1 The current document had a numbering defect

The decisions list repeated item number 8. This has been corrected in the data-model document. The student ID definition has also been clarified: the year component is the student's first enrollment/ID-issuance year, not a fresh identifier each academic session.

### 3.2 Separate academic thresholds

The model currently mentions a proposed 70% online-activity passing threshold. This must not be confused with the teacher-defined assessment threshold used to flag a student for additional support.

- **Passing threshold:** determines whether an online activity meets its completion criterion.
- **Support-indicator threshold:** prompts a teacher to review attendance or assessment evidence.

The 70% default remains unconfirmed and must not be hard-coded until approved.

### 3.3 Student ID allocation

The ID must be allocated only by trusted server code using a Firestore transaction or another concurrency-safe allocator. A simple read-then-increment operation is unsafe if two students are registered simultaneously. Enforce a unique academy-wide ID and never recycle an issued ID.

### 3.4 Email and identity source

Firebase Authentication should be the source of truth for the login email. If the email is also copied into `users/{uid}`, define how email changes are synchronized and how duplicate email addresses are rejected. The owner has asked to include email, but whether it must be verified before account activation still needs a decision.

### 3.5 Admin/teacher role model

**RESOLVED — Separate staff accounts and multi-subject assignment:** The owner confirmed two different staff accounts: one administrator and one teacher. The administrator has academy-wide user, class, settings and permission management, including the ability to assign multiple subjects to the same teacher, across different classes/grades where needed. The teacher has teaching permissions only for the exact class/subject combinations assigned by the administrator. The server must check both class access and subject-specific teaching assignments for teacher actions. Keep the roles separate; do not share credentials or grant teacher access to admin-only operations.

### 3.6 Password recovery without email delivery

The policy is approved, but the actual recovery mechanism is not. A Firebase password-reset link is useful only if there is a safe way to hand it to the student. Do not expose reset links in logs, browser history shared with other users, or an unapproved messaging channel. Before implementation, choose and test a controlled in-person/admin-assisted hand-off or a temporary-password flow with a forced password-change gate. The admin must never learn or retain a student's permanent password.

### 3.7 Academic-session rollover

Annual sessions are approved, but the operational process is not. Define when a new session is opened, how Grade 9 students are promoted to Grade 10, how Grade 10 students are archived/completed, how repeaters/transfers are handled, and how prior class membership and historical records remain unchanged.

### 3.8 Manual backup and restoration

A manual export is approved, but export scope, format, storage location, frequency, encryption/access protection, and restore procedure are not. Do not assume a provider-managed backup/export feature is available on the free plan. Design and test a bounded admin export/restore process that does not include passwords, tokens, reset links or service credentials. A backup that has never been restored in a test is not a verified recovery plan.

### 3.9 Netlify Free remains conditional

The repository configuration is structurally compatible with static hosting plus Netlify Functions, but it has not been deployed or tested there. Pin an exact supported Node.js runtime rather than relying on `node >=22`; test Firebase Admin initialization, function limits, authentication, cold starts, usage and monthly credit consumption on a non-production site. Do not treat the free tier as unlimited or guaranteed uptime.

### 3.10 AJK Board curriculum accuracy

The current Subjects & Topics interface contains illustrative syllabus content. It has not been validated against the official AJK Board Physics syllabus. Do not present it as authoritative curriculum until each class/grade chapter and topic is checked against an approved source.

### 3.11 Authorization and abuse controls

Because the API uses Firebase Admin SDK, Firestore rules do not protect API operations. Every endpoint must check the caller's trusted account status, role, class membership and record ownership. Also define request-size limits, validation, safe error responses and a practical rate-limiting strategy that does not introduce paid services. In-memory per-function rate limiting alone is not a reliable global control across serverless instances.

### 3.12 Audit and privacy

Audit records should be append-only through application code, but the model should also define who can read them, which events are mandatory, how metadata is minimized, and how audit exports are protected. The indefinite-retention policy must remain subject to applicable privacy/legal requirements and a controlled correction/deletion request process.

## 4. Launch blockers to resolve before Firebase setup

These are the remaining questions or technical proofs. They are not reasons to stop development of the static interface, but they must be resolved before real student access or production data.

| # | Blocker | Required resolution |
|---|---|---|
| 1 | Email verification | Decide whether student email must be verified before activation; define email-change synchronization. |
| 2 | Password recovery hand-off | Approve and test the secure no-email recovery mechanism. |
| 3 | Session rollover | Define promotion, repeaters, transfers, Grade 10 completion and archive steps. |
| 4 | Student ID allocator | Implement and test transaction-safe, never-recycled ID issuance. |
| 5 | Online activity pass mark | Approve the default passing threshold (70% is only a proposal) and clarify whether it can vary by activity. |
| 6 | Support-indicator rules | Define assessment/attendance observation periods, minimum data requirements and how often teachers review flags. |
| 7 | Backup/restore | Approve export format, included collections, frequency, secure storage, encryption/access controls and a tested restore procedure. |
| 8 | Netlify runtime and free-tier proof | Pin exact Node.js version and complete a non-production deployment/usage test. |
| 9 | Firebase test environment | Create a separate test project only after the preceding choices; use no real student data. |
| 10 | Time/date behaviour | Define how due dates and scheduled assessments behave at day boundaries in `Asia/Karachi`, including late submissions and edits. |
| 11 | API rate limiting | Choose a workable no-cost strategy and test abuse/limit behaviour. |

## 5. Scope conflicts to keep out of the current build

A prior Library prompt describes a much larger 15-module incremental upgrade, preservation of an existing production database, Vercel Hobby hosting, chat, uploads/imports and other features. The current project direction is a rebuild with a narrower approved scope, Netlify Free as the provisional host, and explicit exclusions such as paid services, file uploads, Cloud Functions and background jobs.

That older prompt must not silently override the later approved STEM Academy Master Specification and the owner's subsequent decisions. If any old feature is to be restored, it needs explicit scope approval and a compatibility/security review first.

## 6. Current implementation status

| Area | Status |
|---|---|
| Frontend module pages | Demo interfaces exist; not connected to persistent data. |
| Login page | Visual/demo only; Firebase Authentication is not connected. |
| Role preview | Visual role switcher only; not a security boundary. |
| Backend API | Health and authenticated `/me` routes only. |
| Firebase Admin | Lazy initialization/authentication foundation exists; no complete application API. |
| Firestore rules | Deny all browser access; unchanged and intentionally restrictive. |
| Firestore collections | Proposed in documentation; not created or deployed. |
| Indexes | Empty; must be based on actual implemented queries. |
| Automated tests | Existing Node/API/static checks passed in the recorded GitHub Actions run; no Firebase emulator or real-browser tests yet. |
| Curriculum | Illustrative, not verified against AJK Board source. |
| Hosting | Netlify not deployed or tested. |
| Production readiness | Not ready; no real student records should be entered. |

## 7. Recommended next sequence

1. Close the remaining owner choices in Section 4 and implement the approved baseline in `docs/ROLE_PERMISSION_MATRIX.md`.
2. Finalize the password recovery and session rollover workflows.
3. Specify the API permission matrix and server-side validation rules.
4. Implement schema/ID allocation helpers with unit tests.
5. Configure Firebase Emulator tests and verify deny-by-default database access.
6. Build and test the first real API workflows against a separate test Firebase project.
7. Implement export/restore and verify a full test restoration.
8. Verify the AJK Board Physics syllabus against official curriculum materials.
9. Deploy a non-production Netlify test site and verify the pinned runtime and usage.
10. Only after these checks, consider a production launch review.

**Final conclusion:** The project has a solid set of owner-approved policies and a useful proposed data model. The next milestone should be design closure and test-environment preparation—not production Firebase setup or student onboarding.
