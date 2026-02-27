# Database & Environment Sync Guide — v1.2 Upgrade

**Created:** February 26, 2026  
**Purpose:** Step-by-step guide for syncing the v1.2 upgrade on another device that already has the app cloned from GitHub. Covers database migrations, environment setup, and verification.  
**Audience:** Developer on a second machine pulling the latest code from `v1.2-additional-feature` branch.

---

## Prerequisites

Before starting, ensure your second device has:

- [x] Node.js 20+ installed
- [x] PostgreSQL 15+ installed and running
- [x] The repository cloned from GitHub
- [x] A working `.env` file in `backend/` with valid `DATABASE_URL`
- [x] The app previously working on a prior branch (e.g., `v1.2-fixes` or `main`)

---

## Quick Reference — What Changed in v1.2

| Change Type | Description |
|-------------|-------------|
| **New DB Table** | `org_settings` — stores per-organization configuration (tuition fees, discounts, study materials) |
| **New DB Table** | `promotion_logs` — tracks student class promotions |
| **New Columns** | `readmission_fee`, `discount_tuition`, `discount_admission`, `discount_readmission`, `association_end_date` on all student models |
| **New Columns** | `association_end_date` on all teacher and staff models |
| **New Columns** | `sub_total`, `discount`, `grand_total`, `paid_amount`, `due_amount` on all payment models |
| **New Columns** | `paid_amount`, `due_amount` on all payroll models |
| **New Backend Module** | `src/settings/` — settings CRUD API |
| **New Frontend Pages** | Settings pages, Import/Export pages, Promotion pages |
| **New npm packages** | Possibly new packages — check `package.json` diffs |

---

## Step-by-Step Sync Guide

### Step 1: Pull Latest Code

```bash
cd /path/to/utsho-account

# Fetch all remote branches
git fetch origin

# Switch to the upgrade branch
git checkout v1.2-additional-feature

# Pull latest changes
git pull origin v1.2-additional-feature
```

**Verify:** `git log --oneline -5` should show the latest commits from the v1.2 branch.

---

### Step 2: Install Backend Dependencies

```bash
cd backend

# Install any new npm packages
npm install
```

**Why:** New packages may have been added (e.g., file parsing libraries for import/export, multer for file uploads, etc.). Running `npm install` ensures your `node_modules` matches the updated `package.json`.

**Verify:** `npm install` completes without errors.

---

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend

# Install any new frontend packages
npm install
```

**Verify:** `npm install` completes without errors.

---

### Step 4: Generate Prisma Client

```bash
cd ../backend

# Regenerate the Prisma client from the updated schema
npx prisma generate
```

**Why:** The Prisma schema has new models (`OrgSettings`, `PromotionLog`) and new fields on existing models. The TypeScript client needs to be regenerated to include these.

**Verify:** Command outputs `✔ Generated Prisma Client`.

---

### Step 5: Run Database Migrations

**⚠️ THIS IS THE CRITICAL STEP**

```bash
# Still in backend/ directory
npx prisma migrate deploy
```

**What this does:**
- Applies all pending migrations that exist in `prisma/migrations/` but haven't been applied to your local database
- Creates new tables: `org_settings`, `promotion_logs`
- Adds new columns to existing tables (all nullable or with defaults — NO data loss)
- Does NOT delete or modify existing data

**Why `migrate deploy` instead of `migrate dev`?**
- `migrate deploy` is designed for applying existing migrations created by another developer
- `migrate dev` is for creating NEW migrations — you don't need to create them, they already exist in the codebase
- `migrate deploy` is safer — it won't prompt to reset your database

**Verify:**
```bash
# Check migration status
npx prisma migrate status
```
Should show all migrations as "Applied."

---

### Step 6: Verify Database State

Open Prisma Studio to visually inspect the database:

```bash
npx prisma studio
```

**Check the following:**

1. **`org_settings` table exists** — should be empty (no settings configured yet)
2. **`promotion_logs` table exists** — should be empty
3. **Student tables** (`uac_students`, `mbcs_students`, `mec_students`):
   - New columns visible: `readmission_fee`, `discount_tuition`, `discount_admission`, `discount_readmission`, `association_end_date`
   - Existing rows should have `NULL` for these new columns (or `0` for discount fields)
4. **Teacher tables** (`uac_teachers`, `mbcs_teachers`):
   - New column visible: `association_end_date` (NULL for all existing rows)
5. **Staff tables** (`uac_staff`, `mbcs_staff`):
   - New column visible: `association_end_date` (NULL for all existing rows)
6. **Payment tables** (`uac_payments`, `mbcs_payments`, `mec_payments`):
   - New columns visible: `sub_total`, `discount`, `grand_total`, `paid_amount`, `due_amount`
   - Existing rows should have `NULL` or `0`
7. **Payroll tables** (`uac_payroll`, `mbcs_payroll`):
   - New columns visible: `paid_amount`, `due_amount`
   - Existing rows should have `NULL` or `0`

Close Prisma Studio when done (Ctrl+C).

---

### Step 7: Build and Test Backend

```bash
# Build the backend to check for TypeScript compilation errors
npm run build
```

**Verify:** Build succeeds with zero errors.

```bash
# Start the development server
npm run start:dev
```

**Verify:** Server starts without errors. Check the terminal for:
- `Nest application successfully started`
- No Prisma connection errors
- No migration-related warnings

---

### Step 8: Build and Test Frontend

```bash
cd ../frontend

# Build the frontend
npm run build
```

**Verify:** Build succeeds with zero errors.

```bash
# Start the dev server
npm run dev
```

**Verify:** App loads in the browser. Check:
- Login works
- Dashboard loads
- Sidebar shows new "Settings" and "Import & Export" menu items
- Settings page opens and tabs render

---

### Step 9: Seed Data (Optional)

If you need fresh seed data that includes the new features:

```bash
cd ../backend

# Re-run the seed script
npx prisma db seed
```

**⚠️ Warning:** The seed script may create duplicate data if run multiple times. Check if the seed script uses `skipDuplicates: true` or `upsert` to handle this. If not, you may want to reset the database first:

```bash
# ONLY if you want to start fresh (DESTROYS ALL DATA):
npx prisma migrate reset

# This will:
# 1. Drop all tables
# 2. Re-run all migrations
# 3. Re-run the seed script
```

**When to use `migrate reset`:**
- Your local data is test data and you don't care about losing it
- You want a completely clean slate
- The seed script has been updated with new v1.2 data

**When NOT to use `migrate reset`:**
- You have real/important data in your local database
- You want to preserve existing payment records, student data, etc.

---

## Troubleshooting

### Problem: `npx prisma migrate deploy` fails with "Migration not found"

**Cause:** Your local database has a migration that no longer exists in the codebase (unlikely but possible if migrations were squashed).

**Fix:**
```bash
# Check which migrations are applied vs available
npx prisma migrate status

# If there's a mismatch, safest approach:
npx prisma migrate resolve --applied "MIGRATION_NAME"
```

---

### Problem: "Column already exists" error during migration

**Cause:** Someone manually added columns to the database outside of Prisma migrations.

**Fix:**
```bash
# Mark the problematic migration as already applied (skip it)
npx prisma migrate resolve --applied "20260226XXXXXX_migration_name"
```

Then verify your schema matches the database:
```bash
npx prisma db pull   # Introspect the database
npx prisma generate  # Regenerate client
```

---

### Problem: Backend build fails with "Property X does not exist on type Y"

**Cause:** Prisma client wasn't regenerated after schema changes.

**Fix:**
```bash
npx prisma generate
npm run build
```

---

### Problem: Frontend shows old pages / missing new routes

**Cause:** Browser cache or stale build.

**Fix:**
1. Hard refresh: `Ctrl+Shift+R`
2. Clear Vite cache: delete `frontend/node_modules/.vite/`
3. Restart dev server: `npm run dev`

---

### Problem: "Cannot find module '@prisma/client'" errors

**Cause:** `node_modules` out of sync.

**Fix:**
```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
npm run build
```

---

### Problem: Database connection fails

**Cause:** PostgreSQL not running or `DATABASE_URL` is wrong in `.env`.

**Fix:**
1. Check PostgreSQL is running:
   ```bash
   # Windows:
   pg_isready

   # Or check services:
   # Services → PostgreSQL → Running
   ```
2. Verify `.env` file in `backend/`:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/utsho_db?schema=public"
   ```
3. Test connection:
   ```bash
   npx prisma db pull
   ```

---

## Summary Cheat Sheet

For a quick sync without reading the full guide:

```bash
# 1. Pull code
git checkout v1.2-additional-feature
git pull origin v1.2-additional-feature

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Database operations
cd ../backend
npx prisma generate
npx prisma migrate deploy

# 4. Verify
npm run build                    # backend
cd ../frontend && npm run build  # frontend

# 5. Start
cd ../backend && npm run start:dev   # terminal 1
cd ../frontend && npm run dev        # terminal 2
```

---

## What About Production Deployment?

If this upgrade needs to be deployed to a production VPS:

1. **SSH into the server**
2. **Pull code:** `git pull origin v1.2-additional-feature`
3. **Backend:**
   ```bash
   cd /var/www/utsho-backend
   npm install
   npx prisma generate
   npx prisma migrate deploy    # ← SAFE: adds tables/columns, no data loss
   npm run build
   pm2 restart utsho-backend
   ```
4. **Frontend:**
   ```bash
   cd /var/www/utsho-frontend
   npm install
   npm run build
   # Nginx automatically serves the new build
   ```
5. **Verify:** Check the app in browser, verify new features work

**⚠️ ALWAYS back up the database before running production migrations:**
```bash
pg_dump -U utsho_user utsho_db > backup_before_v1.2_$(date +%Y%m%d_%H%M%S).sql
```

---

*Last Updated: February 26, 2026*  
*Status: Ready for Use*
