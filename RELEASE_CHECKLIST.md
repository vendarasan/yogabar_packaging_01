# Enterprise Release QA Checklist

This checklist must be executed and signed off prior to deploying any release or major patch to production environments.

---

## 1. Automated Tests & Build Verification

- [ ] **Unit Tests**: All unit tests pass (`npm test --prefix server`).
  - [ ] Workflow stage progression and crunch timeline calculation
  - [ ] Milestone date calculations and days-left calculation
  - [ ] Project and material validation rules
  - [ ] Permissions and role-based capability mapping
- [ ] **Integration Tests**: Database, authentication, and REST API integration tests pass.
- [ ] **End-to-End Workflow**: Core 13-step lifecycle test executes without regression.
- [ ] **Client Production Build**: Frontend compiles cleanly (`npm run build --prefix client`) with zero syntax or bundling errors.

---

## 2. Security & Compliance Verification

- [ ] **No Committed Secrets**: Repository scan confirms no `.env`, database passwords, private keys, or API credentials exist in git history.
- [ ] **Rate Limiting Active**: Brute-force protection verified on `/api/auth/login` and `/api/auth/signup` (HTTP 429 response on threshold breach).
- [ ] **Server-Side Authorization**: Unprivileged or viewer tokens rejected (HTTP 403) when attempting stage advance, spec sign-off, or project mutation.
- [ ] **File Upload Validation**:
  - [ ] Executable file extensions (`.exe`, `.bat`, `.sh`, `.php`, `.js`) are strictly rejected.
  - [ ] PDF magic byte verification active on PDF conversion endpoint.
  - [ ] File payloads larger than 50MB rejected with HTTP 400.
- [ ] **Cookie Security**: `pkg_session` cookie configured with `httpOnly: true`, `sameSite: 'lax'`, and `secure: true` (in production).

---

## 3. Database & Migration Review

- [ ] **Migration Check**: All SQL migrations are backward-compatible and tested against staging schema.
- [ ] **Index Verification**: Production indexes verified for `projects(supplier)`, `projects(target_launch_date)`, `projects(created_at)`, and `advance_logs(project_id)`.
- [ ] **Soft-Delete Integrity**: Deletions flag `is_deleted = true`; un-deleted queries filter out deleted projects by default.

---

## 4. Operational Readiness & Observability

- [ ] **Health Check**: `/api/health` returns HTTP 200 with `status: 'healthy'`, reporting DB connectivity, local storage readiness, and memory footprint.
- [ ] **Metrics Monitoring**: `/api/metrics` reports uptime, request totals, error rates, and average latency.
- [ ] **Backup Verified**: Fresh backup executed (`node server/scripts/backup.js`) and verified with SHA-256 integrity hash before deployment.
- [ ] **Disaster Recovery Runbook**: Rollback procedure reviewed and tested.

---

## 5. Deployment Sign-Off

| Role | Name | Sign-Off Date | Status |
|---|---|---|---|
| **Lead QA Engineer** | | | [ ] Approved |
| **Packaging Platform Lead** | | | [ ] Approved |
| **DevOps / Infrastructure** | | | [ ] Approved |
