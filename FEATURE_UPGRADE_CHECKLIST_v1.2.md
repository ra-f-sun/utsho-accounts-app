# Utsho Accounting System — v1.2 Feature Upgrade Checklist

**Created:** February 26, 2026  
**Purpose:** Comprehensive task checklist for 7 major new features requested for v1.2. Designed so an agent with zero context can read this file and implement every feature end-to-end.  
**Branch:** `v1.2-additional-feature`  
**Prerequisites:** All previous work is complete — Phases 1–6 (v0.1–v1.0), Feature Refactor (REFACTOR_CHECKLIST.md), and Fixes/Hardening (REFACTOR_CHECKLIST_2.md).

---

## Context Summary (Read This First)

### System Architecture
- **Backend:** NestJS 11 + Prisma 7 ORM + PostgreSQL
- **Frontend:** React 19 + Vite 7 + Ant Design 6 + TanStack Query 5 + Zustand 5
- **3 Organizations:** UAC (coaching, classes 8–12), MBCS (kindergarten, morning/day shifts), MEC (English tutoring, simplified)
- **Each org** has its own Prisma models: `UacStudent`, `MbcsStudent`, `MecStudent`, etc.
- **Each org** has its own backend modules: `src/uac/`, `src/mbcs/`, `src/mec/`
- **Each org** has its own frontend pages: `src/pages/uac/`, `src/pages/mbcs/`, `src/pages/mec/`
- **Shared backend:** `src/expenses/`, `src/analytics/`, `src/common/`
- **Shared frontend:** `src/components/invoices/` (7 per-org templates), `src/lib/axios.ts`

### Key File Locations

| What | Backend | Frontend |
|------|---------|----------|
| Prisma Schema | `prisma/schema.prisma` | — |
| UAC Students | `src/uac/students/` | `src/pages/uac/students/` |
| UAC Payments | `src/uac/payments/` | `src/pages/uac/payments/` |
| UAC Payroll | `src/uac/payroll/` | `src/pages/uac/payroll/` |
| UAC Teachers | `src/uac/teachers/` | `src/pages/uac/teachers/` |
| UAC Staff | `src/uac/staff/` (lives under payroll concept) | `src/pages/uac/staff/` |
| MBCS (all) | `src/mbcs/…` | `src/pages/mbcs/…` |
| MEC (all) | `src/mec/…` | `src/pages/mec/…` |
| Expenses | `src/expenses/` | `src/pages/*/expenses/` |
| Analytics | `src/analytics/` | `src/pages/DashboardPage.tsx` |
| Sidebar/Layout | — | `src/layouts/DashboardLayout.tsx` |
| Routes | — | `src/App.tsx` |
| Invoice Templates | — | `src/components/invoices/` |
| Invoice Service | `src/common/services/invoice.service.ts` | — |

### Current DB Schema Summary
- **Students** (per org): Name, class, group/shift, fees (`monthlyTuitionFee`, `admissionFee`), personal info, contact, `admissionDate`, `isActive`
- **Payments** (per org): `studentId`, `paymentType`, `amount`, `paymentMonth`, `paymentDate`, `paymentMethod`, `invoiceNumber`, `notes`, `isActive`
- **Payroll** (UAC, MBCS): `payableType` (teacher/staff), `payableId`, `amount`, `totalLectures`, `paymentMonth`, dates, `isActive`
- **Teachers** (UAC, MBCS): name, `paymentType` (fixed/lecture_based), `monthlySalary`, `perLectureRate`, `isActive`
- **Staff** (UAC, MBCS): name, designation, `monthlySalary`, `isActive`
- **Expenses**: shared table with `organization` field, `expenseType`, `amount`, `isActive`
- **InvoiceCounter**: per-org per-year counter (`@@id([year, organization])`)

### Current Payment Recording Flow
1. Frontend: cascading filters → select student → add line items (type + amount + optional month) → submit
2. Backend: receives `CreateMultiPaymentDto` with `lineItems[]` → creates one `*Payment` row per line item in a `$transaction` → all share same `invoiceNumber`
3. Payment types (UAC): tuition, admission, readmission, exam, sheet, session_charge, study_materials, study_tour, other
4. Payment types (MBCS): same + stationary
5. MEC: tuition only (no `paymentType` field)

### Current Payroll Flow
1. Select teacher/staff → select month → for lecture-based: "Calculate from Attendance" → amount auto-fills (BUT is NOT editable once calculated)
2. Backend creates one `*Payroll` row with duplicate-month guard

### User Roles

| Role | Constant | Access |
|------|----------|--------|
| Super Admin | `SUPER_ADMIN` | Everything + user management |
| Director | `DIRECTOR` | All 3 orgs (read/write) |
| UAC Accountant | `ACCOUNTANT_UAC` | UAC only |
| MBCS Accountant | `ACCOUNTANT_MBCS` | MBCS only |
| MEC Accountant | `ACCOUNTANT_MEC` | MEC only |

---

## Feature Overview (7 Major Features)

| # | Feature | Scope | DB Change | Complexity | Status |
|---|---------|-------|-----------|------------|--------|
| 1 | Settings Page (Module Configuration) | All 3 orgs | **YES** — new `OrgSettings` table | HIGH | ✅ Done |
| 2 | Configure MBCS: Tuition, Admission, ReAdmission, Study Materials, Discounts | MBCS (template for others) | **YES** — settings + student field changes | HIGH | ✅ Done |
| 3 | Configure UAC & MEC (same as MBCS) | UAC, MEC | **YES** — same pattern | MEDIUM | ✅ Done |
| 4 | "No Longer Associated" status for Teachers & Students | All orgs | **YES** — new field on models | MEDIUM | ✅ Done |
| 5 | Student Promotion (Class Upgrade) | All orgs | **YES** — triggers readmission logic | MEDIUM | ✅ Done |
| 6 | Dual Invoice System, Due Collection, Due Management & Payment Priority | All orgs | **YES** — new fields on payment/payroll + priority settings | VERY HIGH | ⬜ Not Started |
| 7 | Export & Import Students | All orgs | NO (data operations) | HIGH | ⬜ Not Started |

---

## Feature 1: Settings Page — Sidebar & Tab Structure

### What Is Needed
A new "Settings" menu item in the sidebar, accessible to `SUPER_ADMIN` and `DIRECTOR`. The settings page will have top-level tabs for each organization: [Configure UAC] [Configure MBCS] [Configure MEC]. More org tabs can be added later.

### Current State
- Sidebar has no "Settings" item
- Fix 28 from REFACTOR_CHECKLIST_2 noted that "Profile" and "Settings" dropdown items in the user menu were non-functional. This feature will implement a proper Settings page.
- The user dropdown "Settings" item currently exists but has no route or page

### Database Changes

**New model: `OrgSettings`** (single table, keyed by `organization` + `settingKey`)

```prisma
model OrgSettings {
  id           String   @id @default(uuid())
  organization String   // 'uac', 'mbcs', 'mec'
  settingKey   String   // e.g., 'tuition_default', 'tuition_override_play', 'admission_default', 'discount_tuition_options', 'study_materials'
  settingValue Json     // flexible JSON value (number, string, array, object)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([organization, settingKey])
  @@index([organization])
  @@map("org_settings")
}
```

**Why JSON `settingValue`?** Different settings need different shapes:
- Tuition default: `{ "value": 3500 }` (a number)
- Tuition override for class play: `{ "value": 2000 }` (a number)
- Discount options for tuition: `{ "values": [100, 200, 500, 1000] }` (array of numbers)
- Study materials: `{ "items": [{"name": "Notebook", "price": 50}, {"name": "Pen set", "price": 30}] }` (array of objects)

### Tasks

#### 1A. Backend — Settings Module

- [x] **1.1** — Add `OrgSettings` model to `prisma/schema.prisma` (schema above)
- [x] **1.2** — Run migration: `npx prisma migrate dev --name add_org_settings`
- [x] **1.3** — Create `backend/src/settings/` module:
  - `settings.module.ts` — imports `PrismaModule`
  - `settings.service.ts` — CRUD for settings by org + key
  - `settings.controller.ts` — REST endpoints
  - `dto/upsert-setting.dto.ts` — validation DTO

- [x] **1.4** — `SettingsService` methods:
  ```typescript
  // Get all settings for an org
  async getAll(organization: string): Promise<OrgSettings[]>

  // Get a specific setting
  async get(organization: string, key: string): Promise<OrgSettings | null>

  // Upsert a setting (create or update)
  async upsert(organization: string, key: string, value: any): Promise<OrgSettings>

  // Bulk upsert (for saving entire settings page at once)
  async bulkUpsert(organization: string, settings: Array<{key: string, value: any}>): Promise<void>

  // Delete a setting
  async delete(organization: string, key: string): Promise<void>
  ```

- [x] **1.5** — `SettingsController` endpoints:
  ```
  GET    /api/settings/:org          — Get all settings for org
  GET    /api/settings/:org/:key     — Get specific setting
  PUT    /api/settings/:org/:key     — Upsert a setting
  PUT    /api/settings/:org/bulk     — Bulk upsert settings
  DELETE /api/settings/:org/:key     — Delete a setting
  ```
  Guards: `AuthGuard('jwt')`, `RolesGuard` — `SUPER_ADMIN`, `DIRECTOR` only

- [x] **1.6** — Register `SettingsModule` in `AppModule`

#### 1B. Frontend — Settings Page Shell

- [x] **1.7** — Create `frontend/src/pages/settings/SettingsPage.tsx`:
  - Top-level Ant Design `Tabs` component with tabs: `Configure UAC`, `Configure MBCS`, `Configure MEC`
  - Each tab renders a child component (Feature 2/3 will populate content)
  - For now, show placeholder content in each tab

- [x] **1.8** — Create `frontend/src/services/settingsService.ts`:
  ```typescript
  // Uses apiGet, apiPatch from lib/axios.ts
  getAll(org: string): Promise<ApiResponse<OrgSettings[]>>
  get(org: string, key: string): Promise<ApiResponse<OrgSettings>>
  upsert(org: string, key: string, value: any): Promise<ApiResponse<OrgSettings>>
  bulkUpsert(org: string, settings: Array<{key: string, value: any}>): Promise<ApiResponse<void>>
  ```

- [x] **1.9** — Add route in `App.tsx`: `/settings` → `<SettingsPage />`
  - Wrap in `RoleProtectedRoute` with `['SUPER_ADMIN', 'DIRECTOR']`

- [x] **1.10** — Add "Settings" menu item to sidebar in `DashboardLayout.tsx`:
  - Place at the bottom of the sidebar menu, before user info area
  - Icon: `SettingOutlined` from `@ant-design/icons`
  - Only visible to `SUPER_ADMIN` and `DIRECTOR`

- [x] **1.11** — Update user dropdown "Settings" item to navigate to `/settings`

---

## Feature 2: Configure MBCS — Tuition, Admission, ReAdmission, Study Materials, Discounts

### What Is Needed
Inside the "Configure MBCS" tab, there will be sub-tabs:
1. **[Tuition]** — Default tuition fee + per-class overrides
2. **[Admission & ReAdmission]** — Default admission fee + per-class overrides; same for readmission
3. **[Study Materials]** — List of study materials with prices
4. **[Discount Options]** — Discount values for tuition, admission, readmission fees

### 2A. Tuition Tab

#### What Is Needed
- **Default tuition fee for all classes** — single input field
- **Default tuition fee overrides per class:**
  - Class Play (input)
  - Class Nursery (input)
  - Class KG (input)
  - …and so on for every class available for that module

**MBCS classes** (kindergarten): The MBCS class field is `Int` in the schema. Typical kindergarten classes may include: Play Group, Nursery, KG-1, KG-2, Class 1, Class 2, etc. Since `class` is an integer in the DB, we need a mapping.

> **AGENT NOTE:** MBCS `class` field is currently `Int` in the schema. The actual class names and their numeric mappings need to be defined. For kindergarten, a typical mapping would be:
> - 0 = Play Group
> - 1 = Nursery
> - 2 = KG
> - 3 = Class 1
> - 4 = Class 2
> - etc.
>
> **This mapping should be configurable in settings or defined as constants.** Currently the schema stores bare integers and the frontend may need a display-name map.

#### Settings Keys (stored in `OrgSettings`)
```
tuition_default           → { "value": 2000 }
tuition_override_0        → { "value": 1500 }     // Play Group
tuition_override_1        → { "value": 1800 }     // Nursery
tuition_override_2        → { "value": 2000 }     // KG
tuition_override_3        → { "value": 2200 }     // Class 1
...
```

#### Impact on Students
- When **adding a new student** and selecting a class, the `monthlyTuitionFee` field should **auto-fill** from the override for that class (if set), or from the default (if no override).
- The `monthlyTuitionFee` field on the **student form should become read-only** (not manually editable). The fee is controlled by settings.
- **Existing students:** When settings are saved/changed, a batch update should be applied to all active students of that org to reflect the new fees — OR — the fee should be looked up dynamically at payment time from settings, not stored on the student record.

> **DECISION (User Confirmed — Option C: Hybrid):**
>
> Keep `monthlyTuitionFee` on student. Auto-fill from settings when adding a new student. For existing students, provide a "Sync Fees from Settings" button on the settings page that batch-updates all students. Individual students can still have fee adjustments via **discount fields** (Feature 2D). This preserves current payment logic while adding settings control.
>
> Minimal disruption to existing code, maximum control. ✅

#### Tasks

- [x] **2.1** — Frontend: Create `frontend/src/pages/settings/mbcs/MbcsTuitionSettings.tsx`:
  - Input: "Default Tuition Fee for All Classes" (InputNumber, ৳)
  - Section: "Per-Class Tuition Fee Overrides"
    - For each MBCS class (Play Group through highest class): InputNumber with label
    - If empty/cleared, the default is used
  - Save button → calls `settingsService.bulkUpsert('mbcs', [...])`
  - Load existing settings on mount via `settingsService.getAll('mbcs')`

- [x] **2.2** — Backend: Ensure `SettingsService.bulkUpsert()` handles creating/updating multiple keys atomically (use `$transaction`)

- [x] **2.3** — Frontend: Update `AddMbcsStudent.tsx` student form:
  - When class is selected (or changed), fetch the tuition fee from settings:
    - First check for override: `settingsService.get('mbcs', 'tuition_override_{class}')`
    - If none, use default: `settingsService.get('mbcs', 'tuition_default')`
  - Auto-fill `monthlyTuitionFee` field with the value
  - Make `monthlyTuitionFee` field **read-only** (disabled, greyed out)
  - Show helper text: "Fee is set from Settings → Configure MBCS"

- [x] **2.4** — Frontend: Add discount fields to student form (see Feature 2D for details):
  - `discountTuition` — dropdown of discount values from settings
  - The effective tuition fee = default/override - selected discount

### 2B. Admission & ReAdmission Tab

#### What Is Needed
- **Default admission fee for all classes** — single input
- **Per-class admission fee overrides** — same structure as tuition
- **Default readmission fee for all classes** — single input
- **Per-class readmission fee overrides** — same structure as tuition

These will auto-fill the `admissionFee` field (and a new `readmissionFee` field) on the student form.

#### Settings Keys
```
admission_default          → { "value": 5000 }
admission_override_0       → { "value": 4000 }
admission_override_1       → { "value": 4500 }
...
readmission_default        → { "value": 3000 }
readmission_override_0     → { "value": 2500 }
...
```

#### Database Changes

- [x] **2.5** — Add `readmissionFee` field to student models in `prisma/schema.prisma`:
  ```prisma
  // Add to MbcsStudent, UacStudent, MecStudent:
  readmissionFee Float?
  ```

- [x] **2.6** — Run migration: `npx prisma migrate dev --name add_readmission_fee_field`

#### Tasks

- [x] **2.7** — Frontend: Create `frontend/src/pages/settings/mbcs/MbcsAdmissionSettings.tsx`:
  - Section: "Admission Fee"
    - Default admission fee (InputNumber, ৳)
    - Per-class admission fee overrides
  - Section: "Re-Admission Fee"
    - Default re-admission fee (InputNumber, ৳)
    - Per-class re-admission fee overrides
  - Save button → bulk upsert to settings

- [x] **2.8** — Frontend: Update `AddMbcsStudent.tsx`:
  - Auto-fill `admissionFee` from settings when class is selected (same logic as tuition)
  - Make `admissionFee` field **read-only**
  - Add new `readmissionFee` field (read-only, auto-filled from settings)
  - Show helper text: "Fees set from Settings → Configure MBCS"

- [x] **2.9** — Backend: Update MBCS `CreateStudentDto` and `UpdateStudentDto` to accept `readmissionFee` (optional Float)

### 2C. Study Materials Tab

#### What Is Needed
- A text area or input where the user enters study materials and their prices as line items
- Example:
  ```
  Notebook - ৳50
  Pen Set - ৳30
  Drawing Kit - ৳150
  ```
- These items will appear as a dropdown in the payment recording form when `paymentType === 'study_materials'` is selected

#### Settings Key
```
study_materials → { "items": [{"name": "Notebook", "price": 50}, {"name": "Pen Set", "price": 30}, {"name": "Drawing Kit", "price": 150}] }
```

#### Tasks

- [x] **2.10** — Frontend: Create `frontend/src/pages/settings/mbcs/MbcsStudyMaterialsSettings.tsx`:
  - UI: A dynamic list (Ant Design `Form.List` or similar) where each row has:
    - Material name (Input)
    - Price (InputNumber, ৳)
    - Remove button
  - "Add Material" button at bottom
  - Save button → upserts key `study_materials` for org `mbcs`

- [x] **2.11** — Frontend: Update `MbcsRecordPayment.tsx`:
  - When a line item's `paymentType` is changed to `study_materials`:
    - Show an additional dropdown: "Select Study Material"
    - Options populated from `settingsService.get('mbcs', 'study_materials')`
    - When a material is selected, auto-fill the line item's `amount` with the material's price
  - This is similar to how selecting `tuition` shows a month picker — now selecting `study_materials` shows a material picker

### 2D. Discount Options Tab

#### What Is Needed
- **Discount options for Tuition fee:** User enters discount values one by one (e.g., 100, 200, 500). These become dropdown options.
- **Discount options for Admission fee:** Same as above
- **Discount options for Re-Admission fee:** Same as above

These discounts will appear in dropdown fields on the student add/edit form:
- `discountTuition` — dropdown with discount values
- `discountAdmission` — dropdown with discount values  
- `discountReadmission` — dropdown with discount values

If no discount is selected, the full default/override fee applies. If a discount is selected, the effective fee = default/override - discount.

#### Settings Keys
```
discount_tuition_options       → { "values": [100, 200, 500, 1000] }
discount_admission_options     → { "values": [500, 1000, 2000] }
discount_readmission_options   → { "values": [300, 500, 1000] }
```

#### Database Changes

- [x] **2.12** — Add discount fields to student models in `prisma/schema.prisma`:
  ```prisma
  // Add to MbcsStudent, UacStudent, MecStudent:
  discountTuition      Float?  @default(0)
  discountAdmission    Float?  @default(0)
  discountReadmission  Float?  @default(0)
  ```

- [x] **2.13** — Run migration: `npx prisma migrate dev --name add_student_discount_fields`

#### Tasks

- [x] **2.14** — Frontend: Create `frontend/src/pages/settings/mbcs/MbcsDiscountSettings.tsx`:
  - Section: "Tuition Fee Discount Options"
    - Text area / tag-input where user types discount values, press Enter to add
    - Display as tag chips: `[100] [200] [500] [x]`
    - Delete individual values with `x`
  - Section: "Admission Fee Discount Options" — same
  - Section: "Re-Admission Fee Discount Options" — same
  - Save button → bulk upsert to settings

- [x] **2.15** — Frontend: Update `AddMbcsStudent.tsx` student form:
  - Add 3 dropdown fields:
    - "Discount on Tuition Fee" — options from `discount_tuition_options` setting, plus "No Discount" default
    - "Discount on Admission Fee" — options from `discount_admission_options` setting
    - "Discount on Re-Admission Fee" — options from `discount_readmission_options` setting
  - Display effective fee calculation:
    - `Effective Tuition = monthlyTuitionFee - discountTuition`
    - `Effective Admission = admissionFee - discountAdmission`
    - `Effective ReAdmission = readmissionFee - discountReadmission`
  - Store selected discount values on the student record

- [x] **2.16** — Backend: Update MBCS `CreateStudentDto` and `UpdateStudentDto`:
  - Add `discountTuition`, `discountAdmission`, `discountReadmission` (all optional Float, default 0)

- [x] **2.17** — Frontend: Update `MbcsRecordPayment.tsx`:
  - When recording tuition payment, auto-fill amount = `student.monthlyTuitionFee - student.discountTuition`
  - When recording admission payment, auto-fill amount = `student.admissionFee - student.discountAdmission`
  - When recording readmission payment, auto-fill amount = `student.readmissionFee - student.discountReadmission`

### 2E. Settings Page Assembly for MBCS

- [x] **2.18** — Frontend: Create `frontend/src/pages/settings/mbcs/MbcsSettings.tsx`:
  - Ant Design `Tabs` with sub-tabs:
    - `Tuition` → `<MbcsTuitionSettings />`
    - `Admission & ReAdmission` → `<MbcsAdmissionSettings />`
    - `Study Materials` → `<MbcsStudyMaterialsSettings />`
    - `Discount Options` → `<MbcsDiscountSettings />`
  - This component is rendered inside the "Configure MBCS" tab of the main Settings page

---

## Feature 3: Configure UAC & MEC (Same Pattern as MBCS)

### What Is Needed
Apply the **same configuration pattern** from Feature 2 to UAC and MEC.

### UAC-Specific Notes
- UAC classes: 8, 9, 10, 11, 12 (coaching center for higher secondary)
- UAC payment types already include `study_materials`
- UAC has the same teacher/staff structure as MBCS

### MEC-Specific Notes
- MEC has optional `class` and `group` — may not need per-class overrides if classes are optional
- MEC only has tuition payments — no admission/readmission payment types currently
- MEC has NO teachers/staff/payroll

> **DECISION (User Confirmed — Option B: Simplified MEC Settings):**
>
> MEC will have tuition defaults and discount settings only — no admission/readmission/study materials settings. This matches MEC's simplified nature (tuition-only payments, no teachers/staff/payroll). ✅

### Tasks

#### 3A. UAC Settings

- [x] **3.1** — Create `frontend/src/pages/settings/uac/UacTuitionSettings.tsx` (same pattern as MBCS, with classes 8–12)
- [x] **3.2** — Create `frontend/src/pages/settings/uac/UacAdmissionSettings.tsx`
- [x] **3.3** — Create `frontend/src/pages/settings/uac/UacStudyMaterialsSettings.tsx`
- [x] **3.4** — Create `frontend/src/pages/settings/uac/UacDiscountSettings.tsx`
- [x] **3.5** — Create `frontend/src/pages/settings/uac/UacSettings.tsx` (tab container)
- [x] **3.6** — Update `AddStudent.tsx` (UAC): auto-fill fees from settings, add discount dropdowns, make fee fields read-only
- [x] **3.7** — Update `RecordPayment.tsx` (UAC): study materials dropdown, discount-aware amount auto-fill

#### 3B. MEC Settings (per user's decision — default to Option B)

- [x] **3.8** — Create `frontend/src/pages/settings/mec/MecTuitionSettings.tsx`
- [x] **3.9** — Create `frontend/src/pages/settings/mec/MecDiscountSettings.tsx`
- [x] **3.10** — Create `frontend/src/pages/settings/mec/MecSettings.tsx` (tab container)
- [x] **3.11** — Update `AddMecStudent.tsx`: auto-fill tuition from settings, add tuition discount dropdown
- [x] **3.12** — Update `MecRecordPayment.tsx`: discount-aware tuition amount auto-fill

#### 3C. Backend DTOs for UAC & MEC

- [x] **3.13** — Update UAC `CreateStudentDto` and `UpdateStudentDto`: add `readmissionFee`, `discountTuition`, `discountAdmission`, `discountReadmission`
- [x] **3.14** — Update MEC `CreateStudentDto` and `UpdateStudentDto`: add `readmissionFee`, `discountTuition`, `discountAdmission`, `discountReadmission`

---

## Feature 4: "No Longer Associated" Status for Teachers & Students

### What Is Needed
For students and teachers who have left the organization, add a button to mark them as "No Longer Associated." This should:
1. Remove them from all active lists (students list, teachers list)
2. Exclude them from analytics (revenue calculations, outstanding payments, etc.)
3. Keep their historical data intact (payment history, payroll history, etc.)
4. Be reversible (soft action, not hard delete)

### Current State
- Both students and teachers already have `isActive Boolean @default(true)` field
- The existing soft-delete (via Delete button) already sets `isActive = false`
- However, "deleting" and "no longer associated" have different semantic meanings:
  - **Delete**: record was created by mistake, should be hidden
  - **No Longer Associated**: person left the organization, historical data should be kept but excluded from ongoing tracking

> **DECISION (User Confirmed — Option C: `associationEndDate` Field):**
>
> Add `associationEndDate DateTime?` to students, teachers, and staff. When set, the person is "no longer associated" as of that date. `isActive = false` remains for soft-delete. This gives both deletion AND disassociation as separate concepts. Allows filtering by date range (e.g., "who left in January?"), preserves deletion semantics, and is most informative. ✅

### Database Changes

- [x] **4.1** — Add `associationEndDate` to student and teacher models in `prisma/schema.prisma`:
  ```prisma
  // Add to UacStudent, MbcsStudent, MecStudent, UacTeacher, MbcsTeacher:
  associationEndDate DateTime?  // NULL = currently active; set = no longer associated
  ```
  Also add to staff models: `UacStaff`, `MbcsStaff`

- [x] **4.2** — Run migration: `npx prisma migrate dev --name add_association_end_date`

### Tasks

#### 4A. Backend

- [x] **4.3** — Update all `findAll()` service methods to filter out disassociated records:
  - Add `associationEndDate: null` (or `associationEndDate: { equals: null }`) to the `where` clause alongside `isActive: true`
  - Affected services: UAC/MBCS/MEC students, UAC/MBCS teachers, UAC/MBCS staff

- [x] **4.4** — Add new endpoint to mark as "no longer associated":
  ```
  PATCH /api/uac/students/:id/disassociate   → sets associationEndDate to today
  PATCH /api/uac/teachers/:id/disassociate   → sets associationEndDate to today
  PATCH /api/uac/staff/:id/disassociate      → sets associationEndDate to today
  ```
  Same for MBCS and MEC.

- [x] **4.5** — Add endpoint to re-associate (undo):
  ```
  PATCH /api/uac/students/:id/reassociate    → sets associationEndDate to null
  ```

- [x] **4.6** — Update analytics service to exclude disassociated students from outstanding payment calculations:
  - Add `associationEndDate: null` to all student queries in `analytics.service.ts`

- [x] **4.7** — Update DTOs to accept `associationEndDate`

#### 4B. Frontend

- [x] **4.8** — Add "Mark as No Longer Associated" button:
  - **Location:** Student update form OR student payment history page
  - When clicked: confirm dialog → call `PATCH /:org/students/:id/disassociate`
  - Show success message
  - Student should disappear from active lists after mutation invalidates queries

- [x] **4.9** — Add same button for teachers on their profile/edit page or payroll history page

- [x] **4.10** — Add same button for staff

- [ ] **4.11** — Optional: Add a filter toggle "Show Inactive / Disassociated" on list pages:
  - Default: only show active & associated
  - Toggle: show all including disassociated (with visual indicator like a grey row or "Inactive" tag)
  - Add query param `?includeDisassociated=true` sent to backend

- [ ] **4.12** — Update backend `findAll` to support the `includeDisassociated` filter

---

## Feature 5: Student Promotion (Class Upgrade)

### What Is Needed
A mechanism to promote students to the next class level. When promoted:
- Student's `class` field is updated (e.g., from 8 to 9)
- For MBCS: if the new class requires a different fees setup, the tuition/admission fees are updated from settings
- A readmission fee may become applicable (promotion = re-enrollment in new class)
- Historical data (payments for old class) should be preserved

> **DECISION (User Confirmed — Option C: Both Individual + Bulk Promotion):**
>
> Both options will be implemented:
> - **Bulk promotion page** (accessible from sidebar or settings) for end-of-year mass promotion
> - **Individual "Promote" button** on student profile for one-off cases
>
> **Additional details:**
> - **Promotion history** tracked via `PromotionLog` table for audit
> - **UAC classes:** 8→9 (no group required → group required), 9→10, 10→11, 11→12, 12→graduated
> - **MBCS classes:** Play→Nursery→KG→Class1→Class2→...
> - **MEC:** Optional class, promotion may not apply ✅

### Database Changes

- [x] **5.1** — Add `PromotionLog` model to `prisma/schema.prisma`:
  ```prisma
  model PromotionLog {
    id             String   @id @default(uuid())
    organization   String   // 'uac', 'mbcs', 'mec'
    studentId      String
    fromClass      Int
    toClass        Int
    promotedAt     DateTime @default(now())
    promotedBy     String   // user ID who performed the promotion
    notes          String?

    @@index([organization, studentId])
    @@index([promotedAt])
    @@map("promotion_logs")
  }
  ```

- [x] **5.2** — Run migration: `npx prisma migrate dev --name add_promotion_log`

### Tasks

#### 5A. Backend

- [x] **5.3** — Add promotion endpoint to each org's student controller:
  ```
  POST /api/uac/students/:id/promote
  Body: { toClass: number, notes?: string }
  ```
  Logic:
  1. Validate student exists and is active
  2. Validate `toClass` is valid for the org
  3. Create `PromotionLog` record
  4. Update student's `class` field
  5. Look up new tuition fee from settings (override for new class or default)
  6. Update student's `monthlyTuitionFee`
  7. Look up readmission fee from settings
  8. Update student's `readmissionFee`
  9. Return updated student

- [x] **5.4** — Add bulk promotion endpoint:
  ```
  POST /api/uac/students/promote-bulk
  Body: { fromClass: number, toClass: number, notes?: string }
  ```
  Logic: same as individual but for all active students in `fromClass`

- [x] **5.5** — Same endpoints for MBCS and MEC

#### 5B. Frontend

- [x] **5.6** — Add "Promote" button on student edit/detail page:
  - Opens a modal: "Promote [Student Name] from Class [current] to Class [next]"
  - Dropdown to select target class (default: current + 1)
  - Optional notes field
  - Submit → call promotion API → refresh student data

- [x] **5.7** — Create bulk promotion page: `frontend/src/pages/uac/students/PromoteStudents.tsx`:
  - Select: "From Class" → "To Class"
  - Preview: table of all students in the source class
  - Checkbox for individual inclusion/exclusion
  - "Promote All" button → calls bulk promotion API
  - Show success/failure summary

- [x] **5.8** — Add route for bulk promotion page and sidebar link

- [x] **5.9** — Same for MBCS students, and MEC if applicable

---

## Feature 6: Dual Invoice System, Due Management & Payment Priority

### What Is Needed

A comprehensive overhaul of the payment recording system with three major additions:

1. **Dual Invoice System** — Every payment generates two invoice perspectives:
   - **Guardian Copy** (existing invoice) — shows full/undiscounted amounts so guardians never see each other's discount differences
   - **Office Copy** (new) — shows real/discounted amounts reflecting actual finances
2. **Due Management** — Track partial payments with a priority-based allocation system
3. **Payment Priority Settings** — Configurable priority order for due allocation across payment types

### Why Dual Invoices?

**Problem:** Settings allow per-student discounts (tuition, admission, readmission). If a guardian sees another guardian's invoice with a lower amount, it creates uncomfortable "why is their fee different?" conversations.

**Solution:** The guardian's invoice always shows the **full** (pre-discount) amounts. The office copy shows the **actual** (post-discount) amounts. Only the office copy feeds into analytics, due tracking, and financial reports.

**Scope:** This dual-amount mechanism applies **only** to fee types that can be discounted from settings:
- ✅ Tuition fee
- ✅ Admission fee
- ✅ Readmission fee

All other payment types (exam, sheet, session_charge, study_materials, study_tour, stationary, other) show the **same amount** on both copies.

---

### 6A. Dual Invoice — How It Works (Detailed)

#### Core Concept

Each student has settings-based discounts stored on their profile:
- `monthlyTuitionFee` = 3500 (from settings default/override)
- `discountTuition` = 500 (from settings discount options)
- `admissionFee` = 6000, `discountAdmission` = 1000
- `readmissionFee` = 3000, `discountReadmission` = 0

When recording payment, the system computes **two sets of numbers**:

| Concept | Guardian Copy (Display) | Office Copy (Actual) |
|---------|------------------------|---------------------|
| Tuition line item | 3500 (full fee) | 3000 (fee - discount) |
| Admission line item | 6000 (full fee) | 5000 (fee - discount) |
| Exam fee line item | 500 | 500 (same — no discount applies) |
| **Sub Total** | 10000 | 8500 |
| Additional Discount | 0 | 0 |
| **Grand Total** | 10000 | 8500 |
| Due | 0 | 0 |
| **Paid** | 10000 | 8500 |

#### With Due Example

Same student, but guardian keeps ৳2000 due:

| Concept | Guardian Copy (Display) | Office Copy (Actual) |
|---------|------------------------|---------------------|
| Sub Total | 10000 | 8500 |
| Due entered by accountant | 2000 | 2000 |
| **Paid** | 10000 - 2000 = **8000** | 8500 - 2000 = **6500** |
| **Due** | **2000** | **2000** |

> **Key:** The `due` amount is the **same** on both copies. It's the `paid` amount that differs because the base totals differ.

#### Calculation Formulas

For each discountable line item (tuition, admission, readmission):
```
guardianAmount = student.feeField                    // e.g. monthlyTuitionFee = 3500
officeAmount   = student.feeField - student.discount  // e.g. 3500 - 500 = 3000
```

For non-discountable line items (exam, sheet, study_materials, etc.):
```
guardianAmount = enteredAmount
officeAmount   = enteredAmount   // same
```

Invoice-level:
```
guardianSubTotal = sum(guardianAmounts)
officeSubTotal   = sum(officeAmounts)

// Additional discount is entered by accountant (applies equally to both)
guardianGrandTotal = guardianSubTotal - additionalDiscount
officeGrandTotal   = officeSubTotal - additionalDiscount

// Due is entered by accountant (same value on both)
guardianPaid = guardianGrandTotal - due
officePaid   = officeGrandTotal - due
```

#### Database Changes

- [x] **6.1** — Add dual-amount fields to payment models in `prisma/schema.prisma`:
  ```prisma
  // Add to UacPayment, MbcsPayment, MecPayment — per-LINE-ITEM fields:
  guardianAmount     Float?    // Display amount for guardian (full fee, pre-discount)

  // Per-INVOICE fields (shared across all rows with same invoiceNumber):
  officeSubTotal     Float?    // Sum of actual (post-discount) amounts
  guardianSubTotal   Float?    // Sum of display (pre-discount) amounts
  additionalDiscount Float?    @default(0)  // Extra discount entered by accountant
  officeGrandTotal   Float?    // officeSubTotal - additionalDiscount
  guardianGrandTotal Float?    // guardianSubTotal - additionalDiscount
  officePaid         Float?    // officeGrandTotal - due
  guardianPaid       Float?    // guardianGrandTotal - due
  dueAmount          Float?    @default(0)  // amount kept as due (same on both copies)
  ```

  > **Note on `amount` (existing field):** The existing `amount` field on each payment row stores the **actual** (office/post-discount) per-line-item amount. This is the source of truth for financial reports. `guardianAmount` is the display-only counterpart.

- [x] **6.2** — Run migration: `npx prisma migrate dev --name add_dual_invoice_fields`

#### Tasks

- [x] **6.3** — Backend: Update `CreateMultiPaymentDto` (UAC):
  - Add fields: `additionalDiscount?`, `dueAmount?`
  - Backend computes all dual fields from student profile + line items:
    - For each discountable line item: look up student's fee and discount fields
    - Compute `guardianAmount` per line item
    - Compute both sub-totals, grand-totals, paid amounts
  - Store on all created payment rows (invoice-level fields shared, line-item fields per-row)

- [x] **6.4** — Frontend: Update `RecordPayment.tsx` (UAC) — redesign summary section:
  - **Decision (S8): Option A — Single view with collapsible office summary**
  - Main form shows **guardian amounts** (what the guardian sees) as the primary view
  - For each line item:
    - **Display Amount** (guardian) = full fee from student profile — primary, always visible
    - **Actual Amount** (office) = fee - discount — shown as helper text or tooltip
  - Summary section below line items:
    - **Sub Total:** sum of guardian amounts — read-only
    - **Additional Discount:** editable InputNumber (default 0). Applied equally to both.
    - **Grand Total:** guardianSubTotal - additionalDiscount — read-only
    - **Due:** editable InputNumber (default 0). Same on both copies.
    - **Paid:** guardianGrandTotal - due — read-only
  - **Collapsible "Office Summary" panel** at the bottom:
    - Shows actual/office amounts: office sub total, office grand total, office paid
    - Collapsed by default — accountant can expand to verify office figures
    - This keeps the form simple while giving visibility into actual financials

- [x] **6.5** — Apply same payment form changes to MBCS (`MbcsRecordPayment.tsx`)
- [x] **6.6** — Apply same to MEC (`MecRecordPayment.tsx`)
- [x] **6.7** — Backend: Update MBCS and MEC payment DTOs and services with same dual-invoice logic

#### Invoice Generation

- [x] **6.8** — Frontend: Update existing invoice template to add "Guardian Copy" label
  - The existing invoice already shows the guardian-facing amounts
  - Add a subtle label: "Guardian's Copy" at the top or bottom

- [x] **6.9** — Frontend: Create Office Copy invoice template:
  - Same layout as guardian copy but:
    - Label: "Office Copy"
    - Shows `amount` (actual/post-discount) per line item instead of `guardianAmount`
    - Shows `officeSubTotal`, `officeGrandTotal`, `officePaid`
    - Shows `dueAmount` if > 0
  - Office copy is generated alongside guardian copy during payment recording
  - Office copy is accessible from the "Office Records" tab in payment history (see 6D)

#### Invoice Mode Toggle (Decision S13: Confirmed)

Orgs can switch between **dual-invoice mode** and **unified-invoice mode**:

- **Dual mode** (default): Guardian copy shows full/undiscounted fees, Office copy shows actual/discounted fees. Used when the org wants to hide discounts from guardians.
- **Unified mode**: Both copies show the **same** amounts (office/actual amounts). Both still labeled "Guardian's Copy" / "Office Copy" but numbers are identical. Used when the org doesn't need to hide discounts.

**Implementation:** One setting per org: `invoice_mode → "dual" | "unified"`. In payment creation service: if `unified`, set `guardianAmount = amount` for all line items. Everything downstream (due allocation, due collection, analytics) is unaffected.

- [x] **6.9a** — Frontend: Add "Invoice Mode" toggle to each org's settings page:
  - Toggle: "Dual Invoice (hide discounts from guardian)" / "Unified Invoice (same amounts on both copies)"
  - Settings key: `invoice_mode` → `"dual"` or `"unified"`
  - Default: `"dual"` (preserving the designed behavior)

- [x] **6.9b** — Backend: In payment creation service, check `invoice_mode` setting:
  - If `"dual"`: compute `guardianAmount` from full/undiscounted fee as designed in 6A
  - If `"unified"`: set `guardianAmount = amount` (office amount) for every line item
  - All downstream fields (`guardianSubTotal`, `guardianGrandTotal`, `guardianPaid`) are derived from `guardianAmount`, so they auto-match office values in unified mode

- [x] **6.9c** — Frontend: In Record Payment form, conditionally show/hide dual-column summary:
  - If `"dual"`: show both Guardian and Office columns in summary
  - If `"unified"`: show single column (or collapse to simpler layout since values are identical)

---

### 6B. Due Collection — Separate Form & Payment Chain

#### The Problem

When a guardian keeps a due (e.g., Tuition ৳3000 paid, Admission ৳4000 due, Exam ৳500 due), the guardian may return later to pay part or all of the due. This creates several complications with the existing Record Payment form:

1. **Duplicate prevention conflict:** The existing system prevents duplicate tuition payments per month. If tuition is marked "paid" by priority allocation, but admission has due — selecting "admission" as a new payment line item would auto-fill the **full** admission fee (৳5000/৳6000), not the **remaining due** (৳4000).

2. **No awareness of prior partial payment:** The Record Payment form doesn't know that ৳1000 was already allocated to admission in the previous payment. It only knows the student's fee fields.

3. **Repeated partial payments:** Guardian might pay ৳2000 of the ৳4000 admission due, then come back again for the remaining ৳2000. Each visit needs to know the **current** remaining due.

4. **Same problem for payroll:** Teacher was owed ৳15000, got paid ৳10000, has ৳5000 due. When collecting, auto-fill should be ৳5000, not ৳15000.

#### The Solution: Separate "Collect Due" Flow

**Decision (S11): Separate "Collect Due" form** — A dedicated form that:
- Loads from the student's/teacher's **due profile**
- Auto-fills line items with **remaining due amounts**, not original fees
- Generates its own invoices (guardian + office copy) with "Due Collection" label
- Links back to the original invoice via `parentInvoiceNumber` field
- Bypasses duplicate prevention (it's a continuation, not a duplicate)
- Supports partial payment again (nested dues)

#### Why Due Amount Is the Same on Both Copies

A key insight that **simplifies the entire due collection flow**: the due amount is mathematically identical on guardian and office copies. Here's the proof:

**Example:** Tuition ৳3000, Admission ৳5000, Exam ৳1000. After discount: Tuition ৳2500, Admission ৳4000, Exam ৳1000.

| | Guardian Copy | Office Copy |
|---|---|---|
| Tuition Fee | ৳3000 | ৳2500 |
| Admission Fee | ৳5000 | ৳4000 |
| Exam Fee | ৳1000 | ৳1000 |
| **Subtotal** | **৳9000** | **৳7500** |
| **Paid** | **৳5500** | **৳4000** |
| **Due** | **৳3500** | **৳3500** |

The paid amounts differ by exactly the discount (৳1500), and the subtotals differ by exactly the discount (৳1500). So the due = subtotal - paid is **always the same**.

**Per-item allocation (priority: Tuition → Admission → Others):**

| Due Type | Guardian perspective | Office perspective |
|----------|---|---|
| Tuition | 3000 - 3000 = **0** | 2500 - 2500 = **0** |
| Admission | 5000 - 2500 = **2500** | 4000 - 1500 = **2500** |
| Exam | 1000 - 0 = **1000** | 1000 - 0 = **1000** |

**Per-item dues are identical.** This is guaranteed because `guardianFee = officeFee + discount` and `guardianPaid = officePaid + discount`, so `guardianDue = guardianFee - guardianPaid = officeFee - officePaid = officeDue`.

> **Implication for Collect Due form:** We only need **one** set of due amounts. No separate guardian/office due columns. No "discount gap absorption" logic. The Collect Due form shows one simple due profile, and the collected amount is the same on both invoice copies. The only difference between the two copies remains the **original fee display** (pre-discount vs post-discount), not the due or payment amounts.

#### How "Collect Due" Works — Walkthrough

**Continuing the example:**
- Original payment: Tuition paid ✅, Admission due ৳2500, Exam due ৳1000 — total due ৳3500
- Guardian returns to pay ৳2000 toward the due

**Step 1: Accountant navigates to "Collect Due"**
- Selects student (or clicks "Collect" from payment history)
- Form loads the student's **due profile** (single set of amounts — same for all):

| Due Type | Due Amount | Select |
|----------|-----------|--------|
| Admission Fee | ৳2500 | ☑ |
| Others (Exam) | ৳1000 | ☑ |
| **Total Due** | **৳3500** | |

**Step 2: Payment amount entry**
- **Paying:** ৳2000 (entered by accountant)
- **Remaining Due:** ৳3500 - ৳2000 = ৳1500
- Priority allocation runs on the ৳2000:
  1. Admission (priority): ৳2500 needed, ৳2000 available → ৳2000 allocated, ৳500 still due
  2. Exam: ৳1000 needed, ৳0 remaining → ৳1000 still due

**Step 3: New due state**

| Due Type | Remaining Due |
|----------|--------------|
| Admission Fee | ৳500 |
| Others (Exam) | ৳1000 |
| **Total** | **৳1500** |

**Step 4: Invoice generated**
- **Guardian copy:** Shows "Due Collection" label, references original invoice, line items show guardian-perspective fees for context, paid ৳2000, remaining due ৳1500
- **Office copy:** Same amounts (paid ৳2000, remaining due ৳1500), but line items show office-perspective fees for context
- Both copies have the **same paid and due amounts** — only the contextual fee labels differ
- Both link to original invoice via `parentInvoiceNumber`

**Step 5: Guardian returns AGAIN to pay remaining ৳1500**
- Due profile now shows: Admission ৳500 + Exam ৳1000
- Guardian pays ৳1500 → all dues cleared ✅

#### Payment Chain — Database Design

Each due collection payment links back to the original payment:

```
Original: INV-UAC-2026-0001 (Tuition + Admission + Exam, ৳3500 due)
  └─ Collection 1: INV-UAC-2026-0015 (parentInvoice: 0001, ৳2000 paid, ৳1500 due)
       └─ Collection 2: INV-UAC-2026-0023 (parentInvoice: 0001, ৳1500 paid, ৳0 due)
```

> All collections reference the **root** invoice, not the previous collection. This keeps queries simple: "find all payments related to invoice X."

#### Database Changes

- [x] **6.10** — Add due collection fields to payment models in `prisma/schema.prisma`:
  ```prisma
  // Add to UacPayment, MbcsPayment, MecPayment:
  parentInvoiceNumber  String?   // Links due collection to original invoice
  isDueCollection      Boolean   @default(false)  // Distinguishes from fresh payments
  ```

- [x] **6.11** — Add due collection fields to payroll models:
  ```prisma
  // Add to UacPayroll, MbcsPayroll:
  parentPayrollId    String?   // Links due collection to original payroll
  isDueCollection    Boolean   @default(false)
  ```

#### Tasks — Student Due Collection

- [x] **6.12** — Backend: Create due collection endpoint:
  ```
  POST /api/uac/students/:id/collect-due
  Body: {
    parentInvoiceNumber: string,   // original invoice
    paidAmount: number,            // what guardian is paying now
    additionalDiscount?: number,   // optional additional discount
    paymentMethod: string,
    paymentDate: string,
    notes?: string
  }
  ```
  Logic:
  1. Fetch student's current due profile (all payment rows with `dueAmount > 0` from the parent invoice chain)
  2. Create new payment rows with `isDueCollection = true`, `parentInvoiceNumber`
  3. Run priority allocation on `paidAmount` against due items
  4. Due amounts are the same for both copies — no separate guardian/office due calculation needed
  5. Generate new invoice number for this collection
  6. For invoice display: carry over original guardian/office fee amounts as context labels only

**Decision (S12): Immutable rows (append-only)** — Original payment rows keep their original `dueAmount` unchanged. Due collection creates new payment rows with `isDueCollection = true`. Current due = `original dueAmount - sum(collection amounts for same parentInvoiceNumber)`. Financial records remain audit-friendly and append-only.

- [x] **6.13** — Same endpoint for MBCS and MEC

- [x] **6.14** — Frontend: Create `CollectDue.tsx` (UAC) — dedicated due collection page:
  - Select student (or pre-filled from "Collect" button)
  - Load due profile: single list of outstanding dues per type (one amount column — same for both copies)
  - Checkboxes to select which dues to collect
  - "Amount to Pay" input (default = total selected dues)
  - "Remaining Due" = auto-calculated
  - Priority allocation preview: show how the payment will be distributed
  - Submit → calls collect-due API
  - Shows success + option to print both invoices

- [x] **6.15** — Same for MBCS: `MbcsCollectDue.tsx`
- [x] **6.16** — Same for MEC: `MecCollectDue.tsx`

- [x] **6.17** — Add routes and sidebar link for Collect Due pages:
  - Under each org: `/uac/collect-due`, `/mbcs/collect-due`, `/mec/collect-due`
  - Or as a sub-option under "Payments" in the sidebar

#### Tasks — Payroll Due Collection

- [x] **6.18** — Backend: Create payroll due collection endpoint:
  ```
  POST /api/uac/payroll/:id/collect-due
  Body: { paidAmount: number, paymentDate: string, notes?: string }
  ```
  Logic:
  1. Fetch original payroll record, verify `dueAmount > 0`
  2. Create new payroll row with `isDueCollection = true`, `parentPayrollId`
  3. Amount = `paidAmount`, `dueAmount` = remaining
  4. No priority needed (single item)

- [x] **6.19** — Same for MBCS payroll

- [x] **6.20** — Frontend: Add "Collect Due" button on payroll history rows where `dueAmount > 0`:
  - Opens modal: "Collect Payroll Due — ৳X remaining. Amount: [____]"
  - Submit → calls collect-due API → refresh list

- [x] **6.21** — Same for MBCS payroll history

#### Duplicate Prevention Update

- [x] **6.22** — Backend: Update duplicate prevention in payment services:
  - **Current:** Blocks duplicate tuition payments for the same month
  - **New:** Skip duplicate check when `isDueCollection = true` (due collections are continuations, not duplicates)
  - Also consider: For fresh payments, check if there's already an unpaid due for the same type and suggest "Collect Due" instead

---

### 6C. Payment Priority Settings

#### What Is Needed

A configurable priority order for payment types. This determines **what the due is attributed to** when a guardian pays partially.

**Example:** Priority order: Tuition → Admission → Readmission → Others

Guardian owes: Tuition ৳3000 + Admission ৳5000 + Exam ৳500 = ৳8500 total.
Guardian pays ৳4000, keeping ৳4500 due.

With priority-based allocation:
1. Tuition ৳3000 — paid ✅ (৳4000 ≥ ৳3000, remaining: ৳1000)
2. Admission ৳5000 — due ৳4000 ❌ (৳1000 < ৳5000, partial: ৳1000 paid, ৳4000 due)
3. Exam ৳500 — due ৳500 ❌ (৳0 remaining)

Result on student's due section:
| Due Type | Amount |
|----------|--------|
| Tuition Fee | No Due ✅ |
| Admission Fee | ৳4000 |
| Others (Exam) | ৳500 |

#### Settings Key
```
payment_priority → { "order": ["tuition", "admission", "readmission", "others"] }
```

> The `others` bucket covers all non-fee payment types: exam, sheet, session_charge, study_materials, study_tour, stationary, other.

#### Tasks

- [x] **6.23** — Frontend: Add "Payment Priority" sub-tab to each org's settings page:
  - Drag-and-drop sortable list of payment types: Tuition, Admission, Readmission, Others
  - Save button → `settingsService.upsert(org, 'payment_priority', { order: [...] })`
  - Default order if not set: `["tuition", "admission", "readmission", "others"]`

- [x] **6.24** — Backend: Add priority-based due allocation logic to payment service:
  - When `dueAmount > 0` on a multi-line payment:
    - Fetch priority order from settings
    - Allocate `officePaid` amount across line items in priority order
    - Each line item gets: `itemPaidAmount` and `itemDueAmount`
    - Store per-line-item due allocation

**Decision (S9): Store `dueAmount` per payment row** — Each row in the payment table gets its own `dueAmount` computed from priority allocation. The invoice-level due is the sum. The existing `dueAmount` field on each payment row (from 6.1) is filled per-row by the priority allocation algorithm.

- [x] **6.25** — Backend: Implement due allocation algorithm:
  ```
  function allocateDue(lineItems, totalPaid, priorityOrder):
    remaining = totalPaid
    for each priorityGroup in priorityOrder:
      items = lineItems.filter(item => item.type in priorityGroup)
      groupTotal = sum(items.officeAmount)
      if remaining >= groupTotal:
        // Fully paid — no due for this group
        items.forEach(item => item.dueAmount = 0)
        remaining -= groupTotal
      else:
        // Partially paid — allocate remaining, rest is due
        items.forEach(item => {
          if remaining >= item.officeAmount:
            item.dueAmount = 0
            remaining -= item.officeAmount
          else:
            item.dueAmount = item.officeAmount - remaining
            remaining = 0
        })
    // Any remaining items after budget exhausted get full due
  ```

---

### 6D. Student Due Tracking — Individual & Global Payment History

#### What Is Needed

##### Individual Student Payment History — Due Section

On each student's payment history page, add a "Due Summary" section showing:

| Due Type | Status / Amount |
|----------|----------------|
| Tuition Fee | [Current month due / "No Due" / amount from partial payment] |
| Admission Fee | [Amount due / "Paid" / "N/A"] |
| Re-Admission Fee | [Amount due / "Paid" / "N/A"] |
| Others | [Total due from non-fee items] |

**Logic (using office copy data + priority allocation):**
- **Tuition Due:** Sum of `dueAmount` from all payment rows where `paymentType === 'tuition'` and `dueAmount > 0`. Also check if current month's tuition is unpaid entirely.
- **Admission Due:** Sum of `dueAmount` from `paymentType === 'admission'` rows. If no admission payment exists and `admissionFee > 0` → show full admission fee as due.
- **Re-Admission Due:** Same logic as admission but for readmission after promotion.
- **Others Due:** Sum of `dueAmount` from all other payment type rows.

> **Important:** All due calculations use **office copy** data (`amount` / `officeGrandTotal` / per-row `dueAmount`), NOT guardian copy data.

##### Global Payment History — Tab Restructure

The current payment history has tabs: `[Tuition Status] [All Payments]`

**New structure:**
- **Tab 1: Tuition Status** — unchanged (monthly grid showing paid/unpaid per student)
- **Tab 2: Payment Records (Guardian)** — the existing "All Payments" list showing guardian-facing amounts. Includes invoice download (guardian copy).
- **Tab 3: Payment Records (Office)** — same payment list but showing office/actual amounts. Includes invoice download (office copy). This is where accountants and directors see real financial data.

**Decision (S10): Tab names** — "Tuition Status" | "Guardian Records" | "Office Records"

##### Due Filter on Payment History

On the "Office Records" tab, add a filter: **"Show Due Only"** — filters to show only payments where `dueAmount > 0`, grouped by due type:
- Admission dues
- Re-Admission dues
- Others dues
- Add "Collect" button → navigates to record payment page with pre-filled student

#### Tasks

- [x] **6.26** — Frontend: Update `StudentPaymentHistory.tsx` (UAC):
  - Add "Due Summary" card above the payment grid
  - Compute due per category from payment rows using office amounts
  - Use priority-based allocation data

- [x] **6.27** — Same for MBCS: `MbcsStudentPaymentHistory.tsx`
- [x] **6.28** — Same for MEC: `MecStudentPaymentHistory.tsx`

- [x] **6.29** — Frontend: Restructure `UacPaymentHistory.tsx` tabs:
  - Rename "All Payments" → "Guardian Records" (or per decision on S10)
  - Add new "Office Records" tab showing office copy data
  - Add "Show Due Only" filter on Office Records tab
  - Add "Collect" button on due rows

- [x] **6.30** — Same for MBCS: `MbcsPaymentHistory.tsx`
- [x] **6.31** — Same for MEC: `MecPaymentHistory.tsx`

- [x] **6.32** — Backend: Add endpoint or query param to fetch payments with office vs guardian perspective:
  - `GET /api/uac/payments?view=office` — returns `amount`, `officeSubTotal`, `officePaid`, etc.
  - `GET /api/uac/payments?view=guardian` — returns `guardianAmount`, `guardianSubTotal`, `guardianPaid`, etc.
  - Or simply return all fields and let frontend pick which to display

- [x] **6.33** — Backend: Add endpoint to fetch due summary for a student:
  ```
  GET /api/uac/students/:id/due-summary
  Response: {
    tuition: { status: "due" | "paid" | "na", amount: number, month?: string },
    admission: { status: "due" | "paid" | "na", amount: number },
    readmission: { status: "due" | "paid" | "na", amount: number },
    others: { status: "due" | "paid" | "na", amount: number, details: [...] }
  }
  ```

---

### 6E. Analytics — Use Office Data Only

#### What Is Needed
All analytics (dashboard, revenue calculations, outstanding payment counts) must use **office copy** data exclusively. Guardian copy amounts are display-only and should NEVER feed into analytics.

**This means:**
- Revenue = sum of `officePaid` (or existing `amount` field which IS the office amount)
- Outstanding = sum of `dueAmount`
- Collection rate = `officePaid / officeGrandTotal`

#### Tasks

- [x] **6.34** — Backend: Audit `analytics.service.ts` to ensure all queries use `amount` (office amount), NOT `guardianAmount`
  - Since `amount` (the existing field) already stores the actual/office value, and `guardianAmount` is new, this should already be correct — but needs verification

- [x] **6.35** — Frontend: Ensure dashboard cards and charts use office-perspective data

---

### 6F. Payroll — Make Lecture-Based Amount Editable & Add Due Fields

#### What Is Needed
1. **Fix:** When creating payroll for lecture-based teachers, after "Calculate from Attendance" auto-fills the amount, the amount field is currently **disabled** (not editable). It should be **editable** — allowing manual adjustments.

2. **Add due fields to payroll:** Similar to student payments:
   - **Sub Total:** calculated amount (from salary/attendance)
   - **Grand Total:** = Sub Total (no discount for payroll — no dual invoice needed)
   - **Paid:** editable, default = Grand Total
   - **Due:** = Grand Total - Paid

If due > 0, it should reflect on the teacher's/staff's payment history.

> **Note:** Payroll does NOT have the dual-invoice concept. Teachers/staff don't get guardian-style invoices. Only students have the guardian copy / office copy split.

#### Database Changes

- [x] **6.36** — Add due fields to payroll models:
  ```prisma
  // Add to UacPayroll, MbcsPayroll:
  paidAmount Float?   // What was actually paid
  dueAmount  Float?   @default(0)  // amount - paidAmount
  ```

- [x] **6.37** — Run migration: `npx prisma migrate dev --name add_payroll_due_fields`

#### Tasks

- [x] **6.38** — Frontend: Update `CreatePayroll.tsx` (UAC):
  - **Fix:** Make the Amount field **always editable** (remove `disabled` when calculated data is present)
  - Add new fields below Amount:
    - **Sub Total:** = Amount (read-only)
    - **Grand Total:** = Sub Total (read-only, same for payroll)
    - **Paid:** InputNumber, default = GrandTotal, editable
    - **Due:** auto-calculated, read-only = GrandTotal - Paid

- [x] **6.39** — Backend: Update UAC `CreatePayrollDto`:
  - Add `paidAmount` (optional Float, defaults to `amount`)
  - Backend calculates `dueAmount = amount - paidAmount`

- [x] **6.40** — Apply same to MBCS payroll (frontend + backend)

### 6G. Teacher/Staff Due in Payment History

#### What Is Needed
On teacher and staff individual payment history pages, show their due status.

- [x] **6.41** — Frontend: Update `TeacherPayrollHistory.tsx` (UAC):
  - Add "Due" section showing total unpaid amount across all payroll records where `dueAmount > 0`

- [x] **6.42** — Same for MBCS teacher payroll history

- [x] **6.43** — Staff due: if staff have a payroll history page, add the same due section

---

## Feature 7: Export & Import Students

### What Is Needed

#### 7A. Import Students

Admins should be able to import students from Excel/CSV. The import flow:

1. **Provide a template file** — downloadable Excel template with column headers and formatting instructions
2. **User selects:** Organization, Class, Shift/Branch (for MBCS) or Group (for UAC), then uploads the file
3. **System processes:**
   - Parse Excel/CSV → extract student data
   - Apply settings: look up tuition fee from settings for the selected class, apply defaults, overrides, discounts
   - Validate data (required fields, formats)
   - Show preview with validation results
   - User confirms → batch create students
4. **Conflict prevention:** Class + Shift/Branch are pre-selected, so imported students are automatically assigned correctly

#### Template Format
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| Name | String | Yes | |
| Gender | String | Yes | male/female/other |
| Date of Birth | Date (DD/MM/YYYY) | Yes | |
| Serial No | String | No | Institution roll |
| Guardian Name | String | Yes | Primary contact |
| Contact Number | String | Yes | BD mobile (+880...) |
| Father Name | String | No | |
| Father Mobile | String | No | |
| Mother Name | String | No | |
| Mother Mobile | String | No | |
| Admission Date | Date (DD/MM/YYYY) | No | Defaults to import date |
| Admission Fee | Number | No | Overridden by settings |
| Notes | String | No | |

> **DECISION (User Confirmed — Option C: Both Excel + CSV):**
>
> Accept both .xlsx and .csv uploads. Parse Excel natively with `xlsx` library (already in frontend dependencies), parse CSV with a simple parser. Users choose whichever is more convenient. ✅
>
> **DECISION (User Confirmed — Option A: Frontend Parsing):**
>
> Parse file in the browser, send JSON array to backend. For ~500 students max, browser parsing is fast enough. Avoids file upload complexity on the server. ✅

#### Settings Keys for Import
```
import_template_columns → { "columns": ["name", "gender", "dateOfBirth", ...] }  // optional, for template generation
```

#### Tasks

##### 7A-1. Import Template & Download

- [x] **7.1** — Frontend: Create `frontend/src/pages/import-export/ImportStudents.tsx`:
  - Step 1: Select Organization (UAC/MBCS/MEC)
  - Step 2: Select Class (dropdown of classes for selected org)
  - Step 3: Select Shift/Branch (MBCS only) or Group (UAC, if applicable)
  - Step 4: "Download Template" button → generates and downloads an Excel file with column headers and instructions
  - Step 5: Upload file (Ant Design `Upload` component, accepts .xlsx and .csv)
  - Step 6: Parse file → show preview table with validation status per row
  - Step 7: "Import" button → POST array of student data to backend

- [x] **7.2** — Frontend: Template generation utility (`frontend/src/utils/importTemplate.ts`):
  - Uses `xlsx` library to generate a blank template with:
    - Column headers (from template format table above)
    - Data validation hints in first row or second sheet
    - Instructions sheet

- [x] **7.3** — Frontend: File parsing utility (`frontend/src/utils/importParser.ts`):
  - Parse .xlsx using `xlsx` library
  - Parse .csv using simple split logic
  - Map columns to student DTO fields
  - Validate each row (required fields, date format, phone format)
  - Return `{ valid: StudentRow[], invalid: ErrorRow[] }`

- [x] **7.4** — Frontend: After parsing, apply settings:
  - Fetch tuition fee from settings for the selected class
  - Set `monthlyTuitionFee` from settings
  - Set `admissionFee` from settings (if applicable)
  - Set selected class and shift/branch/group from the dropdowns

- [x] **7.5** — Backend: Add batch create endpoint:
  ```
  POST /api/uac/students/import
  Body: { students: CreateStudentDto[] }
  ```
  - Validate all students
  - Create in a `$transaction`
  - Return `{ created: number, errors: Array<{index: number, error: string}> }`

- [x] **7.6** — Same backend endpoint for MBCS and MEC

##### 7A-2. Export Students

- [x] **7.7** — Frontend: Create `frontend/src/pages/import-export/ExportStudents.tsx`:
  - Select Organization
  - Select Class (optional — "All Classes" option)
  - Select Shift/Branch (MBCS) or Group (UAC) — optional
  - "Export" button → fetches students via existing API → generates Excel using `xlsx`
  - Downloads the file

- [x] **7.8** — Frontend: Export utility (`frontend/src/utils/exportStudents.ts`):
  - Takes student array
  - Maps to Excel-friendly columns
  - Generates .xlsx file using `xlsx` library
  - Triggers browser download

##### 7A-3. Sidebar & Routes

- [x] **7.9** — Add "Import & Export" menu item to sidebar in `DashboardLayout.tsx`:
  - Under each org module OR as a top-level menu:
    - Option A: Under each org (e.g., UAC → Import/Export, MBCS → Import/Export)
    - Option B: Top-level "Import & Export" with org selection inside
  - **Recommended: Top-level "Import & Export" with org selection inside** — cleaner sidebar, single entry point

- [x] **7.10** — Add routes in `App.tsx`:
  - `/import-export` → main import/export page (with org tab selection)
  - The page can have tabs: [Import Students] [Export Students]
  - Accessible to `SUPER_ADMIN` and `DIRECTOR` only? Or also accountants for their own org?

> **DECISION (User Confirmed — Option B: All Export, Admin Import Only):**
>
> All roles can export (read operation). Only `SUPER_ADMIN` and `DIRECTOR` can import (write operation). ✅

- [x] **7.11** — Add "Import & Export" to sidebar, with proper role-based visibility

---

## Database Migration Summary

### All Schema Changes Required

```prisma
// ==========================================
// NEW MODEL
// ==========================================

model OrgSettings {
  id           String   @id @default(uuid())
  organization String
  settingKey   String
  settingValue Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([organization, settingKey])
  @@index([organization])
  @@map("org_settings")
}

model PromotionLog {
  id           String   @id @default(uuid())
  organization String
  studentId    String
  fromClass    Int
  toClass      Int
  promotedAt   DateTime @default(now())
  promotedBy   String
  notes        String?

  @@index([organization, studentId])
  @@index([promotedAt])
  @@map("promotion_logs")
}

// ==========================================
// FIELD ADDITIONS TO EXISTING MODELS
// ==========================================

// Add to UacStudent, MbcsStudent, MecStudent:
//   readmissionFee      Float?
//   discountTuition     Float?  @default(0)
//   discountAdmission   Float?  @default(0)
//   discountReadmission Float?  @default(0)
//   associationEndDate  DateTime?

// Add to UacTeacher, MbcsTeacher:
//   associationEndDate  DateTime?

// Add to UacStaff, MbcsStaff:
//   associationEndDate  DateTime?

// Add to UacPayment, MbcsPayment, MecPayment (dual-invoice + due fields):
//   guardianAmount       Float?    // Display amount for guardian (full fee, pre-discount) — per line item
//   officeSubTotal       Float?    // Sum of actual (post-discount) amounts — per invoice
//   guardianSubTotal     Float?    // Sum of display (pre-discount) amounts — per invoice
//   additionalDiscount   Float?    @default(0)  // Extra discount by accountant — per invoice
//   officeGrandTotal     Float?    // officeSubTotal - additionalDiscount — per invoice
//   guardianGrandTotal   Float?    // guardianSubTotal - additionalDiscount — per invoice
//   officePaid           Float?    // officeGrandTotal - due — per invoice
//   guardianPaid         Float?    // guardianGrandTotal - due — per invoice
//   dueAmount            Float?    @default(0)  // due amount (same on both copies) — per line item (priority-allocated)
//   parentInvoiceNumber  String?   // Links due collection to original invoice (null for fresh payments)
//   isDueCollection      Boolean   @default(false)  // true = this is a due collection, not a fresh payment

// Add to UacPayroll, MbcsPayroll:
//   paidAmount         Float?
//   dueAmount          Float?    @default(0)
//   parentPayrollId    String?   // Links due collection to original payroll record
//   isDueCollection    Boolean   @default(false)
```

### Recommended Migration Order
Run these as separate migrations for safety:

1. `add_org_settings` — new `OrgSettings` table
2. `add_student_fee_and_discount_fields` — `readmissionFee`, `discountTuition`, `discountAdmission`, `discountReadmission` on all student models
3. `add_association_end_date` — `associationEndDate` on all student, teacher, staff models
4. `add_promotion_log` — new `PromotionLog` table
5. `add_dual_invoice_fields` — `guardianAmount`, `officeSubTotal`, `guardianSubTotal`, `additionalDiscount`, `officeGrandTotal`, `guardianGrandTotal`, `officePaid`, `guardianPaid`, `dueAmount` on all payment models
6. `add_due_collection_fields` — `parentInvoiceNumber`, `isDueCollection` on all payment models; `parentPayrollId`, `isDueCollection` on all payroll models
7. `add_payroll_due_fields` — `paidAmount`, `dueAmount` on all payroll models

> **IMPORTANT:** All new fields are nullable or have defaults, so existing data is unaffected. No data migration scripts are needed — the fields will be `NULL` or `0` for existing records.

---

## Implementation Order (Recommended)

Execute in this order to minimize dependency conflicts:

1. **Feature 1** — Settings page shell (sidebar, routes, backend module, DB table)  
2. **Feature 2** — Configure MBCS (all sub-tabs) — this establishes the pattern  
3. **Feature 3** — Configure UAC & MEC (replicate pattern)  
4. **Feature 4** — "No Longer Associated" (independent of settings)  
5. **Feature 5** — Student Promotion (depends on settings for fee lookup)  
6. **Feature 6** — Due Management (most complex, depends on settings + promotion)  
7. **Feature 7** — Export & Import (independent but benefits from settings being configured)

---

## Summary of Files Modified/Created per Feature

| Feature | Backend Files | Frontend Files | Schema |
|---------|---------------|----------------|--------|
| 1. Settings Shell | New: `settings/` module (4 files) | New: `SettingsPage.tsx`, `settingsService.ts`. Update: `DashboardLayout.tsx`, `App.tsx` | New: `OrgSettings` model + migration |
| 2. Configure MBCS | Update: MBCS DTOs, services | New: 5 settings pages. Update: `AddMbcsStudent.tsx`, `MbcsRecordPayment.tsx` | New fields on `MbcsStudent` + migration |
| 3. Configure UAC & MEC | Update: UAC + MEC DTOs, services | New: ~7 settings pages. Update: `AddStudent.tsx`, `RecordPayment.tsx`, `AddMecStudent.tsx`, `MecRecordPayment.tsx` | New fields on `UacStudent`, `MecStudent` + migration (shared with Feature 2) |
| 4. No Longer Associated | Update: all student/teacher/staff services + controllers + DTOs | Update: student/teacher/staff list pages + detail pages | New `associationEndDate` field + migration |
| 5. Student Promotion | New: promotion endpoints in student controllers. New: promotion service | New: `PromoteStudents.tsx`. Update: student detail pages (promote button) | New: `PromotionLog` model + migration |
| 6. Dual Invoice + Due Management | Update: all payment DTOs + services + analytics. Update: payroll DTOs + services. New: due-summary endpoint, priority settings, collect-due endpoints (×3 orgs + ×2 payroll) | Update: `RecordPayment` (×3), `StudentPaymentHistory` (×3), `PaymentHistory` (×3, restructure tabs), `CreatePayroll` (×2), `TeacherPayrollHistory` (×2). New: `CollectDue.tsx` (×3), Office Copy invoice template, Payment Priority settings page | New fields on payments (dual-invoice + due-collection) + payroll (due + collection) + priority setting + 3 migrations |
| 7. Export & Import | New: batch import endpoints (×3 orgs) | New: `ImportStudents.tsx`, `ExportStudents.tsx`, utils. Update: sidebar, routes | No schema change |

**Estimated total new/modified files: ~70-90 files**  
**Estimated total effort: ~75-100 hours**

---

## All Decisions — Status

All decisions confirmed (S1–S13):

| # | Question | Decision | Status |
|---|----------|----------|--------|
| S1 | How should tuition fees sync with settings? | **Option C: Hybrid** — store on student + "Sync Fees" button | ✅ Confirmed |
| S2 | Should MEC have full settings or simplified? | **Option B: Simplified** — tuition + discounts only | ✅ Confirmed |
| S3 | How to handle "No Longer Associated"? | **Option C: `associationEndDate`** field | ✅ Confirmed |
| S4 | How to handle student promotion? | **Option C: Both** — individual + bulk promotion | ✅ Confirmed |
| S5 | Import file format support? | **Option C: Both** — Excel + CSV | ✅ Confirmed |
| S6 | Who can import/export? | **Option B:** All export, admin import only | ✅ Confirmed |
| S7 | Import processing location? | **Option A: Frontend parsing** | ✅ Confirmed |
| S8 | Record Payment form UX for dual amounts? | **Option A:** Single view, collapsible office summary | ✅ Confirmed |
| S9 | Per-line-item due storage approach? | **Option A:** Store `dueAmount` per payment row | ✅ Confirmed |
| S10 | Payment history tab naming? | **Option A:** "Tuition Status" \| "Guardian Records" \| "Office Records" | ✅ Confirmed |
| S11 | Due collection approach — separate form vs reuse? | **Option A:** Separate "Collect Due" form | ✅ Confirmed |
| S12 | Due state management — immutable vs mutable rows? | **Option A:** Immutable, append-only rows | ✅ Confirmed |
| S13 | Invoice mode toggle — dual vs unified per org? | **Yes:** Add toggle, low cost | ✅ Confirmed |

---

## Incomplete/Deferred Items from Previous Checklists

These items from `REFACTOR_CHECKLIST_2.md` were marked as incomplete and may intersect with this upgrade:

| Fix # | Description | Status | Intersection |
|-------|-------------|--------|-------------|
| 20 | `createdBy` as proper FK | Deferred | No intersection |
| 22 | Token refresh mechanism | Deferred | No intersection |
| 28 | Profile/Settings menu items | Open | **Resolved by Feature 1** (Settings page) |
| 29 | `UpdatePaymentDto` exclude `studentId` | Open | Should be done alongside Feature 6 |

---

*Last Updated: February 28, 2026*  
*Status: Implementation In Progress — Feature 6 all decisions confirmed, ready for implementation*

### Progress Summary
- ✅ **Feature 1** — Settings Page Shell: COMPLETE (tasks 1.1–1.11)
- ✅ **Feature 2** — Configure MBCS: COMPLETE (tasks 2.1–2.18)
- ✅ **Feature 3** — Configure UAC & MEC: COMPLETE (tasks 3.1–3.14)
- ✅ **Feature 4** — No Longer Associated: COMPLETE (tasks 4.1–4.10; 4.11–4.12 optional/deferred)
- ✅ **Feature 5** — Student Promotion: COMPLETE (tasks 5.1–5.9)
- 🔄 **Feature 6** — Dual Invoice + Due Management + Due Collection + Payment Priority: **6A COMPLETE** (tasks 6.1–6.9c done ✅); 6B–6D NOT STARTED (tasks 6.10–6.43)
- ⬜ **Feature 7** — Export & Import: NOT STARTED

### Bug Fixes Applied
- Fixed `syncFeesFromSettings` JSON bug in UAC, MBCS, MEC student services (settings stored as `{value: N}` objects, not bare numbers)
- Fixed frontend TypeScript errors: `allowClear` on `InputNumber`, unused `Title`/`prefix` variables, `KeyboardEvent` type-only imports (7 files in `settings/` pages)
