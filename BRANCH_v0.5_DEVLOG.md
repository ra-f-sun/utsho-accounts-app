# Branch v0.5-feature-refactor — Development Log

**Branch:** `v0.5-feature-refactor`  
**Started from:** `v0.4-MEC-module` (commit `4eee0b5`)  
**Closed / Merged:** February 23, 2026  
**Author:** Development Team  
**Purpose:** 5-feature refactoring sprint covering admission dates, student payment history UX, per-org expenses, separate invoice templates, and multi-line-item payment recording.

---

## Table of Contents

1. [What Was Planned](#1-what-was-planned)
2. [Feature 1 — Admission Date Field](#2-feature-1--admission-date-field)
3. [Feature 2 — N/A Status for Pre-Admission Months](#3-feature-2--na-status-for-pre-admission-months)
4. [Feature 3 — Multi-Line-Item Payment Recording](#4-feature-3--multi-line-item-payment-recording)
5. [Feature 4 — Separate Invoice Templates](#5-feature-4--separate-invoice-templates)
6. [Feature 5 — Per-Organization Expenses](#6-feature-5--per-organization-expenses)
7. [Post-Implementation Bug Fixes (Not in Original Plan)](#7-post-implementation-bug-fixes-not-in-original-plan)
8. [Ant Design Deprecation Fixes](#8-ant-design-deprecation-fixes)
9. [Unplanned Additions](#9-unplanned-additions)
10. [Items Left Incomplete or Deferred](#10-items-left-incomplete-or-deferred)
11. [Commit History Summary](#11-commit-history-summary)
12. [Architecture Decisions Made](#12-architecture-decisions-made)
13. [Lessons Learned](#13-lessons-learned)

---

## 1. What Was Planned

The full plan was documented in `REFACTOR_CHECKLIST.md` at the start of the branch. Five features were scoped, with ~35–40 files estimated to be created or modified.

| Feature | Summary |
|---------|---------|
| **F1** | Add `admissionDate` field to UAC student registration form; add defaults to MBCS/MEC forms |
| **F2** | Show "N/A" (grey) in payment history grids for months before a student's admission date |
| **F3** | Redesign payment recording to support multiple line items in one invoice |
| **F4** | Split the single shared `InvoiceTemplate.tsx` into per-org, per-entity dedicated files |
| **F5** | Move expenses from global `/expenses` route to per-org `/uac/expenses`, `/mbcs/expenses`, `/mec/expenses` |

**Implementation order recommended in plan:** F1 → F2 → F5 → F4 → F3

**Actual order executed:** F1 → F2 → F5 → F4 → F3 (followed the plan exactly)

---

## 2. Feature 1 — Admission Date Field

### What Was Planned
- UAC `AddStudent.tsx` was the only form **missing** the `admissionDate` field (MBCS and MEC already had it)
- Add a `DatePicker` with `format="DD/MM/YYYY"` to UAC form
- Set default value of `dayjs()` (today) for all three org forms
- Wire into `onFinish` and edit-mode `setFieldsValue`

### What Was Implemented

**Commit:** `2569600 fix: student admission date`

**Files changed:**
- `frontend/src/pages/uac/students/AddStudent.tsx` — added `admissionDate` DatePicker, wired `onFinish` and edit-mode population
- `frontend/src/pages/mbcs/students/AddMbcsStudent.tsx` — added default `dayjs()` value (field already existed but had no default)
- `frontend/src/pages/mec/students/AddMecStudent.tsx` — added default `dayjs()` value and fixed edit-mode population

**Backend:** No changes needed. Backend DTOs for all three orgs already accepted `admissionDate` as optional `@IsDateString()`.

### Differences from Plan
None. Implemented exactly as specified.

---

## 3. Feature 2 — N/A Status for Pre-Admission Months

### What Was Planned
- In per-student payment history grids (12-month): show **grey "N/A" tag** for months before the student's admission date
- In global tuition-status tabs (all students for a selected month): show "N/A" instead of "Unpaid" when the selected month precedes a student's admission date
- Apply to all three orgs: UAC, MBCS, MEC

**Files targeted:** 6 files — `StudentPaymentHistory.tsx` (×3), `UacPaymentHistory.tsx`, `MbcsPaymentHistory.tsx`, `MecPaymentHistory.tsx`

### What Was Implemented

**Commit:** `0d85d2f Fix: not available month`

**Logic added to all 6 files:**
```tsx
// In per-student grids
const admissionMonth = student?.admissionDate
  ? dayjs(student.admissionDate).startOf("month")
  : null;

const monthDate = dayjs(`${year}-${month}`);
const isAvailable = !admissionMonth || !monthDate.isBefore(admissionMonth);

// Render:
{!isAvailable ? (
  <Tag color="default">N/A</Tag>
) : isPaid ? (
  <Tag color="success">Paid</Tag>
) : (
  <Tag color="error">Unpaid</Tag>
)}
```

```tsx
// In global tuition-status tabs
const isAvailable = !student.admissionDate ||
  !dayjs(filters.paymentMonth).isBefore(dayjs(student.admissionDate).startOf("month"));

// Row object gains `isAvailable` flag
// Status column renders grey "N/A" when !isAvailable
```

**Backend analytics:** Verified that `getOrgOutstandingPayments()` already calculates unpaid months starting from `admissionDate` (not `createdAt`). No backend changes were required.

### Differences from Plan
None. All 6 targeted files were updated correctly.

---

## 4. Feature 3 — Multi-Line-Item Payment Recording

### What Was Planned
This was the most complex feature. The plan proposed **Option B**: keep the current single-row-per-payment DB schema, but accept an array of line items in a single API call. The backend would use a `$transaction` to create all rows sharing one `invoiceNumber`.

**Planned tasks (3.1–3.13):**
- New `CreateMultiPaymentDto` for UAC, MBCS, MEC backends
- New `POST /uac/payments/multi` endpoint (and same for MBCS, MEC)
- Frontend redesign of `RecordPayment.tsx` using `Form.List` for line items
- Update `InvoiceTemplate` to show line items
- New `GET /uac/payments/invoice/:invoiceNumber` endpoints
- Frontend service updates: `createMulti()`, `getByInvoice()`
- New `InvoiceByNumber.tsx` pages for viewing invoices by invoice number

### Architecture Decision Made
**Option B confirmed** — no schema changes, no new tables. All three orgs use the same approach:
- One API call → one `invoiceNumber` → N individual payment rows in a `$transaction`

### What Was Implemented

**Commit:** `3f34172 Fix: Invoice` (this was the primary Feature 3 commit, despite being named "Fix")

#### Backend Changes

**New DTO — `CreateMultiPaymentDto`** (created for UAC, MBCS, MEC):
```typescript
class LineItemDto {
  @IsEnum(PaymentType)
  paymentType: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  paymentMonth?: string;
}

class CreateMultiPaymentDto {
  @IsUUID()
  studentId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: string;

  @IsDateString()
  paymentDate: string;

  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  @ArrayMinSize(1)
  lineItems: LineItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
```

**New service method** in each org's `payments.service.ts`:
```typescript
async createMulti(dto: CreateMultiPaymentDto) {
  const invoiceNumber = await this.invoiceService.generateInvoiceNumber('uac');
  return this.prisma.$transaction(
    dto.lineItems.map(item =>
      this.prisma.uacPayment.create({
        data: {
          studentId: dto.studentId,
          paymentType: item.paymentType,
          amount: item.amount,
          paymentMonth: item.paymentMonth ?? dto.paymentDate,
          paymentDate: dto.paymentDate,
          paymentMethod: dto.paymentMethod,
          invoiceNumber,
          notes: dto.notes,
        },
        include: { student: true },
      })
    )
  );
}
```

**New controller endpoint** in each org: `POST /uac/payments/multi`

**New `GET /uac/payments/invoice/:invoiceNumber`** endpoint (returns all payments sharing that invoice number, with student relation)

**MEC consideration noted in plan:** MEC has no `paymentType` concept (tuition-only). Implemented with a simplified `lineItems` array where each item just has `amount` and `paymentMonth`, with `paymentType` defaulting to `'tuition'`.

#### Frontend Changes

**Redesigned `RecordPayment.tsx`** (UAC, MBCS, MEC):
- Top section: payment method + receiving date
- `Form.List` with name `"lineItems"` — each row has: Payment Type (Select) + Amount (InputNumber) + conditional Payment Month (shown only when `paymentType === 'tuition'`)
- Auto-fill amount from `selectedStudent.monthlyTuitionFee` when tuition type is selected
- Submit collects all line items + shared fields, POSTs to `createMulti()`

**New `InvoiceByNumber.tsx`** (UAC, MBCS, MEC `MecInvoiceByNumber.tsx`, `MbcsInvoiceByNumber.tsx`):
- Route parameter `:invoiceNumber`
- Fetches all payments for that invoice number
- Renders `UacStudentInvoice` (or org equivalent) with all line items


**Service updates** — `paymentsService.ts`, `mbcsPaymentsService.ts`, `mecPaymentsService.ts`:
```typescript
createMulti: (data: CreateMultiPaymentDto) =>
  api.post('/uac/payments/multi', data),

getByInvoice: (invoiceNumber: string) =>
  api.get(`/uac/payments/invoice/${invoiceNumber}`),
```

**New routes added in `App.tsx`:**
- `/uac/payments/invoice/:invoiceNumber` → `InvoiceByNumber`
- `/mbcs/payments/invoice/:invoiceNumber` → `MbcsInvoiceByNumber`
- `/mec/payments/invoice/:invoiceNumber` → `MecInvoiceByNumber`

### Problems Encountered (Feature 3)

#### Problem 1 — Invoice number format caused URL routing failure
**Issue:** The original invoice number format used `/` as separator: `UAC/2026/0001`. When this was placed in a URL path like `/uac/payments/invoice/UAC/2026/0001`, React Router interpreted `UAC`, `2026`, `0001` as separate path segments, matching no route and redirecting to the dashboard.

**Fix:** Changed invoice number separator from `/` to `-` in `backend/src/common/services/invoice.service.ts`:
```typescript
// Before:
return `${prefix}/${year}/${sequence}`;   // UAC/2026/0001

// After:
return `${prefix}-${year}-${sequence}`;   // UAC-2026-0001
```

**Important:** Existing payment records in the database still used the old `/` format. To handle both old and new formats:
- Navigation uses `encodeURIComponent(invoiceNumber)` — turns `UAC/2026/0001` → `UAC%2F2026%2F0001`
- `InvoiceByNumber` pages use `decodeURIComponent(invoiceNumber!)` before passing to the API

#### Problem 2 — Payments list showed one row per line item instead of one per invoice
**Issue:** `GET /uac/payments` returns all individual `UacPayment` rows — one per line item. So an invoice with 3 line items (e.g., Tuition + Exam Fee + Study Materials) appeared as 3 separate rows in the payments list table, with the same invoice number repeated.

**Fix:** Added frontend grouping using `useMemo` in `PaymentsList.tsx`, `MbcsPaymentsList.tsx`, and the "All Payments" tab of `MecPaymentHistory.tsx`:

```tsx
interface GroupedPayment {
  invoiceNumber: string;
  student: Payment["student"];
  paymentTypes: string[];    // all types in this invoice
  totalAmount: number;       // sum of all line items
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  ids: string[];             // all DB row IDs for bulk delete
}

const groupedPayments = useMemo((): GroupedPayment[] => {
  const payments = (data as unknown as { data?: Payment[] })?.data || [];
  const groups: Record<string, GroupedPayment> = {};
  payments.forEach((p: Payment) => {
    if (!groups[p.invoiceNumber]) {
      groups[p.invoiceNumber] = { ...p, paymentTypes: [], totalAmount: 0, ids: [] };
    }
    groups[p.invoiceNumber].paymentTypes.push(p.paymentType);
    groups[p.invoiceNumber].totalAmount += p.amount;
    groups[p.invoiceNumber].ids.push(p.id);
  });
  return Object.values(groups);
}, [data]);
```

Payment type cells render as multi-tag rows. Delete mutation accepts `ids: string[]` and calls `Promise.all(ids.map(id => service.delete(id)))`.

#### Problem 3 — Double data unwrap in InvoiceByNumber
**Issue:** The axios interceptor in `lib/axios.ts` already strips the `AxiosResponse` wrapper (`response => response.data`). The `InvoiceByNumber` pages were additionally unwrapping with `data?.data?.data` — one too many levels, resulting in `undefined` and blank invoices.

**Fix:** Changed to `data?.data` (one unwrap, since interceptor handles the outer one).

### Differences from Plan
- Tasks 3.1–3.13 were all implemented (Feature 3 was marked as `[ ]` in checklist but fully delivered)
- No schema changes were made (Option B confirmed)
- MEC was kept at parity with UAC/MBCS (not simplified) — multi-item recording works for MEC too
- The invoice number format change (separator `/` → `-`) was NOT in the original plan — it was discovered as necessary when testing URL routing

---

## 5. Feature 4 — Separate Invoice Templates

### What Was Planned
Replace the single generic `InvoiceTemplate.tsx` (with `organization` and `type` props) with 7 dedicated files, one per org × entity combination. Each file would hardcode its own branding and accept an entity-specific data interface.

### What Was Implemented

**Commit:** `13b03fd Feat: separate invoice template`

**New directory:** `frontend/src/components/invoices/`

**New files created:**

| File | Purpose |
|------|---------|
| `UacStudentInvoice.tsx` | UAC student payment invoice — blue theme (`#667eea`) |
| `UacTeacherPayrollInvoice.tsx` | UAC teacher payroll slip |
| `UacStaffPayrollInvoice.tsx` | UAC staff payroll slip |
| `MbcsStudentInvoice.tsx` | MBCS student payment — purple theme (`#7c3aed`) |
| `MbcsTeacherPayrollInvoice.tsx` | MBCS teacher payroll slip |
| `MbcsStaffPayrollInvoice.tsx` | MBCS staff payroll slip |
| `MecStudentInvoice.tsx` | MEC student payment — green theme (`#059669`) |
| `types.ts` | Shared TypeScript interfaces |
| `printHelper.ts` | Shared print/PDF utility function |

**`types.ts` interfaces:**
```typescript
interface LineItem {
  paymentType: string;
  amount: number;
  paymentMonth?: string;
}

interface StudentPaymentInvoiceData {
  invoiceNumber: string;
  student: { name; class; group; monthlyTuitionFee; ... };
  lineItems: LineItem[];
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  totalAmount: number;
}

interface TeacherPayrollInvoiceData { ... }
interface StaffPayrollInvoiceData { ... }
```

**Updated invoice pages:**
- `frontend/src/pages/uac/payments/PaymentInvoice.tsx` — now imports `UacStudentInvoice`
- `frontend/src/pages/uac/payroll/PayrollInvoice.tsx` — conditionally renders `UacTeacherPayrollInvoice` or `UacStaffPayrollInvoice` based on `payroll.payableType`
- `frontend/src/pages/mbcs/payments/MbcsPaymentInvoice.tsx` — imports `MbcsStudentInvoice`
- `frontend/src/pages/mbcs/payroll/MbcsPayrollInvoice.tsx` — conditionally renders MBCS teacher/staff payroll templates
- `frontend/src/pages/mec/payments/MecPaymentInvoice.tsx` — imports `MecStudentInvoice`

**Old `InvoiceTemplate.tsx`:** Kept in place as a deprecated backup.

**Key design trait per template:**
- Each student invoice template supports the `lineItems` array, rendering a table: Payment Type | Month | Amount, with total row
- `forwardRef` used on all templates for print support via `invoiceRef`
- `printHelper.ts` contains the shared `handlePrint(ref, title)` logic used by all invoice pages

### Differences from Plan
- All tasks 4.1–4.11 completed as planned
- `MecStudentInvoice.tsx` was initially created without line-item support; it was updated in the Feature 3 commit (`3f34172`) to accept `lineItems` — this was a dependency ordering issue (F4 done before F3)

---

## 6. Feature 5 — Per-Organization Expenses

### What Was Planned
Move expenses from a global shared route to per-org routes:
- `/uac/expenses`, `/mbcs/expenses`, `/mec/expenses`
- Backend: per-org controllers auto-injecting `organization`
- Frontend: per-org pages, sidebar reorganization
- `organization` NOT selectable in the form — derived from route context

### What Was Implemented

**Commit:** `4ef7443 feat: decentralised expense`

#### Backend Changes

**Three new controllers** added to the shared `ExpensesModule`:
- `backend/src/expenses/uac-expenses.controller.ts`
- `backend/src/expenses/mbcs-expenses.controller.ts`
- `backend/src/expenses/mec-expenses.controller.ts`

Each controller auto-injects its org:
```typescript
@Controller('uac/expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UacExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.expensesService.findAll({ ...query, organization: 'uac' });
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create({ ...dto, organization: 'uac' });
  }
  // PATCH, DELETE unchanged (use expense ID, no org needed)
}
```

The original `ExpensesController` (`/expenses`) was retained for **Super Admin / Director** access (all orgs).

#### Frontend Changes

**Shared components created** (not three separate copies — a shared component with org prop, chosen over per-org duplication):
- `frontend/src/pages/expenses/OrgAddExpense.tsx` — shared add/edit form, accepts `organization` and `apiPrefix` props
- `frontend/src/pages/expenses/OrgExpensesList.tsx` — shared list page, same props

**Thin wrapper pages** (each just re-exports the shared component with org context):
- `frontend/src/pages/uac/expenses/UacExpensesList.tsx` + `AddUacExpense.tsx`
- `frontend/src/pages/mbcs/expenses/MbcsExpensesList.tsx` + `AddMbcsExpense.tsx`
- `frontend/src/pages/mec/expenses/MecExpensesList.tsx` + `AddMecExpense.tsx`

**`App.tsx` route changes:**
- Removed: `/expenses`, `/expenses/add`, `/expenses/edit/:id`
- Added: `/uac/expenses`, `/uac/expenses/add`, `/uac/expenses/edit/:id` (×3 orgs)

**Sidebar (`DashboardLayout.tsx`):**
- Removed global "Expenses" menu item at root level
- Added "Expenses" sub-item under each org's menu group (UAC, MBCS, MEC)

**`expensesService.ts` updated** — methods now accept `organization` parameter building URLs like `/uac/expenses`:
```typescript
const getAll = (org: string, params?: any) =>
  api.get(`/${org}/expenses`, { params });

const create = (org: string, data: any) =>
  api.post(`/${org}/expenses`, data);
```

**Form field addition:** `expenseMonth` (MonthPicker) added to the expense form — this field was missing in the original `AddExpense.tsx` despite the backend DTO expecting it.

### Differences from Plan
- Plan listed creating separate `uacExpensesService.ts`, `mbcsExpensesService.ts`, `mecExpensesService.ts` — instead, the existing `expensesService.ts` was updated with an `organization` parameter (simpler approach, same result)
- Plan listed creating separate per-org add/list page implementations — instead, two shared components (`OrgAddExpense.tsx`, `OrgExpensesList.tsx`) are used with thin wrapper pages, avoiding code duplication
- Both of these deviations were **improvements** over the plan

---

## 7. Post-Implementation Bug Fixes (Not in Original Plan)

These fixes were NOT listed in `REFACTOR_CHECKLIST.md`. They were discovered during testing after Feature 3 was implemented.

### 7.1 — `message` Static Call Deprecation (Ant Design)

**Symptom:** Console warning: `[antd: message] Static usage of `message` is deprecated...`

**Root cause:** Ant Design v5 deprecates `message.success()` / `message.error()` called directly at module level. They must be called via `App.useApp()` hook context.

**Files fixed:**
- `frontend/src/pages/uac/payments/RecordPayment.tsx`
- `frontend/src/pages/mbcs/payments/MbcsRecordPayment.tsx`
- `frontend/src/pages/mec/payments/MecRecordPayment.tsx`
- `frontend/src/pages/uac/payments/PaymentsList.tsx`
- `frontend/src/pages/mbcs/payments/MbcsPaymentsList.tsx`

**Fix pattern:**
```tsx
// Before:
import { message } from 'antd';
// ...used directly in component

// After:
import { App } from 'antd';
const { message } = App.useApp();
```

### 7.2 — `Alert` prop `message` renamed to `title` (Ant Design)

**Symptom:** Console deprecation warning for `<Alert message=...>`

**Files fixed:**
- `RecordPayment.tsx` (UAC, MBCS, MEC) — alert shown on successful payment

**Fix:** `<Alert message="Payment recorded!" />` → `<Alert title="Payment recorded!" />`

### 7.3 — PaymentsList "View Invoice" button navigating to dashboard

**Symptom:** Clicking the eye icon on a payment row navigated to the home/dashboard page instead of the invoice.

**Root cause:** Old invoice numbers used `/` separator (`UAC/2026/0024`). The navigation was:
```tsx
navigate(`/uac/payments/invoice/${record.invoiceNumber}`)
// Resolved to: /uac/payments/invoice/UAC/2026/0024
// React Router matched: /uac/payments/invoice/UAC then 404 → dashboard fallback
```

**Fix:** Encode the invoice number in navigation:
```tsx
navigate(`/uac/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)
```
And decode it before API call in `InvoiceByNumber`:
```tsx
queryFn: () => paymentsService.getByInvoice(decodeURIComponent(invoiceNumber!))
```

Applied to: UAC `PaymentsList.tsx`, MBCS `MbcsPaymentsList.tsx`, MEC `MecPaymentHistory.tsx`, and all three `InvoiceByNumber` files.

### 7.4 — MecPaymentHistory "All Payments" tab showing flat rows

**Symptom:** Same as UAC/MBCS — multiple rows per invoice in MEC's "All Payments" tab.

**Fix:** Added `GroupedMecPayment` interface and `groupedMecPayments = useMemo(...)` in `MecPaymentHistory.tsx`. The "All Payments" tab Table was updated to use `groupedMecPayments` with `rowKey="invoiceNumber"`. Columns updated: `Month` column now shows multi-tag list of months; `Amount` column shows `totalAmount`.

### 7.5 — `useMemo` stale dependency warning

**Symptom:** React lint error: `The 'payments' logical expression could make the dependencies of useMemo Hook change on every render.`

**Root cause:** The pattern was:
```tsx
const payments = (data as any)?.data || [];  // new array ref every render
const groupedPayments = useMemo(() => { ... }, [payments]); // always re-runs!
```

**Fix:** Move the data extraction inside the `useMemo` callback and depend directly on `data`:
```tsx
const groupedPayments = useMemo((): GroupedPayment[] => {
  const payments = (data as unknown as { data?: Payment[] })?.data || [];
  // ...grouping logic
}, [data]);  // stable dependency
```

Applied to: `PaymentsList.tsx` (UAC), `MbcsPaymentsList.tsx` (MBCS).

---

## 8. Ant Design Deprecation Fixes

These were addressed in the final cleanup, across all three orgs and dashboard.

### 8.1 — `Statistic` `valueStyle` prop deprecated

**Symptom:** Console warning: `[antd: Statistic] 'valueStyle' is deprecated. Please use 'styles.content' instead.`

**Files fixed (9 total):**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/uac/payments/UacPaymentHistory.tsx`
- `frontend/src/pages/uac/students/StudentPaymentHistory.tsx`
- `frontend/src/pages/uac/teachers/TeacherPayrollHistory.tsx`
- `frontend/src/pages/mec/payments/MecPaymentHistory.tsx`
- `frontend/src/pages/mec/students/MecStudentPaymentHistory.tsx`
- `frontend/src/pages/mbcs/payments/MbcsPaymentHistory.tsx`
- `frontend/src/pages/mbcs/students/MbcsStudentPaymentHistory.tsx`
- `frontend/src/pages/mbcs/teachers/MbcsTeacherPayrollHistory.tsx`

**Fix:**
```tsx
// Before:
<Statistic valueStyle={{ color: '#2e7d32' }} />

// After:
<Statistic styles={{ content: { color: '#2e7d32' } }} />
```

---

## 9. Unplanned Additions

### 9.1 — User Management Module

**Commit:** `a9cb7d4 feat: update user management and readme`

Not in the original refactor checklist at all. Added:
- `frontend/src/pages/users/AddUser.tsx` — create/edit user form (name, email, password, role, organization)
- `frontend/src/pages/users/UsersList.tsx` — user management table with edit + delete
- `frontend/src/services/usersService.ts` — CRUD service for `/users` endpoint
- Routes wired in `App.tsx`

**Commit:** `02be4db fix: minor fix` — patched a bug in `UsersList.tsx` and `usersService.ts` discovered after initial implementation.

### 9.2 — README Overhaul

**Commits:** `1f208ed chore: update readme` + `a9cb7d4`

`README.md` was significantly expanded (537 → expanded version) to document the full system architecture, routes, roles, and module structure for future onboarding.

---

## 10. Items Left Incomplete or Deferred

| Item | Status | Notes |
|------|--------|-------|
| Task 3.13 — Verify analytics not broken by multi-payment | Deferred | Analytics queries sum all `amount` values per student — unaffected. Informal verification only; no automated test added. |
| Task 6.x — E2E tests | Deferred | No new E2E tests were written for the new features. Existing auth test untouched. |
| Task 8.1 — ESLint across all modified files | Partial | Fixed errors flagged by TypeScript compiler; full ESLint sweep not run. |
| Task 8.3 — Update `IMPLEMENTATION_ANALYSIS.md` | Deferred | Not updated during this branch. |
| Old `InvoiceTemplate.tsx` removal | Deferred | Kept as deprecated backup per task 4.10. Not removed yet. |
| `Statistic` `styles.content` support on older Ant Design | Risk | If Ant Design version is below 5.8, `styles.content` may not exist. Verify `package.json` version. |

---

## 11. Commit History Summary

| Commit | Message | Feature | Key Changes |
|--------|---------|---------|-------------|
| `a9cb7d4` | feat: update user management and readme | Unplanned | `AddUser.tsx`, `UsersList.tsx`, `usersService.ts`, README overhaul |
| `1f208ed` | chore: update readme | Unplanned | README updates |
| `02be4db` | fix: minor fix | Unplanned | Bug fix in `UsersList.tsx` + `usersService.ts` |
| `2569600` | fix: student admission date | F1 | `AddStudent.tsx` (UAC), MBCS/MEC date defaults |
| `0d85d2f` | Fix: not available month | F2 | N/A logic in 6 history/status files |
| `4ef7443` | feat: decentralised expense | F5 | 3 backend controllers, `OrgAddExpense`, `OrgExpensesList`, sidebar, routes |
| `13b03fd` | Feat: separate invoice template | F4 | 7 new invoice components, `types.ts`, `printHelper.ts`, 5 updated invoice pages |
| `3f34172` | Fix: Invoice | F3 + Bug Fixes | Multi-payment DTOs+services+controllers (×3 orgs), redesigned RecordPayment (×3), InvoiceByNumber (×3), PaymentsList grouping (×3), encodeURIComponent fixes, `message` deprecation fixes |

---

## 12. Architecture Decisions Made

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Multi-payment DB approach | Option B (array in one API call, `$transaction`) | No schema changes; maintains analytics compatibility |
| Expense backend routing | Separate per-org controllers in shared module | Cleaner separation; auto-injects `organization`; no role confusion |
| Expense frontend components | Shared `OrgAddExpense` / `OrgExpensesList` + thin wrappers | Avoids 3× code duplication while keeping routes separate |
| Expense service | Modified existing `expensesService.ts` with `org` param | Simpler than 3 separate service files |
| Invoice number separator | Dash `-` instead of slash `/` | Slashes break URL routing in React Router |
| Invoice list grouping | Frontend `useMemo` grouping | No backend changes needed; keeps analytics queries intact |
| InvoiceByNumber URL encoding | `encodeURIComponent` on navigate + `decodeURIComponent` on read | Handles both old `/`-format and new `-`-format invoice numbers transparently |

---

## 13. Lessons Learned

1. **URL-safe identifiers matter from day one.** The invoice number format `ORG/YEAR/NNNN` seemed readable but broke URL routing immediately. Using `-` as separator from the start would have saved debugging time. Lesson: any value that will appear in a URL path should use URL-safe characters.

2. **Flat API responses require frontend aggregation planning.** The backend returns one row per payment. When one logical "invoice" can have multiple rows, the frontend must decide where to aggregate. Frontend `useMemo` grouping was the right call to avoid backend changes, but this should be documented as a "contract" between frontend and backend teams.

3. **Ant Design deprecation warnings compound.** Multiple deprecated props (`valueStyle`, `message` static, `Alert message=`) existed across 15+ files. Fixing them individually after the fact is tedious. Running an Ant Design upgrade migration tool at the start of a branch would have caught these earlier.

4. **`useMemo` dependency arrays must be stable.** Deriving a new array from API data *outside* the `useMemo` callback and listing it as a dependency creates a dependency that changes every render (since `[] !== []`). Always reach for `data` (the raw query result) as the dependency, not a derived value.

5. **Full file rewrites in an AI coding session can leave stale code appended.** When replacing a file's import section alone, old component code may remain at the bottom, creating duplicate `export default` errors. Safer approach: match from the last substantial block of old code to ensure complete replacement.

---

*Document created: February 23, 2026*  
*Branch: `v0.5-feature-refactor`*  
*Total files modified/created in branch: ~45*
