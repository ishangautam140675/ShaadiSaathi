# ShaadiSaathi &bull; Project Architecture Document

**Version:** 2.0.0-phase2  
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
```

### Authentication & RBAC Security Guarantees

1. **Password Protection:** Scrypt hashing via Node's native `crypto.scryptSync` with 16-byte cryptographically secure random salts and constant-time `timingSafeEqual` comparison.
2. **Replay-Protected Setup:** Primary Owner creation is permitted exactly once via `/api/setup`. Subsequent requests are rejected with HTTP 400.
3. **Session Independence:** Each device receives an independent UUIDv4 session token stored as a SHA-256 hash. Logging out on Device A invalidates only Device A's session record.
4. **Invitation Security:** 32-byte cryptographic hex tokens (`crypto.randomBytes(32)`), stored exclusively as SHA-256 hashes. Single-use enforcement inside an atomic transaction, configurable expiration (7, 14, 30 days), and immediate revocation support.
5. **Role Escalation Protection:** Invitations cannot grant `OWNER` status; only existing Owners can promote members. Demoting or deleting the last active Owner is strictly prohibited.
6. **Deny-by-Default Authorization:** Endpoints verify valid sessions and enforce minimum required roles (`requireRole('OWNER')`, `requireRole('FAMILY_MEMBER')`).

---

## 4. Implementation Phasing Roadmap

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | Foundation, Design System & Responsive Shell | **COMPLETED** | PWA foundation, 10 screens, bilingual i18n (EN/HI), luxury palette, Vitest test suite. |
| **Phase 2** | Secure Authentication, Family Invitations & RBAC | **COMPLETED** | Native Node/SQLite database, multi-device sessions, Scrypt hashing, invite-only onboarding, role enforcement, 23 automated tests. |
| **Phase 3** | Wedding Budget, Expenses & Vendor Persistence | Planned | Real database CRUD operations for expenses, vendor advances, shopping lists, and Shagun registers. |
| **Phase 4** | Offline IndexedDB Engine & Sync Conflict Handler | Planned | Background synchronization, optimistic UI updates, conflict resolution with vector clocks. |
| **Phase 5** | Advanced Financial Reports & PDF / Excel Export | Planned | Printable audit reports for wedding accountants, category analysis, spreadsheet exports. |
| **Phase 6** | SmartScan Receipt Verification & Free-Tier OCR | Planned | Client-side Tesseract.js / WebAssembly image preprocessing and side-by-side verification. |
| **Phase 7** | Zero-Lock-In Backup & Portability Engine | Planned | One-click raw JSON / CSV complete wedding archive backup and restore capability. |
