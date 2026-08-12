# Deployment Guide

Covers moving CSU-THRIVE from the local pilot build to an institutional
deployment on either cloud infrastructure or a Caraga State University server
(SRS 2.6 — Deployment Flexibility).

---

## 1. Prerequisites

| Component | Minimum | Notes |
|---|---|---|
| Node.js | 20 LTS | 24.x tested |
| Database | PostgreSQL 14+ | SQLite is for development only |
| Storage | 20 GB+ | Manuscripts average 2–10 MB each, with every revision retained |
| TLS | Required | HTTPS is mandatory for authentication and document transfer (NFR — SRS 3.3.4) |

---

## 2. Switch to PostgreSQL

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

In `.env`:

```bash
DATABASE_URL="postgresql://thrive:STRONG_PASSWORD@db.host:5432/thrive?schema=public"
```

Then:

```bash
npx prisma migrate dev --name init     # once, to author the migration
npx prisma migrate deploy              # on each deployment target
```

No application code changes are needed — the data layer is accessed only
through Prisma.

---

## 3. Environment configuration

```bash
DATABASE_URL="postgresql://…"
AUTH_SECRET="<48+ random bytes, base64url>"
STORAGE_DIR="/var/lib/thrive/documents"
NODE_ENV="production"
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`AUTH_SECRET` must be at least 32 characters — the application refuses to issue
or verify sessions otherwise, rather than falling back to a weak default
(NFR-09). Rotating it invalidates all active sessions, which is the intended
behaviour after a suspected compromise.

---

## 4. File storage

`STORAGE_DIR` must be:

- outside the web root (never served statically),
- writable by the application user only,
- included in the backup schedule alongside the database.

```bash
sudo mkdir -p /var/lib/thrive/documents
sudo chown -R thrive:thrive /var/lib/thrive
sudo chmod 700 /var/lib/thrive/documents
```

To move storage off the application server, replace `saveDocument`,
`readDocument` and `deleteDocument` in `src/lib/storage.ts` with an S3 or MinIO
client. No caller changes are required.

---

## 5. Build and run

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start                # listens on PORT, default 3000
```

Create the first administrator with the seed. It carries no demo data, deletes
nothing, and is safe to rerun — an existing administrator is left untouched:

```bash
ADMIN_EMAIL="admin@carsu.edu.ph" ADMIN_PASSWORD="<a strong password>" npm run db:seed
```

Omit `ADMIN_PASSWORD` to have a strong one generated and printed once.

Every other account is created from inside the application: students register
themselves at `/signup` (restricted to `@carsu.edu.ph`), and all privileged
roles are provisioned by an administrator in *Admin → User Management*.

> `npm run db:reset` runs `prisma db push --force-reset` and **irreversibly
> destroys every row**. It is a development convenience — never run it against
> an institutional database.

---

## 6. Reverse proxy

```nginx
server {
    listen 443 ssl http2;
    server_name thrive.carsu.edu.ph;

    ssl_certificate     /etc/ssl/certs/thrive.crt;
    ssl_certificate_key /etc/ssl/private/thrive.key;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Manuscripts plus revisions; keep above the 20 MB application limit.
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name thrive.carsu.edu.ph;
    return 301 https://$host$request_uri;
}
```

`X-Forwarded-For` matters: the audit trail records client IPs from that header
(NFR-10).

---

## 7. Process management

```ini
# /etc/systemd/system/thrive.service
[Unit]
Description=CSU-THRIVE
After=network.target postgresql.service

[Service]
Type=simple
User=thrive
WorkingDirectory=/opt/thrive
EnvironmentFile=/opt/thrive/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now thrive
```

---

## 8. Backup and recovery

Supports FR-64 and NFR-11 (data intact and recoverable).

```bash
#!/bin/bash
# /opt/thrive/backup.sh — run nightly via cron
set -euo pipefail
STAMP=$(date +%Y%m%d)
DEST=/backup/thrive

pg_dump "$DATABASE_URL" | gzip > "$DEST/db-$STAMP.sql.gz"
tar czf "$DEST/files-$STAMP.tar.gz" -C /var/lib/thrive documents

find "$DEST" -name '*.gz' -mtime +30 -delete
```

Database and file store must be restored from the **same** night: a document row
without its file, or a file without its row, is an inconsistent state. Rehearse
a restore before go-live.

---

## 9. Pre-launch checklist

- [ ] `AUTH_SECRET` is unique to this environment and at least 32 characters
- [ ] `DATABASE_URL` points at PostgreSQL, not SQLite
- [ ] `STORAGE_DIR` is outside the web root and backed up
- [ ] HTTPS enforced; HTTP redirects to HTTPS
- [ ] Bootstrap administrator password changed from the generated one
- [ ] At least one real administrator account exists and has been tested
- [ ] `client_max_body_size` exceeds the 20 MB application upload limit
- [ ] Nightly backup job installed and a restore rehearsed
- [ ] Audit trail reachable at `/admin/audit` and recording events
- [ ] Log rotation configured for application output

---

## 10. Post-deployment verification

```bash
BASE=https://thrive.carsu.edu.ph

# Protected route redirects when unauthenticated (FR-11)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$BASE/student"

# Invalid credentials give a generic refusal (FR-01, FR-03)
curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@carsu.edu.ph","password":"wrong"}'

# Security headers present
curl -sI "$BASE/" | grep -Ei 'strict-transport|x-frame|x-content-type'
```

Then sign in as the administrator and confirm `/admin/audit` shows the sign-in
event with the correct client IP — that verifies the proxy headers, the session
layer and the audit trail in one step.
