# ShaadiSaathi — Security & Access Control Checklist

This document details the complete security architecture, threat model mitigations, and compliance verification for ShaadiSaathi in production.

---

## 1. Threat Mitigation Matrix

| Attack Vector | Defense Mechanism | Implementation Details | Status |
|---|---|---|---|
| **Brute-Force Sign-In** | Sliding-window rate limiter | 5 failed attempts per 15-minute window tracked by IP & action in `rate_limits` table. | **VERIFIED** |
| **Credential Theft** | Scrypt password hashing | Cost parameters `N=16384, r=8, p=1` + 16-byte cryptographically secure random salt. Zero plaintext stored. | **VERIFIED** |
| **Session Hijacking** | Ephemeral UUIDv4 tokens | 32-byte CSPRNG tokens, stored as SHA-256 hashes. Independent session tracking per device. | **VERIFIED** |
| **Session Poisoning** | `HttpOnly`, `SameSite=Lax`, `Secure` | Cookie inaccessible to JavaScript. Automatically flags `Secure=true` when `NODE_ENV=production`. | **VERIFIED** |
| **CSRF Attacks** | Origin header verification + SameSite cookies | In production, all mutating requests (`POST`, `PUT`, `DELETE`) verify `Origin` against `Host` or `ALLOWED_ORIGINS`. | **VERIFIED** |
| **Formula Injection (CSV)** | Formula character neutralization | Prepends `'` to any cell starting with `=`, `+`, `-`, `@`, `\t`, `\r` before RFC 4180 quotation. | **VERIFIED** |
| **Devanagari Garbling (CSV)** | UTF-8 Byte Order Mark (BOM) | Injects `\uFEFF` at the start of all CSV exports, guaranteeing accurate Hindi rendering in Excel. | **VERIFIED** |
| **Tenant Data Leakage** | Strict multi-family database isolation | Every query (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) enforces `WHERE family_id = ?` from verified session. | **VERIFIED** |
| **Privilege Escalation** | Server-side RBAC middleware | `requireRoles('OWNER')` blocks `FAMILY_MEMBER` and `VIEWER` from administrative operations. | **VERIFIED** |
| **Private Document Sniffing** | Tenant-verified file streaming | `GET /api/documents/:id/file` queries database for document's `family_id` before streaming file. | **VERIFIED** |
| **Cloud AI Data Leakage** | Explicit user consent gatekeeper | `geminiService.ts` rejects any cloud extraction call unless payload explicitly passes `userConsent: true`. | **VERIFIED** |
| **PWA Cache Poisoning** | Strict CacheStorage rules | Private financial API endpoints (`/api/*`) are strictly excluded from Service Worker precaching. | **VERIFIED** |
| **Orphaned Admin Lockout** | Last-owner demotion/deletion guard | System disallows deleting or demoting the last active `OWNER` of a family sanctuary. | **VERIFIED** |

---

## 2. Role-Based Access Control (RBAC) Permissions Matrix

| Capability / Action | OWNER | FAMILY_MEMBER | VIEWER | Unauthenticated |
|---|:---:|:---:|:---:|:---:|
| **Initial Family Setup** (First Time Only) | &check; | &mdash; | &mdash; | &check; |
| **Sign In / Sign Out** | &check; | &check; | &check; | &check; |
| **View Dashboard & Financial Summaries** | &check; | &check; | &check; | &cross; (401) |
| **Update Total Wedding Budget** | &check; | &cross; (403) | &cross; (403) | &cross; (401) |
| **Create / Edit / Delete Expenses** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Manage Vendors & Log Payments** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Manage Shopping Items** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Record Sacred Shagun Gifts** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Update Checklist Tasks** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Upload Receipts & Run SmartScan OCR** | &check; | &check; | &cross; (403) | &cross; (401) |
| **Export Financial CSV / JSON Backups** | &check; | &check; | &check; | &cross; (401) |
| **Restore Database Backup Archive** | &check; | &cross; (403) | &cross; (403) | &cross; (401) |
| **Generate Family Invitations** | &check; | &cross; (403) | &cross; (403) | &cross; (401) |
| **Revoke Member Access / Invitations** | &check; | &cross; (403) | &cross; (403) | &cross; (401) |

---

## 3. Production Security Verification Steps

1. **Verify Session Isolation:**
   - Sign in on Device 1 as Owner.
   - Sign in on Device 2 as Family Member.
   - Click Sign Out on Device 1.
   - Reload Device 2. Confirm Device 2 is still logged in as Family Member and has NOT been signed out or escalated to Owner.
2. **Verify Rate Limiting:**
   - Attempt 6 incorrect logins in rapid succession.
   - Verify HTTP 429 Too Many Requests is triggered.
3. **Verify CSV Formula Neutralization:**
   - Create an expense with title `=SUM(A1:A10)`.
   - Download the CSV export.
   - Open in a text editor or hex viewer. Verify it begins with `"'=SUM(A1:A10)"`.
4. **Verify Backup Scrubbing:**
   - Download the JSON backup from Settings.
   - Search for `password_hash` or `password_salt`.
   - Verify 0 instances exist.
