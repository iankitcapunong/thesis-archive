# CSU-THRIVE

**Thesis Hub for Research, Innovation, Validation and Evaluation**
An intelligent academic governance platform for undergraduate thesis management at Caraga State University, built to the SRS baseline v1.0 (College of Computing and Information Sciences pilot).

---

## Quick start

```bash
cd thrive
npm install
npm run setup      # generate Prisma client, create the database, load demo data
npm run dev        # http://localhost:3000
```

`npm run setup` is idempotent — rerun it any time to return to a clean demo dataset.

### Demo accounts

All demo accounts use the password **`Thrive@2027`**.

| Role | Email | What you can do |
|---|---|---|
| Student | `student@carsu.edu.ph` | Register a thesis, request an adviser, submit and revise documents, track progress |
| Faculty Adviser | `adviser@carsu.edu.ph` | Respond to adviser requests, review submissions, approve milestones |
| Panel Member | `panel@carsu.edu.ph` | Evaluate assigned groups, view defense commitments |
| Research Coordinator | `coordinator@carsu.edu.ph` | Schedule defenses, assign panels, monitor compliance, generate reports |
| Department Chair | `chair@carsu.edu.ph` | Department-scoped analytics and reports |
| College Administrator | `dean@carsu.edu.ph` | College-scoped analytics and reports |
| Administrator | `admin@carsu.edu.ph` | Accounts, roles, permissions, audit trail |

### A five-minute tour

1. Sign in as **student** — see the milestone track, a document returned for revision, and the current-stage requirements.
2. Open the thesis workspace and submit a revision — it is recorded as a new version, not an overwrite.
3. Sign in as **adviser** → *Review Queue* — approve or return the submission with remarks.
4. Still as the adviser, open the thesis and try **Approve milestone** — it stays blocked, listing exactly which requirements are outstanding.
5. Approve the remaining documents, then advance — the project moves to the next stage and everyone is notified.
6. Sign in as **coordinator** — schedule a defense, then check *Analytics* and download a CSV report.
7. Sign in as **admin** → *Audit Trail* — every step above is recorded with actor, action and timestamp.

---

## What the system does

| Capability | SRS reference |
|---|---|
| Authentication, sessions, account recovery | FR-01 – FR-09 |
| Route protection and role-based authorization | FR-10 – FR-13 |
| User and access management | FR-14 – FR-18 |
| Thesis registration and project management | FR-19 – FR-23 |
| Adviser discovery, requests and assignment | FR-24 – FR-28 |
| Document submission, validation and revision | FR-29 – FR-34 |
| Evaluation, remarks and approval decisions | FR-35 – FR-40 |
| Milestone tracking and workflow gating | FR-41 – FR-45 |
| Defense scheduling and panel assignment | FR-46 – FR-49 |
| Notifications | FR-50 – FR-52 |
| Role-based dashboards | FR-53 – FR-56 |
| Institutional analytics and reporting | FR-57 – FR-60 |
| Thesis archiving with governed visibility | FR-61 – FR-63 |
| Persistence, secure file storage, graceful failure | FR-64 – FR-66 |

Full requirement-by-requirement mapping: [`docs/REQUIREMENTS-TRACEABILITY.md`](docs/REQUIREMENTS-TRACEABILITY.md).

---

## Architecture

```
Browser  ──HTTPS──▶  Next.js App Router
                       │
                       ├── Presentation   src/app/**            server components + client forms
                       ├── Middleware     src/middleware.ts     first authorization gate (FR-11, FR-12)
                       ├── API layer      src/app/api/**        JSON endpoints, re-checks every permission
                       ├── Domain         src/lib/              rbac · workflow · access · analytics · audit
                       ├── Data           Prisma → SQLite/PostgreSQL
                       └── Files          storage/documents/    served only through an authorized route
```

### Two-layer authorization

Every privileged operation passes two independent checks, both server-side:

1. **Capability** — `can(role, permission)` against the matrix in [`src/lib/rbac.ts`](src/lib/rbac.ts).
   *May this role do this kind of thing at all?*
2. **Scope** — `resolveThesisAccess(user, thesisId)` in [`src/lib/access.ts`](src/lib/access.ts).
   *May this user do it to **this** record?*

Middleware is a convenience gate for page navigation only. It runs on the edge runtime without database access, so account status is re-verified against the database on every request in `getCurrentUser()` — a deactivated account loses access immediately, even while holding a still-valid token (FR-04).

### The workflow engine

[`src/lib/workflow.ts`](src/lib/workflow.ts) declares the six thesis stages and each stage's required documents. `evaluateMilestoneGate()` is the single place that decides whether a milestone may close, and it returns *why not* rather than a bare refusal:

```
POST /api/theses/{id}/advance
409 {
  "error": "This milestone cannot be approved yet.",
  "details": { "missing": [
    "Final Manuscript Draft (Chapters 1-5) is not yet approved (currently REVISE).",
    "Adviser Endorsement for Final Defense has not been submitted."
  ]}
}
```

Changing institutional policy — different stages, different required documents — means editing that one file (NFR-20).

### Document lifecycle

Uploads are validated for type and size **before** anything touches disk (FR-34), stored under generated UUID filenames outside the web root, and served only through `/api/documents/[id]/download`, which re-checks scope and writes an audit entry. A resubmission never overwrites: the previous row is marked `isCurrent = false` and a new version is inserted, so the full revision history and its evaluations survive (FR-33). If the database write fails after the file lands, the orphaned file is removed.

---

## Project layout

```
thrive/
├── prisma/
│   ├── schema.prisma           12 SRS core entities (§4.5.1)
│   └── seed.ts                 22 users · 6 thesis groups across every stage
├── src/
│   ├── middleware.ts           route protection
│   ├── lib/
│   │   ├── rbac.ts             permission matrix + route map
│   │   ├── access.ts           record-level scoping
│   │   ├── workflow.ts         stages, requirements, milestone gate
│   │   ├── auth.ts             JWT sessions, bcrypt, recovery tokens
│   │   ├── analytics.ts        institutional figures
│   │   ├── audit.ts            audit trail
│   │   ├── storage.ts          upload validation + secure file store
│   │   └── api.ts              guards, JSON envelopes, error handling
│   ├── app/
│   │   ├── (app)/              authenticated workspaces per role
│   │   ├── api/                JSON API
│   │   ├── page.tsx            public landing page
│   │   └── login/ …            authentication screens
│   └── components/             shared UI
├── storage/documents/          uploaded manuscripts (git-ignored)
└── docs/
    ├── REQUIREMENTS-TRACEABILITY.md
    └── DEPLOYMENT.md
```

---

## Configuration

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for SQLite, or a PostgreSQL URL |
| `AUTH_SECRET` | Session signing key, **minimum 32 characters** |
| `STORAGE_DIR` | Absolute path for uploads; defaults to `./storage/documents` |

Generate a production secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Moving to PostgreSQL

1. Set `provider = "postgresql"` in `prisma/schema.prisma`.
2. Point `DATABASE_URL` at your server.
3. `npx prisma migrate dev --name init`.

No application code changes are required. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Commands

| Command | Description |
|---|---|
| `npm run setup` | Generate client, create database, seed demo data |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:reset` | Wipe and reseed |
| `npm run db:studio` | Browse the database in Prisma Studio |

---

## Known limitations

These are deliberate boundaries of this build, not defects:

- **No email delivery.** Account recovery issues real time-bound, single-use tokens, but no mail transport is wired up. In development the link is returned to the browser; in production it is only logged server-side. Connect an SMTP or institutional mail service in `src/app/api/auth/forgot-password/route.ts`.
- **Notifications are in-app only.** FR-50 to FR-52 are satisfied in the notification centre; email or SMS fan-out would be an added transport on `src/lib/notifications.ts`.
- **SQLite by default.** Fine for the pilot and for demonstration; PostgreSQL is a two-line change for concurrent institutional load.
- **Local disk storage.** `src/lib/storage.ts` isolates this behind two functions — swap in S3 or MinIO without touching callers.
- **Permissions are code-defined.** The matrix lives in `src/lib/rbac.ts` and is displayed read-only at `/admin/roles`. Making it editable at runtime would require moving it into the database.
