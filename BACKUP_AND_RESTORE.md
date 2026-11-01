# ShaadiSaathi — Backup, Disaster Recovery & Data Portability Guide

This document describes how family wedding data is preserved, exported, backed up, and restored.

---

## 1. Automated vs. Manual Backups (Honest Disclosure)

> [!NOTE]
> - **In-App JSON/CSV Exports:** **Manual**. Triggered on-demand by family members via the web UI.
> - **Filesystem Backups:** **Automated or Manual** depending on your hosting setup. If running on a Linux VPS, a simple `cron` job automates database snapshots. If running on a free ephemeral host without attached volumes, backups **must** be created manually before instances sleep or reset.

---

## 2. In-App Backup & Restore (`ShaadiSaathi-Wedding-Backup-V1`)

ShaadiSaathi includes a built-in, portable JSON archive format designed for family data portability:

### Exporting Master JSON Archive
1. Sign in as `OWNER` or `FAMILY_MEMBER`.
2. Navigate to **Settings** (`/settings`).
3. Click **Download Complete Backup (.json)**.
4. The system produces a structured file named `shaadisaathi-backup-<familyId>-<timestamp>.json`.

#### What is Included:
- Family wedding metadata (names, date, budget).
- Family member accounts (names, emails, roles).
- All expenses, vendor records, payment logs, shopping items, sacred Shagun gifts, and checklist milestones.
- Scan document records and extraction summaries.

#### What is Scrubbed for Privacy & Safety:
- **Zero Passwords:** `password_hash` and `password_salt` are omitted.
- **Zero Session Secrets:** Active login tokens and invitation hashes are omitted.

### Restoring from Backup Archive
1. Sign in as `OWNER`.
2. Navigate to **Settings** &rarr; **Restore from Backup**.
3. Select the `.json` file and confirm the action.
4. The backend verifies the format signature (`ShaadiSaathi-Wedding-Backup-V1`).
5. Within an atomic database transaction (`BEGIN TRANSACTION` ... `COMMIT`), the database is restored safely without leaving orphaned records.

---

## 3. Server-Level Filesystem Backups (Recommended for Production)

For server administrators hosting ShaadiSaathi with persistent disks (Docker, VPS, or home server):

### Backup Script (`backup_wedding.sh`)
```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/shaadisaathi"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. SQLite atomic safe backup (using sqlite3 CLI or file copy if app is quiescent)
sqlite3 /data/shaadisaathi.db ".backup '$BACKUP_DIR/db_$TIMESTAMP.sqlite'"

# 2. Archive uploaded receipts and invoices
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /data/uploads documents

# 3. Retention policy: delete backups older than 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "[ShaadiSaathi Backup] Completed at $TIMESTAMP"
```

### Automating via Cron
To run automatic backups daily at 2:00 AM:
```bash
crontab -e
# Add:
0 2 * * * /bin/bash /opt/shaadisaathi/scripts/backup_wedding.sh >> /var/log/wedding_backup.log 2>&1
```

---

## 4. Disaster Recovery & Provider Migration Runbook

If your hosting provider removes their free tier, changes quotas, or has an outage:

1. **Step 1:** Download the latest master JSON backup from **Settings**.
2. **Step 2:** If you have server access, copy `/data/shaadisaathi.db` and `/data/uploads/documents/` using `scp` or `rsync`:
   ```bash
   rsync -avz ubuntu@old-server:/data/ ./local_wedding_backup/
   ```
3. **Step 3:** Spin up a new instance on your alternative provider (e.g., Oracle Cloud Always Free or local Docker).
4. **Step 4:** Place `shaadisaathi.db` into `/data/` and receipt files into `/data/uploads/documents/`.
5. **Step 5:** Start the container:
   ```bash
   docker-compose up -d
   ```
6. **Step 6:** All family members can immediately sign in with their existing passwords and sessions!
