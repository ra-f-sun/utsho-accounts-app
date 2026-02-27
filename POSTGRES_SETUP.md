# Utsho PostgreSQL Setup Guide

## Finding Your PostgreSQL Connection Details

Since you have PostgreSQL installed locally, follow these steps to find your connection details:

### Step 1: Find PostgreSQL Password

Your PostgreSQL password was set during installation. If you don't remember it:

**Option A: Check if you saved it**

- Look for any notes from when you installed PostgreSQL
- Check if there's a "pgAdmin" application installed (PostgreSQL management tool)

**Option B: Reset the password** (if you forgot it)

1. Open Command Prompt as Administrator
2. Find the PostgreSQL data directory (usually `C:\Program Files\PostgreSQL\<version>\data`)
3. Follow PostgreSQL password reset documentation

### Step 2: Test PostgreSQL Connection

Open Command Prompt or PowerShell and run:

```powershell
# Test if PostgreSQL is running
psql --version

# Try to connect (this will prompt for password)
psql -U postgres -h localhost
```

If it asks for a password, that's good! Try your password. If you get in, you'll see:

```
postgres=#
```

Type `\q` and press Enter to exit.

### Step 3: Create the Utsho Database

Once you can connect to PostgreSQL, create the database for Utsho:

```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost

# In the PostgreSQL prompt, create the database:
CREATE DATABASE utsho_db;

# List databases to confirm:
\l

# Exit:
\q
```

### Step 4: Update the .env File

In `backend\.env`, update this line with YOUR password:

```
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/utsho_db"
```

Replace `YOUR_ACTUAL_PASSWORD` with the PostgreSQL password you used to connect.

### Common PostgreSQL Locations

- **Default Port**: 5432
- **Default User**: postgres
- **Default Host**: localhost
- **pgAdmin Tool**: Usually installed with PostgreSQL, provides a GUI

### If PostgreSQL is Not Running

If `psql --version` doesn't work or you can't connect:

1. **Check if installed**: Look for PostgreSQL in Start Menu or Programs
2. **Start the service**:
   - Open Services (search "services" in Start Menu)
   - Find "postgresql-x64-<version>"
   - Right-click → Start

3. **If not installed**: Download from https://www.postgresql.org/download/windows/

## Quick Reference

Once you have the connection working, here's what you'll run next:

```powershell
cd backend

# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Seed database with sample data
npm run seed
```

---

**Need help?** Let me know your PostgreSQL version or any error messages you see!
