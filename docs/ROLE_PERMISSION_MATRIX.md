# STEM Academy — Role and Permission Matrix

**Status:** Recommended permission baseline for implementation  
**Branch:** `build/frontend-foundation`  
**Scope:** Separate administrator and teacher accounts; one teacher account may be assigned multiple subjects across Grade 9 and Grade 10.  
**Security rule:** Permissions are enforced by the server on every API request. Hiding a button or page is not authorization.

## 1. Core principles

1. There are separate administrator and teacher accounts. They must never share credentials.
2. The administrator has academy-wide administrative authority and may perform teaching actions when needed.
3. A teacher may be assigned multiple subjects and multiple classes. Access is granted separately for each exact teacher + class + subject combination.
4. A teacher must not gain access to an unassigned subject merely because they teach another subject in the same class.
5. Students can access only their own permitted records and published information.
6. All important create, edit, approval, release, account and permission changes are recorded in the audit log.
7. The server derives the actor identity from the verified Firebase session. It never trusts a role, teacher UID, student UID or approval identity supplied by the browser.

## 2. Permission matrix

| Activity | Administrator | Teacher |
|---|---|---|
| View academy dashboard and overall summaries | Yes, academy-wide | Only assigned classes/subjects and relevant teaching summaries |
| Create, activate, deactivate staff accounts | Yes | No |
| Create, activate, deactivate student accounts | Yes | No |
| Assign or change user roles | Yes | No |
| Create and manage academic sessions | Yes | No |
| Create and manage classes and class membership | Yes | No |
| Create and maintain the subject catalogue and topic structure | Yes | No |
| Assign multiple subjects to a teacher | Yes | No |
| View student roster and basic profiles | All academy classes | Assigned classes only |
| View attendance | All academy classes | Assigned classes only |
| Mark and correct attendance | All academy classes | Assigned classes only |
| Create and edit assignments | All classes/subjects | Assigned class/subject only |
| Publish or close assignments | All classes/subjects | Assigned class/subject only |
| Review assignment completion and approve completion | All classes/subjects | Assigned class/subject only |
| Create and edit assessments | All classes/subjects | Assigned class/subject only |
| Publish or close assessments | All classes/subjects | Assigned class/subject only |
| Review assessment attempts and grade work | All classes/subjects | Assigned class/subject only |
| Approve additional assessment attempts | All classes/subjects | Assigned class/subject only |
| Approve assessment results | All classes/subjects | Assigned class/subject only |
| Publish/release approved results to students | All classes/subjects | Assigned class/subject only |
| Create and manage course-hub learning materials (without file uploads) | All classes/subjects | Assigned class/subject only |
| Publish notices to classes | All classes | Assigned classes only |
| View own account and update allowed profile details | Yes | Yes |
| Change academy-wide settings and thresholds | Yes | No |
| View audit logs | All academy audit records | No general audit-log access |
| Export academy data and perform manual backups | Yes | No |
| Restore academy data | Yes, through a controlled recovery procedure | No |
| Change teacher assignments or another user's permissions | Yes | No |

**Scope note:** “Assigned class/subject only” means the teacher must have both an active class-access record and an active subject-specific teaching assignment for the requested class and subject. For class-wide tasks such as attendance, the teacher must have an active teaching assignment in that class; the API must apply the approved class-level attendance policy consistently.

## 3. Teacher subject assignment model

The administrator creates one assignment for every teacher/class/subject combination.

Example:

| Teacher | Class | Subject | Access |
|---|---|---|---|
| Teacher A | Grade 9 | Physics | Active |
| Teacher A | Grade 10 | Physics | Active |
| Teacher A | Grade 9 | Mathematics | Active |

This gives Teacher A three distinct assignments. Deactivating one assignment removes only that class/subject access; it does not remove the teacher's other assignments.

The API must verify the exact tuple:
- authenticated teacher UID;
- requested class ID;
- requested subject ID;
- active class-access record;
- active teaching-assignment record.

Never authorize based only on a teacher role or class membership.

## 4. Approval and publication rules

- **Assignment completion:** A student passing an online activity does not automatically complete it. A teacher assigned to that class/subject, or the administrator, must explicitly approve completion.
- **Assessment retakes:** One initial attempt is allowed. Each additional attempt requires explicit teacher/admin approval before the attempt becomes available.
- **Assessment results:** Approval and publication are separate actions. Marks remain hidden from students until an authorized teacher/admin separately publishes/releases them.
- **Audit trail:** Record who created, edited, approved, rejected, published or released each item and when. Never record passwords, reset links, tokens or answer-key payloads in audit metadata.
- **Answer keys:** Keep answer keys server-only. Teacher access is limited to assessments in their assigned teaching scope; student responses must never contain answer keys.

## 5. Administrator-only controls

Only the administrator can:
- create/deactivate staff and student accounts;
- assign roles and reset access through the approved recovery process;
- create sessions, classes, subjects and topics;
- assign teachers to classes and multiple subjects;
- change academy-wide settings and performance thresholds;
- access full academy audit records;
- initiate manual exports/backups and controlled restoration.

The system must prevent deactivation or demotion of the last active administrator.

## 6. API authorization requirements

Every protected endpoint must declare and enforce:
1. Authentication and active-account check.
2. Required role.
3. Exact class scope, where applicable.
4. Exact subject scope, where applicable.
5. Student ownership check, where applicable.
6. Field-level validation and allowed state transitions.
7. Audit event requirements.
8. Response filtering for unpublished marks, answer keys and other restricted information.

Authorization must be repeated server-side for every request, including read, list, search, create, update, approve and publish operations. Never rely on frontend navigation, disabled controls or client-submitted identifiers.

## 7. Test cases required before real student use

At minimum, automated tests must prove that:
- an administrator can assign more than one subject to a teacher;
- the teacher can access each active assigned class/subject;
- the teacher is denied access to an unassigned subject in an otherwise assigned class;
- the teacher is denied access to a class with no active assignment;
- deactivating one assignment does not remove unrelated active assignments;
- a teacher cannot create accounts, change roles, assign another teacher or change academy-wide settings;
- a teacher can perform allowed teaching actions within their assigned scope;
- a teacher cannot approve or publish another teacher's out-of-scope work;
- students cannot see unpublished results or answer keys;
- a student cannot access another student's records;
- the last active administrator cannot be deactivated or demoted;
- approval and publication actions are audited.

## 8. Implementation status

This document defines the recommended permission baseline; it does not mean these permissions are already implemented. The current frontend remains a demonstration, and the backend does not yet implement the full set of application workflows. Implement and test the server-side authorization before connecting real student accounts or records.
