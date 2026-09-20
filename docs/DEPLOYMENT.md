# Loan Recovery App — Ubuntu Deployment Guide

Deployment uses a **Next.js standalone build** — the build output is self-contained and requires only
Node.js on the server. No `npm install` or `pnpm install` is needed on the server.

**App URL:** `https://loanrecovery.hdccoopbank.com`  
**Internal port:** `3000`  
**API (same server):** `http://localhost:5010`

---

## Table of Contents

- [Step 1: Prepare the Build Locally (Windows)](#step-1-prepare-the-build-locally-windows)
- [Step 2: Install Node.js on the Server](#step-2-install-nodejs-on-the-server)
- [Step 3: Prepare the Server Directory](#step-3-prepare-the-server-directory)
- [Step 4: Transfer Files to the Server](#step-4-transfer-files-to-the-server)
- [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
- [Step 6: Configure as a Systemd Service](#step-6-configure-as-a-systemd-service)
- [Step 7: Obtain SSL Certificate](#step-7-obtain-ssl-certificate)
- [Step 8: Configure Nginx](#step-8-configure-nginx)
- [Step 9: Verify Deployment](#step-9-verify-deployment)
- [Updating the App](#updating-the-app)
- [Management Commands](#management-commands)

---

## Step 1: Prepare the Build Locally (Windows)

### 1.1 Enable Standalone Output

Edit `next.config.mjs` and add `output: 'standalone'`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

### 1.2 Create Production Environment File

Create `.env.production` in the `loan-recovery` project root:

```env
API_BASE_URL=http://localhost:5010
NEXTAUTH_SECRET=YOUR_SECRET_HERE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD2fYxm2kP71jf4Qul4HUrF83xArcc
```

> Generate `NEXTAUTH_SECRET` with PowerShell:
> ```powershell
> $bytes = New-Object byte[] 32
> [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
> [Convert]::ToBase64String($bytes)
> ```

**Important:** `.env.production` is read at build time for `NEXT_PUBLIC_*` variables. The
`API_BASE_URL` and `NEXTAUTH_SECRET` are server-side only and will be set again on the server
in Step 5 — but having them here ensures the build completes correctly.

### 1.3 Build the App

```powershell
cd loan-recovery
pnpm build
```

A successful build produces:
```
loan-recovery/
  .next/
    standalone/       ← self-contained server
    static/           ← static assets
  public/             ← public assets (icons, manifest, sw.js)
```

### 1.4 Assemble the Transfer Package

The standalone folder needs the static and public assets copied into it:

```powershell
# Copy static assets into standalone
xcopy /E /I ".next\static" ".next\standalone\.next\static"

# Copy public folder into standalone
xcopy /E /I "public" ".next\standalone\public"
```

The final transfer folder is `.next\standalone\` — this is everything you upload to the server.

---

## Step 2: Install Node.js on the Server

```bash
# Add NodeSource repository for Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node --version    # should show v22.x.x
```

---

## Step 3: Prepare the Server Directory

```bash
sudo mkdir -p /var/www/loanrecovery
sudo chown -R $USER:$USER /var/www/loanrecovery
```

---

## Step 4: Transfer Files to the Server

Transfer the entire contents of `.next\standalone\` to `/var/www/loanrecovery/` on the server.

**Option A: SCP (PowerShell)**

```powershell
scp -r "D:\DigitaiZ\Development\Codex\CollectorCloud\loan-recovery\.next\standalone\*" user@server-ip:/var/www/loanrecovery/
```

**Option B: SFTP (FileZilla / WinSCP) — Recommended**

1. Connect via SFTP to your server
2. Local: navigate to `loan-recovery\.next\standalone\`
3. Remote: navigate to `/var/www/loanrecovery/`
4. Upload all files and folders

After upload the server directory should look like:

```
/var/www/loanrecovery/
  server.js
  .next/
    static/
    ...
  public/
  node_modules/      ← bundled by standalone (do not delete)
```

### Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/loanrecovery
sudo chmod -R 755 /var/www/loanrecovery
```

---

## Step 5: Configure Environment Variables

Create the production environment file on the server:

```bash
sudo nano /var/www/loanrecovery/.env.production
```

```env
API_BASE_URL=http://localhost:5010
NEXTAUTH_SECRET=YOUR_SECRET_HERE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD2fYxm2kP71jf4Qul4HUrF83xArcc
NODE_ENV=production
```

Use the **same** `NEXTAUTH_SECRET` value you used in Step 1.2.

```bash
sudo chmod 600 /var/www/loanrecovery/.env.production
sudo chown www-data:www-data /var/www/loanrecovery/.env.production
```

---

## Step 6: Configure as a Systemd Service

```bash
sudo nano /etc/systemd/system/loanrecovery.service
```

```ini
[Unit]
Description=HDC Loan Recovery App
After=network.target

[Service]
WorkingDirectory=/var/www/loanrecovery
ExecStart=/usr/bin/node /var/www/loanrecovery/server.js
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=loanrecovery
User=www-data
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/loanrecovery/.env.production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable loanrecovery
sudo systemctl start loanrecovery
sudo systemctl status loanrecovery
```

You should see **active (running)**.

Verify it responds locally:

```bash
curl http://localhost:3000
```

---

## Step 7: Obtain SSL Certificate

The Cloudflare credentials are already set up on this server from the API deployment.
Just request a certificate for the new domain:

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare/credentials.ini \
  -d loanrecovery.hdccoopbank.com
```

---

## Step 8: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/loanrecovery
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name loanrecovery.hdccoopbank.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name loanrecovery.hdccoopbank.com;

    ssl_certificate     /etc/letsencrypt/live/loanrecovery.hdccoopbank.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/loanrecovery.hdccoopbank.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/loanrecovery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 443/tcp
```

---

## Step 9: Verify Deployment

Once the DNS A record for `loanrecovery` points to the server IP:

```bash
curl https://loanrecovery.hdccoopbank.com
```

Open in browser and verify:
- [ ] Login page loads
- [ ] Branch dropdown populates (confirms API connection via localhost:5010)
- [ ] Login works
- [ ] Dashboard loads
- [ ] PWA install prompt appears (on mobile or Chrome)

---

## Updating the App

When you make code changes and need to redeploy:

**On Windows:**
1. Make your changes
2. Run `pnpm build`
3. Copy static assets into standalone (Step 1.4)

**On the server:**

```bash
# Stop the app
sudo systemctl stop loanrecovery

# Backup current version (optional)
sudo cp -r /var/www/loanrecovery /var/www/loanrecovery.backup.$(date +%Y%m%d)

# Upload new files via SCP/SFTP (overwrite existing)

# Fix permissions
sudo chown -R www-data:www-data /var/www/loanrecovery
sudo chmod -R 755 /var/www/loanrecovery

# Start the app
sudo systemctl start loanrecovery
sudo systemctl status loanrecovery
```

---

## Management Commands

```bash
# Start / stop / restart
sudo systemctl start loanrecovery
sudo systemctl stop loanrecovery
sudo systemctl restart loanrecovery

# View real-time logs
sudo journalctl -u loanrecovery -f

# View last 100 lines
sudo journalctl -u loanrecovery -n 100 --no-pager

# Check status
sudo systemctl status loanrecovery
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-04  
**Application:** HDC Loan Recovery App  
**Deployment Type:** Next.js Standalone (Node.js)  
**Target OS:** Ubuntu 22.04 LTS
