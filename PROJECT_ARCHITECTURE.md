# ShaadiSaathi &bull; Project Architecture Document

**Version:** 1.0.0-phase1  
**Project:** ShaadiSaathi (शादीसाथी) &bull; Premium Bilingual Wedding Management Progressive Web App  
**Tagline:** "Every Moment Special. Every Rupee Accounted For." / "हर पल ख़ास, हर रुपये का हिसाब।"

---

## 1. Executive Summary & Design Philosophy

ShaadiSaathi is a specialized, mobile-first Progressive Web App (PWA) crafted for Indian families to collaboratively plan, track, and manage all dimensions of wedding finances, vendor contracts, shopping registers, tasks, and sacred Shagun blessings.

### Core Non-Negotiable Tenets

1. **Zero Mandatory Subscription Costs:** Built exclusively to operate within verified, permanent modern free tiers (Cloudflare Pages, Cloudflare Workers, and Cloudflare D1 or Supabase free tier).
2. **Zero Fake Claims or Dark Patterns:** Unfinished functionality is never disguised as operational. If persistence is slated for Phase 2, the UI honestly identifies current records as session previews.
3. **Sacred Cultural Separation:** In Indian wedding traditions, Shagun envelopes (लिफ़ाफ़ा) and gift offerings represent auspicious blessings and are strictly decoupled from operational wedding expenses and budget deficits.
4. **Invitation-Only Family Security:** To protect private multi-generational family finances, there is no public self-registration. Access is provisioned exclusively through secure invitation tokens issued by family administrators.
5. **Authentic Bilingualism:** Full first-class support for English and natural Devanagari Hindi (हिन्दी), dynamically toggleable with zero layout clipping and independent from user-entered names.

---

## 2. Technology Stack & Directory Topology

```
Frontend Runtime:      React 19 + TypeScript (Strict Type Checking)
Build Tool & Bundler:  Vite 8.x
Styling System:        Tailwind CSS v4 (Custom Luxury Wedding Palette)
Navigation:            React Router v7
Typography:            Cinzel, Playfair Display, Noto Sans Devanagari, Plus Jakarta Sans
Icons:                 Lucide React (tree-shakeable SVG icons)
PWA & Offline Engine:  vite-plugin-pwa (Service Workers, Web App Manifest)
Testing Suite:         Vitest 5.x + React Testing Library + JSDOM
Linter:                Oxlint (0 warnings, 0 errors)
Target Hosting:        Cloudflare Pages (Static Client) + Cloudflare Workers / D1 (API & Storage)
```

### Directory Structure

```
d:/ShadiAPP/
├── public/
│   ├── favicon.svg             # Auspicious Kalash crest in Burgundy & Champagne Gold
│   └── manifest.webmanifest    # PWA installability manifest
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.tsx               # Status badges (Paid, Pending, Tailoring, etc.)
│   │   │   ├── DevPreviewBanner.tsx    # Honest architecture mode switcher
│   │   │   ├── EmptyState.tsx          # Clean first-time empty state with action CTAs
│   │   │   ├── LanguageSwitcher.tsx    # English / हिन्दी switcher with persistence
│   │   │   ├── MetricCard.tsx          # Luxury financial metric card
│   │   │   ├── Modal.tsx               # Accessible dialog container (ESC, focus)
│   │   │   └── PhaseNoticeModal.tsx    # Honest roadmap explanation modal
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx           # Primary responsive shell container
│   │   │   ├── DesktopSidebar.tsx      # Desktop navigation bar (>= 1024px)
│   │   │   ├── MobileBottomNav.tsx     # Mobile bottom bar (< 1024px)
│   │   │   ├── MobileDrawer.tsx        # Mobile slide-over drawer for extended screens
│   │   │   └── TopHeader.tsx           # Global header with wedding timer & quick action
│   │   └── modals/
│   │       ├── AddExpenseModal.tsx     # Form-validated expense logging modal
│   │       ├── AddShoppingModal.tsx    # Shopping item modal with estimate variance
│   │       ├── AddVendorModal.tsx      # Vendor contract & advance tracking modal
│   │       └── RecordShagunModal.tsx   # Sacred Shagun envelope registration modal
│   ├── context/
│   │   ├── LanguageContext.tsx         # Bilingual i18n context + HTML sync
│   │   ├── WeddingContext.tsx          # Central wedding state & financial calculations
│   │   ├── useTranslation.ts           # Typed hook for translation
│   │   └── useWedding.ts               # Typed hook for wedding data
│   ├── data/
│   │   └── mockData.ts                 # Authentic sample wedding data for UI evaluation
│   ├── locales/
│   │   ├── en.ts                       # Complete English translation catalog
│   │   └── hi.ts                       # Complete natural Hindi translation catalog
│   ├── pages/
│   │   ├── WelcomePage.tsx             # Entry / landing page with invite token entry
│   │   ├── DashboardPage.tsx           # Budget overview, utilization bar, quick actions
│   │   ├── ExpensesPage.tsx            # Expense register with filters & status badges
│   │   ├── ShoppingPage.tsx            # Trousseau & wardrobe tracking with variance
│   │   ├── VendorsPage.tsx             # Contracts, advance balances & no-fake-payment notice
│   │   ├── GiftsPage.tsx               # Sacred Shagun & gift register (strictly separated)
│   │   ├── ChecklistPage.tsx           # Preparation timeline & duties from -6m to D-Day
│   │   ├── ReportsPage.tsx             # Visual SVG charts, category breakdown & export stubs
│   │   ├── SmartScanPage.tsx           # 4-stage receipt verification & audit staging
│   │   └── SettingsPage.tsx            # Language switch, profile, zero-cost architecture info
│   ├── test/
│   │   ├── setup.ts                    # Jest-DOM matchers setup
│   │   ├── App.test.tsx                # App rendering tests
│   │   ├── Expenses.test.tsx           # Validation & session persistence tests
│   │   ├── Language.test.tsx           # Language switching & persistence tests
│   │   └── Navigation.test.tsx         # Full route navigation & banner tests
│   ├── types/
│   │   └── index.ts                    # TypeScript domain models & interfaces
│   ├── App.tsx                         # Client-side router configuration
│   ├── index.css                       # Tailwind v4 import & custom color themes
│   └── main.tsx                        # React 19 application bootstrap
├── .env.example
├── .gitignore
├── FREE_DEPLOYMENT_PLAN.md
├── PROJECT_ARCHITECTURE.md
├── README.md
├── TESTING.md
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Visual Design System & Palette

ShaadiSaathi implements a warm, royal wedding identity honoring Indian aesthetic heritage while retaining modern minimalist readability:

| Role | Color Name | Hex Code | Purpose & Application |
|---|---|---|---|
| **Primary Background** | Warm Ivory | `#FFF9F0` | Default body and screen canvas; soft on the eyes |
| **Brand Primary** | Deep Burgundy | `#702D3D` | Key headings, active navigation, primary action buttons |
| **Accent & Borders** | Champagne Gold | `#C5A46D` | Auspicious accents, crest borders, highlight tags |
| **Success & Solvency** | Sage Green | `#849780` | Paid badges, budget surplus indicators, safe balances |
| **Typography** | Charcoal | `#292725` | Primary body text with AA+ accessible contrast |
| **Secondary Surfaces** | Soft Rose | `#EBD9D8` | Secondary cards, pill backgrounds, progress tracks |

### Accessibility & Contrast
- Visible focus rings: `outline: 2px solid #C5A46D; outline-offset: 2px`.
- Semantic HTML tags used throughout (`header`, `main`, `aside`, `nav`, `section`, `table`, `form`).
- Respects `prefers-reduced-motion` to disable animations for sensitive users.
- Large, touch-friendly tap targets (&ge; 44x44px) across mobile navigation bars.

---

## 4. Domain Data Models

```typescript
// 1. Expense Record
interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paidBy: string;
  paidTo?: string;
  paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card';
  status: 'paid' | 'pending' | 'partial';
  notes?: string;
  side: 'groom' | 'bride' | 'mutual';
  receiptAttached?: boolean;
}

// 2. Vendor Record
interface Vendor {
  id: string;
  name: string;
  category: ExpenseCategory;
  contactPerson: string;
  phone: string;
  city: string;
  agreedAmount: number;
  advancePaid: number;
  balanceDue: number;
  dueDate: string;
  status: 'booked' | 'advance_paid' | 'fully_paid';
  notes?: string;
}

// 3. Sacred Shagun & Gift Record
interface ShagunGift {
  id: string;
  donorName: string;
  relation: string;
  side: 'groom' | 'bride' | 'mutual';
  giftType: 'cash' | 'gold_silver' | 'item';
  cashAmount?: number;
  itemDescription?: string;
  eventName: 'roka' | 'engagement' | 'sangeet' | 'haldi' | 'wedding' | 'reception';
  date: string;
  returnGiftNotes?: string;
  thankYouSent: boolean;
}

// 4. Shopping Item
interface ShoppingItem {
  id: string;
  title: string;
  category: 'bride' | 'groom' | 'family' | 'pooja_ceremony' | 'return_gifts' | 'other';
  estimatedPrice: number;
  actualPrice?: number;
  status: 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
  assignedTo: string;
  storeName?: string;
  notes?: string;
  urgency: 'high' | 'medium' | 'low';
}

// 5. Checklist Task
interface ChecklistTask {
  id: string;
  title: string;
  phase: '6_months' | '3_months' | '1_month' | 'wedding_week' | 'day_of' | 'post_wedding';
  category: string;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  dueDate: string;
}
```

---

## 5. Security & Multi-User Architecture Plan (For Phase 2)

### Invitation-Only Token Boundary
1. **Host Generation:** The wedding creator (e.g. bride/groom or parents) provisions an encrypted invite link containing an HMAC-SHA256 family token.
2. **Granular Permissions:**
   - **Family Admin:** Can edit total budget, approve vendor contracts, delete entries.
   - **Family Editor:** Can log expenses, check shopping items, record Shagun envelopes.
   - **Family Viewer:** Read-only access to schedules, checklists, and travel instructions.
3. **No Insecure Public Signups:** Prevents accidental leakage of wedding finances, vendor negotiation rates, or personal family contact lists to web crawlers.

---

## 6. Implementation Phasing Roadmap

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | Foundation, Design System & Responsive Shell | **COMPLETED** | Complete PWA foundation, 10 screens, bilingual i18n, honest state management, Vitest test suite. |
| **Phase 2** | Family Accounts & Cloudflare D1 / SQLite Persistence | Planned | Secure invitation tokens, role-based access, relational database schema, CRUD API. |
| **Phase 3** | Offline IndexedDB Engine & Sync Conflict Handler | Planned | Background synchronization, optimistic UI updates, conflict resolution with vector clocks. |
| **Phase 4** | Advanced Financial Reports & PDF / Excel Export | Planned | Printable audit reports for wedding accountants, category analysis, spreadsheet exports. |
| **Phase 5** | SmartScan Receipt Verification & Free-Tier OCR | Planned | Client-side Tesseract.js / WebAssembly image preprocessing and side-by-side verification. |
| **Phase 6** | Zero-Lock-In Backup & Portability Engine | Planned | One-click raw JSON / CSV complete wedding archive backup and restore capability. |
