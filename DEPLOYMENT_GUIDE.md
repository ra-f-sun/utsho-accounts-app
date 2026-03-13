# Utsho Account — Production Deployment Guide

> **Stack:** NestJS + Prisma (PostgreSQL) backend · React + Vite frontend  
> **Infrastructure:** DigitalOcean Droplet → Coolify → Docker  
> **DNS/CDN:** Domain from Spaceship/NameSilo → Cloudflare DNS (optional proxy)  
> **Droplet:** Basic, Regular SSD, 2 GB RAM / 1 vCPU / 50 GB SSD / 2 TB transfer

---

## Table of Contents

1. [Create the `production` Branch](#1-create-the-production-branch)
2. [Create Docker & Deployment Files](#2-create-docker--deployment-files)
3. [Provision the DigitalOcean Droplet](#3-provision-the-digitalocean-droplet)
4. [Install Coolify on the Droplet](#4-install-coolify-on-the-droplet)
5. [Purchase & Configure the Domain](#5-purchase--configure-the-domain)
6. [Set Up Cloudflare DNS](#6-set-up-cloudflare-dns)
7. [Connect Repository to Coolify](#7-connect-repository-to-coolify)
8. [Deploy PostgreSQL via Coolify](#8-deploy-postgresql-via-coolify)
9. [Deploy the Backend (API)](#9-deploy-the-backend-api)
10. [Deploy the Frontend (SPA)](#10-deploy-the-frontend-spa)
11. [Run Database Migrations & Seed](#11-run-database-migrations--seed)
12. [SSL / HTTPS Setup](#12-ssl--https-setup)
13. [Post-Deployment Verification](#13-post-deployment-verification)
14. [Backups & Maintenance](#14-backups--maintenance)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Create the `production` Branch

The `production` branch will contain only the files needed to build and run the app — no dev docs, checklists, or analysis files.

### 1.1 Create the Branch

```bash
# From your main/dev branch
git checkout main
git pull origin main

# Create and switch to production branch
git checkout -b production
```

### 1.2 Remove Unnecessary Files

Delete documentation/dev-only files that are NOT needed in production:

```bash
# Root-level dev docs
git rm API_TESTING.md
git rm BRANCH_v0.5_DEVLOG.md
git rm BUG_PREVENTION_GUIDE.md
git rm DB_SYNC_GUIDE_v1.2.md
git rm FEATURE_UPGRADE_CHECKLIST_v1.2.md
git rm IMPLEMENTATION_ANALYSIS.md
git rm POSTGRES_SETUP.md
git rm PROJECT_REVIEW.md
git rm REFACTOR_CHECKLIST.md
git rm REFACTOR_CHECKLIST_2.md

# Doc folder
git rm -r doc/

# Backend dev docs
git rm backend/TEST_UAC_STUDENTS.md
git rm backend/test-create-user.json

# Frontend lint output files
git rm frontend/eslint-out.txt
git rm frontend/eslint-results.txt
git rm frontend/eslint-results2.txt

# Test files (not needed in production image)
git rm -r backend/test/
git rm backend/src/app.controller.spec.ts
```

### 1.3 Commit and Push

```bash
git add -A
git commit -m "chore: prepare production branch - remove dev docs and test files"
git push -u origin production
```

> **Tip:** Going forward, merge from `main` → `production` when you release, then re-remove any new dev files if needed. Alternatively, add a `.dockerignore` (shown below) which handles this at build time even if the files exist in the branch.

---

## 2. Create Docker & Deployment Files

You need to create the following files in the `production` branch. The project currently has **zero** Docker/deployment files, so everything below is new.

### 2.1 `backend/Dockerfile`

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (need devDeps for build)
RUN npm ci

# Copy prisma schema and config
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Build NestJS
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy Prisma files (needed for migrations at runtime)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Don't run as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main"]
```

### 2.2 `backend/.dockerignore`

```
node_modules
dist
coverage
.env
.env.*
*.md
test/
src/**/*.spec.ts
test-create-user.json
.git
```

### 2.3 `frontend/Dockerfile`

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy all source
COPY . .

# Build argument for API URL (baked into build)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Don't run as root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 2.4 `frontend/nginx.conf`

This serves the SPA correctly (all routes → `index.html`):

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback - all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 2.5 `frontend/.dockerignore`

```
node_modules
dist
.env
.env.*
*.md
eslint-out.txt
eslint-results.txt
eslint-results2.txt
.git
```

### 2.6 `docker-compose.yml` (Root — for local testing)

> This file is helpful for local testing. Coolify will manage containers individually, but this validates the setup.

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: utsho_db
      POSTGRES_USER: utsho_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U utsho_user -d utsho_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://utsho_user:${DB_PASSWORD}@db:5432/utsho_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: 7d
      PORT: 3001
      NODE_ENV: production
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "3001:3001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
```

### 2.7 Commit All Docker Files

```bash
git add backend/Dockerfile backend/.dockerignore
git add frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
git add docker-compose.yml
git commit -m "feat: add Docker configuration for production deployment"
git push origin production
```

---

## 3. Provision the DigitalOcean Droplet

### 3.1 Create the Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Click **Create** → **Droplets**
3. Choose settings:
   - **Region:** Choose closest to your users (e.g., Singapore, Bangalore for BD)
   - **OS:** **Ubuntu 24.04 LTS**
   - **Droplet Type:** Basic
   - **CPU Option:** Regular (SSD)
   - **Plan:** 2 GB RAM / 1 vCPU / 50 GB SSD / 2 TB transfer ($12/mo)
4. **Authentication:** Choose **SSH Key** (strongly recommended)
   - If you don't have one, generate it:
     ```bash
     ssh-keygen -t ed25519 -C "your_email@example.com"
     ```
   - Copy the public key content (`cat ~/.ssh/id_ed25519.pub`) and paste it in DO
5. **Hostname:** `utsho-production` (or whatever you prefer)
6. Click **Create Droplet**
7. Note the **public IP address** (e.g., `167.71.xx.xx`)

### 3.2 Initial Server Setup

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Run basic security hardening:

```bash
# Update system
apt update && apt upgrade -y

# Set timezone (adjust to your timezone)
timedatectl set-timezone Asia/Dhaka

# Enable automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades

# Set up firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 8000    # Coolify dashboard
ufw enable
```

### 3.3 Create Swap Space (Important for 2GB RAM)

With only 2 GB RAM, a swap file prevents OOM kills during Docker builds:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
free -h
```

---

## 4. Install Coolify on the Droplet

### 4.1 Install Coolify

Still SSH'd into the server:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This installs Docker, Docker Compose, and Coolify. It takes 2–5 minutes.

### 4.2 Access Coolify Dashboard

1. Open your browser and go to: `http://YOUR_DROPLET_IP:8000`
2. Create your **admin account** (first user becomes admin)
3. Set a **strong password** — this is your deployment control panel

### 4.3 Initial Coolify Configuration

1. Go to **Settings** → **General**
   - Instance FQDN: leave blank for now (set later after domain setup)
2. Go to **Servers** → verify `localhost` is connected and healthy

---

## 5. Purchase & Configure the Domain

### 5.1 Buy the Domain

1. Go to [Spaceship](https://www.spaceship.com/) or [NameSilo](https://www.namesilo.com/)
2. Search and purchase your domain (e.g., `utsho.com` or `utshoaccount.com`)
3. After purchase, **do NOT use the registrar's nameservers** — you'll point to Cloudflare

### 5.2 Change Nameservers to Cloudflare

> Do this AFTER setting up Cloudflare (Step 6.1). The registrar panel will have a **Nameservers** section.

In your registrar (Spaceship/NameSilo):
1. Go to **Domain Management** → your domain → **Nameservers**
2. Change from default to **Custom Nameservers**
3. Enter the two Cloudflare nameservers (provided in Step 6.1), e.g.:
   ```
   aria.ns.cloudflare.com
   brad.ns.cloudflare.com
   ```
4. Save. Propagation takes 1–24 hours (usually under 1 hour).

---

## 6. Set Up Cloudflare DNS

### 6.1 Add Site to Cloudflare

1. Create a free account at [Cloudflare](https://dash.cloudflare.com/)
2. Click **Add a site** → enter your domain → select **Free plan**
3. Cloudflare will scan existing DNS records. Remove any auto-detected ones that aren't yours
4. **Note the two nameservers** Cloudflare assigns — use them in Step 5.2
5. Click **Done, check nameservers**

### 6.2 Create DNS Records

Once nameservers are active, add these DNS records:

| Type | Name | Content (Value) | Proxy | TTL |
|------|------|-----------------|-------|-----|
| `A` | `@` | `YOUR_DROPLET_IP` | **DNS only (gray cloud)** ⚠️ | Auto |
| `A` | `api` | `YOUR_DROPLET_IP` | **DNS only (gray cloud)** ⚠️ | Auto |
| `A` | `coolify` | `YOUR_DROPLET_IP` | **DNS only (gray cloud)** ⚠️ | Auto |

> **⚠️ IMPORTANT:** Start with **DNS only** (gray cloud icon / proxy OFF) for all records. This is critical because Coolify uses Let's Encrypt for SSL, and the proxy interferes with certificate issuance. You can enable proxy later (see Section 12.3).

This gives you:
- `utsho.com` → Frontend
- `api.utsho.com` → Backend API
- `coolify.utsho.com` → Coolify Dashboard (optional, or use IP:8000)

### 6.3 Cloudflare SSL/TLS Settings (Do This Now)

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)** — this will be used later when you enable proxy
3. Go to **SSL/TLS** → **Edge Certificates**
   - Enable **Always Use HTTPS**
   - Enable **Automatic HTTPS Rewrites**
   - Set **Minimum TLS Version** to `1.2`

---

## 7. Connect Repository to Coolify

### 7.1 Option A: GitHub (Recommended)

1. In Coolify dashboard → **Sources** → **Add New Source**
2. Select **GitHub App**
3. Follow the OAuth flow to install the Coolify GitHub App on your repo
4. Grant access to the `utsho-account` repository

### 7.2 Option B: Manual Git (via Deploy Key)

1. In Coolify → **Sources** → **Add New Source** → **Public/Private Git**
2. Repository URL: `git@github.com:YOUR_USERNAME/utsho-account.git`
3. Branch: `production`
4. Generate a deploy key in Coolify and add it to your GitHub repo's **Settings → Deploy Keys**

---

## 8. Deploy PostgreSQL via Coolify

### 8.1 Create PostgreSQL Database

1. In Coolify → **Projects** → **Create New Project** → name it `Utsho Production`
2. Click the project → **Add New Resource** → **New Environment** → name it `production`
3. In the environment → **Add New Resource** → **Database** → **PostgreSQL**
4. Configure:
   - **Version:** `16` (select `postgres:16-alpine`)
   - **Database Name:** `utsho_db`
   - **Database User:** `utsho_user`
   - **Database Password:** Click generate or enter a strong password (save this!)
   - **Public Port:** Leave empty (internal network only — more secure)
5. Click **Deploy**
6. Wait for the status to show **Running**

### 8.2 Note the Internal Connection URL

After deployment, Coolify shows the internal connection string. It will look like:

```
postgresql://utsho_user:YOUR_GENERATED_PASSWORD@CONTAINER_NAME:5432/utsho_db
```

The `CONTAINER_NAME` is typically something like `pgxxxx` — Coolify shows this. You can also find it in the database resource's **Connection** tab. **Copy this URL — you need it for the backend.**

---

## 9. Deploy the Backend (API)

### 9.1 Create Backend Resource

1. In your Coolify project/environment → **Add New Resource** → **Application**
2. Select your GitHub source → `utsho-account` repo → branch `production`
3. **Build Pack:** Select **Dockerfile**
4. Configure:
   - **Name:** `utsho-backend`
   - **Dockerfile Location:** `/backend/Dockerfile`
   - **Build Context:** `/backend`
   - **Domains:** `https://api.utsho.com` (your API subdomain)
   - **Port Exposes:** `3001`

### 9.2 Set Environment Variables

In the resource → **Environment Variables** tab, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://utsho_user:PASSWORD@CONTAINER_NAME:5432/utsho_db` |
| `JWT_SECRET` | Generate a strong secret: `openssl rand -base64 48` |
| `JWT_EXPIRATION` | `7d` |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://utsho.com` (your frontend domain) |

> **Generating a secure JWT secret:**
> ```bash
> openssl rand -base64 48
> # e.g.: a7Kx9mP2qR8sT5wY1zA3bC6eF0hJ4kL7nO9pQ2rS5uW8xZ1
> ```

### 9.3 Configure Health Check

In the resource settings:
- **Health Check Path:** `/api/health`
- **Health Check Port:** `3001`

### 9.4 Deploy

1. Click **Deploy** and monitor the build log
2. Wait for status: **Running**
3. Test: Visit `https://api.utsho.com/api/health` — should return:
   ```json
   { "status": "ok", "timestamp": "..." }
   ```

---

## 10. Deploy the Frontend (SPA)

### 10.1 Create Frontend Resource

1. **Add New Resource** → **Application**
2. Select your GitHub source → `utsho-account` repo → branch `production`
3. **Build Pack:** Select **Dockerfile**
4. Configure:
   - **Name:** `utsho-frontend`
   - **Dockerfile Location:** `/frontend/Dockerfile`
   - **Build Context:** `/frontend`
   - **Domains:** `https://utsho.com` (your main domain)
   - **Port Exposes:** `80`

### 10.2 Set Build Arguments

In **Environment Variables**, add as **Build Variable** (not runtime — this is baked at compile time):

| Variable | Value | Type |
|----------|-------|------|
| `VITE_API_URL` | `https://api.utsho.com/api` | **Build** |

> **Critical:** `VITE_API_URL` must be a **Build Variable** because Vite embeds environment variables at build time. Runtime env vars don't work for Vite.

### 10.3 Deploy

1. Click **Deploy** and monitor the build log
2. Wait for status: **Running**
3. Test: Visit `https://utsho.com` — should show the login page

---

## 11. Run Database Migrations & Seed

After both services are running, you need to run Prisma migrations and optionally seed the database.

### 11.1 Run Migrations

In Coolify → **utsho-backend** resource → **Terminal** (or **Execute Command**):

```bash
npx prisma migrate deploy
```

This applies all 13 migration files from `prisma/migrations/` to the production database.

> **Note:** `migrate deploy` (not `migrate dev`) is the production-safe command. It only applies pending migrations without generating new ones.

### 11.2 Seed the Database (First Time Only)

```bash
npx ts-node prisma/seed.ts
```

Or if `ts-node` isn't available in the production image (since it's a dev dependency), you can either:

**Option A — Execute from the builder stage temporarily:**

SSH into the server and run directly against the container:

```bash
# Find the backend container ID
docker ps | grep utsho-backend

# Execute inside the container
docker exec -it CONTAINER_ID sh

# Inside container, run migration
npx prisma migrate deploy
```

For seeding, since `ts-node` isn't in production, do this from your **local machine** pointing to the production database (only if the DB has a public port, which we don't recommend). Instead:

**Option B (Recommended) — Run seed before first production build:**

From your local machine, temporarily set `DATABASE_URL` to the production database (you'll need to temporarily expose the DB port or use SSH tunnel):

```bash
# SSH tunnel to access production DB from local machine
ssh -L 5433:localhost:POSTGRES_CONTAINER_PORT root@YOUR_DROPLET_IP

# Then locally:
cd backend
DATABASE_URL="postgresql://utsho_user:PASSWORD@localhost:5433/utsho_db" npx prisma migrate deploy
DATABASE_URL="postgresql://utsho_user:PASSWORD@localhost:5433/utsho_db" npx ts-node prisma/seed.ts
```

**Option C (Simplest) — Add a migration seed script to the Dockerfile:**

Add this to the end of the backend Dockerfile, as a one-time entrypoint script:

Create `backend/entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/main
```

Then in the Dockerfile, replace the last CMD line with:

```dockerfile
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
CMD ["./entrypoint.sh"]
```

This way migrations run automatically on every deployment.

### 11.3 Verify Migration

Check that the tables exist by visiting:
```
https://api.utsho.com/api/health
```
If the API is running and responding, the database connection is working.

### 11.4 Default Login Credentials (from seed)

After seeding, the default accounts are:

| Email | Password | Role |
|-------|----------|------|
| `admin@utsho.com` | `admin123` | SUPER_ADMIN |
| `director@utsho.com` | `admin123` | DIRECTOR |
| `uac@utsho.com` | `admin123` | ACCOUNTANT_UAC |
| `mbcs@utsho.com` | `admin123` | ACCOUNTANT_MBCS |
| `mec@utsho.com` | `admin123` | ACCOUNTANT_MEC |

> **⚠️ IMMEDIATELY change all passwords after first login!** Especially the SUPER_ADMIN account. These are default development credentials.

---

## 12. SSL / HTTPS Setup

### 12.1 Coolify Auto-SSL (Let's Encrypt)

Coolify automatically provisions Let's Encrypt SSL certificates when you set a domain on a resource. This should happen automatically when you deployed with domains in Steps 9 and 10.

Verify:
- `https://api.utsho.com` — should show a valid SSL certificate
- `https://utsho.com` — should show a valid SSL certificate

If certificates failed, check:
1. DNS records are pointing to the correct IP
2. Proxy is **OFF** (gray cloud) in Cloudflare
3. Ports 80 and 443 are open on the server (`ufw status`)
4. In Coolify, try **Restart** on the resource or re-trigger certificate generation

### 12.2 Secure Coolify Dashboard

Optionally set up SSL for the Coolify dashboard itself:

1. In Coolify → **Settings** → **General**
2. Set **Instance's FQDN** to `https://coolify.utsho.com`
3. Coolify will auto-provision an SSL certificate for itself

### 12.3 Enable Cloudflare Proxy (Optional — After SSL is Working)

Once Let's Encrypt certificates are issued and working:

1. Go to Cloudflare DNS settings
2. Click the **gray cloud** icon next to each record to turn it **orange** (proxied)
3. This enables:
   - DDoS protection
   - CDN caching for static assets
   - IP address hiding (your real server IP is hidden)
   - WAF (Web Application Firewall) on free tier

**When using Cloudflare proxy, ensure:**
- Cloudflare SSL/TLS mode is set to **Full (strict)** (set in Step 6.3)
- This means: Browser → Cloudflare (CF cert) → Your Server (Let's Encrypt cert)

> **⚠️ If you see redirect loops** after enabling proxy, your SSL mode is wrong. Go to Cloudflare SSL/TLS → set to **Full (strict)**.

> **Note:** If you enable proxy for the Coolify dashboard (`coolify.utsho.com`), Cloudflare may interfere with WebSocket connections Coolify uses. You may want to keep the Coolify subdomain as **DNS only** (gray cloud).

---

## 13. Post-Deployment Verification

Run through this checklist after everything is deployed:

### 13.1 Health & Connectivity

- [ ] `https://api.utsho.com/api/health` returns `{ "status": "ok" }`
- [ ] `https://utsho.com` loads the login page
- [ ] SSL certificates are valid for both domains (click lock icon in browser)
- [ ] Coolify dashboard is accessible

### 13.2 Functional Tests

- [ ] Login with `admin@utsho.com` / `admin123` works
- [ ] **Change the admin password immediately**
- [ ] Create a test student in any org (UAC/MBCS/MEC) and verify it saves
- [ ] Create a test payment and verify invoice generation
- [ ] Test logout and re-login
- [ ] Try accessing a page you shouldn't have access to (RBAC test)

### 13.3 Performance

- [ ] Page load time is reasonable (< 3 seconds)
- [ ] API responses are fast (< 500ms for simple queries)
- [ ] Check Coolify resource usage (CPU/RAM) — 2 GB should be fine for this app

### 13.4 Security

- [ ] Change ALL default passwords (all 5 seed accounts)
- [ ] Verify rate limiting works: hit an endpoint 101 times quickly → should get 429
- [ ] Verify CORS: requests from other domains are blocked
- [ ] Database is NOT publicly accessible (no public port)
- [ ] Coolify dashboard uses HTTPS and strong password

---

## 14. Backups & Maintenance

### 14.1 Database Backups

#### Automated Backups via Coolify

1. In Coolify → go to your PostgreSQL resource
2. Click **Backups** tab
3. Enable **Scheduled Backups**
4. Set frequency: **Daily** (recommended: every day at 3 AM)
5. Set retention: **Keep last 7 backups**
6. Coolify stores backups on the server at `/data/coolify/backups/`

#### Manual Backup

SSH into the server:

```bash
# Find postgres container ID
docker ps | grep postgres

# Create backup
docker exec POSTGRES_CONTAINER_ID pg_dump -U utsho_user -d utsho_db > /root/backups/utsho_db_$(date +%Y%m%d_%H%M%S).sql
```

#### Off-Site Backup (Recommended)

Configure Coolify to send backups to S3/DigitalOcean Spaces:

1. In Coolify → **Settings** → **S3 Storages** → **Add New**
2. Enter your S3/Spaces credentials
3. In the PostgreSQL backup settings, select the S3 storage

### 14.2 Monitoring

- **Coolify Dashboard:** Shows resource health, CPU, RAM, logs
- **Health Endpoint:** Set up a free uptime monitor at [UptimeRobot](https://uptimerobot.com/) or [BetterStack](https://betterstack.com/):
  - Monitor: `https://api.utsho.com/api/health`
  - Alert interval: 5 minutes
  - Alerts via email/Telegram/Slack

### 14.3 Updates & Redeployment

When you push changes to the `production` branch:

**Manual Deploy:**
- Go to Coolify → select the resource → Click **Deploy**

**Auto Deploy (Webhook):**
- In Coolify resource settings, copy the **Webhook URL**
- In GitHub → repo **Settings** → **Webhooks** → Add webhook
- Paste the URL, set content type `application/json`, trigger on **push** events
- Now every push to `production` triggers auto-deploy

### 14.4 Server Maintenance

```bash
# SSH into server periodically
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Check disk usage
df -h

# Check memory
free -h

# Docker cleanup (remove unused images/containers)
docker system prune -af --volumes
# ⚠️ Only run prune when you're sure no important stopped containers exist

# Check Coolify logs
docker logs coolify -f --tail 100
```

---

## 15. Troubleshooting

### Build Fails

| Issue | Solution |
|-------|----------|
| `npm ci` fails with memory error | Ensure swap is enabled (Step 3.3). For 2GB RAM, builds can be tight |
| Prisma generate fails | Ensure `prisma/schema.prisma` and `prisma.config.ts` are both in the build context |
| TypeScript errors | Run `npm run build` locally first to catch errors before pushing |

### Runtime Errors

| Issue | Solution |
|-------|----------|
| Backend can't connect to DB | Check `DATABASE_URL` env var. Use the internal container hostname, not `localhost` |
| CORS errors in browser | Check `FRONTEND_URL` env var matches your actual frontend domain exactly (including `https://`) |
| 502 Bad Gateway | Backend isn't running. Check Coolify logs for the backend container |
| Frontend shows blank page | Check browser console. Likely `VITE_API_URL` is wrong. Must be a **Build** variable, not runtime |
| `ERR_TOO_MANY_REDIRECTS` | Cloudflare SSL mode mismatch. Set to **Full (strict)** |

### SSL / Certificate Issues

| Issue | Solution |
|-------|----------|
| Let's Encrypt fails | Ensure Cloudflare proxy is **OFF** (gray cloud) during initial certificate issuance |
| Certificate expired | Coolify auto-renews. If stuck, delete and re-add the domain in Coolify |
| Mixed content warnings | Ensure `VITE_API_URL` uses `https://`, not `http://` |

### Performance / Memory

| Issue | Solution |
|-------|----------|
| OOM kills during build | Increase swap to 4 GB. Or build images locally and push to a registry |
| Slow API responses | Check DB query performance. Add indexes in Prisma schema if needed |
| High disk usage | Run `docker system prune -af`. Check backup retention settings |

### Accessing Docker Logs

```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# List all running containers
docker ps

# View logs for a specific container
docker logs CONTAINER_ID -f --tail 200

# View Coolify logs
docker logs coolify -f --tail 200
```

---

## Quick Reference Card

| What | Value |
|------|-------|
| **Droplet IP** | `YOUR_DROPLET_IP` |
| **Frontend URL** | `https://utsho.com` |
| **Backend API URL** | `https://api.utsho.com/api` |
| **Coolify Dashboard** | `https://coolify.utsho.com` or `http://YOUR_DROPLET_IP:8000` |
| **Health Check** | `GET https://api.utsho.com/api/health` |
| **SSH** | `ssh root@YOUR_DROPLET_IP` |
| **Backend Port** | `3001` |
| **DB Internal** | `postgresql://utsho_user:PASS@CONTAINER:5432/utsho_db` |
| **Prisma Migrations** | `npx prisma migrate deploy` |

---

## Files Created Summary

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Multi-stage Docker build for NestJS API |
| `backend/.dockerignore` | Exclude unnecessary files from backend image |
| `backend/entrypoint.sh` | Auto-run migrations on deploy |
| `frontend/Dockerfile` | Multi-stage Docker build for React SPA |
| `frontend/.dockerignore` | Exclude unnecessary files from frontend image |
| `frontend/nginx.conf` | Nginx config for SPA routing + caching + security headers |
| `docker-compose.yml` | Local testing compose file |

---

## Deployment Order Checklist

```
1.  [ ] Create production branch and push
2.  [ ] Create all Docker files and push
3.  [ ] Create DigitalOcean droplet
4.  [ ] SSH in → update, firewall, swap
5.  [ ] Install Coolify
6.  [ ] Purchase domain
7.  [ ] Set up Cloudflare → get nameservers
8.  [ ] Point domain nameservers to Cloudflare
9.  [ ] Create DNS records (A records, proxy OFF)
10. [ ] Wait for DNS propagation (check: nslookup utsho.com)
11. [ ] Connect GitHub to Coolify
12. [ ] Deploy PostgreSQL in Coolify
13. [ ] Deploy backend with env vars
14. [ ] Deploy frontend with build args
15. [ ] Run migrations (npx prisma migrate deploy)
16. [ ] Seed database (first time only)
17. [ ] Verify health endpoint
18. [ ] Verify frontend loads and login works
19. [ ] Change all default passwords
20. [ ] Enable Cloudflare proxy (orange cloud)
21. [ ] Set up database backups
22. [ ] Set up uptime monitoring
23. [ ] Set up webhook for auto-deploy
```
