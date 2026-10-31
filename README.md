# ShaadiSaathi (शादीसाथी)

> **"Every Moment Special. Every Rupee Accounted For."**  
> *"हर पल ख़ास, हर रुपये का हिसाब।"*

ShaadiSaathi is a premium, bilingual Progressive Web App (PWA) designed for Indian families to manage their complete wedding budget, expenses, shopping lists, vendor contracts, advance payments, traditional Shagun blessings, and preparation timelines with zero mandatory subscription costs.

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

## 🚀 Key Features Delivered in Phase 1

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
   - Persisted in `localStorage`.
   - Switching language preserves user-entered vendor names and custom descriptions.
4. **Honest Engineering Modes:**
   - One-click toggle between **Sample Development Preview Data** and **Clean First-Time Empty State**.
   - Transparent Phase 1 modals that validate forms and honestly explain that permanent database persistence will be integrated in Phase 2.
5. **PWA & Offline-Capable Setup:**
   - Auto-updating service worker via `vite-plugin-pwa` precaching all assets for offline launchability.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript (Strict Mode)
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4 with custom color variables
- **Navigation:** React Router v7
- **Icons:** Lucide React
- **PWA:** `vite-plugin-pwa`
- **Testing:** Vitest, React Testing Library, JSDOM
- **Linter:** Oxlint (0 errors, 0 warnings)

---

## 📦 Getting Started

### Prerequisites
- Node.js &ge; 20.x (Recommended: v24.x)
- npm &ge; 10.x

### 1. Installation
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Run Linter
```bash
npm run lint
```

### 5. Build for Production
```bash
npm run build
```
Production assets are generated in `dist/` with service worker bundles (`dist/sw.js`) and manifest files.

---

## 🔒 Free-Tier Hosting & Zero-Cost Architecture

ShaadiSaathi is architected to run on permanent, verified free tiers without automatic paid upgrades:

- **Frontend Hosting:** Cloudflare Pages (Unlimited bandwidth, global CDN, free SSL).
- **Future API & Storage (Phase 2):** Cloudflare Workers (100,000 free requests/day) + Cloudflare D1 (5,000,000 free row reads/day, 5 GB storage).
- **Data Portability (Phase 6):** Standard SQLite schema allows migrating all wedding records to any server or downloading a complete JSON/CSV archive anytime.

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
| Vitest Automated Testing Suite (13 tests) | ✅ Complete | Phase 1 |
| Secure Invite-Only Family Accounts & Auth | ⏳ Planned | Phase 2 |
| Cloudflare D1 / SQLite Database Persistence | ⏳ Planned | Phase 2 |
| Offline IndexedDB Synchronization & Conflict Resolution | ⏳ Planned | Phase 3 |
| Exportable PDF & Excel Financial Reports | ⏳ Planned | Phase 4 |
| SmartScan WebAssembly OCR Receipt Extraction | ⏳ Planned | Phase 5 |
| Full JSON/CSV Wedding Archive Backup & Restore | ⏳ Planned | Phase 6 |

---

## 📜 License & Ownership

Built for families everywhere. Open-source under the MIT License.
