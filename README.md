# Utsho Accounting System

> **Status:** ✅ Production-Ready | **Version:** 1.0 | **Last Updated:** February 22, 2026

A comprehensive, multi-tenant educational accounting platform designed to manage the unique financial and administrative needs of three distinct educational organizations:

- **UAC (Utsho Academic Care)**: Coaching center management with tuition, admission, and exam fees
- **MBCS (Morning Bell Children School)**: Kindergarten management with shift/branch tracking and stationary fees
- **MEC (Modern English Care)**: Simplified English tutoring management (tuition only)

---

## 🚀 Tech Stack

### Backend (NestJS)

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 7 (with `@prisma/adapter-pg`)
- **Authentication:** JWT, Passport, BCrypt
- **Validation:** class-validator, class-transformer
- **Security:** @nestjs/throttler (Rate Limiting), CORS
- **Testing:** Jest, Supertest

### Frontend (React)

- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **UI Library:** Ant Design (AntD)
- **State Management:** Zustand (with persistence)
- **Data Fetching:** TanStack Query (React Query)
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Export:** xlsx (Excel), jsPDF (PDF)
- **Testing:** Vitest, React Testing Library

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

The database seeding creates the following test accounts (Password for all: `Admin@123`):

| Role                | Email                | Access Scope                         |
| ------------------- | -------------------- | ------------------------------------ |
| **Super Admin**     | `admin@utsho.com`    | Full System Access + User Management |
| **Director**        | `director@utsho.com` | All Organizations (Read/Write)       |
| **UAC Accountant**  | `uac@utsho.com`      | UAC Organization Only                |
| **MBCS Accountant** | `mbcs@utsho.com`     | MBCS Organization Only               |
| **MEC Accountant**  | `mec@utsho.com`      | MEC Organization Only                |

> **Note:** Change these passwords immediately in production!

---

## ✨ Key Features

### 🔐 Authentication & Authorization

- **JWT-based Authentication:** Secure login with access tokens (7-day expiration)
- **Role-Based Access Control (RBAC):** `RolesGuard` ensures users access only permitted endpoints
- **Organization Scoping:** `OrganizationGuard` restricts data access to authorized organizations
- **Password Security:** BCrypt hashing with salt rounds

### 👥 User Management

- **CRUD Operations:** Super Admins can manage all users
- **Role Assignment:** Super Admin, Director, UAC/MBCS/MEC Accountant
- **Status Management:** Active/Inactive user toggling
- **Soft Deletes:** Users deactivated to preserve audit trails

### 🎓 Student Management (UAC/MBCS/MEC)

- **Complete CRUD:** Add, edit, view, delete students
- **Advanced Filtering:** By class, group/shift, school/branch
- **Payment Tracking:** Individual student payment history
- **Tuition Status Dashboard:** Visual monthly payment status grid
- **Parent Information:** Contact details and emergency information

### 👨‍🏫 Teacher Management (UAC/MBCS)

- **CRUD Operations:** Full teacher lifecycle management
- **Payment Types:** Fixed salary or lecture-based compensation
- **Attendance Tracking:** Date-wise attendance with lecture counts
- **Payroll History:** Individual teacher payroll records
- **Subject & Department:** Teacher assignment tracking

### 👔 Staff Management (UAC/MBCS)

- **Basic CRUD:** Staff member management
- **Role Assignment:** Designation and department tracking
- **Payroll Integration:** Monthly salary processing

### 💰 Payment Management

- **Multi-Organization:** Separate payment tracking for UAC, MBCS, MEC
- **Payment Types:** Tuition, admission, exam fees (UAC), stationary (MBCS)
- **Payment Methods:** Cash, bank transfer, mobile banking (bKash, Nagad, Rocket)
- **Auto-Generated Invoices:** HTML-based print-ready invoices with org branding
- **Payment History:** Global and per-student payment listing
- **Monthly Status Tracking:** Visual grid showing paid/unpaid months

### 💼 Payroll Management (UAC/MBCS)

- **Teacher Payroll:** Fixed or lecture-based calculation
- **Staff Payroll:** Monthly salary processing
- **Duplicate Prevention:** Guard against duplicate monthly payments
- **Payroll Invoices:** Print-ready payroll receipts
- **Payment History:** Individual payroll tracking per teacher/staff

### 📊 Analytics & Reporting

- **Revenue Dashboard:** Real-time revenue statistics per organization
- **Monthly Trends:** Revenue trend chart (last 6 months) with Recharts
- **Payment Distribution:** Pie chart showing payment type breakdown
- **Outstanding Payments:** Track unpaid student fees
- **Expense Analysis:** Breakdown by category with profit/loss view
- **Cross-Organization View:** Super Admin/Director see all orgs with filtering
- **Role-Based Filtering:** Accountants see only their organization

### 📈 Export Functionality

- **Excel Export:** Payment records, payroll data, expense reports via xlsx
- **PDF Export:** Analytics reports and summaries via jsPDF
- **Custom Date Ranges:** Filter and export by date range
- **Organization Filtering:** Export data per organization or combined

### 💸 Expense Management

- **Multi-Category:** Rent, electricity, water, internet, other
- **Organization Scoping:** Track expenses per UAC/MBCS/MEC
- **Monthly Tracking:** Date-wise expense recording
- **Expense Summary:** Category-wise breakdown in analytics

### 🎨 UI/UX Features

- **Responsive Design:** Mobile-friendly dashboard and forms
- **Loading States:** Skeleton screens and spinners throughout
- **Empty States:** Helpful messages with call-to-action buttons
- **Error Boundaries:** Graceful error handling with stack traces in dev
- **Cascading Filters:** Smart class → group → student selection
- **Pagination:** Table pagination with customizable page sizes
- **Search & Filter:** Real-time search and multi-column filtering
- **Print-Ready Invoices:** Browser-native print to PDF

### 🔒 Security Features

- **Rate Limiting:** 60 requests/minute via @nestjs/throttler
- **Input Validation:** class-validator on all DTOs
- **CORS Configuration:** Controlled cross-origin requests
- **SQL Injection Protection:** Prisma parameterized queries
- **XSS Prevention:** React automatic escaping
- **Password Requirements:** Minimum length and complexity enforcement

### 🧪 Testing & Quality Assurance

- **Unit Tests:** Service business logic testing with Jest
- **E2E Tests:** Critical flow testing with Supertest
- **Type Safety:** Full TypeScript strict mode compliance
- **ESLint:** Code quality and consistency enforcement
- **Error-Free:** Zero TypeScript/ESLint compilation errors

### 🗄️ Database & Performance

- **30+ Models:** Comprehensive Prisma schema
- **18+ Indexes:** Optimized query performance
- **Soft Deletes:** `isActive` flag for audit trails
- **UUID Primary Keys:** Secure, non-sequential identifiers
- **Transactions:** Atomic operations for payments/payroll
- **Invoice Counter:** Global sequential numbering with transaction safety

---

## 📂 Project Structure

```
utsho-account/
├── backend/                      # NestJS API
│   ├── src/
│   │   ├── analytics/           # Analytics & Reporting Module
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.service.spec.ts
│   │   │   └── dto/
│   │   ├── auth/                # Authentication Module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── users/               # User Management Module
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── uac/                 # UAC Organization Module
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── staff/
│   │   │   ├── payments/
│   │   │   ├── payroll/
│   │   │   └── teacher-attendance/
│   │   ├── mbcs/                # MBCS Organization Module
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── staff/
│   │   │   ├── payments/
│   │   │   ├── payroll/
│   │   │   └── teacher-attendance/
│   │   ├── mec/                 # MEC Organization Module
│   │   │   ├── students/
│   │   │   └── payments/
│   │   ├── expenses/            # Expense Management Module
│   │   │   ├── expenses.controller.ts
│   │   │   ├── expenses.service.ts
│   │   │   └── dto/
│   │   ├── common/              # Shared Resources
│   │   │   ├── decorators/      # Custom Decorators
│   │   │   ├── filters/         # Exception Filters
│   │   │   ├── interceptors/    # Response Interceptors
│   │   │   ├── interfaces/      # TypeScript Interfaces
│   │   │   └── services/        # Shared Services (Invoice)
│   │   ├── guards/              # Auth Guards
│   │   │   ├── roles.guard.ts
│   │   │   └── organization.guard.ts
│   │   ├── prisma/              # Database Service
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── health/              # Health Check Endpoint
│   │   └── app.module.ts        # Root Module
│   ├── prisma/
│   │   ├── schema.prisma        # Database Schema (30+ models)
│   │   ├── seed.ts              # User & Data Seeding Script
│   │   └── migrations/          # Database Migration History
│   ├── test/
│   │   └── auth.e2e-spec.ts     # E2E Authentication Tests
│   ├── .env                     # Environment Variables
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # React UI
│   ├── src/
│   │   ├── components/          # Reusable Components
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── InvoiceTemplate.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layouts/             # Page Layouts
│   │   │   └── DashboardLayout.tsx
│   │   ├── pages/               # Application Pages
│   │   │   ├── DashboardPage.tsx     # Analytics Dashboard
│   │   │   ├── LoginPage.tsx
│   │   │   ├── users/                # User Management
│   │   │   ├── uac/                  # UAC Pages
│   │   │   │   ├── students/
│   │   │   │   ├── teachers/
│   │   │   │   ├── staff/
│   │   │   │   ├── payments/
│   │   │   │   ├── payroll/
│   │   │   │   └── teacher-attendance/
│   │   │   ├── mbcs/                 # MBCS Pages
│   │   │   ├── mec/                  # MEC Pages
│   │   │   └── expenses/             # Expenses Pages
│   │   ├── services/            # API Integration
│   │   │   ├── authService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── usersService.ts
│   │   │   ├── expensesService.ts
│   │   │   ├── mbcsStudentsService.ts
│   │   │   ├── mecStudentsService.ts
│   │   │   └── [... more services]
│   │   ├── stores/              # State Management (Zustand)
│   │   │   └── authStore.ts
│   │   ├── utils/               # Utility Functions
│   │   │   └── exportUtils.ts   # Excel/PDF export helpers
│   │   ├── lib/                 # Library Configuration
│   │   │   └── axios.ts         # Axios instance with interceptors
│   │   ├── App.tsx              # Root Component
│   │   └── main.tsx             # Entry Point
│   ├── .env                     # API Configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── doc/                         # Documentation
│   ├── Utsho_Planning_NestJS.md           # Original Planning Doc
│   └── IMPLEMENTATION_ANALYSIS.md         # Implementation Status Report
├── POSTGRES_SETUP.md            # Database Setup Guide
├── API_TESTING.md               # API Testing Documentation
├── .gitignore                   # Root Git Ignore
└── README.md                    # This File
```

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### User Management (Super Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Analytics (Super Admin, Director, Accountants)
- `GET /api/analytics/revenue-stats` - Revenue statistics
- `GET /api/analytics/monthly-trend` - Monthly revenue trend
- `GET /api/analytics/outstanding-payments` - Outstanding payments list
- `GET /api/analytics/expense-breakdown` - Expense analysis

### UAC Module
- Students: `/api/uac/students/*`
- Teachers: `/api/uac/teachers/*`
- Staff: `/api/uac/staff/*`
- Payments: `/api/uac/payments/*`
- Payroll: `/api/uac/payroll/*`
- Attendance: `/api/uac/teacher-attendance/*`

### MBCS Module
- Students: `/api/mbcs/students/*`
- Teachers: `/api/mbcs/teachers/*`
- Staff: `/api/mbcs/staff/*`
- Payments: `/api/mbcs/payments/*`
- Payroll: `/api/mbcs/payroll/*`
- Attendance: `/api/mbcs/teacher-attendance/*`

### MEC Module
- Students: `/api/mec/students/*`
- Payments: `/api/mec/payments/*`

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Health Check
- `GET /api/health` - Server health status

> **Note:** All endpoints (except `/auth/login` and `/health`) require JWT authentication via `Authorization: Bearer <token>` header.

---

## 🧪 Testing

### Backend Tests

Run unit tests:
```bash
cd backend
npm run test
```

Run E2E tests:
```bash
npm run test:e2e
```

Run test coverage:
```bash
npm run test:cov
```

### Frontend Tests

Run unit tests:
```bash
cd frontend
npm run test
```

### Linting

Check code quality:
```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

---

## 🚀 Production Deployment

### Prerequisites

1. **VPS Server** - Ubuntu 22.04+ recommended
2. **PostgreSQL** - Version 15 or higher
3. **Node.js** - Version 18 or higher
4. **Nginx** - For reverse proxy
5. **PM2** - For process management
6. **Certbot** - For SSL certificates

### Deployment Steps

1. **Clone Repository on VPS**
   ```bash
   git clone <repository-url>
   cd utsho-account
   ```

2. **Backend Deployment**
   ```bash
   cd backend
   npm install --production
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   pm2 start dist/main.js --name utsho-backend
   ```

3. **Frontend Deployment**
   ```bash
   cd frontend
   npm install
   npm run build
   # Serve dist/ folder with Nginx
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           root /var/www/utsho-frontend/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

5. **SSL Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

6. **Database Backup**
   ```bash
   # Setup daily backup cron job
   0 2 * * * pg_dump utsho_db > /backups/utsho_db_$(date +\%Y\%m\%d).sql
   ```

> **Important:** Update environment variables for production (strong JWT secret, production database URL, etc.)

---

## 📊 Project Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Complete | 100% |
| Phase 2: UAC Module | ✅ Complete | 100% |
| Phase 3: MBCS Module | ✅ Complete | 100% |
| Phase 4: MEC Module | ✅ Complete | 100% |
| Phase 5: Analytics & Reporting | ✅ Complete | 100% |
| Phase 6: Polish & Security | ✅ Complete | 100% |
| **Overall Project** | ✅ **Production-Ready** | **100%** |

### What's Included

- ✅ All core features implemented
- ✅ Analytics dashboard with charts
- ✅ Excel/PDF export functionality
- ✅ Unit tests and E2E tests
- ✅ Security hardening (rate limiting, CORS, validation)
- ✅ UI/UX polish (error boundaries, empty states, responsive design)
- ✅ Zero compilation errors
- ✅ Full TypeScript type safety
- ✅ Comprehensive documentation

### Next Steps

- 📋 User Acceptance Testing (UAT)
- 🚀 VPS Deployment (when ready)
- 📱 Consider mobile app (React Native) for v2.0

---

## 🤝 Contributing

This is a private project for Utsho organizations. For internal contributions:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Code Standards

- Follow TypeScript strict mode
- Use ESLint configuration provided
- Write tests for new features
- Update documentation as needed
- Follow Ant Design component patterns

---

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Ensure Prisma client is generated: `npx prisma generate`

### Frontend build fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check VITE_API_URL in `.env`
- Verify all dependencies installed

### Database connection issues
- Check PostgreSQL credentials
- Ensure database `utsho_db` exists
- Verify firewall allows port 5432

### Authentication errors
- Verify JWT_SECRET is set correctly
- Check token expiration settings
- Clear browser local storage and re-login

---

## 📞 Support

For issues, questions, or feature requests, contact the development team.

---

## 📄 License

Private - Utsho Accounting System  
© 2026 Utsho Organizations. All rights reserved.

---

## 🙏 Acknowledgments

- **NestJS** - For the powerful backend framework
- **React** - For the intuitive frontend library
- **Ant Design** - For the beautiful UI components
- **Prisma** - For the excellent ORM
- **Recharts** - For the analytics visualizations

---

**Built with ❤️ for Utsho Academic Care, Morning Bell Children School, and Modern English Care**
