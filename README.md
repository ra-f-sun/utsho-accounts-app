# Utsho Accounting System

A comprehensive, multi-tenant educational accounting platform designed to manage the unique financial and administrative needs of three distinct educational organizations:

- **UAC (Utsho Academic Care)**: Coaching center management.
- **MBCS (Morning Bell Children School)**: Kindergarten and primary school management.
- **MEC (Modern English Care)**: English language tutoring management.

---

## 🚀 Tech Stack

### Backend (NestJS)

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 7 (with `@prisma/adapter-pg`)
- **Authentication:** JWT, Passport, BCrypt
- **Validation:** class-validator, class-transformer

### Frontend (React)

- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **UI Library:** Ant Design (AntD)
- **State Management:** Zustand (with persistence)
- **Data Fetching:** TanStack Query (React Query)
- **Routing:** React Router DOM
- **HTTP Client:** Axios

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** (v15 or higher)

---

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd utsho-account
```

### 2. Backend Setup

Navigate to the backend directory and expanding setup:

```bash
cd backend
```

**Install Dependencies:**

```bash
npm install
```

**Configure Environment Variables:**

Create a `.env` file in the `backend/` directory (or copy `.env.example`):

```env
# backend/.env

# Database Configuration
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/utsho_db"

# JWT Configuration
JWT_SECRET="your-secure-secret-key"
JWT_EXPIRATION="7d"

# Server Configuration
PORT=3000
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

**Database Migration & Seeding:**

Run migration to create tables and seed initial data:

```bash
# Generate Prisma Client
npx prisma generate

# Run Migration
npx prisma migrate dev --name init

# Seed Database
npm run seed
```

**Start the Backend Server:**

```bash
npm run start:dev
```

The backend will run on `http://localhost:3000/api`.

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

**Install Dependencies:**

```bash
npm install
```

**Configure Environment Variables:**

Create a `.env` file in the `frontend/` directory (or copy `.env.example`):

```env
# frontend/.env

VITE_API_URL=http://localhost:3000/api
```

**Start the Frontend Server:**

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`.

---

## 🔑 Default Credentials

The database seeding creates the following test accounts (Password for all: `admin123`):

| Role                | Email                | Access Scope                         |
| ------------------- | -------------------- | ------------------------------------ |
| **Super Admin**     | `admin@utsho.com`    | Full System Access + User Management |
| **Director**        | `director@utsho.com` | All Organizations (Read/Write)       |
| **UAC Accountant**  | `uac@utsho.com`      | UAC Organization Only                |
| **MBCS Accountant** | `mbcs@utsho.com`     | MBCS Organization Only               |
| **MEC Accountant**  | `mec@utsho.com`      | MEC Organization Only                |

---

## ✨ Key Features (Phase 1)

### Authentication & Authorization

- **JWT-based Auth:** Secure login with access tokens.
- **Role-Based Access Control (RBAC):** `RolesGuard` ensures users can only access endpoints permitted for their role.
- **Organization Scoping:** `OrganizationGuard` restricts data access to authorized organizations only.

### User Management

- **CRUD Operations:** Super Admins can Create, Read, Update, and Delete users.
- **Soft Deletes:** Users are deactivated rather than permanently deleted to preserve audit trails.

### Database Schema

- **30+ Models:** Comprehensive schema covering Students, Teachers, Staff, Payments, Payroll, Attendance, and Expenses across UAC, MBCS, and MEC.
- **Audit Trails:** `createdBy`, `updatedAt`, `createdAt` timestamps on all major records.

### Frontend Dashboard

- **Responsive Layout:** Sidebar navigation with user profile menu.
- **Protected Routes:** Automatic redirection to login for unauthenticated users.
- **Persistent Auth:** User session persists on refresh using local storage.

---

## 📂 Project Structure

```
utsho-account/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Authentication Module
│   │   ├── users/          # User Management Module
│   │   ├── common/         # Shared Decorators, Filters, Interceptors
│   │   ├── guards/         # Auth, Roles, Organization Guards
│   │   ├── prisma/         # Database Service
│   │   └── health/         # Health Check
│   └── prisma/
│       ├── schema.prisma   # Database Schema
│       └── seed.ts         # User & Data Seeding Script
│
├── frontend/                # React UI
│   ├── src/
│   │   ├── components/     # Reusable Components
│   │   ├── layouts/        # Page Layouts (Dashboard)
│   │   ├── pages/          # Application Pages (Login, Dashboard)
│   │   ├── services/       # API Integration
│   │   └── stores/         # State Management (Zustand)
│   └── .env                # API Configuration
│
├── .gitignore               # Root Git Ignore
└── README.md                # Project Documentation
```

## 📜 License

Private - Utsho Accounting System
