# Utsho Accounting System — v1.2 Fixes & Hardening Checklist

**Created:** February 23, 2026  
**Purpose:** Comprehensive task checklist for 30 fixes identified in `PROJECT_REVIEW.md`. Designed so an agent with zero context can read this file and implement every fix.  
**Branch:** `v1.2-fixes` (create from current `v0.5-feature-refactor`)  
**Reference:** `PROJECT_REVIEW.md` — Section 17 (Priority-Ranked Fix List)

---

## Context Summary (Read This First)

### System Architecture
- **Backend:** NestJS 11 + Prisma 7 ORM + PostgreSQL
- **Frontend:** React 19 + Vite 7 + Ant Design 6 + TanStack Query 5 + Zustand 5
- **3 Organizations:** UAC (coaching), MBCS (kindergarten), MEC (English tutoring)
- **Each org** has its own Prisma models: `UacStudent`, `MbcsStudent`, `MecStudent`, etc.
- **Each org** has its own backend modules: `src/uac/`, `src/mbcs/`, `src/mec/`
- **Each org** has its own frontend pages: `src/pages/uac/`, `src/pages/mbcs/`, `src/pages/mec/`
- **Shared backend:** `src/expenses/` (shared module with per-org controllers), `src/analytics/`, `src/common/`
- **Shared frontend:** `src/components/invoices/` (7 per-org templates), `src/components/ProtectedRoute.tsx`, `src/lib/axios.ts`

### Key File Locations

| What | Backend | Frontend |
|------|---------|----------|
| Expenses (shared) | `src/expenses/expenses.controller.ts`, `expenses.service.ts` | `src/pages/expenses/OrgExpensesList.tsx`, `OrgAddExpense.tsx` |
| Expenses (per-org) | `src/expenses/uac-expenses.controller.ts`, `mbcs-expenses.controller.ts`, `mec-expenses.controller.ts` | `src/pages/uac/expenses/`, `src/pages/mbcs/expenses/`, `src/pages/mec/expenses/` |
| Exception Filter | `src/common/filters/all-exceptions.filter.ts` | — |
| Response Interceptor | `src/common/interceptors/transform.interceptor.ts` | — |
| Rate Limiter | `src/app.module.ts` (ThrottlerModule config) | — |
| Analytics | `src/analytics/analytics.service.ts` | `src/pages/DashboardPage.tsx` |
| Auth Guard/Route | `src/guards/organization.guard.ts`, `src/guards/roles.guard.ts` | `src/components/ProtectedRoute.tsx` |
| Login Page | — | `src/pages/LoginPage.tsx` |
| Auth Store | — | `src/stores/authStore.ts` |
| Sidebar/Layout | — | `src/layouts/DashboardLayout.tsx` |
| Routes | — | `src/App.tsx` |
| Axios Client | — | `src/lib/axios.ts` |
| Prisma Schema | `prisma/schema.prisma` | — |
| Invoice Counter | `src/common/services/invoice.service.ts` | — |
| UAC Payments | `src/uac/payments/` (service, controller, DTOs) | `src/pages/uac/payments/` |
| MBCS Payments | `src/mbcs/payments/` (service, controller, DTOs) | `src/pages/mbcs/payments/` |
| MEC Payments | `src/mec/payments/` (service, controller, DTOs) | `src/pages/mec/payments/` |
| UAC Payroll | `src/uac/payroll/` | `src/pages/uac/payroll/` |
| MBCS Payroll | `src/mbcs/payroll/` | `src/pages/mbcs/payroll/` |
| Backend package.json | `backend/package.json` | — |
| Frontend package.json | — | `frontend/package.json` |

### Current State Summary (What Has Been Built)

The application is **functionally complete** — all 6 phases + 5 refactor features (F1–F5) are delivered:

- Multi-tenant architecture with 3 orgs (UAC, MBCS, MEC)
- JWT auth with 5 roles (Super Admin, Director, 3 Accountants)
- Triple guard: `AuthGuard` + `RolesGuard` + `OrganizationGuard` on backend
- Student/Teacher/Staff CRUD, payments with multi-line-item invoices, payroll, attendance, expenses
- Analytics dashboard with Recharts graphs, Excel/PDF export
- Per-org invoice templates (7 files), per-org expenses, N/A for pre-admission months

**What this checklist fixes:** Security gaps, data integrity risks, validation gaps, dead code, performance issues, and UX improvements identified during the full project review.

### User Roles

| Role | Constant | Has Access To |
|------|----------|---------------|
| Super Admin | `SUPER_ADMIN` | Everything + user management |
| Director | `DIRECTOR` | All 3 orgs (read/write) |
| UAC Accountant | `ACCOUNTANT_UAC` | UAC only |
| MBCS Accountant | `ACCOUNTANT_MBCS` | MBCS only |
| MEC Accountant | `ACCOUNTANT_MEC` | MEC only |

---

## Implementation Order (Recommended)

Execute in this order to avoid dependency conflicts:

1. **Fix 1** — Restrict `/expenses` endpoint (security, backend only)
2. **Fix 2** — Expense ownership verification (security, backend only)
3. **Fix 3** — AllExceptionsFilter (UX, backend only)
4. **Fix 5** — Rate limit (config change, backend only)
5. **Fix 6** — Remove test credentials (frontend only)
6. **Fix 10** — MBCS studentId UUID validation (backend only)
7. **Fix 11** — Delete dead code files (frontend only)
8. **Fix 12** — Remove recharts from backend (backend only)
9. **Fix 8** — Analytics null admissionDate (backend only)
10. **Fix 9** — Analytics payment type filter (backend only)
11. **Fix 7** — Frontend role-based route guards (frontend, touches App.tsx + ProtectedRoute)
12. **Fix 4** — Soft deletes on financial records (backend + DB migration — most invasive)
13. **Fix 13–30** — remaining P2/P3 fixes in any order

---

## Fix 1: Restrict `/expenses` Endpoint to Super Admin / Director Only [P0 — Security]

### Current State
- **File:** `backend/src/expenses/expenses.controller.ts`
- **Line 24–31:** `@Roles()` grants access to ALL 5 roles — including all 3 accountant roles
- There is NO `OrganizationGuard` on this controller (unlike per-org controllers)
- This means `ACCOUNTANT_UAC` can `GET /api/expenses?organization=mbcs` to see MBCS expenses
- They can also `POST /api/expenses` with `organization: 'mec'` to create a MEC expense
- And `PATCH /api/expenses/:id` or `DELETE /api/expenses/:id` on any org's expense

### Current Code
```typescript
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.DIRECTOR,
  Role.ACCOUNTANT_UAC,
  Role.ACCOUNTANT_MBCS,
  Role.ACCOUNTANT_MEC,
)
```

### Tasks

- [x] **1.1** — Restrict `@Roles()` decorator to `SUPER_ADMIN` and `DIRECTOR` only:
  ```typescript
  @Controller('expenses')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  ```
  This keeps the global `/expenses` endpoint available for cross-org viewing (directors/admin), while accountants must use their org-specific endpoints (`/uac/expenses`, `/mbcs/expenses`, `/mec/expenses`).

- [x] **1.2** — Verify the per-org controllers still work for accountants:
  - The per-org controllers (`uac-expenses.controller.ts`, etc.) already have the correct `@Roles()` for each accountant
  - Confirm that after this change, `ACCOUNTANT_UAC` can still `GET /api/uac/expenses` (their org-specific endpoint)
  - Confirm that `ACCOUNTANT_UAC` gets a 403 from `GET /api/expenses` (global endpoint, now restricted)

---

## Fix 2: Expense Ownership Verification on Update/Delete [P0 — Security]

### Current State
- **Files:** `backend/src/expenses/uac-expenses.controller.ts`, `mbcs-expenses.controller.ts`, `mec-expenses.controller.ts`
- `PATCH /api/uac/expenses/:id` calls `this.expensesService.update(id, dto)` with NO org check
- `DELETE /api/uac/expenses/:id` calls `this.expensesService.remove(id)` with NO org check
- A UAC accountant who knows a MBCS expense UUID can update/delete it via the UAC endpoint

### Current Code (uac-expenses.controller.ts, line 60–71)
```typescript
@Patch(':id')
update(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() updateExpenseDto: UpdateExpenseDto,
) {
  return this.expensesService.update(id, updateExpenseDto);
}

@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string) {
  return this.expensesService.remove(id);
}
```

### Tasks

- [x] **2.1** — Add an org-verification method to `ExpensesService` (`backend/src/expenses/expenses.service.ts`):
  ```typescript
  async findOneForOrg(id: string, organization: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    if (expense.organization !== organization) {
      throw new ForbiddenException(
        `This expense does not belong to ${organization.toUpperCase()}`
      );
    }
    return expense;
  }
  ```
  Import `ForbiddenException` from `@nestjs/common`.

- [x] **2.2** — Update `UacExpensesController` update/delete to use org-verified methods:
  ```typescript
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    await this.expensesService.findOneForOrg(id, 'uac');
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.expensesService.findOneForOrg(id, 'uac');
    return this.expensesService.remove(id);
  }
  ```

- [x] **2.3** — Apply same change to `MbcsExpensesController` — pass `'mbcs'` to `findOneForOrg`

- [x] **2.4** — Apply same change to `MecExpensesController` — pass `'mec'` to `findOneForOrg`

---

## Fix 3: AllExceptionsFilter — Preserve Validation Error Details [P0 — UX]

### Current State
- **File:** `backend/src/common/filters/all-exceptions.filter.ts`
- When NestJS validation fails, `exception.getResponse()` returns:
  ```json
  { "statusCode": 400, "message": ["name must not be empty", "email must be an email"], "error": "Bad Request" }
  ```
- But the filter only extracts `exception.message` → the string `"Bad Request"`, losing the array of validation errors
- Users see `"Bad Request"` with no indication of which field failed

### Current Code (line 22–24)
```typescript
const message =
  exception instanceof HttpException
    ? exception.message
    : 'Internal server error';
```

### Tasks

- [x] **3.1** — Update the `message` extraction to preserve validation error arrays:
  ```typescript
  const message =
    exception instanceof HttpException
      ? (exception.getResponse() as any)?.message || exception.message
      : 'Internal server error';
  ```
  This way:
  - For validation errors, `message` will be `["name must not be empty", "email must be valid"]` (the array is included in the JSON)
  - For other `HttpException`s, it falls back to the string `exception.message`
  - For non-HTTP exceptions, it returns `"Internal server error"`

- [x] **3.2** — Verify the response JSON structure still matches frontend expectations:
  - The `message` field will now sometimes be an array instead of a string
  - Frontend error handling (e.g., `error.response?.data?.message`) should handle both `string` and `string[]`
  - In the Axios error interceptor (`frontend/src/lib/axios.ts`), verify error messages are displayed correctly

---

## Fix 4: Soft Deletes on Financial Records [P0 — Data Integrity]

### Current State
- **Payments** (`UacPayment`, `MbcsPayment`, `MecPayment`): hard delete via `prisma.*.delete()`
- **Payroll** (`UacPayroll`, `MbcsPayroll`): hard delete
- **Expenses** (`Expense`): hard delete
- Hard deleting financial records violates accounting audit requirements
- Student, Teacher, Staff, and User models already use `isActive: Boolean @default(true)` for soft deletes

### Affected Schema Models (in `backend/prisma/schema.prisma`)
- `UacPayment` (line ~117) — no `isActive`, no `updatedAt`
- `MbcsPayment` (line ~249) — no `isActive`, no `updatedAt`
- `MecPayment` (line ~349) — no `isActive`, no `updatedAt`
- `UacPayroll` (line ~151) — no `isActive`, no `updatedAt`
- `MbcsPayroll` (line ~283) — no `isActive`, no `updatedAt`
- `Expense` (line ~373) — no `isActive`, no `updatedAt`

### Tasks

- [x] **4.1** — Add `isActive` and `updatedAt` fields to all 6 financial models in `backend/prisma/schema.prisma`:
  ```prisma
  // Add these two lines to each model:
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt
  ```
  Models to update: `UacPayment`, `MbcsPayment`, `MecPayment`, `UacPayroll`, `MbcsPayroll`, `Expense`

- [x] **4.2** — Run Prisma migration:
  ```bash
  cd backend
  npx prisma migrate dev --name add_soft_delete_financial_records
  ```
  This will add the `is_active` column (default `true`) and `updated_at` column to 6 tables. Existing data will get `isActive = true` automatically.

- [x] **4.3** — Update UAC Payments Service (`backend/src/uac/payments/payments.service.ts`):
  - Change `remove()` from hard delete to soft delete:
    ```typescript
    async remove(id: string) {
      await this.findOne(id);
      return this.prisma.uacPayment.update({
        where: { id },
        data: { isActive: false },
      });
    }
    ```
  - Update `findAll()` to filter `where: { isActive: true, ...otherFilters }`
  - Update `findByInvoice()` to filter `where: { invoiceNumber, isActive: true }`

- [x] **4.4** — Update MBCS Payments Service (`backend/src/mbcs/payments/payments.service.ts`):
  - Same changes as 4.3

- [x] **4.5** — Update MEC Payments Service (`backend/src/mec/payments/payments.service.ts`):
  - Same changes as 4.3

- [x] **4.6** — Update UAC Payroll Service (`backend/src/uac/payroll/payroll.service.ts`):
  - Change `remove()` to soft delete
  - Update `findAll()` to filter `where: { isActive: true }`
  - Update `checkDuplicate()` to only check active records: `where: { payableType, payableId, paymentMonth, isActive: true }`

- [x] **4.7** — Update MBCS Payroll Service (`backend/src/mbcs/payroll/payroll.service.ts`):
  - Same changes as 4.6

- [x] **4.8** — Update Expenses Service (`backend/src/expenses/expenses.service.ts`):
  - Change `remove()` from hard delete to soft delete:
    ```typescript
    async remove(id: string) {
      await this.findOne(id);
      return this.prisma.expense.update({
        where: { id },
        data: { isActive: false },
      });
    }
    ```
  - Update `findAll()` to add `isActive: true` to the where clause
  - Update `getOrganizationSummary()` to add `isActive: true` to where clause

- [x] **4.9** — Update Analytics Service (`backend/src/analytics/analytics.service.ts`):
  - All aggregate queries (`sum`, `count`, `groupBy`) should add `isActive: true` to their `where` clause
  - This ensures soft-deleted records are excluded from revenue stats, outstanding payments, and expense breakdowns
  - Methods to check: `getStudentPaymentsTotal()`, `getTeacherPayrollTotal()`, `getStaffPayrollTotal()`, `getExpensesTotal()`, `getExpenseBreakdown()`, `getOrgOutstandingPayments()`

- [x] **4.10** — Frontend: no changes needed — the API response will no longer contain soft-deleted records

- [x] **4.11** — Verify: after migration, run `npx prisma generate` and ensure backend still compiles: `npm run build`

---

## Fix 5: Rate Limit — Increase from 10 to 100 Requests/Minute [P0 — UX]

### Current State
- **File:** `backend/src/app.module.ts` (lines 27–32)
- Current config: `{ ttl: 60000, limit: 10 }` — 10 requests per 60 seconds
- README claims "60 requests/minute" but actual config is 10
- 10 req/min is far too aggressive — loading the dashboard alone triggers 4+ API calls

### Current Code
```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,
    limit: 10,
  },
]),
```

### Tasks

- [x] **5.1** — Update throttle limit in `backend/src/app.module.ts`:
  ```typescript
  ThrottlerModule.forRoot([
    {
      ttl: 60000,
      limit: 100,
    },
  ]),
  ```
  100 requests per 60 seconds is reasonable — high enough for normal usage, still protects against brute-force.

- [x] **5.2** — Verify README is now accurate: it already says "60 requests/minute" — update to say "100 requests/minute" to match the new config, or keep as-is if you set `limit: 60`.

---

## Fix 6: Remove Hardcoded Test Credentials from Login Page [P0 — Security]

### Current State
- **File:** `frontend/src/pages/LoginPage.tsx`
- Line 86: `<p>Test Account: admin@utsho.com / admin123</p>`
- This is visible in production — anyone can see login credentials

### Tasks

- [x] **6.1** — Wrap the test credentials in a dev-only check:
  ```tsx
  {import.meta.env.DEV && (
    <p style={{ color: '#999', fontSize: 12 }}>
      Test Account: admin@utsho.com / admin123
    </p>
  )}
  ```
  `import.meta.env.DEV` is `true` only in Vite dev mode (`npm run dev`), `false` in production builds (`npm run build`).

---

## Fix 7: Frontend Role-Based Route Protection [P1 — Security]

### Current State
- **File:** `frontend/src/components/ProtectedRoute.tsx`
- Only checks `isAuthenticated && token` — no role check
- `ACCOUNTANT_MEC` can navigate to `/uac/students`, `/users`, etc. by typing the URL
- Backend guards reject the API calls, but the frontend pages **render and expose the UI**
- Sidebar menu items use `disabled` prop which only greys out visually — doesn't prevent navigation

### Current ProtectedRoute Code
```tsx
if (!isAuthenticated || !token) {
  return <Navigate to="/login" replace />;
}
return <Outlet />;
```

### Auth Store User Interface (`frontend/src/stores/authStore.ts`)
```typescript
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;  // <-- plain string, not typed union
  isActive: boolean;
}
```

### Tasks

- [x] **7.1** — Create a role-based route wrapper component in `frontend/src/components/RoleProtectedRoute.tsx`:
  ```tsx
  import { Navigate, Outlet } from "react-router-dom";
  import { useAuthStore } from "../stores/authStore";

  interface Props {
    allowedRoles: string[];
  }

  export default function RoleProtectedRoute({ allowedRoles }: Props) {
    const user = useAuthStore((s) => s.user);

    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  }
  ```

- [x] **7.2** — Update `frontend/src/App.tsx` to nest org-specific routes inside `RoleProtectedRoute`:
  - UAC routes (`/uac/*`): wrap in `<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT_UAC']}>`
  - MBCS routes (`/mbcs/*`): wrap in `<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT_MBCS']}>`
  - MEC routes (`/mec/*`): wrap in `<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT_MEC']}>`
  - User management routes (`/users/*`): wrap in `<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}>`
  
  Example pattern in `App.tsx`:
  ```tsx
  {/* Inside the authenticated layout route */}
  <Route element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT_UAC']} />}>
    <Route path="uac/students" element={<StudentsList />} />
    <Route path="uac/students/add" element={<AddStudent />} />
    {/* ... all other /uac/* routes */}
  </Route>

  <Route element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
    <Route path="users" element={<UsersList />} />
    <Route path="users/add" element={<AddUser />} />
    {/* ... other /users/* routes */}
  </Route>
  ```

- [x] **7.3** — Dashboard route (`/dashboard`) should remain accessible to ALL authenticated users.

- [x] **7.4** — Test: Login as `ACCOUNTANT_MEC`, navigate to `/uac/students` via URL bar → should redirect to `/dashboard`. Login as `SUPER_ADMIN` → should access all routes normally.

---

## Fix 8: Outstanding Payments — Null `admissionDate` Crash [P1 — Bug]

### Current State
- **File:** `backend/src/analytics/analytics.service.ts`
- The `getOrgOutstandingPayments()` method (duplicated for UAC, MBCS, MEC) calculates unpaid months:
  ```typescript
  const unpaidMonths = lastPaymentMonth
    ? dayjs().diff(lastPaymentMonth, 'month')
    : dayjs().diff(dayjs(student.admissionDate), 'month') + 1;
  ```
- When `student.admissionDate` is `null` (field is `DateTime?` in schema), `dayjs(null)` returns current date
- This makes `unpaidMonths = 0 + 1 = 1` — student shows as having 1 unpaid month regardless of how long they've been enrolled
- These students are **silently misreported** in the outstanding payment analytics

### Tasks

- [x] **8.1** — Update the UAC outstanding payments calculation in `backend/src/analytics/analytics.service.ts`:
  Find the block where `unpaidMonths` is calculated for UAC students and change to:
  ```typescript
  const unpaidMonths = lastPaymentMonth
    ? dayjs().diff(lastPaymentMonth, 'month')
    : student.admissionDate
      ? dayjs().diff(dayjs(student.admissionDate), 'month') + 1
      : dayjs().diff(dayjs(student.createdAt), 'month') + 1;
  ```
  This way:
  - If there's a last payment → months since that payment
  - If there's no payment but there IS an admissionDate → months since admission
  - If there's neither → fall back to `createdAt` (when the record was entered)

- [x] **8.2** — Apply same fix to the MBCS outstanding payments calculation (same file, different section)

- [x] **8.3** — Apply same fix to the MEC outstanding payments calculation (same file, different section)

---

## Fix 9: Outstanding Payments — Filter by Tuition Payments Only [P1 — Bug]

### Current State
- **File:** `backend/src/analytics/analytics.service.ts`
- The outstanding calculation fetches the latest payment of **any type** (tuition, admission, exam, etc.)
- A student who paid an exam fee this month but hasn't paid tuition for 3 months shows 0 unpaid months
- For UAC, the query is approximately:
  ```typescript
  payments: { orderBy: { paymentDate: 'desc' }, take: 1 }
  ```
  This should filter to `paymentType: 'tuition'` only.

### Tasks

- [x] **9.1** — Update UAC outstanding payments query to filter by tuition type:
  ```typescript
  payments: {
    where: { paymentType: 'tuition' },
    orderBy: { paymentMonth: 'desc' },
    take: 1,
  }
  ```
  Also change `orderBy` from `paymentDate` to `paymentMonth` — we want the latest tuition **month** paid, not the latest payment date (a late payment for January made in March shouldn't mask February being unpaid).

- [x] **9.2** — Apply same filter to MBCS outstanding payments query:
  - MBCS also has `paymentType` — add `where: { paymentType: 'tuition' }`

- [x] **9.3** — Verify MEC outstanding payments query:
  - MEC has NO `paymentType` field (all payments are tuition) — no filter needed
  - But still change `orderBy` to `paymentMonth: 'desc'` for consistency

---

## Fix 10: MBCS `studentId` UUID Validation [P1 — Validation]

### Current State
- **File:** `backend/src/mbcs/payments/dto/create-payment.dto.ts` (lines 15–17)
  ```typescript
  @IsString()
  @MinLength(1)
  studentId: string;
  ```
- **File:** `backend/src/mbcs/payments/dto/create-multi-payment.dto.ts` (lines 39–40)
  ```typescript
  @IsString()
  studentId: string;
  ```
- UAC and MEC correctly use `@IsUUID()` — MBCS is the inconsistency

### Tasks

- [x] **10.1** — Update `backend/src/mbcs/payments/dto/create-payment.dto.ts`:
  Replace `@IsString()` + `@MinLength(1)` on `studentId` with `@IsUUID()`:
  ```typescript
  @IsUUID()
  studentId: string;
  ```
  Add `IsUUID` to the `class-validator` import at the top of the file.

- [x] **10.2** — Update `backend/src/mbcs/payments/dto/create-multi-payment.dto.ts`:
  Replace `@IsString()` on `studentId` with `@IsUUID()`:
  ```typescript
  @IsUUID()
  studentId: string;
  ```
  Add `IsUUID` to the import.

---

## Fix 11: Delete Dead Code Files [P1 — Cleanup]

### Current State
These files are NOT imported anywhere in the codebase. They reference old API signatures that no longer exist and will cause compile errors if ever imported.

| File | Why It's Dead |
|------|---------------|
| `frontend/src/pages/expenses/ExpensesList.tsx` | Old global expense list — replaced by `OrgExpensesList.tsx` with per-org wrappers. Calls `expensesService.getAll(search)` which now requires `(org, ...)` params. |
| `frontend/src/pages/expenses/AddExpense.tsx` | Old global expense form — replaced by `OrgAddExpense.tsx` with per-org wrappers. Calls `expensesService.create(data)` which now requires `(org, data)`. Navigates to `/expenses` route which no longer exists. |
| `frontend/src/components/InvoiceTemplate.tsx` | Old shared invoice template (332 lines) — superseded by 7 org-specific templates in `frontend/src/components/invoices/`. Not imported anywhere. |

### Tasks

- [x] **11.1** — Delete `frontend/src/pages/expenses/ExpensesList.tsx`
- [x] **11.2** — Delete `frontend/src/pages/expenses/AddExpense.tsx`
- [x] **11.3** — Delete `frontend/src/components/InvoiceTemplate.tsx`
- [x] **11.4** — Verify no imports reference these files: search for `ExpensesList`, `AddExpense`, and `InvoiceTemplate` imports across the frontend codebase. (The per-org wrappers `UacExpensesList.tsx`, `AddUacExpense.tsx`, etc. import from `OrgExpensesList` and `OrgAddExpense` — NOT from the old files.)

---

## Fix 12: Remove `recharts` from Backend Dependencies [P1 — Cleanup]

### Current State
- **File:** `backend/package.json`
- `recharts` (React charting library) is listed as a dependency: `"recharts": "^3.7.0"`
- This is a copy-paste error — `recharts` belongs only in the frontend
- It adds unnecessary weight to the backend `node_modules`

### Tasks

- [x] **12.1** — Remove `recharts` from `backend/package.json`:
  ```bash
  cd backend
  npm uninstall recharts
  ```

- [x] **12.2** — Verify backend still builds: `npm run build`

---

## Fix 13: Typed API Wrapper to Eliminate `any` Casts [P2 — Code Quality]

### Current State
- **File:** `frontend/src/lib/axios.ts` (line 32)
- The response interceptor unwraps `response.data`, so every `api.get()` returns the raw response body (`{ success: true, data: [...] }`) directly, not an `AxiosResponse`
- TypeScript still infers the return type as `AxiosResponse<T>`, forcing 50+ `as any` casts across the codebase:
  ```tsx
  const students: Student[] = (data as any)?.data || [];
  ```

### Current Interceptor
```typescript
api.interceptors.response.use(
  (response) => response.data,  // strips AxiosResponse wrapper
  (error) => { ... }
);
```

### Tasks

- [x] **13.1** — Create a typed API response interface in `frontend/src/lib/axios.ts`:
  ```typescript
  export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    timestamp: string;
  }
  ```

- [x] **13.2** — Create typed wrapper functions:
  ```typescript
  export const apiGet = <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.get(url, config) as unknown as Promise<ApiResponse<T>>;

  export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.post(url, data, config) as unknown as Promise<ApiResponse<T>>;

  export const apiPatch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.patch(url, data, config) as unknown as Promise<ApiResponse<T>>;

  export const apiDelete = <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.delete(url, config) as unknown as Promise<ApiResponse<T>>;
  ```

- [x] **13.3** — Update all service files to use the typed wrappers:
  - `frontend/src/services/studentsService.ts` — replace `api.get(...)` with `apiGet<Student[]>(...)`
  - `frontend/src/services/paymentsService.ts` — same
  - `frontend/src/services/mbcsStudentsService.ts` — same
  - `frontend/src/services/mbcsPaymentsService.ts` — same
  - `frontend/src/services/mecStudentsService.ts` — same
  - `frontend/src/services/mecPaymentsService.ts` — same
  - `frontend/src/services/teachersService.ts` — same
  - `frontend/src/services/mbcsTeachersService.ts` — same
  - `frontend/src/services/staffService.ts` — same
  - `frontend/src/services/mbcsStaffService.ts` — same
  - `frontend/src/services/payrollService.ts` — same
  - `frontend/src/services/mbcsPayrollService.ts` — same
  - `frontend/src/services/expensesService.ts` — same
  - `frontend/src/services/usersService.ts` — same
  - `frontend/src/services/analyticsService.ts` — same
  - `frontend/src/services/attendanceService.ts` — same (if exists)

- [x] **13.4** — Update page components to remove `as any` casts:
  - Instead of `(data as any)?.data || []`, use `data?.data || []` (properly typed now)
  - This is a large refactoring pass across ~30 page components — do systematically by module

- [x] **13.5** — Verify: `npm run build` in frontend should pass with no TypeScript errors after all changes

---

## Fix 14: Standardize Payment Method Enums [P2 — Consistency]

### Current State
Different DTOs use different payment method values for the same concept:

| Context | Allowed Values |
|---------|---------------|
| UAC & MEC Payments | `cash`, `bkash`, `nagad`, `bank_transfer` |
| MBCS Payments | `cash`, `bank`, `mobile` |
| Expenses | `cash`, `bank`, `mobile` |
| UAC Payroll | `cash`, `bkash`, `nagad`, `bank_transfer` |

### Tasks

- [x] **14.1** — Decide on a canonical set of values. Recommended: `cash`, `bkash`, `nagad`, `bank_transfer` (more specific than `bank`/`mobile`).

- [x] **14.2** — Update MBCS payment DTO (`backend/src/mbcs/payments/dto/create-payment.dto.ts`):
  Change `@IsEnum(['cash', 'bank', 'mobile'])` to `@IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])` (or use `@IsIn(...)`)

- [x] **14.3** — Update MBCS multi-payment DTO (`backend/src/mbcs/payments/dto/create-multi-payment.dto.ts`): same

- [x] **14.4** — Update Expense DTO (`backend/src/expenses/dto/create-expense.dto.ts`): same

- [x] **14.5** — Update MBCS payroll DTO if it uses the old values (`backend/src/mbcs/payroll/dto/create-payroll.dto.ts`): same

- [x] **14.6** — Update frontend forms — MBCS `MbcsRecordPayment.tsx` Select options, expense form Select options to match the new canonical values

- [x] **14.7** — Data migration: any existing records with `bank` or `mobile` values need to be updated:
  ```sql
  UPDATE mbcs_payments SET "paymentMethod" = 'bank_transfer' WHERE "paymentMethod" = 'bank';
  UPDATE mbcs_payments SET "paymentMethod" = 'bkash' WHERE "paymentMethod" = 'mobile';
  UPDATE expenses SET "paymentMethod" = 'bank_transfer' WHERE "paymentMethod" = 'bank';
  UPDATE expenses SET "paymentMethod" = 'bkash' WHERE "paymentMethod" = 'mobile';
  ```
  Run these in a migration or a one-time script. Consider keeping `mobile` as a valid alias (mapped to `bkash`) during a transition period.

---

## Fix 15: Server-Side Pagination [P2 — Performance]

### Current State
ALL `findAll` endpoints return every record with no pagination. As data grows, this will degrade performance.

### Tasks

- [x] **15.1** — Create a shared pagination DTO in `backend/src/common/dto/pagination.dto.ts`:
  ```typescript
  import { IsOptional, IsInt, Min, Max } from 'class-validator';
  import { Type } from 'class-transformer';

  export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
  }
  ```

- [x] **15.2** — Update all `findAll` service methods across all modules to accept `skip` and `take`:
  ```typescript
  async findAll(filters, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.uacStudent.findMany({
        where: { ...filters, isActive: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.uacStudent.count({ where: { ...filters, isActive: true } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  ```

- [x] **15.3** — Update all controllers to pass `page` and `limit` from query params

- [x] **15.4** — Update frontend services and list pages to pass pagination params and handle the new response shape

- [x] **15.5** — Update frontend tables to use Ant Design's `pagination` prop with `total` from the API response

---

## Fix 16: Analytics N+1 Query Optimization [P2 — Performance]

### Current State
- **File:** `backend/src/analytics/analytics.service.ts`
- Monthly revenue trend runs 4 aggregate queries per month per org
- For 12 months × 3 orgs × 4 aggregates = 144 queries per dashboard load

### Tasks

- [x] **16.1** — Refactor the monthly trend calculation to use a single query with date-range grouping:
  ```typescript
  const result = await this.prisma.uacPayment.groupBy({
    by: ['paymentMonth'],
    where: {
      paymentDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });
  ```
  This replaces N individual `aggregate()` calls with one `groupBy()` call.

- [x] **16.2** — Apply same optimization to MBCS and MEC payment queries

- [x] **16.3** — Apply same optimization to payroll and expense queries

- [x] **16.4** — Skip MEC teacher/staff payroll queries entirely (MEC has no payroll — always returns 0)

---

## Fix 17: Sidebar `defaultOpenKeys` Bug [P2 — Bug]

### Current State
- **File:** `frontend/src/layouts/DashboardLayout.tsx` (line ~226)
- Uses `defaultOpenKeys={openKeys}` on the `<Menu>` component
- `defaultOpenKeys` is an **uncontrolled** prop — only sets the initial value on first render
- If a user navigates from `/uac/students` to `/mbcs/students` via browser URL bar, the `openKeys` state updates but `defaultOpenKeys` is ignored — MBCS submenu stays collapsed

### Tasks

- [x] **17.1** — Convert to controlled mode by adding `openKeys` state and `onOpenChange` handler:
  ```tsx
  const [currentOpenKeys, setCurrentOpenKeys] = useState<string[]>(openKeys);

  // Update when pathname changes
  useEffect(() => {
    setCurrentOpenKeys(openKeys);
  }, [pathname]);

  // In the Menu component:
  <Menu
    openKeys={currentOpenKeys}
    onOpenChange={(keys) => setCurrentOpenKeys(keys)}
    selectedKeys={[selectedKey]}
    items={menuItems}
    mode="inline"
  />
  ```
  Remove the `defaultOpenKeys` prop.

---

## Fix 18: Standardize Ant Design `message` API to `App.useApp()` [P2 — Code Quality]

### Current State
Some files use the deprecated static `import { message } from 'antd'` instead of the `App.useApp()` hook.

### Files That Still Use Static `message`
1. `frontend/src/pages/LoginPage.tsx`
2. `frontend/src/pages/users/AddUser.tsx`
3. `frontend/src/pages/uac/staff/StaffList.tsx`
4. `frontend/src/pages/mec/students/MecStudentsList.tsx`
5. `frontend/src/pages/mbcs/teachers/MbcsTeachersList.tsx`
6. `frontend/src/pages/mbcs/staff/MbcsStaffList.tsx`
7. `frontend/src/pages/expenses/OrgExpensesList.tsx`
8. `frontend/src/pages/DashboardPage.tsx`

### Files Already Using `App.useApp()` (Reference)
- `frontend/src/pages/uac/payments/RecordPayment.tsx`
- `frontend/src/pages/uac/payments/PaymentsList.tsx`
- `frontend/src/pages/mbcs/payments/MbcsRecordPayment.tsx`
- `frontend/src/pages/mec/payments/MecRecordPayment.tsx`

### Tasks

For each file in the "Static" list above:

- [x] **18.1** — Remove `message` from the `import { ... } from 'antd'` line
- [x] **18.2** — Add `App` to the antd import (if not already imported)
- [x] **18.3** — Inside the component, add: `const { message } = App.useApp();`
- [x] **18.4** — No other code changes needed — the `message.success()` / `message.error()` calls work the same way

Example pattern:
```tsx
// Before:
import { Button, Table, message } from 'antd';

// After:
import { App, Button, Table } from 'antd';
// ...
const MyComponent = () => {
  const { message } = App.useApp();
  // ... rest of component unchanged
};
```

---

## Fix 19: Add Error UI for Failed Data Fetches [P2 — UX]

### Current State
Most pages show `<Spin>` for `isLoading` but have **no error handling UI** for failed API calls. Only `UsersList.tsx` displays an error card. All others silently show empty tables on failure.

### Tasks

- [x] **19.1** — Create a reusable `QueryError` component in `frontend/src/components/QueryError.tsx`:
  ```tsx
  import { Result, Button } from 'antd';

  interface Props {
    error: Error | null;
    onRetry?: () => void;
  }

  export default function QueryError({ error, onRetry }: Props) {
    return (
      <Result
        status="error"
        title="Failed to load data"
        subTitle={error?.message || 'An unexpected error occurred'}
        extra={onRetry && <Button onClick={onRetry}>Try Again</Button>}
      />
    );
  }
  ```

- [x] **19.2** — Add error states to all list pages. Pattern to apply:
  ```tsx
  const { data, isLoading, isError, error, refetch } = useQuery(...);

  if (isLoading) return <Spin />;
  if (isError) return <QueryError error={error} onRetry={refetch} />;
  ```

  Pages to update:
  - `frontend/src/pages/uac/students/StudentsList.tsx`
  - `frontend/src/pages/uac/teachers/TeachersList.tsx`
  - `frontend/src/pages/uac/staff/StaffList.tsx`
  - `frontend/src/pages/uac/payments/PaymentsList.tsx`
  - `frontend/src/pages/uac/payments/UacPaymentHistory.tsx`
  - `frontend/src/pages/uac/students/StudentPaymentHistory.tsx`
  - `frontend/src/pages/uac/teachers/TeacherPayrollHistory.tsx`
  - `frontend/src/pages/mbcs/students/MbcsStudentsList.tsx`
  - `frontend/src/pages/mbcs/teachers/MbcsTeachersList.tsx`
  - `frontend/src/pages/mbcs/staff/MbcsStaffList.tsx`
  - `frontend/src/pages/mbcs/payments/MbcsPaymentsList.tsx`
  - `frontend/src/pages/mbcs/payments/MbcsPaymentHistory.tsx`
  - `frontend/src/pages/mec/students/MecStudentsList.tsx`
  - `frontend/src/pages/mec/payments/MecPaymentHistory.tsx`
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/pages/expenses/OrgExpensesList.tsx`

---

## Fix 20: `createdBy` as Proper Foreign Key [P2 — Data Integrity]

### Current State
- `createdBy` in payments, payroll, and expenses is declared as `String` in the Prisma schema
- Comment says `// FK → users.id` but there is NO actual `@relation` in Prisma
- No referential integrity enforcement — if a user is deleted, orphaned `createdBy` UUIDs remain

### Tasks

- [ ] **20.1** — Add a Prisma relation to the `User` model in `backend/prisma/schema.prisma`:
  - This is complex because you'd need named relations per model. A simpler approach: just add a database-level foreign key constraint via raw SQL in a migration, without changing the Prisma relation (to avoid breaking the model API).
  - **Alternatively (simpler):** Just add a validation check in the services — when creating a payment/payroll/expense, verify the `createdBy` user exists. This doesn't fix orphaning but prevents invalid IDs.

- [ ] **20.2** — If going with proper FK: add `@relation` to each model that has `createdBy`, and add corresponding `User` model back-relations. This is a significant schema change and should be tested carefully.

**Recommended approach for now:** Skip the Prisma relation change (too invasive). Instead, ensure the `@CurrentUser()` decorator is always used in controllers and the user ID is always valid at the time of creation.

---

## Fix 21: Per-Organization Invoice Counter [P3 — UX]

### Current State
- **File:** `backend/prisma/schema.prisma` — `InvoiceCounter` model uses `year Int @id`
- All orgs share one counter: UAC gets `0001`, MBCS gets `0002`, UAC gets `0003`, etc.
- Numbers are non-contiguous per org — may confuse accountants

### Tasks

- [x] **21.1** — Update `InvoiceCounter` model to have a composite primary key:
  ```prisma
  model InvoiceCounter {
    year         Int
    organization String  // 'uac', 'mbcs', 'mec'
    sequence     Int     @default(0)

    @@id([year, organization])
    @@map("invoice_counters")
  }
  ```

- [x] **21.2** — Run migration: `npx prisma migrate dev --name per_org_invoice_counter`

- [x] **21.3** — Update `InvoiceService.generateInvoiceNumber()` in `backend/src/common/services/invoice.service.ts`:
  ```typescript
  async generateInvoiceNumber(organization: 'uac' | 'mbcs' | 'mec'): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = organization.toUpperCase();

    const result = await this.prisma.$transaction(async (tx) => {
      let counter = await tx.invoiceCounter.findUnique({
        where: { year_organization: { year, organization } },
      });

      if (!counter) {
        counter = await tx.invoiceCounter.create({
          data: { year, organization, sequence: 1 },
        });
      } else {
        counter = await tx.invoiceCounter.update({
          where: { year_organization: { year, organization } },
          data: { sequence: { increment: 1 } },
        });
      }

      return counter;
    });

    const sequence = result.sequence.toString().padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  }
  ```

- [x] **21.4** — Update JSDoc comment in the same file — old comment still says format is `UAC/2024/0001` (slashes), actual format is `UAC-2024-0001` (dashes)

---

## Fix 22: Token Refresh Mechanism [P3 — Security]

### Current State
- JWT tokens valid for 7 days, no refresh token, no token blacklist
- If compromised, token remains valid for full 7-day period

### Tasks

- [ ] **22.1** — Shorten access token expiry to 15 minutes in `backend/src/auth/auth.module.ts`

- [ ] **22.2** — Add a `refreshToken` field to the `User` model (or a separate `RefreshToken` table)

- [ ] **22.3** — Create `POST /api/auth/refresh` endpoint that accepts a refresh token and issues a new access token

- [ ] **22.4** — Update frontend `axios.ts` interceptor to auto-refresh on 401: attempt refresh, retry the failed request, or logout if refresh fails

**Note:** This is a significant architectural change. Consider deferring to v2.0 if not critical for the initial deployment.

---

## Fix 23: Search Input Debouncing [P3 — Performance]

### Current State
- Student list pages (and similar) fire API calls on every keystroke in search inputs
- `onChange` directly updates filter state → triggers re-fetch via React Query

### Tasks

- [x] **23.1** — Create a `useDebouncedValue` hook in `frontend/src/utils/useDebouncedValue.ts`:
  ```typescript
  import { useState, useEffect } from 'react';

  export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
  }
  ```

- [x] **23.2** — Apply to search inputs in list pages:
  ```tsx
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  // Use debouncedSearch in the query key / filter params
  ```

  Pages to update:
  - `frontend/src/pages/uac/students/StudentsList.tsx`
  - `frontend/src/pages/mbcs/students/MbcsStudentsList.tsx`
  - `frontend/src/pages/mec/students/MecStudentsList.tsx`
  - Any other pages with search inputs

---

## Fix 24: 404 Page Instead of Silent Redirect [P3 — UX]

### Current State
- **File:** `frontend/src/App.tsx` (line ~253)
- Catch-all route: `<Route path="*" element={<Navigate to="/dashboard" replace />} />`
- Invalid URLs like `/uac/nonexistent` silently redirect to dashboard with no feedback

### Tasks

- [x] **24.1** — Create a `NotFoundPage` component in `frontend/src/pages/NotFoundPage.tsx`:
  ```tsx
  import { Result, Button } from 'antd';
  import { useNavigate } from 'react-router-dom';

  export default function NotFoundPage() {
    const navigate = useNavigate();
    return (
      <Result
        status="404"
        title="404 — Page Not Found"
        subTitle="The page you're looking for doesn't exist."
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>}
      />
    );
  }
  ```

- [x] **24.2** — Update `frontend/src/App.tsx` catch-all route:
  ```tsx
  <Route path="*" element={<NotFoundPage />} />
  ```

---

## Fix 25: Disable Delete Buttons During Pending Mutation [P3 — UX]

### Current State
Delete buttons in list pages don't disable during the deletion API call. Double-clicking triggers multiple delete requests.

### Tasks

- [x] **25.1** — In each list page with a delete button, use the mutation's `isPending` state:
  ```tsx
  const deleteMutation = useMutation({ ... });

  // In the table column:
  <Popconfirm
    title="Are you sure?"
    onConfirm={() => deleteMutation.mutate(record.id)}
    disabled={deleteMutation.isPending}
  >
    <Button
      danger
      icon={<DeleteOutlined />}
      loading={deleteMutation.isPending}
    />
  </Popconfirm>
  ```

  Pages to update:
  - `frontend/src/pages/uac/students/StudentsList.tsx`
  - `frontend/src/pages/uac/teachers/TeachersList.tsx`
  - `frontend/src/pages/uac/staff/StaffList.tsx`
  - `frontend/src/pages/uac/payments/PaymentsList.tsx`
  - `frontend/src/pages/mbcs/students/MbcsStudentsList.tsx`
  - `frontend/src/pages/mbcs/teachers/MbcsTeachersList.tsx`
  - `frontend/src/pages/mbcs/staff/MbcsStaffList.tsx`
  - `frontend/src/pages/mbcs/payments/MbcsPaymentsList.tsx`
  - `frontend/src/pages/mec/students/MecStudentsList.tsx`
  - `frontend/src/pages/mec/payments/MecPaymentHistory.tsx`
  - `frontend/src/pages/expenses/OrgExpensesList.tsx`
  - `frontend/src/pages/users/UsersList.tsx`

---

## Fix 26: Invoice Service JSDoc Comment Fix [P3 — Docs]

### Current State
- **File:** `backend/src/common/services/invoice.service.ts` (lines 7–10)
- JSDoc says: `Generate unique invoice number with format: {ORG_PREFIX}/{YEAR}/{SEQUENCE}`
- Actual output format: `{ORG_PREFIX}-{YEAR}-{SEQUENCE}` (dashes, not slashes)

### Tasks

- [x] **26.1** — Update the JSDoc comment:
  ```typescript
  /**
   * Generate unique invoice number with format: {ORG_PREFIX}-{YEAR}-{SEQUENCE}
   * Examples: UAC-2026-0001, MBCS-2026-0123, MEC-2026-0045
   *
   * Uses atomic transaction to prevent duplicate invoice numbers
   */
  ```

---

## Fix 27: Update REFACTOR_CHECKLIST.md Feature 3 Checkboxes [P3 — Docs]

### Current State
- Feature 3 tasks 3.1–3.13 show `- [ ]` despite being fully implemented
- Documented in `BRANCH_v0.5_DEVLOG.md` but checklist wasn't ticked

### Tasks

- [x] **27.1** — Change all `- [ ]` to `- [x]` for tasks 3.1 through 3.13 in `REFACTOR_CHECKLIST.md`

**Note:** This is being done as part of this checklist creation. See the companion edit.

---

## Fix 28: Fix Non-Functional Profile/Settings Menu Items [P3 — UX]

### Current State
- **File:** `frontend/src/layouts/DashboardLayout.tsx` (lines 195–208)
- User dropdown has "Profile" and "Settings" items — no `onClick` handlers, clicking does nothing

### Tasks

- [ ] **28.1** — Either implement basic profile/settings pages, or remove the dead menu items:

  **Option A (Implement):**
  - Create `/profile` page showing user info (read-only)
  - Create `/settings` page (even if just a placeholder for now)
  - Add `onClick` handlers: `navigate('/profile')`, `navigate('/settings')`
  - Add routes in `App.tsx`

  **Option B (Remove — simpler):**
  - Remove the `profile` and `settings` items from `userMenuItems`
  - Keep only `Logout`

  **Recommended:** Option B for now — don't ship dead UI. Add Profile/Settings when there's actual functionality to show.

---

## Fix 29: `UpdatePaymentDto` — Exclude `studentId` [P3 — Security]

### Current State
- `UpdatePaymentDto` extends `PartialType(CreatePaymentDto)` (or `CreateMultiPaymentDto`), inheriting `studentId`
- A PATCH request can reassign a payment to a different student

### Tasks

- [ ] **29.1** — UAC: Update `UpdatePaymentDto` in `backend/src/uac/payments/dto/update-payment.dto.ts`:
  ```typescript
  import { OmitType, PartialType } from '@nestjs/mapped-types';
  import { CreatePaymentDto } from './create-payment.dto';

  export class UpdatePaymentDto extends PartialType(
    OmitType(CreatePaymentDto, ['studentId'] as const)
  ) {}
  ```
  This prevents `studentId` from being included in update payloads.

- [ ] **29.2** — MBCS: Apply same change to `backend/src/mbcs/payments/dto/update-payment.dto.ts`

- [ ] **29.3** — MEC: Apply same change to `backend/src/mec/payments/dto/update-payment.dto.ts`

---

## Fix 30: Duplicate Tuition Payment Detection/Warning [P3 — UX]

### Current State
- No check prevents creating multiple tuition payments for the same student + same month
- Users can accidentally double-pay without any warning

### Tasks

- [x] **30.1** — Backend: Add a warning check (NOT a hard block) to the `createMulti` method in each org's payment service:
  ```typescript
  // Before creating, check if tuition for this student+month already exists
  for (const item of dto.lineItems) {
    if (item.paymentType === 'tuition' && item.paymentMonth) {
      const existing = await this.prisma.uacPayment.findFirst({
        where: {
          studentId: dto.studentId,
          paymentType: 'tuition',
          paymentMonth: new Date(item.paymentMonth),
          isActive: true,  // only check active records (after Fix 4)
        },
      });
      if (existing) {
        // Option: throw ConflictException or return a warning flag
        // Recommended: throw ConflictException to prevent duplicate
        throw new ConflictException(
          `Tuition payment for ${item.paymentMonth} already exists for this student`
        );
      }
    }
  }
  ```

- [x] **30.2** — Frontend: handle the 409 Conflict response in `RecordPayment.tsx` mutation's `onError` — show a user-friendly message like "Tuition for this month has already been paid"

- [x] **30.3** — Apply same to MBCS and MEC payment services

---

## Cross-Cutting Concerns

### Testing
- [ ] **T.1** — After all P0 fixes, verify `npm run build` passes for both backend and frontend
- [ ] **T.2** — After Fix 4 (soft deletes), run `npx prisma migrate dev` and verify all services compile
- [ ] **T.3** — Manually test: login as `ACCOUNTANT_UAC`, verify cannot access `/api/expenses?organization=mbcs` (Fix 1)
- [ ] **T.4** — Manually test: login as `ACCOUNTANT_UAC`, try `PATCH /api/uac/expenses/:mbcs_expense_id` → should get 403 (Fix 2)
- [ ] **T.5** — Manually test: submit an invalid form, verify detailed validation errors appear (Fix 3)
- [ ] **T.6** — Manually test: login as `ACCOUNTANT_MEC`, navigate to `/uac/students` → should redirect to `/dashboard` (Fix 7)
- [ ] **T.7** — Manually test: record a payment, then delete it → verify it's soft-deleted (Fix 4)

### Documentation
- [ ] **D.1** — Update `README.md` rate limit documentation to match actual config after Fix 5
- [ ] **D.2** — Update `README.md` to say "React 19" instead of "React 18"
- [ ] **D.3** — Update `IMPLEMENTATION_ANALYSIS.md` to reflect v0.5 refactor features and these fixes

---

## Summary of Files Modified per Fix

| Fix | Backend Files | Frontend Files | Schema |
|-----|---------------|----------------|--------|
| 1. Restrict `/expenses` | `expenses.controller.ts` | — | — |
| 2. Expense ownership | `expenses.service.ts`, `uac-expenses.controller.ts`, `mbcs-expenses.controller.ts`, `mec-expenses.controller.ts` | — | — |
| 3. Exception filter | `all-exceptions.filter.ts` | — | — |
| 4. Soft deletes | 7 service files, `analytics.service.ts` | — | `schema.prisma` + migration |
| 5. Rate limit | `app.module.ts` | — | — |
| 6. Test credentials | — | `LoginPage.tsx` | — |
| 7. Role route guards | — | `RoleProtectedRoute.tsx` (new), `App.tsx` | — |
| 8. Null admissionDate | `analytics.service.ts` | — | — |
| 9. Payment type filter | `analytics.service.ts` | — | — |
| 10. MBCS UUID | `create-payment.dto.ts`, `create-multi-payment.dto.ts` | — | — |
| 11. Dead code | — | Delete 3 files | — |
| 12. Recharts cleanup | `package.json` | — | — |
| 13. Typed API | — | `axios.ts`, ~15 services, ~30 pages | — |
| 14. Payment methods | 4–5 DTOs | 2–3 form pages | — |
| 15. Pagination | All services/controllers | All services/pages | — |
| 16. N+1 analytics | `analytics.service.ts` | — | — |
| 17. Sidebar keys | — | `DashboardLayout.tsx` | — |
| 18. Message API | — | 8 pages | — |
| 19. Error UI | — | `QueryError.tsx` (new), ~16 pages | — |
| 20. CreatedBy FK | — | — | Consider skip |
| 21. Per-org counter | `invoice.service.ts` | — | `schema.prisma` + migration |
| 22. Token refresh | `auth.service.ts`, new endpoint | `axios.ts` | `schema.prisma` |
| 23. Debounce | — | `useDebouncedValue.ts` (new), 3+ pages | — |
| 24. 404 page | — | `NotFoundPage.tsx` (new), `App.tsx` | — |
| 25. Delete loading | — | ~12 list pages | — |
| 26. JSDoc fix | `invoice.service.ts` | — | — |
| 27. Checklist fix | — | — | — (docs only) |
| 28. Profile menu | — | `DashboardLayout.tsx` | — |
| 29. UpdatePaymentDto | 3 DTOs | — | — |
| 30. Duplicate detection | 3 payment services | 3 RecordPayment pages | — |

**Estimated total files: ~85 files modified/created**  
**Estimated total effort: ~45 hours**

---

*Last Updated: February 23, 2026*  
*Status: Planning Complete — Ready for Implementation*
