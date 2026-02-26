# Bug Prevention Guide — Utsho Account

> Lessons learned from the v1.2 debugging session (Feb 2026).
> Reference this document before writing new controllers, services, or frontend pages.

---

## Table of Contents

1. [BUG-001: Dual @Query() Causes 400 Bad Request](#bug-001-dual-query-causes-400-bad-request)
2. [BUG-002: PaginationDto @Max vs Frontend limit](#bug-002-paginationdto-max-vs-frontend-limit)
3. [BUG-003: Response Envelope Not Unwrapped in Services](#bug-003-response-envelope-not-unwrapped-in-services)
4. [BUG-004: React Hooks Called After Early Return](#bug-004-react-hooks-called-after-early-return)
5. [BUG-005: Missing Ant Design Imports After Upgrade](#bug-005-missing-ant-design-imports-after-upgrade)
6. [BUG-006: Deprecated Ant Design Props](#bug-006-deprecated-ant-design-props)
7. [BUG-007: TanStack Query queryFn Must Be a Function Reference](#bug-007-tanstack-query-queryfn-must-be-a-function-reference)
8. [Checklists](#checklists)

---

## BUG-001: Dual @Query() Causes 400 Bad Request

**Severity:** Critical — breaks ALL list endpoints site-wide  
**Affected:** 14+ backend controllers  

### What Happened

Controllers used **two** `@Query()` parameters:

```ts
// ❌ BAD — causes mutual validation rejection
@Get()
findAll(
  @Query() pagination: PaginationDto,
  @Query() filters: FilterStudentDto,
) { ... }
```

### Why It Breaks

`main.ts` registers a global `ValidationPipe` with:

```ts
new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,   // ← the key setting
})
```

When NestJS sees two `@Query()` decorators, it validates the **entire** query string against **each** DTO separately. So for a request like `?page=1&limit=20&class=5`:

- `PaginationDto` validation rejects `class` → "property class should not exist"
- `FilterStudentDto` validation rejects `page`, `limit` → "property page should not exist"

Both DTOs fail validation, producing a 400 Bad Request.

### The Fix

Make the Filter DTO **extend** `PaginationDto` and use a **single** `@Query()`:

```ts
// ✅ GOOD — single DTO, all fields whitelisted
// filter-student.dto.ts
export class FilterStudentDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  class?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

// students.controller.ts
@Get()
findAll(@Query() filters: FilterStudentDto) {
  const { page, limit, ...filterParams } = filters;
  return this.studentsService.findAll(filterParams, page, limit);
}
```

### Prevention Rule

> **NEVER use two `@Query()` decorators on the same method.**
> Always create a single DTO that extends `PaginationDto` if the endpoint needs both pagination and filters.

---

## BUG-002: PaginationDto @Max vs Frontend limit

**Severity:** Critical — breaks every dropdown/select data-loading call  
**Affected:** 22 frontend service calls  

### What Happened

`PaginationDto` had `@Max(100)` on the `limit` field, but 22 frontend calls passed `limit=1000` to load all records for dropdown/select lists (e.g., student selector in payment forms, teacher selector in attendance forms).

```ts
// Backend — PaginationDto
@Max(100)  // ❌ Rejects limit=1000
limit?: number = 20;

// Frontend — service call
queryFn: () => studentsService.getAll(undefined, 1, 1000)  // for dropdown
```

### The Fix

Changed `@Max(100)` → `@Max(1000)` in `PaginationDto`.

### Prevention Rule

> **When setting validation constraints, check all frontend callers.**
> If any page loads "all records" for dropdowns (common pattern), the `@Max` must accommodate that.
> Consider adding a dedicated endpoint (e.g., `GET /students/dropdown`) that returns `{ id, name }` without pagination if unbounded fetching is needed.

---

## BUG-003: Response Envelope Not Unwrapped in Services

**Severity:** High — causes `TypeError: rows.forEach is not a function`  
**Affected:** 8 frontend settings pages  

### What Happened

The backend wraps every response in an envelope via `TransformInterceptor`:

```json
{ "success": true, "data": [...], "timestamp": "..." }
```

The frontend axios interceptor strips the AxiosResponse wrapper (`response.data`), leaving the **envelope** object — NOT the actual data array.

```ts
// axios.ts — response interceptor
api.interceptors.response.use((response) => response.data)
// Runtime result: { success: true, data: OrgSetting[], timestamp: "..." }

// ❌ BAD — type lie: claims OrgSetting[] but is actually the envelope
export const getAllSettings = (org: string): Promise<OrgSetting[]> =>
  api.get(`/settings/${org}`) as unknown as Promise<OrgSetting[]>;

// Caller code crashes:
const rows: OrgSetting[] = await settingsService.getAllSettings("uac");
rows.forEach(...)  // TypeError: rows.forEach is not a function
```

### The Fix

Use the typed `apiGet` helper and unwrap `.data`:

```ts
// ✅ GOOD — properly unwraps envelope
import { apiGet } from "../lib/axios";

export const getAllSettings = (org: string): Promise<OrgSetting[]> =>
  apiGet<OrgSetting[]>(`/settings/${org}`).then((res) => res.data);
```

### Prevention Rule

> **Never cast `api.get(...)` with `as unknown as Promise<T[]>`.**
> Always use the typed helpers (`apiGet`, `apiPost`, etc.) from `lib/axios.ts` and access `.data` to unwrap the envelope.
> The response interceptor returns the backend envelope `{ success, data, timestamp }`, NOT the raw data.
>
> Data flow:
> ```
> Backend service returns T
>   → TransformInterceptor wraps as { success, data: T, timestamp }
>   → Axios response.data strips AxiosResponse → { success, data: T, timestamp }
>   → apiGet<T>() types it as ApiResponse<T>
>   → .then(res => res.data) gives you T
> ```

---

## BUG-004: React Hooks Called After Early Return

**Severity:** High — crashes the entire page with: "Rendered fewer hooks than expected"  
**Affected:** 10 list pages  

### What Happened

`useMutation()` hooks were placed **after** an early return:

```tsx
// ❌ BAD — hook after conditional return
function StudentsList() {
  const { data, isError } = useQuery(...);

  if (isError) return <ErrorComponent />;  // early return

  const deleteMutation = useMutation(...);  // 💥 hook skipped on error path
}
```

React requires hooks to be called in the **same order** every render. When `isError` is true, the early return skips `useMutation`, causing a hooks mismatch.

### The Fix

Move ALL hooks above any early return:

```tsx
// ✅ GOOD — all hooks before any conditional return
function StudentsList() {
  const { data, isError } = useQuery(...);
  const deleteMutation = useMutation(...);  // always called

  if (isError) return <ErrorComponent />;

  // ... rest of component
}
```

### Prevention Rule

> **All hooks (`useState`, `useQuery`, `useMutation`, `useEffect`, etc.) must be called before any `if (...) return` statement.**
> This is React's Rules of Hooks. Use the `eslint-plugin-react-hooks` rule `react-hooks/rules-of-hooks` to catch these at lint time.

---

## BUG-005: Missing Ant Design Imports After Upgrade

**Severity:** Medium — page crashes with "X is not defined"  
**Affected:** SettingsPage.tsx  

### What Happened

After upgrading to Ant Design 6, some icon/component imports were missing or renamed:

```tsx
// ❌ Missing import — crashes at runtime
<SettingOutlined />  // ReferenceError: SettingOutlined is not defined
```

### The Fix

Add the import:

```tsx
import { SettingOutlined } from "@ant-design/icons";
```

### Prevention Rule

> **After any Ant Design major version upgrade:**
> 1. Run `npx tsc --noEmit` to catch missing imports
> 2. Check the Ant Design migration guide for renamed/removed components
> 3. Search for any icon/component usage that lacks a corresponding import
> 4. Test every page visually — TypeScript won't catch lazy-loaded or dynamically referenced components

---

## BUG-006: Deprecated Ant Design Props

**Severity:** Low — console warning  
**Affected:** 10 settings files (16 occurrences)  

### What Happened

Ant Design 6 renamed `Space`'s `direction` prop to `orientation`:

```tsx
// ❌ Deprecated — console warning
<Space direction="vertical">

// ✅ Updated
<Space orientation="vertical">
```

### Prevention Rule

> **After any Ant Design upgrade, search for deprecated prop warnings in the browser console.**
> Common renames in Ant Design 6:
> - `Space`: `direction` → `orientation`
>
> Run a project-wide search for the old prop name and replace.

---

## BUG-007: TanStack Query queryFn Must Be a Function Reference

**Severity:** Medium — 400 error on page load  
**Affected:** UsersList page  

### What Happened

`queryFn` was assigned a direct function call instead of a function reference:

```ts
// ❌ BAD — calls the function immediately during render, not at query time
useQuery({
  queryKey: ["users"],
  queryFn: usersService.getAll(),  // executes immediately!
})

// ✅ GOOD — arrow function wrapper
useQuery({
  queryKey: ["users"],
  queryFn: () => usersService.getAll(),
})
```

### Prevention Rule

> **`queryFn` must always be a function reference, not a function call.**
> If the service function takes no arguments, wrap it: `() => service.getAll()`.
> If it takes arguments, use an arrow function: `() => service.getAll(filters, page, limit)`.

---

## Checklists

### When Creating a New Backend Controller Endpoint

- [ ] Use a **single** `@Query()` with a DTO that extends `PaginationDto`
- [ ] Every filter field in the DTO has `@IsOptional()` and proper decorators
- [ ] If no filters needed, use `@Query() pagination: PaginationDto` directly
- [ ] Test with `curl` or Postman including extra query params to verify `forbidNonWhitelisted` doesn't reject them

### When Creating a New Frontend Service Function

- [ ] Use `apiGet<T>()` / `apiPost<T>()` from `lib/axios.ts` — never raw `api.get()`
- [ ] Unwrap the envelope: `.then(res => res.data)` for direct data, or return `ApiResponse<T>` if the caller needs metadata
- [ ] Verify the return type matches what the caller expects (array vs envelope vs paginated)

### When Creating a New Frontend List Page

- [ ] All hooks (`useQuery`, `useMutation`, `useState`, `useEffect`) declared **before** any early return
- [ ] `queryFn` uses arrow function wrapper: `() => service.getAll(...)`
- [ ] `limit` value is within backend's `@Max` constraint (currently 1000)
- [ ] Handle both loading and error states without skipping hooks

### After Any Ant Design Upgrade

- [ ] Check migration guide for renamed/removed components and props
- [ ] Run `npx tsc --noEmit` to catch import errors
- [ ] Search console for deprecation warnings
- [ ] Project-wide search for known renamed props (e.g., `direction` → `orientation`)

### After Any NestJS Upgrade

- [ ] Verify `ValidationPipe` behavior hasn't changed
- [ ] Test all list endpoints with query params
- [ ] Check that `forbidNonWhitelisted` + `whitelist` still work as expected with DTO inheritance

---

*Last updated: February 26, 2026*
