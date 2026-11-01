# ShaadiSaathi — Production Environment Specification

This document details the production environment requirements, configuration settings, and operational best practices for running ShaadiSaathi.

---

## 1. System Requirements

### Hardware & Compute
- **CPU:** 1 vCPU (minimum 1.0 GHz).
- **RAM:** 512 MB minimum (1 GB recommended for concurrent OCR image extraction).
- **Disk Storage:** 500 MB minimum for app + dependencies; allocate 2–5 GB persistent volume for wedding documents and receipt scans.
- **Operating System:** Linux (Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, Alpine 3.20) or Windows Server.

### Software Runtimes
- **Node.js:** &ge; 24.0.0 (Node 24 LTS recommended).
- **SQLite Engine:** Built-in Node 24 `node:sqlite` (ANSI-SQL compatible).
- **Docker Engine (optional):** &ge; 24.0 with Docker Compose &ge; v2.20.

---

## 2. Environment Variables Configuration

| Variable Name | Type | Production Example | Default | Security Level | Purpose |
|---|---|---|---|---|---|
| `NODE_ENV` | string | `production` | `development` | High | Enables HTTPS secure cookies, HSTS headers, and CSRF origin validation. |
| `PORT` | integer | `3001` or `8080` | `3001` | Low | Port for internal server binding. |
| `DATABASE_PATH` | string | `/data/shaadisaathi.db` | `data/shaadisaathi.db` | High | Filesystem path for SQLite database file on persistent volume. |
| `UPLOADS_DIR` | string | `/data/uploads/documents` | `data/uploads/documents` | High | Persistent storage directory for user receipts and bills. |
| `ALLOWED_ORIGINS` | string | `https://wedding.kapoorparivar.com` | `""` (same-origin) | High | Comma-delimited list of trusted client origins for CORS. |
| `GEMINI_API_KEY` | string | `AIzaSy...` (optional) | `""` | Critical | Server-side API key for optional Gemini Flash OCR enhancement. |

> [!CAUTION]
> **Zero Secrets in Git:** Never commit `.env` or any production secret keys to version control. Set them exclusively via environment injection or cloud secret management dashboards.

---

## 3. Storage Hierarchy & Permissions

In production container environments, permissions must be strictly scoped to non-root users:

```text
/data
├── shaadisaathi.db              (mode 0600 - node:node)
├── shaadisaathi.db-journal      (mode 0600 - node:node)
└── uploads/
    └── documents/               (mode 0700 - node:node)
        └── <timestamp>-<uuid>.<ext>
```

---

## 4. Reverse Proxy & HTTPS Setup

ShaadiSaathi must be hosted behind a reverse proxy (Caddy, Nginx, Traefik, or Cloudflare Tunnel) that terminates TLS/HTTPS:

### Recommended Caddy Configuration (`/etc/caddy/Caddyfile`)
```caddy
wedding.myfamily.com {
    encode gzip zstd
    
    # Forward headers
    reverse_proxy 127.0.0.1:3001 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-For {remote_host}
    }
}
```

### Recommended Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name wedding.myfamily.com;

    ssl_certificate /etc/letsencrypt/live/wedding.myfamily.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wedding.myfamily.com/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
