# ShaadiSaathi — Free Hosting Tiers & Resource Limits Analysis

This document provides a realistic, transparent breakdown of popular free hosting services, their official limitations, and their suitability for running ShaadiSaathi.

---

## 1. Hosting Services Comparison Matrix

| Provider | Free Tier Details | Storage Type | Inactivity Spindown? | Credit Card Required? | Suitability for ShaadiSaathi |
|---|---|---|:---:|:---:|---|
| **Oracle Cloud Always Free** | 2 AMD VMs or 4 ARM cores, 24 GB RAM, 200 GB persistent disk | **Persistent Block Volume** | **NO** (Always Running) | Verification only (never billed) | **EXCELLENT (Recommended)** &bull; Full SQLite persistence, zero spindown, free forever. |
| **Home Server + Cloudflare Tunnel** | Existing PC / Mac / Pi + `cloudflared` | **Local Persistent Disk** | **NO** (as long as PC runs) | **NO** | **EXCELLENT** &bull; Zero subscription, free HTTPS, zero port forwarding. |
| **Render.com** | 512 MB RAM, 0.1 CPU | **Ephemeral Disk** (Wiped on restart) | **YES** (after 15 min idle) | **NO** | **LIMITED** &bull; Great for demo/preview; unsuitable for permanent SQLite storage unless persistent disk ($7/mo) is added. |
| **Koyeb** | 1 Nano service, 512 MB RAM | **Ephemeral Disk** | **YES** (sleeps when idle) | **NO** | **LIMITED** &bull; Same ephemeral storage constraint as Render. |
| **Fly.io** | Up to 3 shared-cpu-1x VMs, 256MB RAM | **Volume (3GB free)** | **YES** (auto-suspend) | **YES** (Mandatory CC) | **MODERATE** &bull; Requires credit card on signup; volume configuration required. |
| **Google Cloud e2-micro** | 1 e2-micro VM (0.25 vCPU, 1 GB RAM), 30 GB persistent disk | **Persistent Disk** | **NO** | Verification only | **GOOD** &bull; Stays within monthly free usage limits in `us-central1`, `us-east1`, or `us-west1`. |

---

## 2. Key Limitations to Understand

### 1. Inactivity Spindown (Cold Starts)
Free tiers on Render and Koyeb put container instances into a deep sleep when no web requests are received for 15 minutes.
- **Consequence:** The first family member opening the app after a quiet period will experience a **30 to 60-second delay** while the container starts up.
- **Mitigation:** Self-hosting or using Oracle Cloud Always Free compute avoids cold starts entirely.

### 2. Ephemeral Storage vs. Persistent Volumes
- **Ephemeral Storage:** Any files written by the application (including SQLite `.db` files and uploaded receipts) reside in container memory or temporary disk. When the container restarts or re-deploys, **all data is permanently deleted**.
- **Requirement:** For real wedding data, ShaadiSaathi **MUST** be deployed with a persistent mount attached (e.g., Docker volume `/data`, Oracle Block Volume, or local host directory).

### 3. Memory & OCR Processing
- Tesseract.js performs image preprocessing and character recognition in Node.js worker threads.
- During high-resolution receipt OCR, Node memory usage may temporarily peak between **150 MB and 250 MB**.
- Services with only 256 MB RAM (such as free Fly.io instances) risk encountering Out-Of-Memory (OOM) errors during simultaneous receipt uploads. Ensure at least **512 MB RAM** is available.

---

## 3. Cost-Trigger Protections

ShaadiSaathi is engineered to enforce zero mandatory costs:
1. **Zero External Paid APIs:** Built-in Tesseract.js runs 100% locally on the CPU.
2. **Optional Gemini API:** If an API key is configured, Gemini 2.5 Flash operates within Google AI Studio's free tier (15 requests per minute, 1,500 requests per day at zero cost).
3. **Graceful Fallbacks:** If the Gemini API key is missing, invalid, or reaches quota limits, ShaadiSaathi falls back to local OCR and manual human verification without throwing fatal application errors.
