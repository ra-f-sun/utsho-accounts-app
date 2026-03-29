# Utsho Account — Deployment Guide (Coolify)

> **Assumed:** Coolify is already installed on a separate VPS (the "Coolify VPS").
> The application runs on a second VPS (the "App VPS").
> Both are already provisioned and reachable.

Domain plan used in this guide:

| Service  | Domain |
|----------|--------|
| Frontend | `finance.theutshobd.com` |
| Backend  | `api.finance.theutshobd.com` |

---

## 0) DNS Setup

Point both app domains to the **App VPS IP**, not the Coolify VPS IP.

| Record | Type | Target |
|--------|------|--------|
| `finance.theutshobd.com` | A | App VPS IP |
| `api.finance.theutshobd.com` | A | App VPS IP |
| `coolify.theutshobd.com` | A | Coolify VPS IP |

> Keep Cloudflare proxy **off** (DNS only / grey cloud) during the first SSL certificate issuance.
> You can re-enable it afterwards if desired.

---

## 1) Add App VPS as a Coolify Server

1. In Coolify: **Servers → Add Server**
2. Enter the App VPS SSH credentials
3. Create a destination on that server (e.g. `app-prod`)
4. **Use this destination for every resource below** — DB, backend, and frontend must all be on the App VPS so they share the same internal Docker network

---

## 2) Connect the Repository

1. Coolify → **Sources → Add** → GitHub App (recommended) or deploy key
2. Select this repository
3. All resources in this guide use branch: **`production`**

---

## 3) Deploy PostgreSQL

1. Project → **Add Resource → Database → PostgreSQL** (`postgres:16-alpine`)
2. Destination: **app-prod**
3. Set:
   - Database name: `utsho_db`
   - Username: `utsho_user`
   - Password: generate a strong secret, save it
   - Public port: **leave empty** (internal only)
4. Deploy → wait for `Running`
5. Copy the **internal connection string** from the Connection tab

Format: `postgresql://utsho_user:<PASSWORD>@<INTERNAL_HOST>:5432/utsho_db`

The `<INTERNAL_HOST>` is the container hostname assigned by Coolify — do **not** use `localhost`.

---

## 4) Deploy Backend (NestJS API)

1. Project → **Add Resource → Application** → your repo, branch `production`
2. Destination: **app-prod**

### Build settings

| Field | Value |
|-------|-------|
| Build pack | Dockerfile |
| Dockerfile location | `/backend/Dockerfile` |
| Build context | `/backend` |
| Port | `3001` |
| Domain | `https://api.finance.theutshobd.com` |

### Environment variables (all required)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://utsho_user:<PASSWORD>@<INTERNAL_HOST>:5432/utsho_db` |
| `JWT_SECRET` | strong random string (min 32 chars) |
| `JWT_EXPIRATION` | `7d` |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://finance.theutshobd.com` |

> `FRONTEND_URL` is used for CORS. It must exactly match the frontend origin (no trailing slash).
> The backend will **refuse to start** in production if `JWT_SECRET` is missing or set to the dev default.

### Healthcheck

| Field | Value |
|-------|-------|
| Path | `/api/health` |
| Port | `3001` |
| Interval | `30s` |
| Start period | `30s` (allows time for migration on first boot) |

### Migrations

Migrations run **automatically on every container start** before the app boots.
The `CMD` in `backend/Dockerfile` is:

```
npx prisma migrate deploy && exec node dist/main
```

`prisma migrate deploy` is idempotent — it applies only unapplied migrations and is safe on every deploy.

Deploy and verify:

```
https://api.finance.theutshobd.com/api/health
```

Expected response: `{ "status": "ok", "timestamp": "..." }`

---

## 5) Deploy Frontend (React + Vite)

1. Project → **Add Resource → Application** → same repo, branch `production`
2. Destination: **app-prod**

### Build settings

| Field | Value |
|-------|-------|
| Build pack | Dockerfile |
| Dockerfile location | `/frontend/Dockerfile` |
| Build context | `/frontend` |
| Port | `8080` |
| Domain | `https://finance.theutshobd.com` |

### Build argument (not a runtime env var)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.finance.theutshobd.com/api` |

> This must be set as a **Build Argument** in Coolify (not an environment variable).
> Vite bakes it into the JavaScript bundle at build time. Changing it requires a redeploy.

Deploy and verify:

- Frontend loads at `https://finance.theutshobd.com`
- Login page appears

---

## 6) Seed the Initial Admin User (First Deploy Only)

The database starts empty. You need to create the first admin account before you can log in.

### Method — backend resource terminal

In Coolify, open the backend resource → **Terminal** tab (or use the Execute Command button):

```bash
SEED_PASSWORD=<your-chosen-admin-password> npx prisma db seed
```

> Choose a strong password. You can change it through the app after first login.
> This only needs to be run once. Subsequent deploys do not require re-seeding.

---

## 7) HTTPS and Cookie Requirements

The app uses httpOnly cookies for refresh tokens. These **only work over HTTPS**.

- Both the frontend and backend domains must have valid SSL certificates
- SSL is handled automatically by Coolify (Let's Encrypt)
- If the browser shows login errors even though the API responds correctly, check that:
  - Both domains have valid SSL (no mixed content)
  - `FRONTEND_URL` exactly matches the frontend origin (protocol + domain, no trailing slash)
  - The browser is not blocking third-party cookies (since the API is on a subdomain)

> Backend and frontend are on different subdomains (`api.` vs root). Browsers allow this for
> `SameSite=Lax` cookies as long as both are on the same registrable domain (they are).

---

## 8) Post-Deploy Checklist

- [ ] `https://api.finance.theutshobd.com/api/health` returns `{ status: "ok" }`
- [ ] Frontend loads and shows the login page
- [ ] Admin login works
- [ ] Create a test student — verifies DB write + read
- [ ] Create a test payment — verifies the payment flow
- [ ] Both domains show valid SSL padlocks
- [ ] Coolify shows all three resources (DB, backend, frontend) as `Running`

---

## 9) Ongoing Operations

- Enable scheduled backups on the PostgreSQL resource in Coolify (daily, retain 7+ days)
- Configure off-site backup storage (Coolify supports S3-compatible destinations)
- Set up uptime monitoring for `/api/health`
- Enable **auto-deploy on push to `production`** in each Coolify application resource if desired

---

## 10) Troubleshooting

### Backend container exits immediately

1. Check build settings: Dockerfile path `/backend/Dockerfile`, context `/backend`
2. Verify all required env vars are present (see §4)
3. Check that `JWT_SECRET` is set — the app crashes on startup if it's missing in production
4. Check that `DATABASE_URL` uses the internal container hostname, not `localhost`
5. Open the Coolify logs tab and read the first fatal error

### Migrations fail on startup

1. Verify `DATABASE_URL` is correct and the DB resource is `Running`
2. Check DB is on the same Coolify destination (same Docker network) as the backend
3. If you see a migration conflict, connect to the backend terminal and run:
   ```bash
   npx prisma migrate status
   ```
4. If there are drift errors, check if the DB was manually modified

### Frontend builds but API calls fail (CORS / network errors)

1. Confirm `VITE_API_URL` is set as a **build argument** and includes `/api` suffix
2. Redeploy frontend after changing it (build args are not applied on restart — only on rebuild)
3. Check browser DevTools Network tab: requests should go to `https://api.finance.theutshobd.com/api/...`
4. Confirm `FRONTEND_URL` backend env var exactly matches the frontend origin
5. Check for mixed-content warnings (HTTP API called from HTTPS frontend)

### SSL certificate fails to issue

1. Confirm app domain A records point to the **App VPS IP**, not the Coolify VPS IP
2. Ensure ports `80` and `443` are open on the App VPS firewall
3. Keep Cloudflare proxy **off** (grey cloud) during initial issuance
4. Retry by redeploy or using the Coolify "Regenerate SSL" button

### Login works but I am immediately logged out

1. Check that both domains use HTTPS (not HTTP)
2. Confirm `FRONTEND_URL` in the backend env matches the actual frontend URL exactly
3. Verify there are no browser cookie-blocking policies (try incognito mode)

### PostgreSQL deploy fails (network/CIDR conflict)

1. In Coolify, create a dedicated Docker network for DB (e.g. `coolify-db-net`)
2. Create a new destination bound to that network
3. Redeploy PostgreSQL on that destination
4. Update `DATABASE_URL` with the new internal hostname and redeploy backend

---

## 11) Quick Reference

```
1. DNS  →  Point app domains to App VPS IP
2. Server  →  Add App VPS in Coolify, create destination app-prod
3. DB  →  Deploy PostgreSQL on app-prod, copy internal connection string
4. Backend  →  Deploy NestJS app on app-prod with all 6 env vars
5. Frontend  →  Deploy React app on app-prod with VITE_API_URL build arg
6. Seed  →  Run SEED_PASSWORD=... npx prisma db seed in backend terminal (once)
7. Verify  →  Health endpoint + login + test record
8. Backups  →  Enable in Coolify DB resource
```
