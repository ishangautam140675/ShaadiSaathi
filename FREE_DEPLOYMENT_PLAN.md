# ShaadiSaathi &bull; Zero-Cost Free Deployment Architecture Plan

**Document Version:** 1.0.0  
**Target Architecture:** Fully functional, publicly deployed, multi-device PWA with **zero mandatory subscription costs**.

---

## 1. Non-Negotiable Financial Directives

1. **No Paid Dependencies:** No paid APIs, paid cloud databases, paid icon kits, or proprietary SaaS platforms.
2. **Zero Auto-Billing Traps:** The application must never require a credit card that transitions automatically into billed overages.
3. **Honest Tier Disclosure:** We do not claim "unlimited lifetime free storage". We document the exact official free-tier allowances and operational thresholds.
4. **Architecture Portability:** Database access is modularized (standard SQLite / SQL DDL) so hosting can transition seamlessly between Cloudflare, Supabase, Fly.io, or self-hosted servers.

---

## 2. Comparative Evaluation of Free-Tier Hosting & Storage Providers

| Platform | Component | Verified Free Tier Allowance | Known Constraints & Limits | Verdict |
|---|---|---|---|---|
| **Cloudflare Pages** | Frontend Static PWA | **Unlimited bandwidth**, 500 builds/month, 20,000 files/deployment, free custom domain with SSL | Maximum single file size 25MB. Static files only. | **PRIMARY RECOMMENDATION (Frontend)** |
| **Cloudflare Workers** | Backend API & Logic | **100,000 requests/day**, 10ms CPU time per request, global edge deployment | CPU time capped at 10ms on free tier; daily quota resets UTC midnight. | **PRIMARY RECOMMENDATION (API)** |
| **Cloudflare D1** | Serverless SQL (SQLite) | **5,000,000 rows read/day**, **100,000 rows written/day**, **5 GB total storage** | Daily writes capped at 100K; requires Workers integration. | **PRIMARY RECOMMENDATION (Database)** |
| **Supabase** | Backend + Postgres | 500MB database, 50,000 monthly active users, 1GB file storage | Pauses project after 7 days of inactivity on free tier (requires manual unpause). | Strong alternative; inactive pause risk makes Cloudflare preferred. |
| **GitHub Pages** | Frontend Static Host | 100GB monthly bandwidth, 1GB repo size | Static only; cannot host server-side APIs or private secrets directly. | Good fallback for pure client demos. |
| **Vercel Hobby** | Full-Stack Host | 100GB bandwidth, 1,000,000 edge requests/month | Commercial use restrictions; strict overage enforcement if tier exceeded. | Secondary alternative. |

---

## 3. Recommended Primary Architecture: Cloudflare Pages + Workers + D1

### Why this combination fits ShaadiSaathi:
1. **Capacity for a Real Indian Wedding:**
   - An active wedding coordination team of 15 family members logging 50 expenses, 100 shopping items, and 200 Shagun envelopes generates less than **2,000 requests per day**.
   - Cloudflare's free allowance of **100,000 requests/day** provides a **50x safety margin** with zero cost.
2. **5 GB Database Ceiling:**
   - 1,000 wedding transactions, vendor logs, and Shagun records occupy roughly **2 to 5 MB** of text data.
   - The 5 GB D1 database limit can comfortably accommodate over 1,000 distinct family weddings without ever approaching tier limits.
3. **No Automatic Billing Incurrence:**
   - Cloudflare Workers and D1 free tiers simply throttle with a `429 Too Many Requests` code rather than automatically debiting credit cards for overages.

---

## 4. Portability & Migration Strategy

To guarantee that ShaadiSaathi never suffers vendor lock-in:

1. **Standard ANSI SQL / SQLite Schema:**  
   Cloudflare D1 runs on standard SQLite. If a family or developer ever wishes to migrate away from Cloudflare, the database schema can be dumped into a standard `.sqlite3` file and hosted on:
   - Supabase (PostgreSQL via simple DDL mapping)
   - Turso (LibSQL / SQLite)
   - Self-hosted Raspberry Pi or Docker container running SQLite / PostgreSQL.
2. **Decoupled API Client:**  
   Frontend data fetching uses standard `fetch` abstractions with a configurable base URL (`VITE_API_BASE_URL`). Changing the backend provider requires modifying a single environment variable.
3. **Client-Side Data Portability (Phase 6):**  
   Every family will have a dedicated "Download Full Wedding Archive" button that exports all tables (Expenses, Vendors, Shagun, Tasks) as raw JSON and formatted CSV files.

---

## 5. Deployment Guide (Cloudflare Pages)

### Step 1: Pre-requisites
- Cloudflare account (Free Tier)
- GitHub or GitLab repository containing the ShaadiSaathi codebase.

### Step 2: Cloudflare Pages Configuration
1. Log in to the Cloudflare Dashboard and navigate to **Workers & Pages** &rarr; **Create application** &rarr; **Pages**.
2. Connect your Git repository.
3. Configure the Build settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
   - **Node.js Version:** `20.x` or `24.x` (Set environment variable `NODE_VERSION=20.18.0`)
4. Click **Save and Deploy**.

### Step 3: PWA Manifest & Domain Verification
1. Once deployed, Cloudflare provides a free `*.pages.dev` HTTPS URL (e.g. `https://shaadisaathi.pages.dev`).
2. The service worker (`sw.js`) and manifest (`manifest.webmanifest`) will automatically register.
3. Users opening the link on Chrome (Android/Desktop) or Safari (iOS) can click **"Add to Home Screen"** or **"Install ShaadiSaathi"** for an authentic native app experience.
