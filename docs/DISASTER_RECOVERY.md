# Enterprise Disaster Recovery & Business Continuity Runbook

This runbook outlines operational procedures, recovery workflows, and failover mechanics for the Packaging Development Platform.

---

## 1. Objectives & Metrics

- **Recovery Point Objective (RPO)**: < 1 Hour (maximum acceptable data loss window)
- **Recovery Time Objective (RTO)**: < 15 Minutes (maximum downtime for critical path restoration)

---

## 2. Failure Scenarios & Automated Mitigations

### Scenario A: Primary Database (PostgreSQL RDS) Failure or Network Partition
- **Symptoms**: Database connection timeout, connection refused, or RDS maintenance downtime.
- **System Behavior**:
  - The platform implements **Graceful Storage Degradation**.
  - If RDS is unreachable, `PersistenceService` falls back to the persistent local JSON store (`server/data/local_store.json`).
  - The application remains online and responsive for all project workflows, spec editing, and activity logging.
  - The `/api/health` endpoint reports `status: 'degraded'` and `dependencies.database: 'disconnected'`, enabling automated alerting systems (e.g., Datadog, CloudWatch, Prometheus) without taking the platform offline.
- **Recovery Action**:
  1. Check RDS instance health in AWS Console (`ap-south-1`).
  2. Once RDS connectivity is restored, trigger synchronization:
     ```bash
     node server/scripts/restore.js
     ```

---

### Scenario B: File System or Data Corruption
- **Symptoms**: Corrupted data entries, accidental batch modifications, or local disk error.
- **System Behavior**:
  - The backup system maintains timestamped JSON snapshots in `server/backups/`.
  - Every backup contains a cryptographic SHA-256 integrity hash of its payload.
- **Recovery Action**:
  1. Execute automated restore from the latest verified backup:
     ```bash
     node server/scripts/restore.js
     ```
  2. Or specify a specific point-in-time backup file:
     ```bash
     node server/scripts/restore.js server/backups/backup_1789798855889_2026-09-19T06-20-55-889Z.json
     ```
  3. The restore script automatically validates the SHA-256 signature before touching memory or database state, protecting against corrupted backups.

---

### Scenario C: Failed Deployment or Defective Release
- **Symptoms**: Application crashing on startup, unhandled 500 errors, or failed health check.
- **System Behavior**:
  - Process manager (PM2 / Docker / Systemd) detects failed health check on `/api/health`.
- **Recovery Action**:
  1. Revert to the last known stable git release tag:
     ```bash
     git checkout tags/v1.0-stable
     ```
  2. Reinstall dependencies and rebuild client:
     ```bash
     npm ci --prefix server
     npm ci --prefix client
     npm run build --prefix client
     ```
  3. Restart application servers:
     ```bash
     pm2 restart all || npm run start
     ```
  4. Verify health check:
     ```bash
     curl http://localhost:5001/api/health
     ```

---

## 3. Routine Backup Schedule

In production, backups must be scheduled via system cron or PM2 cron:

```cron
# Run hourly backup with automated 10-backup retention
0 * * * * cd /app-package && node server/scripts/backup.js >> /var/log/pkg-backup.log 2>&1
```
