# Utsho Accounting System — v1.1 Refactoring Checklist

**Created:** February 22, 2026  
**Purpose:** Comprehensive task checklist for 5 refactoring features. Designed so an agent with zero context can read this file and continue implementation.  
**Branch:** `v0.5-feature-refactor`

---

## Context Summary (Read This First)

### System Architecture
- **Backend:** NestJS + Prisma ORM + PostgreSQL
- **Frontend:** React 18 + Vite + Ant Design + TanStack Query + Zustand
- **3 Organizations:** UAC (coaching), MBCS (kindergarten), MEC (English tutoring)
- **Each org** has its own Prisma models: `UacStudent`, `MbcsStudent`, `MecStudent`, etc.
- **Each org** has its own backend modules: `src/uac/`, `src/mbcs/`, `src/mec/`
- **Each org** has its own frontend pages: `src/pages/uac/`, `src/pages/mbcs/`, `src/pages/mec/`
- **Shared:** `InvoiceTemplate.tsx` (single component), `InvoiceService` (backend), `Expense` model (centralized)

### Key File Locations
| What | Backend | Frontend |
|------|---------|----------|
| UAC Students CRUD | `src/uac/students/` (service, controller, DTOs) | `src/pages/uac/students/AddStudent.tsx`, `StudentsList.tsx` |
| UAC Payments | `src/uac/payments/` (service, controller, DTOs) | `src/pages/uac/payments/RecordPayment.tsx`, `PaymentInvoice.tsx` |
| UAC Student Payment History | (uses payments service `getAll({studentId})`) | `src/pages/uac/students/StudentPaymentHistory.tsx` |
| UAC Payment History (global) | (uses payments service) | `src/pages/uac/payments/UacPaymentHistory.tsx` |
| UAC Payroll Invoice | — | `src/pages/uac/payroll/PayrollInvoice.tsx` |
| MBCS Students CRUD | `src/mbcs/students/` | `src/pages/mbcs/students/AddMbcsStudent.tsx` |
| MBCS Payments | `src/mbcs/payments/` | `src/pages/mbcs/payments/MbcsRecordPayment.tsx`, `MbcsPaymentInvoice.tsx` |
| MBCS Payroll Invoice | — | `src/pages/mbcs/payroll/MbcsPayrollInvoice.tsx` |
| MEC Students CRUD | `src/mec/students/` | `src/pages/mec/students/AddMecStudent.tsx` |
| MEC Payments | `src/mec/payments/` | `src/pages/mec/payments/MecRecordPayment.tsx`, `MecPaymentInvoice.tsx` |
| Expenses | `src/expenses/` (single module, centralized table) | `src/pages/expenses/AddExpense.tsx`, `ExpensesList.tsx` |
| Analytics | `src/analytics/` (queries all 3 orgs + Expense table) | `src/pages/DashboardPage.tsx` |
| Invoice Template | `src/common/services/invoice.service.ts` (numbering) | `src/components/InvoiceTemplate.tsx` (single shared component) |
| Prisma Schema | `prisma/schema.prisma` | — |
| App Routes | — | `src/App.tsx` |
| Sidebar Nav | — | `src/layouts/DashboardLayout.tsx` |
| Services | — | `src/services/*.ts` (one per entity per org) |

### Current DB Schema Highlights
- `UacStudent` has `admissionDate DateTime?` field already in schema — but UAC `AddStudent.tsx` does NOT render it (MBCS and MEC do)
- `Expense` is a **single shared table** with `organization` field (`'uac'|'mbcs'|'mec'`)
- Each payment table stores **one payment per row** — no line items concept
- `UacPayment` has: `studentId`, `paymentType` (enum string), `amount`, `paymentMonth`, `paymentDate`, `paymentMethod`, `invoiceNumber`, `notes`
- `InvoiceCounter` is a single shared table with `year` → `sequence` counter

### Current Payment Recording Flow
1. Frontend `RecordPayment.tsx`: cascading filters (class→group→student), then fill: paymentType, amount, paymentMethod, paymentMonth, paymentDate, notes
2. Backend: verifies student exists → generates invoice number → creates single `UacPayment` row → returns payment with student include
3. Each payment type is a **separate row**. No concept of "line items" in one payment.

### Current Invoice Template
- Single `InvoiceTemplate.tsx` component with `organization` prop (`"uac"|"mbcs"|"mec"`) and `type` prop (`"payment"|"payroll"`)
- Uses an `orgConfig` object for name/color differences
- Same visual layout for all orgs and all entity types (students, teachers, staff)
- Called from: `PaymentInvoice.tsx` (UAC), `MbcsPaymentInvoice.tsx` (MBCS), `MecPaymentInvoice.tsx` (MEC), `PayrollInvoice.tsx` (UAC), `MbcsPayrollInvoice.tsx` (MBCS)

### Current Expense Flow
- Centralized route: `/expenses` (global, not under any org)
- Sidebar: single "Expenses" menu item visible to all roles
- Frontend form has NO organization field (despite DTO requiring it) — the `AddExpense.tsx` form fields are: expenseType (free text), amount, paymentMethod, date, description
- Backend `CreateExpenseDto` expects an `organization` enum field
- Analytics `getExpensesTotal()` queries `prisma.expense.aggregate({where: {organization: org}})` — already org-filtered

### Current Student Payment History Grid
- `StudentPaymentHistory.tsx`: renders 12-month grid (Jan–Dec of current year)
- Binary logic: `isPaid` (green "Paid") or not (red "Unpaid")
- No awareness of student's admission date — shows "Unpaid" even for months before student enrolled

---

## Feature 1: Admission Date Field in Student Forms

### Current State
- **Schema:** `admissionDate DateTime?` already exists on `UacStudent`, `MbcsStudent`, `MecStudent`
- **Backend DTOs:** `CreateStudentDto` (UAC) already has `admissionDate?: string` as `@IsOptional() @IsDateString()`
- **Frontend:**
  - UAC `AddStudent.tsx` — **MISSING** admission date field entirely, does NOT include it in the form (unlike MBCS/MEC which already have it)
  - MBCS `AddMbcsStudent.tsx` — already has `admissionDate` field with DatePicker + handles edit mode
  - MEC `AddMecStudent.tsx` — already has `admissionDate` field with DatePicker + handles edit mode
  - UAC also does NOT set `admissionDate` in `onFinish` or `setFieldsValue` in edit mode

### Tasks

- [x] **1.1** — UAC `AddStudent.tsx` (`frontend/src/pages/uac/students/AddStudent.tsx`):
  - Add `admissionDate` field in "Contact & Fee Information" card, alongside `monthlyTuitionFee`
  - Use `<DatePicker>` with `format="DD/MM/YYYY"`
  - Set default `initialValue` to `dayjs()` (today's date)
  - In `onFinish`, add `admissionDate: values.admissionDate?.format("YYYY-MM-DD")` to the data object
  - In edit mode `useEffect`, add `admissionDate: student.admissionDate ? dayjs(student.admissionDate) : undefined` to `setFieldsValue`

- [x] **1.2** — MBCS `AddMbcsStudent.tsx` (`frontend/src/pages/mbcs/students/AddMbcsStudent.tsx`):
  - Verify existing `admissionDate` field is present (it is)
  - Add default value to `dayjs()` (today) if not already defaulted — currently it has NO default, user must manually pick

- [x] **1.3** — MEC `AddMecStudent.tsx` (`frontend/src/pages/mec/students/AddMecStudent.tsx`):
  - Same as 1.2 — add default value `dayjs()` for the admission date field

- [x] **1.4** — Backend UAC `CreateStudentDto` (`backend/src/uac/students/dto/create-student.dto.ts`):
  - Verify `admissionDate` is already optional and accepted (it is per schema)
  - No changes needed if DTO already has it

- [x] **1.5** — Backend UAC Students Service (`backend/src/uac/students/students.service.ts`):
  - Verify `create()` and `update()` handle `admissionDate` conversion to `Date` (check if it does — MBCS service does this with `new Date(dto.admissionDate)`)

- [x] **1.6** — Verify that existing students without `admissionDate` populate gracefully (field should be optional, `null` in DB is fine)

---

## Feature 2: "Not Available" Status for Pre-Admission Months

### Current State
- `StudentPaymentHistory.tsx` (UAC): 12-month grid shows "Paid" (green) or "Unpaid" (red) for every month of current year
- No awareness of when the student was admitted
- Student object returned from API includes `admissionDate` field (if set)
- Same issue exists in MBCS `MbcsStudentPaymentHistory.tsx` and MEC `MecStudentPaymentHistory.tsx`
- Also exists in `UacPaymentHistory.tsx` global tuition status tab (month filter cross-references all students)

### Tasks

- [x] **2.1** — UAC `StudentPaymentHistory.tsx` (`frontend/src/pages/uac/students/StudentPaymentHistory.tsx`):
  - Read `student.admissionDate` from the student data
  - In the monthly grid loop, for each month: compare `monthKey` (e.g., `2026-01`) against admission month
  - If the month is **before** the admission month → show "N/A" tag in **grey** color (not red, not green)
  - Style: grey background `#f5f5f5`, grey border `#d9d9d9`, grey tag color `default` or custom grey
  - If admission date is null/undefined, fall back to current behavior (or treat all months as available)
  - Current rendering code location: `MONTHS.map((month, idx) => { ... isPaid ? "Paid" : "Unpaid" ... })` — add a third state

- [x] **2.2** — MBCS `MbcsStudentPaymentHistory.tsx` (`frontend/src/pages/mbcs/students/MbcsStudentPaymentHistory.tsx`):
  - Apply same logic as 2.1

- [x] **2.3** — MEC `MecStudentPaymentHistory.tsx` (`frontend/src/pages/mec/students/MecStudentPaymentHistory.tsx`):
  - Apply same logic as 2.1

- [x] **2.4** — UAC `UacPaymentHistory.tsx` tuition status tab (`frontend/src/pages/uac/payments/UacPaymentHistory.tsx`):
  - The global tuition status tab shows per-student paid/unpaid for a selected month
  - When the selected month is before a student's admission date, that student's status should show "N/A" instead of "Unpaid"
  - Modify the `tuitionStatusRows` computed logic: add `isAvailable` flag based on `student.admissionDate` vs `filters.paymentMonth`
  - Update the `statusColumns` rendering to show grey "N/A" tag when not available

- [x] **2.5** — MBCS `MbcsPaymentHistory.tsx` (`frontend/src/pages/mbcs/payments/MbcsPaymentHistory.tsx`):
  - Apply same logic as 2.4 (if it has a tuition status tab)

- [x] **2.6** — MEC `MecPaymentHistory.tsx` (`frontend/src/pages/mec/payments/MecPaymentHistory.tsx`):
  - Apply same logic as 2.4 (if applicable)

- [x] **2.7** — Analytics Impact — Outstanding Payments (`backend/src/analytics/analytics.service.ts`):
  - `getOrgOutstandingPayments()` currently calculates `unpaidMonths` from admission date or last payment
  - Verify that months before admission are NOT counted as "unpaid" — the current logic already uses `admissionDate` as the start point, so this may just need verification
  - If the calculation counts months from `createdAt` instead of `admissionDate`, fix it to use `admissionDate` when available

- [x] **2.8** — Analytics Revenue Impact:
  - When computing expected revenue in analytics, months before a student's admission should not be considered "outstanding"
  - Verify `getOutstandingPayments()` in analytics service respects admission dates correctly
  - This already appears to use admission date as the start point — verify and fix if needed

---

## Feature 3: Record Payment Form — Line Items Redesign

### Current State
- `RecordPayment.tsx` (UAC): single payment per submission with fields: paymentType, amount, paymentMethod, paymentMonth, paymentDate, notes
- Backend: `POST /uac/payments` creates **one** `UacPayment` row per request
- Each payment type gets its own row in the database (e.g., tuition + exam = 2 separate `UacPayment` rows)
- When `paymentType === 'tuition'`, amount auto-fills from `student.monthlyTuitionFee`

### New Design
- **Payment receiving details** (top section): select payment method + select payment receiving date (default today)
- **Line items section**: dynamic rows with "Add Row" button
  - Each line item: select payment type + amount
  - If payment type is `tuition`, show an additional **payment month** field and auto-fill amount from student's `monthlyTuitionFee`
  - Multiple line items can be added (e.g., tuition + exam + materials in one go)
- **Backend must create MULTIPLE payment rows** from one form submission (one per line item), all sharing same `paymentDate`, `paymentMethod`, and `invoiceNumber`

### Architecture Decision
**Option A:** Keep current single-row-per-payment DB schema. Frontend sends multiple API calls (one per line item). All share same `paymentDate` and `paymentMethod` but get separate `invoiceNumber`s.  
**Option B:** Keep current schema. Backend accepts array of line items in one API call, creates multiple rows in a `$transaction`, all sharing one `invoiceNumber`.  
**Option C:** New schema with `PaymentGroup` parent + `PaymentLineItem` children. Invoice ties to the group.

**Recommended: Option B** — minimal schema change, maintains current analytics queries, allows grouped invoice display.

### Tasks

- [x] **3.1** — Backend: New DTO for multi-line payment (`backend/src/uac/payments/dto/create-payment.dto.ts`):
  - Create `CreateMultiPaymentDto` or modify existing:
    ```
    studentId: string (UUID)
    paymentMethod: string (enum)
    paymentDate: string (DateString)
    notes?: string
    lineItems: Array<{
      paymentType: string (enum)
      amount: number
      paymentMonth: string (DateString) — required when paymentType is 'tuition'
    }>
    ```
  - Validate: at least 1 line item, each line item has required fields
  - `paymentMonth` on each line item should be required only when `paymentType === 'tuition'`; for non-tuition types, default to current month or the selected date's month

- [x] **3.2** — Backend: UAC Payments Service (`backend/src/uac/payments/payments.service.ts`):
  - Add new method (or modify existing `create`) to handle multi-line payments
  - Generate a single `invoiceNumber` via `invoiceService.generateInvoiceNumber('uac')`
  - Create all line items in a `$transaction`, each as a separate `UacPayment` row with the **same** `invoiceNumber`, `paymentDate`, `paymentMethod`
  - Each line item gets its own `paymentType`, `amount`, and `paymentMonth`
  - Return all created payments together

- [x] **3.3** — Backend: UAC Payments Controller (`backend/src/uac/payments/payments.controller.ts`):
  - Add new endpoint `POST /uac/payments/multi` or replace existing endpoint behavior
  - If replacing, ensure backward compatibility or update all callers

- [x] **3.4** — MBCS: Apply same backend changes to `backend/src/mbcs/payments/`:
  - Same DTO structure (MBCS payment types include `stationary`)
  - Same service logic with `prisma.mbcsPayment.create`
  - Same controller endpoint

- [x] **3.5** — MEC: Apply same backend changes to `backend/src/mec/payments/`:
  - MEC has NO `paymentType` field — only tuition payments
  - Either: make MEC line items always `tuition` type, or keep MEC simple (single item). **Decision needed.**
  - If multi-line: each line item still just needs `amount` and `paymentMonth`

- [x] **3.6** — Frontend: UAC `RecordPayment.tsx` (`frontend/src/pages/uac/payments/RecordPayment.tsx`) — Full redesign:
  - **Payment Details card (top):**
    - Payment Method (Select: cash/bkash/nagad/bank_transfer)
    - Payment Receiving Date (DatePicker, default `dayjs()`)
  - **Line Items card:**
    - Dynamic list using Ant Design `Form.List` with name `"lineItems"`
    - Each row: Payment Type (Select) + Amount (InputNumber) + conditional Payment Month (MonthPicker, shown only when paymentType is `tuition`)
    - "Add Row" button at bottom using `<Button onClick={() => add()}>Add Row</Button>`
    - "Remove" button on each row (except if only 1 row)
    - When paymentType changes to `tuition` on any row: auto-fill that row's amount with `selectedStudent.monthlyTuitionFee`
  - **Notes field** stays at the bottom
  - **Submit:** collect all line items + shared fields, POST to new multi endpoint

- [x] **3.7** — Frontend: MBCS `MbcsRecordPayment.tsx` (`frontend/src/pages/mbcs/payments/MbcsRecordPayment.tsx`):
  - Apply same redesign as 3.6, with MBCS payment types (includes `stationary`)

- [x] **3.8** — Frontend: MEC `MecRecordPayment.tsx` (`frontend/src/pages/mec/payments/MecRecordPayment.tsx`):
  - Apply same redesign (or simplified version since MEC is tuition-only)

- [x] **3.9** — Invoice Template Update for Multi-Line Payments (`frontend/src/components/InvoiceTemplate.tsx`):
  - Currently shows a single payment type + single amount
  - Need to display multiple line items in invoice when payments share the same `invoiceNumber`
  - Add a `lineItems` array to `InvoiceData` interface (optional, for multi-payment display)
  - Render as a table: Payment Type | Month | Amount, with total at bottom

- [x] **3.10** — Frontend Invoice Pages — Update to fetch grouped payments by invoice number:
  - `PaymentInvoice.tsx` (UAC), `MbcsPaymentInvoice.tsx`, `MecPaymentInvoice.tsx`
  - When viewing an invoice, fetch ALL payments with the same `invoiceNumber` (not just the single payment)
  - Pass them as `lineItems` to the updated `InvoiceTemplate`

- [x] **3.11** — Backend: Add endpoint to fetch payments by invoice number (if not existing):
  - `GET /uac/payments/invoice/:invoiceNumber` → returns array of payments with that invoice number
  - Same for MBCS and MEC

- [x] **3.12** — Frontend Service Updates:
  - `paymentsService.ts`: add `createMulti(data)` method calling new endpoint
  - `paymentsService.ts`: add `getByInvoice(invoiceNumber)` method
  - Same for `mbcsPaymentsService.ts` and `mecPaymentsService.ts`

- [x] **3.13** — Verify analytics are not broken:
  - `getStudentPaymentsTotal()` sums `amount` across all payments — unaffected (still individual rows)
  - Student payment history page shows individual payment rows — still works
  - Outstanding calculation — verify multi-line tuition payments don't create false "paid" signals

---

## Feature 4: Separate Invoice Templates per Organization per Entity

### Current State
- `InvoiceTemplate.tsx` — single shared component, takes `organization` and `type` props
- `orgConfig` object provides: name, shortName, address, phone, color
- Same HTML structure for all: UAC student payment, MBCS student payment, MEC student payment, UAC payroll, MBCS payroll
- Invoice pages: `PaymentInvoice.tsx` (UAC student payments), `PayrollInvoice.tsx` (UAC teacher/staff payroll), `MbcsPaymentInvoice.tsx`, `MbcsPayrollInvoice.tsx`, `MecPaymentInvoice.tsx`

### New Design
- Each org × entity combination gets its own invoice template **file**
- Templates may share a base structure but are **separate files** for independent customization
- Entity types per org:
  - **UAC:** student payment, teacher payroll, staff payroll
  - **MBCS:** student payment, teacher payroll, staff payroll
  - **MEC:** student payment only (no teachers/staff)
- Total: **7 invoice template files** (3 student + 2 teacher + 2 staff)
- Each template can be visually different (different layout, branding, fields displayed)

### Tasks

- [x] **4.1** — Create folder: `frontend/src/components/invoices/`

- [x] **4.2** — Create individual template files (initial structure same as current, will diverge later):
  - `UacStudentInvoice.tsx` — for UAC student payments
  - `UacTeacherPayrollInvoice.tsx` — for UAC teacher payroll
  - `UacStaffPayrollInvoice.tsx` — for UAC staff payroll
  - `MbcsStudentInvoice.tsx` — for MBCS student payments
  - `MbcsTeacherPayrollInvoice.tsx` — for MBCS teacher payroll
  - `MbcsStaffPayrollInvoice.tsx` — for MBCS staff payroll
  - `MecStudentInvoice.tsx` — for MEC student payments

- [x] **4.3** — Each template should:
  - Use `forwardRef` (for print support)
  - Accept entity-specific `InvoiceData` interface (student invoice has student fields, payroll has teacher/staff fields)
  - Have hardcoded org branding (name, color, address) instead of `orgConfig` lookup
  - Handle line items display (from Feature 3)
  - For now, keep same visual structure but in separate files

- [x] **4.4** — Create shared types file: `frontend/src/components/invoices/types.ts`
  - `StudentPaymentInvoiceData` — invoiceNumber, student details, lineItems array, paymentDate, paymentMethod, notes
  - `TeacherPayrollInvoiceData` — invoiceNumber, teacher details, amount, paymentMonth, lectures, paymentDate, paymentMethod
  - `StaffPayrollInvoiceData` — invoiceNumber, staff details, amount, paymentMonth, paymentDate, paymentMethod

- [x] **4.5** — Update UAC `PaymentInvoice.tsx` (`frontend/src/pages/uac/payments/PaymentInvoice.tsx`):
  - Import `UacStudentInvoice` instead of generic `InvoiceTemplate`
  - Remove `organization="uac"` and `type="payment"` props (hardcoded in template now)

- [x] **4.6** — Update UAC `PayrollInvoice.tsx` (`frontend/src/pages/uac/payroll/PayrollInvoice.tsx`):
  - Use `UacTeacherPayrollInvoice` or `UacStaffPayrollInvoice` based on `payroll.payableType`
  - Conditionally render the correct template based on `teacher` vs `staff`

- [x] **4.7** — Update MBCS `MbcsPaymentInvoice.tsx` — use `MbcsStudentInvoice`

- [x] **4.8** — Update MBCS `MbcsPayrollInvoice.tsx` — use `MbcsTeacherPayrollInvoice` or `MbcsStaffPayrollInvoice`

- [x] **4.9** — Update MEC `MecPaymentInvoice.tsx` — use `MecStudentInvoice`

- [x] **4.10** — Keep old `InvoiceTemplate.tsx` as deprecated/backup until migration is complete, then remove

- [x] **4.11** — Add unique visual elements per template (examples):
  - UAC: Blue (#667eea) theme, "Utsho Coaching" header, show class/group
  - MBCS: Purple (#7c3aed) theme, "Morning Bell Childhood School" header, show shift/branch
  - MEC: Green (#059669) theme, "M@hee's English Care" header, simplified layout
  - Teacher payroll: show subject specialization, lecture count (if applicable)
  - Staff payroll: show designation, simple fixed salary display

---

## Feature 5: Per-Organization Expenses (Decentralize)

### Current State
- **DB:** Single shared `Expense` table with `organization` field
- **Backend Routes:** `GET/POST/PATCH/DELETE /expenses` — no org scoping in URL
- **Backend Controller:** No `OrganizationGuard` — any accountant can see/create expenses for any org
- **Frontend Route:** `/expenses` (global, not under any org module)
- **Frontend Sidebar:** Single "Expenses" menu item at root level
- **Frontend Form (`AddExpense.tsx`):** Currently has NO organization field in the form! Despite backend DTO requiring it
- **Analytics:** `getExpensesTotal(org, start, end)` already queries by organization — but relies on `Expense.organization` field being correctly set

### New Design
- Expenses become per-organization: `/uac/expenses`, `/mbcs/expenses`, `/mec/expenses`
- Each accountant only sees their org's expenses
- Organization is determined by route (implicit), not by form dropdown
- Analytics already query by org — should work with minimal changes

### Tasks

#### 5A. Database & Backend

- [x] **5.1** — Database Schema (`prisma/schema.prisma`):
  - The `Expense` model already has `organization` field — **no schema change needed**
  - The single shared table design still works; we just need proper scoping at the API level

- [x] **5.2** — Backend: Consider splitting into per-org expense modules OR keep shared module with enforced org scoping:
  - **Recommended:** Keep shared `ExpensesModule` but add `OrganizationGuard` and enforce `organization` from route/guard
  - Alternative: Create `UacExpensesController`, `MbcsExpensesController`, `MecExpensesController` — more work but cleaner separation
  - **Decision: Create per-org endpoints** in the shared expenses module:
    - `GET /uac/expenses` → `findAll({organization: 'uac'})`
    - `POST /uac/expenses` → auto-set `organization: 'uac'`
    - Same for `/mbcs/expenses` and `/mec/expenses`
    - OR use a param: `GET /expenses?organization=uac` with enforced role scoping

- [x] **5.3** — Backend: Update `ExpensesController` (`backend/src/expenses/expenses.controller.ts`):
  - Option A: Add separate route groups with org prefix (`/uac/expenses`, `/mbcs/expenses`, `/mec/expenses`)
  - Option B: Keep `/expenses` but add mandatory `organization` query param, enforced by role
  - **Recommended Option A** — create new controllers: `UacExpensesController`, `MbcsExpensesController`, `MecExpensesController` that delegate to shared `ExpensesService`
  - Each controller: `@UseGuards(AuthGuard, RolesGuard, OrganizationGuard)` with appropriate roles
  - Auto-inject `organization` value from controller context, user doesn't have to pick

- [x] **5.4** — Backend: Update `ExpensesService` (`backend/src/expenses/expenses.service.ts`):
  - `findAll` already accepts `organization` filter — no change needed
  - `create` already accepts `organization` in DTO — the controller should pass it automatically
  - Add a method variant that injects org if not coming from DTO

- [x] **5.5** — Backend: Remove old `/expenses` global routes (or keep for Super Admin/Director only):
  - Option: Super Admin and Director can still use `/expenses` to see all orgs
  - Accountants are routed to their org-specific endpoints only

- [x] **5.6** — Frontend: Update `AddExpense.tsx` (`frontend/src/pages/expenses/AddExpense.tsx`):
  - Remove the current global form
  - Create per-org add expense pages or use a shared component with org from route:
    - `src/pages/uac/expenses/AddUacExpense.tsx` (or use param)
    - `src/pages/mbcs/expenses/AddMbcsExpense.tsx`
    - `src/pages/mec/expenses/AddMecExpense.tsx`
  - Auto-set `organization` from route context (not user-selected dropdown)
  - Form fields remain: expenseType, amount, paymentMethod, date (paymentDate), expenseMonth, notes

- [x] **5.7** — Frontend: Update `ExpensesList.tsx` (`frontend/src/pages/expenses/ExpensesList.tsx`):
  - Split into per-org pages or use shared component with org from route
  - Each org's expense list only shows their expenses
  - Remove org dropdown filter (no longer needed since it's implicit)

- [x] **5.8** — Frontend: Create per-org expense page directories:
  - `src/pages/uac/expenses/` — `UacExpensesList.tsx`, `AddUacExpense.tsx`
  - `src/pages/mbcs/expenses/` — `MbcsExpensesList.tsx`, `AddMbcsExpense.tsx`
  - `src/pages/mec/expenses/` — `MecExpensesList.tsx`, `AddMecExpense.tsx`
  - OR: Use shared components with org prop from route

- [x] **5.9** — Frontend: Update routes in `App.tsx` (`frontend/src/App.tsx`):
  - Remove: `/expenses`, `/expenses/add`, `/expenses/edit/:id`
  - Add: `/uac/expenses`, `/uac/expenses/add`, `/uac/expenses/edit/:id`
  - Add: `/mbcs/expenses`, `/mbcs/expenses/add`, `/mbcs/expenses/edit/:id`
  - Add: `/mec/expenses`, `/mec/expenses/add`, `/mec/expenses/edit/:id`

- [x] **5.10** — Frontend: Update sidebar navigation (`frontend/src/layouts/DashboardLayout.tsx`):
  - Remove global "Expenses" menu item
  - Add "Expenses" as a child under each org module:
    - UAC Module → Expenses
    - MBCS Module → Expenses
    - MEC Module → Expenses
  - Update `allKeys` array for selected key detection

- [x] **5.11** — Frontend: Update/create per-org expense services:
  - Either: modify `expensesService.ts` to accept org prefix in URLs
  - Or: create `uacExpensesService.ts`, `mbcsExpensesService.ts`, `mecExpensesService.ts`
  - **Recommended:** modify existing `expensesService.ts` to take `organization` param in each method, building URL like `/uac/expenses`

- [x] **5.12** — Analytics Impact — Verify (`backend/src/analytics/analytics.service.ts`):
  - `getExpensesTotal(org, start, end)` already queries `prisma.expense.aggregate({where: {organization: org}})` — should still work
  - `getExpenseBreakdown()` uses `groupBy` with `organization` — still works
  - No changes needed to analytics backend IF the `Expense` table still has the `organization` field

- [x] **5.13** — Analytics Dashboard Impact (`frontend/src/pages/DashboardPage.tsx`):
  - Analytics already filters by org — should work without changes
  - Verify expense breakdown charts still render correctly per org
  - Verify net revenue (income − expenses) calculation per org still accurate

- [x] **5.14** — Update expense form fields:
  - Currently `AddExpense.tsx` has `expenseType` as free text — consider making it a Select with options: rent, electricity, water, internet, salary, other (matching backend DTO enum)
  - Add `expenseMonth` field (MonthPicker) — currently the form may not have this despite backend DTO expecting it
  - Ensure `paymentDate` maps correctly

- [x] **5.15** — Data migration consideration:
  - Existing expenses already have `organization` set — no data migration needed
  - If any expenses have NULL organization, backfill them

---

## Cross-Cutting Concerns

### Testing
- [ ] **6.1** — After all changes, verify `npm run build` passes for both backend and frontend (zero TypeScript errors)
- [ ] **6.2** — Verify existing E2E tests still pass (`backend/test/auth.e2e-spec.ts`)
- [ ] **6.3** — Manually test: create student with admission date, view payment history grid, verify "N/A" months
- [ ] **6.4** — Manually test: record multi-line payment, verify invoice shows all line items
- [ ] **6.5** — Manually test: create expense from each org's section, verify analytics
- [ ] **6.6** — Test each invoice template renders correctly for each org × entity

### Database Migration
- [ ] **7.1** — Run `npx prisma migrate dev` if schema changes are needed (Feature 3 Option C only)
- [ ] **7.2** — For existing students without `admissionDate`, ensure the system handles `null` gracefully everywhere

### Code Quality
- [ ] **8.1** — Run ESLint on all modified files
- [ ] **8.2** — Ensure no unused imports in modified files
- [ ] **8.3** — Update `IMPLEMENTATION_ANALYSIS.md` with new feature descriptions

---

## Implementation Order (Recommended)

1. **Feature 1** (Admission Date) — simplest, prerequisite for Feature 2
2. **Feature 2** (N/A months) — depends on Feature 1
3. **Feature 5** (Expense decentralization) — independent, can be done in parallel with 1+2
4. **Feature 4** (Invoice templates) — can start while 3 is in progress
5. **Feature 3** (Line items payment form) — most complex, touches the most files, depends on Feature 4 for invoice updates

---

## Summary of Files Modified per Feature

| Feature | Backend Files | Frontend Files | Schema |
|---------|---------------|----------------|--------|
| 1. Admission Date | Verify DTOs + service | UAC `AddStudent.tsx`, MBCS `AddMbcsStudent.tsx`, MEC `AddMecStudent.tsx` | No change |
| 2. N/A Months | Verify analytics service | `StudentPaymentHistory.tsx` (×3 orgs), `UacPaymentHistory.tsx`, `MbcsPaymentHistory.tsx`, `MecPaymentHistory.tsx` | No change |
| 3. Line Items | Payment DTOs + services + controllers (×3 orgs) | `RecordPayment.tsx` (×3 orgs), `InvoiceTemplate.tsx`, Invoice pages (×5), Payment services (×3) | No change (Option B) |
| 4. Invoice Templates | None | New: 7 template files, Update: 5 invoice pages, Remove: old template | No change |
| 5. Expenses | Expenses controller (new per-org routes), possibly new controllers | Expense pages (×3 orgs new), `App.tsx` routes, `DashboardLayout.tsx` sidebar, expense services | No change |

**Total estimated files to create/modify: ~35-40 files**

---

*Last Updated: February 22, 2026*  
*Status: Planning Complete — Ready for Implementation*
