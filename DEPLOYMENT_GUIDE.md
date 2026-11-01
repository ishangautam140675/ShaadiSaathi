# ShaadiSaathi (शादीसाथी) — Production Deployment Guide

This guide provides concrete, step-by-step deployment instructions for hosting **ShaadiSaathi** online for your family.

---

## 1. Actual Application Architecture & Runtime Requirements

Before deploying, verify what ShaadiSaathi actually needs to run:

| Component | Technical Requirement | Note |
|---|---|---|
| **Runtime** | **Node.js &ge; 24.0.0** | Uses built-in `node:sqlite` (`DatabaseSync`), requiring Node 22.5+ or 24 LTS. Requires zero C++ compilation (`node-gyp`). |
| **Backend** | Express 4.x / 5.x | Serves REST API `/api/*` and compiled PWA assets `/dist` with SPA client-side fallback. |
| **Database** | SQLite File (`data/shaadisaathi.db`) | Local persistent disk storage. |
| **File Storage** | Filesystem (`data/uploads/documents/`) | Stores receipt images and invoice PDFs up to 15MB. |
| **Memory** | &ge; 256MB RAM (512MB recommended) | Tesseract.js local OCR uses ~150MB during active text parsing. |

> [!IMPORTANT]
> **Persistence Warning:** Because ShaadiSaathi uses SQLite on disk, **any deployment platform with an ephemeral filesystem will reset family wedding data whenever the service restarts or spins down** unless a persistent volume is attached or SQLite is replicated.
> 
> Below are the most reliable, genuinely free deployment options.

---

## 2. Recommended Deployment Options

### Option A: Oracle Cloud Always Free VM (Best for 100% Free Forever with Persistent Disk)
Oracle Cloud offers an **Always Free** tier that does **not** expire after a trial and does **not** automatically activate billing:
- **Specs:** Up to 4 Ampere ARM cores, 24 GB RAM, 200 GB persistent block storage, or 2 AMD micro VMs.
- **Persistent Disk:** Guaranteed permanent block volume (data is never wiped on reboot).
- **Cost:** ₹0 ($0), no mandatory credit card charges.

#### Deployment Steps:
1. Create an Oracle Cloud Free Tier account at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
2. Provision an **Always Free** Ubuntu or Oracle Linux Compute instance.
3. SSH into the instance:
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<YOUR_INSTANCE_IP>
   ```
4. Install Docker and Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   sudo usermod -aG docker $USER
   ```
5. Clone your repository:
   ```bash
   git clone https://github.com/<your-username>/ShadiAPP.git /opt/shaadisaathi
   cd /opt/shaadisaathi
   ```
6. Start the container with persistent storage:
   ```bash
   docker-compose up -d --build
   ```
7. Set up free SSL with Caddy or Nginx:
   ```bash
   sudo apt install -y caddy
   ```
   Add to `/etc/caddy/Caddyfile`:
   ```caddy
   wedding.yourdomain.com {
       reverse_proxy localhost:3001
   }
   ```
   Run `sudo systemctl restart caddy`. Caddy automatically provisions a free Let's Encrypt HTTPS certificate.

---

### Option B: Home Server / Raspberry Pi + Cloudflare Tunnel (100% Free, Zero Port Forwarding)
If you have a home PC, laptop, or Raspberry Pi that stays on during wedding season:
- **Zero Cost:** Uses your existing computer.
- **Zero Port Forwarding:** Cloudflare Tunnel securely routes traffic to `localhost:3001`.
- **Free HTTPS & DDoS Protection:** Provided by Cloudflare.

#### Deployment Steps:
1. Run ShaadiSaathi locally with production build:
   ```bash
   npm run build
   npm start
   ```
2. Install `cloudflared` from [cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
3. Run a quick free tunnel (requires no domain):
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
   Cloudflare outputs a public HTTPS link (e.g. `https://random-words.trycloudflare.com`) that family members can immediately open on mobile phones or laptops anywhere in the world!

---

### Option C: Container PaaS (Render / Koyeb / Railway)

#### Important Platform Differences:
- **Render Free Web Service:** Spins down after 15 minutes of inactivity. Free tier has an **ephemeral disk** (the SQLite database file resets on spindown). To use Render safely for production, use a persistent disk ($7/mo paid add-on) or use Render only for live family testing sessions.
- **Koyeb Free Nano Instance:** 512MB RAM, spins down when idle, ephemeral disk.

#### Steps for Render:
1. Create an account at [render.com](https://render.com).
2. Connect your Git repository.
3. Select **Web Service** &bull; **Docker** (or Node).
4. Environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
5. Start command: `npm start`.

---

## 3. Production Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables secure session cookies and CSRF checks. |
| `PORT` | Optional | `3001` | Port for the HTTP server to bind. |
| `DATABASE_PATH` | Optional | `data/shaadisaathi.db` | Absolute or relative path to SQLite database. |
| `UPLOADS_DIR` | Optional | `data/uploads/documents` | Directory for uploaded receipt files. |
| `ALLOWED_ORIGINS` | Optional | `""` (allow self) | Comma-separated CORS allowed origins. |
| `GEMINI_API_KEY` | Optional | `""` | Gemini 2.5 Flash API key for enhanced OCR. |

---

## 4. Post-Deployment Verification Checklist

Once deployed:
1. Open the public HTTPS URL in a web browser.
2. Confirm the **Setup Wizard** appears at `/setup`.
3. Complete initial family owner registration (e.g. create the family sanctuary).
4. Verify `/api/setup/status` now returns `{"setupRequired": false, "initialized": true}`.
5. Sign in from a second browser or mobile device using an invitation link.
6. Upload a test receipt in **SmartScan** and confirm local OCR extracts line items.
7. Download a JSON backup from **Settings** to verify export functionality.
