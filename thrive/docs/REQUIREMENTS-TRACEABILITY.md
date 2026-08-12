# Requirements Traceability Matrix

Maps every requirement in the SRS baseline v1.0 to its implementation and the
check that verifies it. Paths are relative to `thrive/`.

Legend — **Status**: ✅ implemented · ⚠️ implemented with a documented boundary

---

## 3.1.1 Identity and Authentication

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-01 | Authenticate users using validated credentials | `src/app/api/auth/login/route.ts` | ✅ |
| | *AC: valid credentials grant access within 2s* | Single indexed lookup + bcrypt compare | ✅ |
| | *AC: generic error, no field disclosure* | `GENERIC_FAILURE` returned for unknown account **and** wrong password; miss path also runs a dummy bcrypt compare to avoid a timing oracle | ✅ |
| FR-02 | Establish sessions via secure token | `src/lib/auth.ts` — HS256 JWT, httpOnly + SameSite=Lax cookie, 8h expiry, `secure` in production | ✅ |
| FR-03 | Deny access on invalid credentials | Same handler, HTTP 401 | ✅ |
| FR-04 | Deny deactivated accounts even with valid tokens | Status checked at login **and** re-checked from the database on every request in `getCurrentUser()` | ✅ |
| FR-05 | Log out and terminate sessions | `src/app/api/auth/logout/route.ts` | ✅ |

## 3.1.2 Account Management and Recovery

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-06 | Administrators create user accounts | `POST /api/users`, guarded by `users.create` | ✅ |
| FR-07 | Assign roles during account creation | Role is a required, enum-validated field; non-admins are restricted to student/faculty/panel roles | ✅ |
| FR-08 | Secure password reset | `src/app/api/auth/forgot-password/route.ts`, `reset-password/route.ts` | ✅ |
| | *AC: time-bound recovery* | 30-minute expiry; only the SHA-256 digest is stored | ✅ |
| | *AC: expired/invalid tokens rejected* | Expiry, prior use and account status all checked | ✅ |
| FR-09 | Recovery messages expose no account information | Identical response whether or not the address exists | ✅ |

> **Email delivery** is not wired up. Tokens are real and enforced; the delivery
> channel is a single integration point in `forgot-password/route.ts`.

## 3.1.3 Authorization and Route Protection

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-10 | Evaluate roles and permissions before granting access | `src/lib/rbac.ts` capability matrix; `requirePermission()` on every privileged route | ✅ |
| FR-11 | Unauthenticated users redirected to login | `src/middleware.ts`, preserving the intended destination in `?next=` | ✅ |
| FR-12 | Authenticated-but-unauthorized users see an unauthorized page | `src/app/unauthorized/page.tsx`; unknown addresses fall through to the 404 page instead | ✅ |
| FR-13 | Restrict records by role and responsibility | `src/lib/access.ts` — `resolveThesisAccess()` and `thesisScopeFilter()` | ✅ |

## 3.1.4 User and Role Management

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-14 | View and manage registered users | `/admin/users`, `GET /api/users` | ✅ |
| FR-15 | Search and filter by name, role, status | Query, role and status filters; also matches email and ID number | ✅ |
| FR-16 | Update user roles and account status | `PATCH /api/users/[id]` | ✅ |
| FR-17 | Activate or deactivate accounts | Same route, guarded by `users.setStatus` | ✅ |
| FR-18 | Require confirmation for critical actions | Server rejects role/status changes without `confirmed: true` (HTTP 428); UI shows an inline confirmation row | ✅ |
| | *AC: success or error feedback* | Every response carries an actionable message | ✅ |

Additional safeguards beyond the SRS: an administrator cannot deactivate or
demote their own account, and the last active administrator cannot be removed.

## 3.1.5 Thesis Registration and Project Management

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-19 | Students register thesis projects | `POST /api/theses`, `/student/register` | ✅ |
| FR-20 | Provide and update permitted thesis information | `PATCH /api/theses/[id]`; students may not change lifecycle status | ✅ |
| FR-21 | Maintain current status of each project | `ThesisProject.status` + `currentStage` | ✅ |
| FR-22 | Role-appropriate viewing of project information | `thesisScopeFilter()` applied to every listing | ✅ |
| FR-23 | Maintain records of thesis activities | `AuditLog` + evaluation and document history | ✅ |

## 3.1.6 Adviser Assignment

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-24 | View available advisers by academic criteria | `/student/adviser` — same-department advisers ranked first, remaining capacity shown | ✅ |
| FR-25 | Submit adviser requests | `POST /api/adviser-requests` | ✅ |
| FR-26 | Advisers view and respond to requests | `/adviser/requests`, `PATCH /api/adviser-requests/[id]` | ✅ |
| FR-27 | Record request status | `AdviserRequest.status` — pending / accepted / rejected / cancelled | ✅ |
| FR-28 | Prevent conflicting adviser assignments | Acceptance is transactional: assigns the adviser and cancels the group's other pending requests; re-checks both existing assignment and advising capacity at accept time | ✅ |

## 3.1.7 Thesis Document Management

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-29 | Upload documents per current stage | `POST /api/theses/[id]/documents` | ✅ |
| FR-30 | Associate documents with project and milestone | Requirement key validated against the current stage's requirement set | ✅ |
| FR-31 | Authorized faculty view submissions | `/api/documents/[id]/download` re-checks scope on every read | ✅ |
| FR-32 | Maintain document status through review | `Document.status` — pending / under review / approved / revise / rejected | ✅ |
| FR-33 | Support revision and resubmission | New row with incremented `version`; prior version marked `isCurrent = false` and retained with its evaluations | ✅ |
| FR-34 | Validate file types and sizes | `src/lib/storage.ts` — extension and MIME allow-list, 20 MB cap, checked before any disk write | ✅ |
| | *AC: only permitted formats accepted* | `.pdf .doc .docx .ppt .pptx .zip` | ✅ |
| | *AC: oversized files rejected* | Explicit message naming the limit | ✅ |
| | *AC: upload failures give a clear message* | Client-side pre-check mirrors the server rules | ✅ |

## 3.1.8 Thesis Evaluation and Approval

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-35 | Advisers review submitted documents | `/adviser/reviews`, thesis workspace | ✅ |
| FR-36 | Provide comments or remarks | `POST /api/documents/[id]/evaluations`, minimum 10 characters | ✅ |
| FR-37 | Assign a document status (Approved / Revise) | Decision drives `Document.status`; Rejected also supported | ✅ |
| FR-38 | Display comments to the appropriate students | Student dashboard and thesis workspace, with evaluator and timestamp | ✅ |
| FR-39 | Maintain a record of evaluations and decisions | `Evaluation` rows are append-only and survive resubmission | ✅ |
| FR-40 | Prevent progression without required approvals | `evaluateMilestoneGate()` in `src/lib/workflow.ts`; refusals list every outstanding item | ✅ |

## 3.1.9 Thesis Progress and Workflow

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-41 | Track progress by defined milestones | Full milestone plan created at registration | ✅ |
| FR-42 | Support all defined workflow stages | Proposal Development → Proposal Defense → Post-Defense Revision → Final Development → Final Defense → Completion | ✅ |
| FR-43 | Display current milestone and completion status | `src/components/milestone-track.tsx` (SRS Figure 6.4) | ✅ |
| FR-44 | Update progress automatically on approval | `POST /api/theses/[id]/advance` closes the milestone, opens the next, notifies all parties | ✅ |
| FR-45 | Restrict stages with unmet prerequisites | Stages start `LOCKED`; only the current stage accepts submissions | ✅ |

## 3.1.10 Defense Scheduling

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-46 | Create and manage defense schedules | `/coordinator/schedules`, `POST /api/defenses`, `PATCH /api/defenses/[id]` | ✅ |
| FR-47 | Record date, time, group and panel | `DefenseSchedule` + `DefensePanelist` | ✅ |
| FR-48 | Students and faculty view relevant schedules | Scoped in `GET /api/defenses`; surfaced on every dashboard | ✅ |
| FR-49 | Notifications for defense activities | Scheduling, rescheduling, cancellation and completion all notify participants | ✅ |

Additional safeguards: past-dated schedules are refused, panelist double-booking
within an overlapping window is detected, and the assigned adviser cannot be
placed on the panel evaluating their own advisees.

## 3.1.11 Notifications and Communication

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-50 | Notify users of activities and workflow changes | `src/lib/notifications.ts` | ✅ |
| FR-51 | Cover submissions, revisions, approvals, requests, schedules | All six categories emitted | ✅ |
| FR-52 | Notifications scoped by role and thesis relationship | `thesisAudience()` resolves recipients from the relationship graph | ⚠️ In-app only; no email transport |

## 3.1.12 Dashboard and Monitoring

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-53 | Role-based dashboards | `/student` `/adviser` `/panel` `/coordinator` `/oversight` `/admin` | ✅ |
| FR-54 | Student dashboard content | Progress, requirements, submissions, feedback, notifications | ✅ |
| FR-55 | Faculty dashboard content | Advisees, submissions, review queue, pending activities | ✅ |
| FR-56 | Administrative dashboard content | Progress, completion, workload, compliance indicators | ✅ |

## 3.1.13 Analytics and Reporting

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-57 | Institutional analytics | `src/lib/analytics.ts`, `/oversight` | ✅ |
| FR-58 | Progress, completion, workload, panel and compliance figures | All present, including overdue reviews and stalled groups | ✅ |
| FR-59 | Authorized users generate reports | `/reports`, `GET /api/reports/export` — four report types as CSV | ✅ |
| FR-60 | Reports reflect the most recent data | Computed from live tables per request; no caching layer | ✅ |

## 3.1.14 Thesis Archiving

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-61 | Archive completed thesis records | `POST /api/theses/[id]/archive`; only a completed project with an approved manuscript qualifies | ✅ |
| FR-62 | Store manuscripts and related records | `ArchivedThesis` links the approved manuscript and generated citation | ✅ |
| FR-63 | Restrict access per defined permissions | Visibility PUBLIC / INSTITUTIONAL / RESTRICTED enforced in both archive views | ✅ |

## 3.1.15 Integration and Data Management

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| FR-64 | Persist all domain data | Prisma schema, 12 entities with referential integrity | ✅ |
| FR-65 | Secure file storage | Generated filenames outside the web root, served only via an authorized route | ✅ |
| FR-66 | Handle failures gracefully | `handler()` wrapper in `src/lib/api.ts` | ✅ |
| | *AC: meaningful, actionable messages* | Every error path returns guidance, never a stack trace | ✅ |
| | *AC: no sensitive information exposed* | Internal faults log server-side and return a generic message | ✅ |
| | *AC: no corrupted or incomplete records* | Multi-table operations run in transactions; an orphaned upload is deleted if its database write fails | ✅ |

---

## Non-Functional Requirements

| ID | Requirement | Implementation | Status |
|---|---|---|---|
| NFR-01 | 95% of requests under 2s | Server components query directly (no client waterfall); indexed lookups on every hot path | ✅ |
| NFR-02 | Permission checks without noticeable delay | In-memory matrix lookup; no database round trip for the capability layer | ✅ |
| NFR-03 | Search and filtering under 2s | Indexed columns on `role/status`, `status/currentStage`, `adviserId`, `department/academicYear` | ✅ |
| NFR-04 | Dashboards load under 3s | Parallel `Promise.all` fetches per dashboard | ✅ |
| NFR-05 | Protected functions require authentication | `requireUser()` / `requirePermission()` on every non-public route | ✅ |
| NFR-06 | Server-side authorization for privileged operations | Capability **and** scope checks; middleware never the sole gate | ✅ |
| NFR-07 | Passwords stored with one-way hashing | bcrypt, cost 10 | ✅ |
| NFR-08 | Sensitive documents accessible only to authorized users | Every download re-checks scope and is audited | ✅ |
| NFR-09 | Secrets via environment configuration | `AUTH_SECRET`, `DATABASE_URL`, `STORAGE_DIR`; startup fails if the secret is missing or under 32 characters | ✅ |
| NFR-10 | Critical actions logged for traceability | `AuditLog` — 25 action types with actor, entity, summary, metadata, IP | ✅ |
| NFR-11 | Data intact after controlled restarts | Durable relational storage; no in-memory state | ✅ |
| NFR-12 | Handle transient failures without corruption | Transactions plus compensating file cleanup | ✅ |
| NFR-13 | Core functions available during partial failures | Notification and audit writes are isolated — a failure there never rolls back the academic action | ✅ |
| NFR-14 | Intuitive without extensive training | Task-oriented dashboards; the next action is always on screen | ✅ |
| NFR-15 | Clear, consistent, immediate feedback | Shared status vocabulary; every mutating action returns a plain-language message | ✅ |
| NFR-16 | Recovery actions on unauthorized / not-found / error pages | `unauthorized/page.tsx`, `not-found.tsx`, `error.tsx` — each offers a route onward | ✅ |
| NFR-17 | Responsive across desktop and mobile | Mobile drawer navigation, responsive grids, horizontally scrollable tables | ✅ |
| NFR-18 | Modular separation by concern | `src/lib/` split into auth, rbac, access, workflow, storage, analytics, audit, notifications | ✅ |
| NFR-19 | Requirement identifiers traceable to code | This document; FR/NFR references appear in source comments | ✅ |
| NFR-20 | Workflow or permission changes stay local | Stages and requirements in `workflow.ts`; permissions in `rbac.ts` | ✅ |

---

## Deviations from the SRS

**1. Appendix Table 6.1 versus FR-06 / FR-16 / FR-17.**
The appendix marks *Create User Account* and *Activate / Deactivate Accounts* as
available to every role, including students. That contradicts the normative
requirements, which reserve these actions for authorized administrators. The
implementation follows the functional requirements:

- Account creation: administrators, plus research coordinators limited to student, faculty adviser and panel member accounts.
- Activation and deactivation: administrators only.

This is surfaced in the application itself at `/admin/roles`.

**2. Section numbering in §3.1.13.**
The SRS labels both §3.1.11 and §3.1.13 "Notifications and Communication",
though §3.1.13 (FR-57 – FR-60) describes analytics and reporting. Implemented
per content, not per heading.

**3. §5.2.1 requirement ranges.**
The validation section cites ranges (for example "FR-16 to FR-27 (User
Management)") that do not line up with the requirement numbering in §3.1.
Traceability above follows §3.1, which is the normative list.

**4. §4.1 "File Upload (MOV)".**
The performance table refers to *MOV* (Means of Verification), terminology
carried over from the ARMS glossary. Interpreted as thesis document upload.
