# ShaadiSaathi (शादीसाथी)

> **"Every Moment Special. Every Rupee Accounted For."**  
> *"हर पल ख़ास, हर रुपये का हिसाब।"*

ShaadiSaathi is a premium, bilingual Progressive Web App (PWA) designed for Indian families to collaboratively manage their complete wedding budget, expenses, shopping lists, vendor contracts, advance payments, traditional Shagun blessings, and preparation timelines with zero mandatory subscription costs.

---

## 💎 Premium Wedding Design System

Built with a dedicated luxury Indian wedding palette:
- **Warm Ivory Background:** `#FFF9F0`
- **Deep Burgundy Primary:** `#702D3D`
- **Champagne Gold Accents:** `#C5A46D`
- **Sage Green Success States:** `#849780`
- **Charcoal Text:** `#292725`
- **Soft Rose Secondary Surfaces:** `#EBD9D8`

---

## 🚀 Key Features Delivered Across Phases

### Phase 1: Foundation, Design System & Responsive Shell
1. **Responsive Application Shell:**
   - **Desktop:** Elegant left sidebar with wedding crest, countdown, active state indicators, and top utility header.
   - **Mobile:** Touch-friendly bottom navigation bar, compact header, and slide-out drawer for auxiliary screens.
2. **10 Comprehensive Screens:**
   - **Welcome / Entry Screen (`/welcome`):** Royal wedding landing with family invitation token input and zero public signups.
   - **Dashboard (`/`):** Wedding budget overview, expense tracking, remaining balance, pending payments, utilization progress bar, recent transactions, and quick action modals.
   - **Expenses Screen (`/expenses`):** Itemized expenses with category filtering, search, payment status badges, and validated logging modal.
   - **Shopping Screen (`/shopping`):** Trousseau and wardrobe tracking with estimate vs. actual variance analysis and responsible family member tags.
   - **Vendors & Payments Screen (`/vendors`):** Vendor contracts, advance deposits, remaining balances, payment due dates, and zero-fake-payment guarantees.
   - **Gifts & Shagun Register (`/gifts`):** Sacred ledger for cash envelopes (लिफ़ाफ़ा) and jewelry, **strictly separated from operational wedding expenses**.
   - **Checklist Screen (`/checklist`):** Time-phased duties from 6 months prior to D-Day with interactive completion checkboxes.
   - **Financial Reports Screen (`/reports`):** Lightweight SVG/CSS Budget vs. Actual spending and family side allocation charts.
   - **SmartScan Screen (`/smartscan`):** 4-step human-verified receipt upload and audit workflow with explicit Phase 5 scheduling notice.
   - **Settings Screen (`/settings`):** Language preferences, wedding profile, role breakdown, and zero-cost architecture status.
3. **Bilingual Localization (English & हिन्दी):**
   - Instant UI switching between English and natural Devanagari Hindi.
   - Persisted in `localStorage` and synchronized with document `lang` attributes.
4. **PWA & Offline-Capable Setup:**
   - Auto-updating service worker via `vite-plugin-pwa` precaching all assets for offline launchability.

### Phase 2: Secure Authentication, Family Invitations & Role-Based Access
1. **Multi-Device Independent Sessions:**
   - Real, isolated authentication sessions per device.
   - Logging in on a mobile phone does not interfere with a laptop session; signing out on one device leaves other authorized family members uninterrupted.
2. **First-Time Primary Owner Setup Wizard (`/setup`):**
   - Replay-protected setup endpoint initializes the family wedding sanctuary and creates the primary Owner account.
   - No hardcoded passwords, no insecure default accounts.
3. **Invitation-Only Onboarding (`/invite/:token`):**
   - 32-byte cryptographically secure random tokens (`crypto.randomBytes(32)`), stored exclusively as SHA-256 hashes.
   - Single-use atomic acceptance, configurable expiration (7, 14, 30 days), and immediate revocation.
   - One-click copy and direct WhatsApp invite link generation.
   - Role escalation prevention: invitations can only provision `FAMILY_MEMBER` or `VIEWER` access.
4. **Server-Enforced Role-Based Access Control (RBAC):**
   - **Owner / Admin:** Can manage family members, issue/revoke invitation tokens, update roles, and manage wedding configurations. Protected against last-owner removal or demotion.
   - **Family Member:** Can view and record wedding finances, shopping, and tasks.
   - **Viewer:** Read-only access to authorized schedules, checklists, and reports.
5. **Zero-Dependency Native SQLite Engine:**
   - Leverages Node 24's built-in `node:sqlite` (`DatabaseSync`), requiring zero native C++ compiler tools.
   - Fully ANSI-SQL compatible with Cloudflare D1 for future cloud migration.
6. **Brute-Force Rate Limiting:**
   - Sliding-window rate limiter protecting `/api/auth/sign-in` (5 attempts per 15-minute window).

### Phase 3: Real Wedding Budget and Expense Management
1. **Total Wedding Budget Management:**
   - Set and update authoritative total family wedding budget.
   - Strictly validated against non-negative amounts, invalid characters, and capped at ₹100 Crores.
   - Default currency set explicitly to INR (₹).
   - Creator and timestamp audit tracking with optimistic UI updates.
2. **Integer Paise Financial Precision:**
   - Authoritative monetary values are stored as integer paise (`amount_paise`, `paid_amount_paise`, `outstanding_balance_paise`).
   - Prevents IEEE 754 floating-point inaccuracies. Formatted rupee outputs are produced only at API boundaries.
3. **Full Expense CRUD Operations:**
   - **Create:** Log wedding expenditures with title, exact amount, category, date, payer, optional vendor, payment method (`cash`, `upi`, `card`, `bank_transfer`, `other`), and notes.
   - **Partial Payments:** Support upfront partial deposits (`paidAmount`) with automatic calculation of outstanding balance (`amount - paidAmount`) and statuses (`paid`, `partially_paid`, `pending`).
   - **Read:** Search expenses by keyword, filter by category or payment status, and sort by date or amount.
   - **Update:** Real-time editing of expense records with live balance calculation and audit logging.
   - **Delete:** Accessible confirmation dialog before permanently removing an expense record.
4. **Authoritative Financial Summaries:**
   - Real-time computations: Total Budget, Total Committed (`SUM(amount)`), Total Paid (`SUM(paid_amount)`), Total Outstanding (`SUM(outstanding)`), Remaining Runway (`budget - committed`), Cash Remaining (`budget - paid`), and Budget Utilization (`%`).
   - Category-wise breakdown with zero double-counting.
5. **Multi-Tenancy & RBAC Security:**
   - Strict `family_id` data isolation: zero cross-family data leakage.
   - Deny-by-default access: unauthenticated requests receive HTTP 401.
   - `OWNER` & `FAMILY_MEMBER` can create, update, and delete; `VIEWER` is strictly read-only.
   - Complete audit trail (`expense_audit_logs`) tracking mutations with user IDs and timestamps.

### Phase 4: Vendors, Payment Tracking, Shopping, Gifts & Checklist
1. **Complete Vendor Lifecycle Management:**
   - Full CRUD for catering, venue, decor, photography, makeup, clothing, sound, and invitations.
   - Agreed price, advances paid, balance due, and next payment due date tracking.
   - Zero-fake-payment guarantee: clear honest disclosure that direct gateway processing is not offered, ensuring families log real bank transfers and receipts.
2. **Transactional Vendor Payment Logging & Expense Linking:**
   - Record payments against vendors with date, mode, transaction reference, and optional expense linking.
   - Strict validation: overpayments exceeding the agreed price are rejected.
   - **Zero double-counting accounting model**: vendor agreements do not inflate budget commitments until disbursements are logged.
3. **Wedding Shopping Register & Variance Analysis:**
   - Wardrobe, jewellery, and trousseau tracking with quantities, store names, deadlines, and assigned family members.
   - Dynamic estimated vs actual variance analysis highlighting budget over/under-runs and overdue purchase alerts.
4. **Sacred Gifts & Shagun Register (Culturally Decoupled):**
   - Traditional auspicious Shagun cash envelopes (लिफ़ाफ़ा) and physical gifts/jewellery tracking.
   - **Strict cultural decoupling**: Shagun blessings are kept in a separate sacred ledger and are NEVER subtracted from operational wedding expenses or budget deficits.
5. **Wedding Checklist & Timeline:**
   - Time-phased duties from 6 months before, 3 months before, 1 month before, wedding week, day-of, and post-wedding.
   - Real completion percentages and dynamic phase progress indicators.
6. **Multi-Tenancy & RBAC Protection:**
   - Strict `family_id` tenant isolation across all Phase 4 tables.
   - VIEWER role enforces read-only guards on both frontend and server.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript (Strict Mode)
- **Backend:** Node.js 24, Express 4.x
- **Database:** Node 24 Native SQLite (`node:sqlite`) / Cloudflare D1 compatible
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4 with custom color variables
- **Navigation:** React Router v7
- **Icons:** Lucide React
- **PWA:** `vite-plugin-pwa`
- **Testing:** Vitest, React Testing Library, Supertest, JSDOM (56 automated tests across 9 suites)
- **Linter:** Oxlint (0 errors, 0 warnings)

---

## 📦 Getting Started

### Prerequisites
- Node.js &ge; 24.x (Recommended: Node 24 LTS)
- npm &ge; 10.x

### 1. Installation
```bash
npm install
```

### 2. Run Development Server (with integrated API backend)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. The Vite development server automatically mounts the Express API middleware under `/api`.

### 3. Run Standalone API Server
```bash
npm run server
```

### 4. Run Automated Tests
```bash
npm run test
```

### 5. Run Linter
```bash
npm run lint
```

### 6. Build for Production
```bash
npm run build
```
Production assets are generated in `dist/` with service worker bundles (`dist/sw.js`) and manifest files.

---

## 🔒 Free-Tier Hosting & Zero-Cost Architecture

ShaadiSaathi is architected to run on permanent, verified free tiers without automatic paid upgrades:

- **Frontend Hosting:** Cloudflare Pages (Unlimited bandwidth, global CDN, free SSL).
- **Backend API & Database:** Cloudflare Workers (100,000 free requests/day) + Cloudflare D1 (5,000,000 free row reads/day, 5 GB storage) or lightweight Node VPS/container.
- **Data Portability:** Standard SQLite schema allows migrating all wedding records to any server or downloading a complete JSON/CSV archive anytime.

See [FREE_DEPLOYMENT_PLAN.md](file:///d:/ShadiAPP/FREE_DEPLOYMENT_PLAN.md) and [PROJECT_ARCHITECTURE.md](file:///d:/ShadiAPP/PROJECT_ARCHITECTURE.md) for full architectural documentation.

---

## 📋 Implementation Status & Phase Roadmap

| Feature / Module | Current Status | Delivery Phase |
|---|---|---|
| Responsive Application Shell & Design System | ✅ Complete | Phase 1 |
| Bilingual English / Hindi Localization | ✅ Complete | Phase 1 |
| 10 Interactive Screens & Navigation | ✅ Complete | Phase 1 |
| Honest Empty States & Sample Preview Toggle | ✅ Complete | Phase 1 |
| Form Validation & Local Session Preview | ✅ Complete | Phase 1 |
| Secure Multi-Device Authentication & Sessions | ✅ Complete | Phase 2 |
| Replay-Protected First-Admin Setup Wizard | ✅ Complete | Phase 2 |
| Cryptographic Single-Use Family Invitations | ✅ Complete | Phase 2 |
| Role-Based Access Control (Owner / Member / Viewer) | ✅ Complete | Phase 2 |
| Native SQLite Database & Brute-Force Protection | ✅ Complete | Phase 2 |
| Automated Test Suite (23/23 tests passing) | ✅ Complete | Phase 1 & 2 |
| Wedding Budget, Expenses & Vendor Persistence | ⏳ Planned | Phase 3 |
| Offline IndexedDB Synchronization & Conflict Resolution | ⏳ Planned | Phase 4 |
| Exportable PDF & Excel Financial Reports | ⏳ Planned | Phase 5 |
| SmartScan WebAssembly OCR Receipt Extraction | ⏳ Planned | Phase 6 |
| Full JSON/CSV Wedding Archive Backup & Restore | ⏳ Planned | Phase 7 |

---

## 📜 License & Ownership

Built for families everywhere. Open-source under the MIT License.
