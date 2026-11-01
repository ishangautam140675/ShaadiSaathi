# ShaadiSaathi &bull; Project Architecture Document

**Version:** 4.0.0-phase4  
**Project:** ShaadiSaathi (शादीसाथी) &bull; Premium Bilingual Wedding Management Progressive Web App  
**Tagline:** "Every Moment Special. Every Rupee Accounted For." / "हर पल ख़ास, हर रुपये का हिसाब।"

---

## 1. Executive Summary & Design Philosophy

ShaadiSaathi is a specialized, mobile-first Progressive Web App (PWA) crafted for Indian families to collaboratively plan, track, and manage all dimensions of wedding finances, vendor contracts, shopping registers, tasks, and sacred Shagun blessings.

### Core Non-Negotiable Tenets

1. **Zero Mandatory Subscription Costs:** Built exclusively to operate within verified, permanent modern free tiers (Cloudflare Pages, Cloudflare Workers, and Cloudflare D1 or Node/SQLite servers). Zero paid dependencies, zero forced upgrades.
2. **Zero Fake Claims or Dark Patterns:** Unfinished functionality is never disguised as operational. All implemented features are backed by real database persistence and tests.
3. **Sacred Cultural Separation:** In Indian wedding traditions, Shagun envelopes (लिफ़ाफ़ा) and gift offerings represent auspicious blessings and are strictly decoupled from operational wedding expenses and budget deficits.
4. **Invitation-Only Family Security:** To protect private multi-generational family finances, there is no public self-registration. Access is provisioned exclusively through secure, single-use, cryptographically unpredictable invitation tokens issued by family administrators.
5. **Multi-Device Session Isolation:** Family members on phones, tablets, and laptops maintain independent authenticated sessions. Actions, role changes, or signouts on one device never silently compromise or alter other devices.
6. **Authentic Bilingualism:** Full first-class support for English and natural Devanagari Hindi (हिन्दी), dynamically toggleable with zero layout clipping and independent from user-entered names.

---

## 2. Technology Stack & Directory Topology

```
Frontend Runtime:      React 19 + TypeScript (Strict Type Checking)
Backend Runtime:       Node.js 24 + Express 4.x
Database Engine:       Node 24 Built-In SQLite (DatabaseSync) - Zero Native C++ Compilation Required
Build Tool & Bundler:  Vite 8.x
Styling System:        Tailwind CSS v4 (Custom Luxury Wedding Palette)
Navigation:            React Router v7
Typography:            Cinzel, Playfair Display, Noto Sans Devanagari, Plus Jakarta Sans
Icons:                 Lucide React (tree-shakeable SVG icons)
PWA & Offline Engine:  vite-plugin-pwa (Service Workers, Web App Manifest)
Testing Suite:         Vitest 5.x + React Testing Library + JSDOM (Frontend & Server Integration)
Linter:                Oxlint (0 warnings, 0 errors)
Production Target:     Cloudflare Pages / Node.js Server + Cloudflare D1 / SQLite
```

### Directory Structure

```
d:/ShadiAPP/
├── public/
│   ├── favicon.svg             # Auspicious Kalash crest in Burgundy & Champagne Gold
│   └── manifest.webmanifest    # PWA installability manifest
├── server/
│   ├── db/
│   │   ├── database.ts         # Native node:sqlite DatabaseSync wrapper
│   │   └── schema.sql          # ANSI SQL schema (families, users, sessions, invitations, rate_limits)
│   ├── middleware/
│   │   ├── authMiddleware.ts   # Session token verification (Cookie & Bearer)
│   │   ├── rateLimitMiddleware.ts # SQLite brute-force protection (5 attempts / 15 min)
│   │   └── rbacMiddleware.ts   # Deny-by-default role permission guards (OWNER, FAMILY_MEMBER, VIEWER)
│   ├── services/
│   │   ├── authService.ts      # Setup, sign-in, session isolation, logout
│   │   ├── cryptoService.ts    # Scrypt hashing, random salt, SHA-256 tokens, timing-safe compare
│   │   ├── familyService.ts    # Member listing, role assignment, revocation, last-owner safeguard
│   │   └── invitationService.ts# Single-use token generation, expiry, validation, acceptance
│   ├── test/
│   │   └── auth.test.ts        # Comprehensive backend integration & security tests
│   ├── app.ts                  # Express server application & route mounting
│   └── index.ts                # Standalone Node production server entrypoint
├── src/
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Badge, Modal, EmptyState, LanguageSwitcher)
│   │   └── layout/             # Responsive shell (DesktopSidebar, MobileBottomNav, MobileDrawer, TopHeader)
│   ├── context/
│   │   ├── AuthContext.tsx     # Session management, sign-in, setup, invitation acceptance
│   │   ├── LanguageContext.tsx # Bilingual i18n context + HTML sync
│   │   └── WeddingContext.tsx  # Central wedding state & financial calculations
│   ├── locales/                # Complete English & Hindi dictionary mappings
│   ├── pages/
│   │   ├── AcceptInvitePage.tsx# /invite/:token secure onboarding screen
│   │   ├── FamilyPage.tsx      # /family member management & invitation generator
│   │   ├── SetupPage.tsx       # /setup first-time primary owner wizard
│   │   ├── SignInPage.tsx      # /sign-in multi-device authentication screen
│   │   ├── WelcomePage.tsx     # Public welcome screen with invitation-only guidance
│   │   └── ...                 # Dashboard, Expenses, Vendors, Shopping, Shagun, Tasks, SmartScan, Settings
│   └── test/                   # Vitest unit & integration test suites
```

---

## 3. Database Schema & Security Architecture

### Relational Schema (ANSI SQLite / Cloudflare D1 Compatible)

```sql
-- 1. Wedding Families
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date TEXT NOT NULL,
  total_budget REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. User Accounts
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'FAMILY_MEMBER', 'VIEWER')),
  side TEXT NOT NULL DEFAULT 'mutual' CHECK (side IN ('bride', 'groom', 'mutual')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 3. Multi-Device Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 4. Cryptographic Single-Use Invitations
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('FAMILY_MEMBER', 'VIEWER')),
  side TEXT NOT NULL DEFAULT 'mutual' CHECK (side IN ('bride', 'groom', 'mutual')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  accepted_at TEXT,
  accepted_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Brute-Force Rate Limiting
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,
  action_key TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_attempt_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Wedding Expenses (Phase 3 Real Database Persistence)
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_amount_paise INTEGER NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  outstanding_balance_paise INTEGER NOT NULL DEFAULT 0,
  outstanding_balance REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  paid_by_name TEXT NOT NULL,
  paid_by_user_id TEXT,
  vendor_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'other',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Expense Audit Trail (Phase 3)
CREATE TABLE expense_audit_logs (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  changed_by_user_id TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Wedding Vendors (Phase 4)
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  agreed_amount REAL NOT NULL DEFAULT 0,
  agreed_amount_paise INTEGER NOT NULL DEFAULT 0,
  advance_paid REAL NOT NULL DEFAULT 0,
  advance_paid_paise INTEGER NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  balance_due_paise INTEGER NOT NULL DEFAULT 0,
  payment_due_date TEXT,
  status TEXT NOT NULL DEFAULT 'booked', -- 'booked', 'advance_paid', 'fully_paid', 'cancelled'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 9. Vendor Payments (Phase 4)
CREATE TABLE vendor_payments (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  amount REAL NOT NULL,
  amount_paise INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'bank_transfer',
  transaction_ref TEXT,
  notes TEXT,
  expense_id TEXT, -- Optional link to operational expense
  recorded_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Wedding Shopping Items (Phase 4)
CREATE TABLE shopping_items (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'clothing',
  description TEXT,
  estimated_price REAL NOT NULL DEFAULT 0,
  estimated_price_paise INTEGER NOT NULL DEFAULT 0,
  actual_price REAL,
  actual_price_paise INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'to_buy', 'in_tailoring', 'purchased', 'cancelled'
  assigned_to TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
  deadline TEXT,
  store_name TEXT,
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Sacred Gifts & Shagun Register (Phase 4 - Decoupled from Expenses)
CREATE TABLE gifts_shagun (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  giver_name TEXT NOT NULL,
  relation TEXT,
  gift_type TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'physical_gift', 'jewellery', 'other'
  amount REAL,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  side TEXT NOT NULL DEFAULT 'mutual', -- 'bride', 'groom', 'mutual'
  date_received TEXT NOT NULL,
  received_by TEXT,
  thank_you_sent INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Wedding Checklist Tasks (Phase 4)
CREATE TABLE checklist_tasks (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  phase TEXT NOT NULL DEFAULT '1_month', -- '6_months', '3_months', '1_month', 'wedding_week', 'day_of', 'post_wedding'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  assigned_to TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Idempotency Keys (Phase 5)
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Offline-First & Safe Synchronization Architecture (Phase 5)

1. **Durable IndexedDB Persistence:**
   - **`sync_queue` Store:** Durable queue for offline mutations (`operationId`, `familyId`, `userId`, `entityType`, `entityId`, `operationType`, `payload`, `baseVersion`, `status`, `retryCount`, `serverRecord`). Keyed by `operationId` with status and creation indexes.
   - **`cached_records` Store:** Fast local read cache keyed by composite `${familyId}:${entityType}:${id}`.
   - **`storage_metadata` Store:** Health, quota tracking, and persistent storage grant status.
   - In non-browser or test runner environments (Vitest/JSDOM), an in-memory queue fallback operates automatically.

2. **Idempotency & Duplicate Prevention:**
   - Client generates a unique UUID operation ID (`Idempotency-Key` / `x-idempotency-key`).
   - Server checks `idempotency_keys` table inside an atomic transaction.
   - If an operation with the same key was previously processed, the server replays the stored status code and response payload with header `X-Idempotency-Replay: true`, eliminating duplicate records upon network retries or timeouts.

3. **Optimistic Concurrency & Revision Conflict Resolution:**
   - All mutable tables (`families`, `expenses`, `vendors`, `shopping_items`, `gifts_shagun`, `checklist_tasks`) track a monotonically increasing `version INTEGER NOT NULL DEFAULT 1`.
   - Mutating requests specify `expectedVersion` or `baseVersion`. If the server record's current revision is greater than `expectedVersion`, the server aborts the mutation and responds with HTTP 409 Conflict along with `serverRecord`.
   - **Anti-Merge Monetary Guarantee:** Automatic algorithmic merging of monetary amounts, vendor advances, or payments is strictly forbidden. Conflicting edits trigger a side-by-side comparison modal allowing the user to explicitly choose `Accept Server Version` or `Overwrite with My Changes`.

4. **Multi-Device Pull Synchronization:**
   - Endpoints `/api/sync/changes?since=<ISO_TIMESTAMP>` provide differential change sets across all entities, enabling family members on phones and laptops to remain synchronized in real time.
   - Batch endpoint `/api/sync/batch` processes queued offline operations sequentially in an atomic transaction, validating authorizations and checking concurrency versions.

5. **Safe PWA Workbox Caching Policy:**
   - **Static Assets:** Versioned JS bundles, CSS stylesheets, web fonts, and application icons use `StaleWhileRevalidate` and `CacheFirst` strategies.
   - **Security Restriction:** Private financial data and authentication API responses (`/api/*`) are **strictly prohibited** from Service Worker `CacheStorage` to protect private multi-generational family finances.
   - **PWA Update Notification:** Foreground banner (`PwaUpdatePrompt`) alerts users when a new service worker release is ready and provides an instant one-click reload.
   - **Offline Shell & Fallback:** Royal offline fallback page (`/offline`) with an auspicious Kalash crest and retry connectivity trigger.

---

## 4. Implementation Phasing Roadmap

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | Foundation, Design System & Responsive Shell | **COMPLETED** | PWA foundation, 10 screens, bilingual i18n (EN/HI), luxury palette, Vitest test suite. |
| **Phase 2** | Secure Authentication, Family Invitations & RBAC | **COMPLETED** | Native Node/SQLite database, multi-device sessions, Scrypt hashing, invite-only onboarding, role enforcement, 23 automated tests. |
| **Phase 3** | Wedding Budget, Expenses & Real Database Persistence | **COMPLETED** | Real SQLite database CRUD for wedding budget & expenses, integer paise precision, partial payments, search/filter/pagination, audit trail, 43 automated tests. |
| **Phase 4** | Vendors, Payment Tracking, Shopping, Gifts & Checklist | **COMPLETED** | Complete CRUD for vendors, payment log with expense linking, shopping variance analysis, sacred gifts/shagun decoupled ledger, and wedding checklist, 56 automated tests. |
| **Phase 5** | Offline-First Experience, Safe Synchronization & PWA | **COMPLETED** | Durable IndexedDB queue, idempotency key caching, revision optimistic concurrency (409 Conflict), side-by-side anti-merge conflict modal, pull sync, PWA Workbox policy, 69 automated tests. |
| **Phase 6** | SmartScan Document Extraction, Financial Reports, Export & Backups | **COMPLETED** | Multi-engine receipt scanning (Local Tesseract OCR + optional Gemini Flash with explicit consent), side-by-side verification & discrepancy detection, duplicate checks, comprehensive database-backed analytics, formula-safe RFC 4180 CSV exports, and transactional JSON backup/restore (`ShaadiSaathi-Wedding-Backup-V1`), 89 automated tests. |
| **Phase 7** | Production Hardening, Multi-Family Tenancy & Final Polish | Planned | Multi-family hosting isolation, performance benchmarking, end-to-end audit readiness, and deployment verification. |

---

## 5. Phase 6 Architecture: SmartScan, Reports, Export & Backups

### 5.1 Document Processing Pipeline (SmartScan)
1. **Upload & Storage (`documentService.ts`)**:
   - Receipts and invoices stored under `data/uploads/documents` using sanitized, collision-resistant UUID filenames (`.pdf`, `.jpg`, `.png`, `.webp`).
   - Tenant isolation enforced: File access (`/api/documents/:id/file`) checks `family_id` ownership on every read.
2. **Local OCR Engine (`ocrService.ts`)**:
   - Uses `tesseract.js` for completely local, offline-capable optical character recognition.
   - Dual-language support (`eng` and `hin+eng`).
   - Domain-tuned regex heuristics for Indian Rupee amounts, receipt dates, vendor detection, and itemized rows.
   - Grand Total Discrepancy detector flags math errors when `detectedGrandTotal != sum(itemizedAmounts)`.
3. **Optional Cloud Enhancement (`geminiService.ts`)**:
   - Uses `@google/genai` (Gemini 2.5 Flash) strictly as an opt-in enhancement.
   - **Zero Mandatory Subscription**: Works 100% locally if `GEMINI_API_KEY` is not provided.
   - **Privacy First**: Explicit user consent (`userConsent: true`) is required per document.
   - Schema-enforced structured JSON output for vendor, date, line items, and totals.
4. **Duplicate Detection & Human Verification (`importService.ts`)**:
   - Potential duplicates checked against existing database expenses before importing.
   - **Zero Automatic Ingestion**: Expenses are never written to the database until explicitly confirmed by the user.
   - Traceability: Imported expenses reference `source_document_id`.

### 5.2 Financial Reports Engine (`reportsService.ts`)
- Computes real-time wedding financial health from authoritative SQLite tables with integer paise precision:
  - Total Budget, Committed Contracts, Total Paid, Outstanding Dues, Budget Utilization %, Cash Remaining.
  - Category Breakdown with spend progress bars.
  - Vendor Payment Balances with contract dues.
  - Shopping Budget Variance (Estimated vs Actual price).
  - Decoupled Shagun / Gifts tally (sacred blessings separated from operational wedding budget).
  - Monthly Spend Timeline.

### 5.3 Safe Data Export (`exportService.ts`)
- **Formula Injection Mitigation**: Any field starting with dangerous spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is safely prefixed with a single quote (`'`).
- **UTF-8 BOM Header**: Prefixes all CSV streams with `\uFEFF` ensuring Excel and Numbers render Devanagari Hindi text cleanly without garbled characters.
- Strict RFC 4180 quoting and comma escaping.

### 5.4 Backup & Disaster Recovery (`backupService.ts`)
- **Format**: `ShaadiSaathi-Wedding-Backup-V1` JSON format.
- **Security**: Strips sensitive credentials (password hashes, active session tokens, invitation secrets) during export.
- **Isolated Restoration**: Validates schema version and family identity before executing a single atomic SQLite transaction (`BEGIN TRANSACTION` ... `COMMIT`), wiping and repopulating all wedding records safely.
