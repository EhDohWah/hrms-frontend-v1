# Employment (Assignment) & Funding Allocation System — Complete Research

> Last updated: 2026-03-15
> Scope: Full-stack analysis of the Employment and Funding Allocation features

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [Backend: Models](#3-backend-models)
4. [Backend: Services (Business Logic)](#4-backend-services)
5. [Backend: Controllers & Routes](#5-backend-controllers--routes)
6. [Backend: Validation (FormRequests)](#6-backend-validation)
7. [Backend: API Resources (Response Shape)](#7-backend-api-resources)
8. [Frontend: Component Architecture](#8-frontend-component-architecture)
9. [Frontend: EmploymentTab.vue](#9-frontend-employmenttabvue)
10. [Frontend: FundingTab.vue](#10-frontend-fundingtabvue)
11. [Frontend: API Layer](#11-frontend-api-layer)
12. [Data Flow: Complete Lifecycle](#12-data-flow-complete-lifecycle)
13. [FTE: Storage vs Display Conversion](#13-fte-storage-vs-display-conversion)
14. [Probation System](#14-probation-system)
15. [Payroll Integration](#15-payroll-integration)
16. [Grant Structure](#16-grant-structure)
17. [Excel Comparison (Client's Legacy Workflow)](#17-excel-comparison)
18. [Known Bugs & Inconsistencies](#18-known-bugs--inconsistencies)
19. [UX Analysis & Pain Points](#19-ux-analysis--pain-points)

---

## 1. System Overview

### Entity Relationship

```
Employee (personal/biographical data)
  │
  ├── Employment (1:1 active) — position, salary, probation, benefits
  │     │
  │     ├── EmployeeFundingAllocation (1:many) — which grant funds this position, at what FTE%
  │     │     │
  │     │     └── Payroll (1:1 per allocation per pay period) — calculated monthly payroll
  │     │
  │     ├── EmploymentHistory (1:many) — snapshot on every change
  │     │
  │     └── ProbationRecord (1:many) — probation lifecycle events
  │
  ├── Grant → GrantItem — the grant structure that allocations reference
  │
  └── (Other: Identifications, Education, Children, Languages, Beneficiaries, Leave, etc.)
```

### Dependency Chain (Create Flow)

```
Employee must exist FIRST (POST /employees)
  └── Employment requires employee_id (POST /employments)
        └── Funding Allocation requires BOTH employee_id AND employment_id
              └── Amount preview requires employment_id (for salary lookup)
```

### Key Design Decisions

- **Cookie-based auth** (Laravel Sanctum) — no Bearer tokens
- **Snake_case JSON** — Laravel serializes relationships as snake_case (e.g., `employee_funding_allocations`)
- **FTE stored as decimal** (0.00–1.00 in DB), **displayed as percentage** (0–100 in API/frontend)
- **Payroll records snapshot everything** — immune to future data changes
- **All payroll monetary values are AES-encrypted** at rest via Laravel's `encrypted` cast
- **Employment has exactly one active record** per employee (enforced by service, not DB constraint)
- **Funding allocations use status lifecycle**: `active` → `inactive` (reversible) → `closed` (permanent)

---

## 2. Database Schema

### `employments` table

Migration: `2025_02_13_025537_create_employments_table.php`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint unsigned | NO | auto | PK |
| `employee_id` | bigint unsigned | NO | — | FK → employees, CASCADE DELETE |
| `organization` | varchar(10) | NO | — | `'SMRU'` or `'BHF'` |
| `position_id` | bigint unsigned | YES | NULL | FK → positions, NO ACTION |
| `department_id` | bigint unsigned | YES | NULL | FK → departments, NO ACTION |
| `section_department_id` | bigint unsigned | YES | NULL | FK → section_departments, SET NULL |
| `site_id` | bigint unsigned | YES | NULL | FK → sites, SET NULL |
| `pay_method` | varchar | YES | NULL | `'Transferred to bank'` or `'Cash cheque'` |
| `start_date` | date | NO | — | Employment start |
| `end_date` | date | YES | NULL | Set on resignation acknowledgement |
| `pass_probation_date` | date | YES | NULL | First day at full salary (typically start + 3 months) |
| `end_probation_date` | date | YES | NULL | Last day of probation period |
| `probation_required` | boolean | NO | true | If false, full salary from day 1 |
| `probation_salary` | decimal(10,2) | YES | NULL | Salary during probation |
| `pass_probation_salary` | decimal(10,2) | NO | — | Regular/full salary (REQUIRED) |
| `previous_year_salary` | decimal(10,2) | YES | NULL | System-managed snapshot before annual increase |
| `health_welfare` | boolean | NO | false | Benefit opt-in flag |
| `pvd` | boolean | NO | false | Provident fund opt-in |
| `saving_fund` | boolean | NO | false | Saving fund opt-in |
| `study_loan` | decimal(10,2) | YES | 0 | Monthly deduction |
| `retroactive_salary` | decimal(10,2) | YES | 0 | Manual HR correction |
| `created_by` / `updated_by` | varchar | YES | NULL | Audit (user name strings) |
| `created_at` / `updated_at` | timestamps | — | — | |

**Indexes:**
- `(pass_probation_date, end_probation_date, end_date)` — probation transition queries
- `(employee_id, end_date)` — active record lookup
- `(department_id, end_date)` — department-scoped queries
- `organization` — org-level filtering
- `start_date`, `end_probation_date`, `site_id`, `position_id` — added in performance migration

### `employee_funding_allocations` table

Migration: `2025_04_07_090015_create_employee_funding_allocations_table.php`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint unsigned | NO | auto | PK |
| `employee_id` | bigint unsigned | NO | — | FK → employees |
| `employment_id` | bigint unsigned | YES | — | FK → employments |
| `grant_item_id` | bigint unsigned | YES | — | FK → grant_items, NO ACTION |
| `fte` | decimal(4,2) | NO | — | **Stored as 0.00–1.00** (decimal fraction) |
| `allocated_amount` | decimal(15,2) | YES | NULL | Computed: salary x FTE |
| `salary_type` | varchar(50) | YES | NULL | `'probation_salary'` or `'pass_probation_salary'` |
| `status` | varchar(20) | NO | `'active'` | `'active'`, `'inactive'`, `'closed'` |
| `created_by` / `updated_by` | varchar(100) | YES | NULL | Audit |
| `created_at` / `updated_at` | timestamps | — | — | |

**Indexes:**
- `(employee_id, employment_id)` — primary lookup
- `(employment_id, status)` — status-filtered queries
- `(status)` — status queries
- `(grant_item_id, status)` — grant-level queries

### `grant_items` table

Migration: `2025_02_13_025154_create_grant_items_table.php`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | bigint unsigned | NO | PK |
| `grant_id` | bigint unsigned | NO | FK → grants, CASCADE DELETE |
| `grant_position` | varchar | YES | Position title in the grant |
| `grant_salary` | decimal(15,2) | YES | Budgeted salary for this position |
| `grant_benefit` | decimal(15,2) | YES | Budgeted benefits amount |
| `grant_level_of_effort` | decimal(5,2) | YES | Budgeted FTE percentage |
| `grant_position_number` | integer | YES | Maximum headcount (capacity cap) |
| `budgetline_code` | varchar(255) | YES | NULL for hub grants |

**Uniqueness:** `(grant_id, grant_position, budgetline_code)` enforced at **application level** in `GrantItem::boot()`, not DB, because hub grants have NULL budgetline_code.

### `grants` table

Migration: `2025_02_13_025153_create_grants_table.php`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | PK |
| `code` | varchar | NOT NULL |
| `name` | varchar | NOT NULL |
| `organization` | varchar | `'SMRU'` or `'BHF'` |
| `description` | text | nullable |
| `end_date` | date | nullable (NULL = Active, no expiry) |
| `deleted_at` | timestamp | Soft delete |

**Hub grants:** Hardcoded codes `'S0031'` (SMRU Other Fund), `'S22001'` (BHF General Fund).

**Status accessor:** `'Active'` (no end_date or future), `'Ending Soon'` (within 30 days), `'Expired'`.

### `payrolls` table

Migration: `2025_04_27_114136_create_payrolls_table.php`

| Column | Type | Notes |
|--------|------|-------|
| `employment_id` | FK → employments | CASCADE UPDATE, NO ACTION DELETE |
| `employee_funding_allocation_id` | FK → employee_funding_allocations | One payroll per allocation per period |
| `organization` | varchar(10) | Denormalized snapshot |
| 9 snapshot fields | varchar/decimal | `snapshot_staff_id`, `snapshot_employee_name`, `snapshot_department`, `snapshot_position`, `snapshot_site`, `snapshot_grant_code`, `snapshot_grant_name`, `snapshot_budget_line_code`, `snapshot_fte` |
| 21 monetary fields | TEXT | All **AES-encrypted** via Laravel `encrypted` cast |
| `pay_period_date` | date | |
| `notes` | text | nullable |

### `employment_histories` table

Full snapshot of employment state at the time of each change, including `changes_made` (JSON diff) and `previous_values` (JSON of old values). Created automatically by `Employment::booted()` on every `created` and `updated` event.

### `probation_records` table

Tracks probation lifecycle: `initial` → `extension` (optional, repeatable) → `passed`/`failed`. Only one record is `is_active = true` at a time. Each new event deactivates the previous and creates a new record.

### Status Lifecycle for Funding Allocations

```
active ──→ inactive (user-deactivated, reversible via batchUpdate)
  │              │
  │              └──→ closed (system-replaced, permanent)
  │
  └──→ closed (deleted via batchUpdate, or replaced during probation transition)
```

---

## 3. Backend Models

### Employment Model (`app/Models/Employment.php`, 576 lines)

**Relationships:**

| Method | Type | Target | Notes |
|--------|------|--------|-------|
| `employee()` | belongsTo | Employee | `.withTrashed()` |
| `employeeFundingAllocations()` | hasMany | EmployeeFundingAllocation | All statuses |
| `activeAllocations()` | hasMany | EmployeeFundingAllocation | WHERE status = active |
| `closedAllocations()` | hasMany | EmployeeFundingAllocation | WHERE status = closed |
| `inactiveAllocations()` | hasMany | EmployeeFundingAllocation | WHERE status = inactive |
| `payrolls()` | hasMany | Payroll | |
| `employmentHistories()` | hasMany | EmploymentHistory | |
| `probationRecords()` | hasMany | ProbationRecord | All records |
| `activeProbationRecord()` | hasOne | ProbationRecord | WHERE is_active = true |
| `department()` | belongsTo | Department | `.withTrashed()` |
| `sectionDepartment()` | belongsTo | SectionDepartment | |
| `position()` | belongsTo | Position | |
| `site()` | belongsTo | Site | |

**Boot Events (automatic audit trail):**
- `static::created` → Creates EmploymentHistory with reason `'Initial employment record'`
- `static::updated` → Compares `getChanges()` vs original, creates EmploymentHistory with auto-generated change reason (maps field names to human-readable labels like "Salary adjustment", "Department change", etc.)

**Key Business Methods:**

| Method | Logic |
|--------|-------|
| `getCurrentSalary()` | Returns `probation_salary` if on probation, else `pass_probation_salary` |
| `isOnProbation()` | `false` if not required; `true` if `now() < pass_probation_date` |
| `hasProbationEnded()` | `true` if not required; `true` if `now() >= pass_probation_date` |
| `getSalaryTypeForDate($date)` | Returns `'probation_salary'` or `'pass_probation_salary'` based on date vs `pass_probation_date` |
| `getSalaryAmountForDate($date)` | Returns the numeric salary for the given date |
| `calculateAllocatedAmount($fte, $date)` | `round(salary * fte, 2)` — fte is raw multiplier here |
| `isActive()` / `isInactive()` | Based on `end_date === null` |
| `isReadyForTransition()` | True only if `pass_probation_date` is today, `end_probation_date` is null, and not already passed |
| `updateFundingAllocationsAfterProbation()` | Recalculates all allocation amounts using `pass_probation_salary` |

### EmployeeFundingAllocation Model (`app/Models/EmployeeFundingAllocation.php`, 163 lines)

**Casts:**
- `fte` → `'decimal:4'`
- `allocated_amount` → `'decimal:2'`
- `status` → `FundingAllocationStatus::class` (PHP backed enum)

**Relationships:**
- `employee()` → belongsTo Employee (withTrashed)
- `employment()` → belongsTo Employment
- `grantItem()` → belongsTo GrantItem
- `history()` → hasMany EmployeeFundingAllocationHistory
- `payrolls()` → hasMany Payroll

**Accessors:**
- `grant` → `$this->grantItem?->grant` (traverses relationship)
- `grant_code`, `grant_name` → convenience shortcuts through grantItem

**No boot events, no soft deletes.**

### GrantItem Model (`app/Models/GrantItem.php`, 97 lines)

**Boot events:** Both `creating` and `updating` call `validateUniqueness()` which checks `(grant_id, grant_position, budgetline_code)` uniqueness at the application level. Skips validation if any of the three fields is null (for hub grants).

**Relationships:**
- `grant()` → belongsTo Grant (withTrashed)
- `employeeFundingAllocations()` → hasMany EmployeeFundingAllocation

### Grant Model (`app/Models/Grant.php`, 366 lines)

- Soft-deletable with 90-day pruning
- `pruning()` manually nullifies `grant_item_id` in `employee_funding_allocations` before permanent delete
- `getDeletionBlockers()` prevents soft-delete if any active allocations reference this grant's items
- Hub grants: codes `'S0031'` (SMRU) and `'S22001'` (BHF)

---

## 4. Backend Services

### EmploymentService (`app/Services/EmploymentService.php`, 564 lines)

**Dependencies:** ProbationTransitionService, ProbationRecordService, CacheManagerService

#### `create(array $validated): Employment`

1. If `probation_required === false`: clears all probation fields
2. If `pass_probation_date` not provided: auto-calculates `start_date + 3 months`
3. Checks for existing active employment (throws `ActiveEmploymentExistsException`)
4. `DB::beginTransaction()`
5. Creates Employment (triggers boot event → EmploymentHistory)
6. If probation required: creates initial ProbationRecord
7. `DB::commit()`
8. Invalidates cache, reloads with relationships

**Active employment check:** Queries where `start_date <= today` AND `(end_probation_date IS NULL OR end_probation_date >= today)`. Note: uses `end_probation_date`, not `end_date`.

#### `update(Employment $employment, array $validated): EmploymentUpdateResult`

1. Handles `probation_required` toggle: clears or recalculates dates
2. Validates department-position relationship
3. Validates date constraints (end_probation must be after start)
4. `DB::beginTransaction()`
5. Updates employment (triggers boot event → EmploymentHistory)
6. If `pass_probation_date` changed: handles probation extension
7. If `end_probation_date < pass_probation_date`: handles early termination
8. `DB::commit()`

Returns `EmploymentUpdateResult` DTO with optional `earlyTermination` flag.

#### `completeProbation(Employment $employment): array`

Loads funding allocations, delegates to `ProbationTransitionService::handleProbationCompletion()`. Returns updated employment and allocations.

#### `updateProbationStatus(Employment $employment, array $validated): array`

Routes to either `handleProbationCompletion()` or `handleManualProbationFailure()` based on `$action` (passed/failed).

### EmployeeFundingAllocationService (`app/Services/EmployeeFundingAllocationService.php`, 795 lines)

#### `store(array $validated, User $performedBy): array`

The most complex method. Two-phase approach:

**Phase 1 — Validate all, create none:**
1. Validates employment exists and has salary
2. Validates `replace_allocation_ids` belong to the employee's active allocations
3. **FTE check:** `existingFteToKeep + newFte` must equal 100 +/- 0.01
4. For each allocation: validates grant_item exists, checks capacity (`grant_position_number`), checks for duplicates
5. If ANY error → throws `FundingAllocationException` with full errors array (all-or-nothing)

**Phase 2 — Create (inside DB transaction):**
1. Marks `replace_allocation_ids` as `Closed`
2. For each validated item: divides FTE by 100, calls `deriveSalaryContext()`, creates record
3. Returns fresh allocations with salary info

#### `batchUpdate(array $validated, User $performedBy): array`

Atomically handles simultaneous updates + creates + deletes:

1. Validates all update/delete IDs belong to this employee/employment
2. **FTE projection** (only counts active allocations):
   - `untouchedFte` = active allocations NOT in updates or deletes (DB decimal x 100)
   - `updatesFte` = from request updates where status is active
   - `createsFte` = from request creates
   - **Special case:** if `projectedTotal <= 0.01` (all being deactivated), 100% rule is skipped
3. `DB::beginTransaction()`
4. Deletes → set status to `Closed`
5. Updates → recalculate `allocated_amount = baseSalary x newFte`
6. Creates → `fteDecimal = fte / 100`, calculate amount, always `Active`
7. Returns fresh allocations + summary

#### `calculatePreview(array $validated): array`

No DB writes. Divides FTE by 100, calls `deriveSalaryContext()`. Returns `fte_decimal`, `fte_percentage`, `allocated_amount`, `salary_type`, `salary_amount`, `is_probation_period`, `pass_probation_date`.

#### `grantStructure(): array`

Returns all grants with their grant_items for the dropdown cascade in the funding modal.

#### `deriveSalaryContext(Employment $employment, float $fte, ?Carbon $effectiveDate): array`

The core salary calculation helper. FTE is already decimal (0–1) at this point. Returns `['salary_type' => string, 'allocated_amount' => round(salary * fte, 2)]`.

### FundingAllocationService (`app/Services/FundingAllocationService.php`, 374 lines)

**LEGACY SERVICE — schema-incompatible.** References `start_date` and `end_date` columns on `employee_funding_allocations` that no longer exist. Methods like `createGrantAllocation()` and `validateGrantCapacity()` would throw SQL errors if called. Effectively dead code.

### ProbationTransitionService (`app/Services/ProbationTransitionService.php`)

**`transitionEmploymentAllocations()`** — The core probation-pass method:
1. Loads active allocations
2. For each: closes the old allocation (status → Closed), creates a new one with post-probation salary via `deriveSalaryContext()`
3. Creates `EVENT_PASSED` probation record
4. Creates employment history entry

**`handleEarlyTermination()`** — Sets allocations to `Inactive` (not Closed), creates `EVENT_FAILED` record.

**`handleManualProbationFailure()`** — Same as early termination but triggered by HR manually.

**`handleProbationExtension()`** — Does NOT touch allocations. Creates extension probation record, updates `pass_probation_date`.

**Salary helpers:** `calculateProRatedSalary()` handles the transition month (blends daily probation and post-probation rates using 30-day month), `calculateFirstMonthSalary()` handles mid-month starts.

---

## 5. Backend Controllers & Routes

### EmploymentController

| Method | Route | HTTP | Permission | Notes |
|--------|-------|------|------------|-------|
| `index` | `/employments` | GET | employment_records.read | Paginated list with filters |
| `searchByStaffId` | `/employments/search/staff-id/{staffId}` | GET | employment_records.read | |
| `store` | `/employments` | POST | employment_records.create | Returns EmploymentResource |
| `show` | `/employments/{employment}` | GET | employment_records.read | |
| `update` | `/employments/{employment}` | PUT | employment_records.update | |
| `destroy` | `/employments/{employment}` | DELETE | employment_records.delete | |
| `completeProbation` | `/employments/{employment}/complete-probation` | POST | employment_records.update | |
| `updateProbationStatus` | `/employments/{employment}/probation-status` | POST | employment_records.update | |
| `probationHistory` | `/employments/{employment}/probation-history` | GET | employment_records.read | |
| `fundingAllocations` | `/employments/{employment}/funding-allocations` | GET | employment_records.read | Excludes Closed status |

### EmployeeFundingAllocationController

| Method | Route | HTTP | Permission | Notes |
|--------|-------|------|------------|-------|
| `index` | `/employee-funding-allocations` | GET | employee_funding_allocations.read | |
| `grantStructure` | `/employee-funding-allocations/grant-structure` | GET | employee_funding_allocations.read | |
| `employeeAllocations` | `/employee-funding-allocations/employee/{employeeId}` | GET | employee_funding_allocations.read | |
| `byGrantItem` | `/employee-funding-allocations/by-grant-item/{grantItemId}` | GET | employee_funding_allocations.read | |
| `show` | `/employee-funding-allocations/{allocation}` | GET | employee_funding_allocations.read | |
| `calculatePreview` | `/employee-funding-allocations/calculate-preview` | POST | employee_funding_allocations.read | Read-only! |
| `store` | `/employee-funding-allocations` | POST | employee_funding_allocations.create | |
| `batchUpdate` | `/employee-funding-allocations/batch` | PUT | employee_funding_allocations.update | Primary save |
| `updateEmployeeAllocations` | `/employee-funding-allocations/employee/{employeeId}` | PUT | employee_funding_allocations.update | |
| `update` | `/employee-funding-allocations/{allocation}` | PUT | employee_funding_allocations.update | |
| `destroy` | `/employee-funding-allocations/{allocation}` | DELETE | employee_funding_allocations.delete | Sets Inactive |
| `bulkDeactivate` | `/employee-funding-allocations/bulk-deactivate` | POST | employee_funding_allocations.update | |

### EmployeeController — `show()` (the critical endpoint)

Returns raw `Employee` model (no Resource transformation) with 17 eager-loaded relationships:

```
employment, employment.department, employment.position, employment.site,
employeeFundingAllocations, employeeFundingAllocations.grantItem,
employeeFundingAllocations.grantItem.grant,
employeeFundingAllocations.employment,
employeeFundingAllocations.employment.department,
employeeFundingAllocations.employment.position,
employeeBeneficiaries, employeeEducation, employeeChildren, employeeLanguages,
leaveBalances, leaveBalances.leaveType,
identifications, primaryIdentification
```

**Important:** This is NOT wrapped in `EmployeeResource`. The raw Eloquent model is serialized to JSON, which is why all relationship keys are snake_case.

---

## 6. Backend Validation

### StoreEmploymentRequest

| Field | Rules |
|-------|-------|
| `employee_id` | required, integer, exists:employees |
| `organization` | required, string, in:SMRU,BHF |
| `position_id` | required, integer, exists:positions WHERE department_id matches |
| `department_id` | required, integer, exists:departments |
| `section_department_id` | nullable, integer, exists |
| `site_id` | nullable, integer, exists |
| `pay_method` | nullable, in:'Transferred to bank','Cash cheque' |
| `start_date` | required, date |
| `pass_probation_date` | nullable, date, after:start_date |
| `end_probation_date` | nullable, date, after:start_date |
| `probation_salary` | nullable, numeric, min:0, **lte:pass_probation_salary** |
| `pass_probation_salary` | required, numeric, min:0 |
| `probation_required` | nullable, boolean |
| `health_welfare` / `pvd` / `saving_fund` | boolean |
| `study_loan` | nullable, numeric, min:0, max:999999.99 |
| `retroactive_salary` | nullable, numeric, min:-999999.99, max:999999.99 |

Post-validation hook: `pass_probation_date` must be strictly after `start_date`.

### UpdateEmploymentRequest

Same fields but all are `sometimes` instead of `required`. `position_id` cross-department validation moves to `withValidator` hook.

### BatchUpdateAllocationsRequest

| Field | Rules |
|-------|-------|
| `employee_id` | required, integer, exists |
| `employment_id` | required, integer, exists |
| `updates` | nullable, array |
| `updates.*.id` | required, integer, exists |
| `updates.*.grant_item_id` | nullable, integer, exists |
| `updates.*.fte` | nullable, numeric, **min:1**, max:100 |
| `updates.*.status` | nullable, in:active,inactive (NOT closed) |
| `creates` | nullable, array |
| `creates.*.grant_item_id` | required, integer, exists |
| `creates.*.fte` | required, numeric, **min:1**, max:100 |
| `deletes` | nullable, array of IDs |

Note: FTE min is 1 in batchUpdate (not 0) — cannot set FTE to 0 via batch.

### StoreFundingAllocationRequest

| Field | Rules |
|-------|-------|
| `employee_id` | required, exists |
| `employment_id` | required, exists |
| `allocations` | required, array, min:1 |
| `allocations.*.grant_item_id` | required, exists |
| `allocations.*.fte` | required, numeric, min:0, max:100 |
| `replace_allocation_ids` | nullable, array of IDs |

### CalculatePreviewRequest

| Field | Rules |
|-------|-------|
| `employment_id` | required, exists |
| `fte` | required, numeric, min:0, max:100 |
| `effective_date` | nullable, date |

---

## 7. Backend API Resources

### EmploymentResource

Returns all employment scalar fields. `is_active` computed inline as `end_date === null`. Benefit percentages read from dynamic properties set by the service (not DB columns). Relationships: `employee`, `department`, `position`, `site`, `employee_funding_allocations` (via `whenLoaded`).

**Missing from output:** `organization` field is NOT included in the resource despite being required on create and used for filtering.

### EmployeeFundingAllocationResource

**Critical FTE transformation:** `'fte' => $this->fte * 100` — converts stored decimal to display percentage.

Always-present: `id`, `employee_id`, `employment_id`, `grant_item_id`, `grant_id` (null if not loaded), `fte` (percentage), `status`, `allocated_amount`, `is_active`, timestamps, audit fields.

Conditional (when loaded): `employee` (limited fields), `employment` (id, start_date, end_probation_date), `grant_item` (with nested grant), flattened `grant_name`, `grant_code`, `grant_position`, `budgetline_code`.

**Missing from output:** `salary_type` — stored in DB but not returned to frontend.

---

## 8. Frontend Component Architecture

### EmployeeFormView.vue — The Container

**Two modes:** Create (`/employees/new`) and Edit (`/employees/:id`), determined by `!!route.params.id`.

**Tab structure (8 total):**

| # | Tab Key | Component | Mode | Save Behavior |
|---|---------|-----------|------|---------------|
| 1 | `basic_info` | BasicInfoTab | Both | Top Save button |
| 2 | `identification` | IdentificationTab | Both | Top Save button |
| 3 | `contact_family` | ContactFamilyTab | Both | Top Save button |
| 4 | `financial` | FinancialTab | Both | Top Save button |
| — | `__divider__` | (visual separator) | Edit only | — |
| 5 | `leave` | LeaveTab | Edit only | Per-action (live) |
| 6 | `records` | RecordsTab | Edit only | Per-action (live) |
| 7 | `employment` | EmploymentTab | Edit only | Per-action (live) |
| 8 | `funding` | FundingTab | Edit only | Per-action (live) |

**Create mode:** Only tabs 1–4 visible. After save → redirects to edit mode via `router.replace()`.

**Live tabs:** When active, the top Save button is hidden and a "Saves per action" badge appears. Each live tab manages its own persistence via modals and emits `refresh` on success.

**Data flow:**
1. `loadEmployee()` → `employeeApi.show(id)` → `employee.value = data.data`
2. Vue reactivity propagates `employee` prop to all live tabs
3. When any live tab emits `refresh`, `loadEmployee()` re-fetches everything

**Dirty tracking:** `JSON.stringify(form) !== savedSnapshot` — only applies to form tabs (1–4).

**URL hash sync:** Tab changes update `route.hash` via `router.replace()`. On mount and hash change, `syncTabFromHash()` activates the correct tab. Tabs are bookmarkable.

---

## 9. Frontend: EmploymentTab.vue

### Props
- `employee` (Object, required) — reads `employee.employment` (single object)

### Emits
- `refresh` — after create, update, delete, or probation status change

### Template Branches

1. **`v-if="employee.employment"`** — Shows read-only employment details:
   - Employment Details: Organization, Department, Section, Position, Site, Start Date, Pay Method, Status
   - Salary: Probation Salary (conditional), Pass-Probation Salary
   - Probation: Required flag, dates, action buttons ("Mark as Passed"/"Mark as Failed")
   - Benefits: Health Welfare, PVD, Saving Fund, Study Loan, Retroactive Salary

2. **`v-else`** — Empty state with "Add Employment" button (gated by `canCreateEmployment`)

### Employment Modal (Add/Edit Combined)

800px wide, 70vh scrollable. Opened by `openAddEmployment()` or `openEditEmployment()`.

**Fields:** Organization (SMRU/BHF), Department (searchable), Position (filtered by department), Section Department (filtered by department), Site, Start Date, Probation Required toggle, End Probation Date, Pass Probation Date, Probation Salary, Pass-Probation Salary, Pay Method, Health Welfare/PVD/Saving Fund checkboxes, Study Loan, Retroactive Salary.

**Dropdown loading:** `loadDropdownOptions()` fires 5 parallel API calls on first modal open: departments, positions, sites, section departments, pay methods. Cached for component lifetime.

**Watchers:**
- `empForm.start_date` → auto-calculates `pass_probation_date = start + 3 months`, `end_probation_date = start + 3 months - 1 day`
- `empForm.probation_required` → clears/recalculates probation fields
- `empForm.department_id` → validates position and section still belong to new department, clears if not

**Skip flags:** `skipDateAutoFill` and `skipDepartmentReset` prevent watchers from firing during edit modal population.

**Validation (manual, in order):** Organization, Department, Position, Start Date, Salary, probation_salary <= pass_probation_salary.

**Save:** `employmentApi.store(payload)` for create, `employmentApi.update(id, payload)` for edit. Emits `refresh` on success.

### Probation Modal

480px. Fields: Decision Date, Reason (required for failed), Notes. Calls `employmentApi.probationStatus(id, payload)`.

---

## 10. Frontend: FundingTab.vue

### Props
- `employee` (Object, required) — reads `employee.employee_funding_allocations` (array, snake_case) and `employee.employment`

### Emits
- `refresh` — after `saveAllocations()` succeeds

### Template Branches

1. **`v-if="employee.employee_funding_allocations?.length"`** — Read-only table showing: Grant (name + code), Grant Position, Budget Line, FTE%, Amount, Status
2. **`v-else-if="!employee.employment"`** — Empty state: "Add an employment record first" (no action button)
3. **`v-else`** — Empty state: "No funding allocations" with "Add Allocation" button (gated by `canCreate`)

### FTE Display

- Read-only header: `totalFte` computed from `employee.employee_funding_allocations`, filters active, sums `fte * 100`. Green tag at 100%, orange otherwise.
- Edit modal header: `editFteTotal` computed from `allocRows`.

### Manage Allocations Modal

1200px wide, `maskClosable=false`, 70vh scrollable.

**Grant structure loading:** `loadGrantStructureData()` fires on first modal open → `GET /employee-funding-allocations/grant-structure`. Cached for component lifetime.

**Edit table columns:** Grant (searchable select, 300px), Position (cascaded from grant, 220px), Budget Line (auto-filled, 110px), FTE% (number input, 110px), Amount (preview, 120px), Status (switch for existing, tag for new), Actions (delete).

**Row management:**
- `makeAllocRow(existing)` → creates a row object with `_key`, `_id`, `grant_id`, `grant_item_id`, `fte` (converted from decimal to percentage), `previewAmount`, `status`
- `addAllocRow()` → pushes a blank row
- `removeAllocRow(index)` → splice, with confirmation if it's the last row

**Grant cascade:** `onAllocGrantChange(row)` clears position and preview when grant changes. `getGrantItemOptions(grantId)` provides position options filtered by selected grant.

**Preview calculation:** `fetchPreviewAmount(row)` calls `POST /calculate-preview` with `{ employment_id, fte }`. On API failure, falls back to local calculation: `salary * (fte / 100)`.

### Save Logic (`saveAllocations()`)

1. Validates all rows have `grant_item_id` and `fte > 0`
2. Diffs `allocRows` against `originalAllocIds` to detect deletes
3. Calls `PUT /employee-funding-allocations/batch` with:
   - `updates`: `[{ id, grant_item_id, fte, status }]` for existing rows
   - `creates`: `[{ grant_item_id, fte }]` for new rows
   - `deletes`: `[id, ...]` for removed rows
4. Emits `refresh` on success

**FTE validation:** The frontend does NOT enforce the 100% rule. It shows a hint ("must total 100%") but `saveAllocations()` does not block saves below 100%. The backend service enforces it (except in `batchUpdate` when all allocations are being deactivated).

---

## 11. Frontend API Layer

### employmentApi.js

| Method | HTTP | Endpoint | Used By |
|--------|------|----------|---------|
| `list(params)` | GET | `/employments` | Not used by tab |
| `show(id)` | GET | `/employments/:id` | Not used by tab |
| `store(payload)` | POST | `/employments` | EmploymentTab create |
| `update(id, payload)` | PUT | `/employments/:id` | EmploymentTab edit |
| `destroy(id)` | DELETE | `/employments/:id` | EmploymentTab delete |
| `probationStatus(id, payload)` | POST | `/employments/:id/probation-status` | EmploymentTab probation |
| `searchByStaffId(staffId)` | GET | `/employments/search/staff-id/:id` | Not used by tab |
| `completeProbation(id)` | POST | `/employments/:id/complete-probation` | Not used (dead) |
| `probationHistory(id)` | GET | `/employments/:id/probation-history` | Not used by tab |

### fundingAllocationApi.js

| Method | HTTP | Endpoint | Used By |
|--------|------|----------|---------|
| `grantStructure()` | GET | `/employee-funding-allocations/grant-structure` | FundingTab modal open |
| `calculatePreview(payload)` | POST | `/employee-funding-allocations/calculate-preview` | FundingTab FTE change |
| `batchUpdate(payload)` | PUT | `/employee-funding-allocations/batch` | FundingTab save |
| `list(params)` | GET | `/employee-funding-allocations` | Not used by tab |
| `store(payload)` | POST | `/employee-funding-allocations` | Not used by tab |
| `update(id, payload)` | PUT | `/employee-funding-allocations/:id` | Not used by tab |
| `destroy(id)` | DELETE | `/employee-funding-allocations/:id` | Not used by tab |
| `employeeAllocations(id)` | GET | `/employee-funding-allocations/employee/:id` | Not used by tab |
| `byGrantItem(id)` | GET | `/employee-funding-allocations/by-grant-item/:id` | Not used by tab |
| `updateEmployeeAllocations(id, payload)` | PUT | `/employee-funding-allocations/employee/:id` | Not used by tab |
| `bulkDeactivate(payload)` | POST | `/employee-funding-allocations/bulk-deactivate` | Not used by tab |

---

## 12. Data Flow: Complete Lifecycle

### Load (View Employee)

```
Browser → GET /employees/:id
  → EmployeeController::show()
    → EmployeeDataService::show()
      → Employee::load(17 relationships)
    → Returns raw Employee JSON (no Resource)
  → Frontend: employee.value = response.data.data
  → EmploymentTab reads: employee.employment.*
  → FundingTab reads: employee.employee_funding_allocations[].grant_item.grant.*
```

### Create Employment

```
User clicks "Add Employment" → openAddEmployment()
  → loadDropdownOptions() [5 parallel API calls, cached]
  → User fills modal fields
  → Watchers auto-calculate probation dates
  → User clicks OK → handleSaveEmployment()
    → Manual validation (6 checks)
    → POST /employments { employee_id, organization, department_id, ... }
      → EmploymentService::create()
        → DB::beginTransaction()
        → Employment::create() [triggers EmploymentHistory via boot]
        → ProbationRecordService::createInitialRecord()
        → DB::commit()
    → emit('refresh')
      → EmployeeFormView.loadEmployee()
        → GET /employees/:id [full reload with all relationships]
        → employee.value updated → all tabs re-render
```

### Create/Update Funding Allocations

```
User clicks "Manage Allocations" → openManageAllocations()
  → loadGrantStructureData() [GET /grant-structure, cached]
  → allocRows seeded from existing allocations or blank row
  → originalAllocIds captured for diff

User edits rows:
  → Grant change → onAllocGrantChange() → clears position and preview
  → Position change → onAllocItemChange() → fetchPreviewAmount()
  → FTE change → onAllocFteChange() → fetchPreviewAmount()
    → POST /calculate-preview { employment_id, fte }
    → Returns allocated_amount (or falls back to local calc)

User clicks "Save Allocations" → saveAllocations()
  → Validates grant_item_id and fte > 0 on all rows
  → Diffs current rows vs originalAllocIds
  → PUT /employee-funding-allocations/batch
    { employee_id, employment_id, updates: [...], creates: [...], deletes: [...] }
      → EmployeeFundingAllocationService::batchUpdate()
        → Validates all IDs belong to this employee/employment
        → FTE projection (must = 100 or 0)
        → DB::beginTransaction()
        → Deletes: status → Closed
        → Updates: recalculate allocated_amount
        → Creates: fteDecimal = fte/100, calculate amount
        → DB::commit()
  → emit('refresh') → full employee reload
```

### Probation Pass → Allocation Recalculation

```
ProbationTransitionService::transitionEmploymentAllocations()
  → For each active allocation:
    → Close old allocation (status → Closed)
    → deriveSalaryContext() with pass_probation_salary
    → Create new allocation with updated amount
  → ProbationRecordService::markAsPassed()
  → EmploymentHistory entry
```

---

## 13. FTE: Storage vs Display Conversion

This is the most critical data transformation in the system.

### Storage
`fte` is stored as a **decimal fraction** between 0.00 and 1.00 in the database. Column type: `decimal(4,2)`.

### API Input (Frontend → Backend)
All write endpoints receive FTE as a **percentage** (0–100). Validation rules confirm: `min:0, max:100`.

### Conversion Points (percentage → decimal before save)

| Location | Code |
|----------|------|
| `store()` line 212 | `$fteDecimal = $item['data']['fte'] / 100` |
| `update()` line 322 | `$newFteDecimal = $validated['fte'] / 100` |
| `batchUpdate()` line 497 | `$newFte = (float) $updateData['fte'] / 100` |
| `batchUpdate()` line 519 | `$fteDecimal = (float) $createData['fte'] / 100` |
| `updateEmployeeAllocations()` line 671 | `'fte' => $allocationData['fte'] / 100` |
| `calculatePreview()` line 267 | `$fteDecimal = $validated['fte'] / 100` |

### FTE Validation (in percentage space)

| Location | Formula | Tolerance |
|----------|---------|-----------|
| `store()` | `(existingFte * 100) + newFte == 100` | +/- 0.01 |
| `update()` | `(otherFte + newFteDecimal) * 100 == 100` | +/- 0.01 |
| `batchUpdate()` | `untouched + updates + creates == 100` | +/- 0.01 |
| `updateEmployeeAllocations()` | `sum == 100` | **NO tolerance (strict)** |

### API Output (Backend → Frontend)

`EmployeeFundingAllocationResource` line 27: `'fte' => $this->fte * 100`

This is the single conversion point on read. The model's `decimal:4` cast produces the raw DB value (e.g., 0.6000), multiplied by 100 → 60.

### Frontend Conversion

- `makeAllocRow()`: `fte: Math.round(Number(existing.fte) * 100)` — redundant since the Resource already converts, but harmless for the raw `show()` endpoint which doesn't use the Resource
- Read-only table: `(record.fte * 100).toFixed(0)` — again redundant double-conversion for the `show()` endpoint data

---

## 14. Probation System

### Lifecycle

```
Employment Created (probation_required = true)
  → ProbationRecord(EVENT_INITIAL, is_active=true)
  → Dates: start_date, pass_probation_date (auto: start + 3 months)

Extension (optional, repeatable):
  → Deactivate current record
  → ProbationRecord(EVENT_EXTENSION, extension_number++, is_active=true)
  → Updates employment.pass_probation_date to new date

Pass:
  → Deactivate current record
  → ProbationRecord(EVENT_PASSED, is_active=true)
  → Close all active allocations, create new ones with pass_probation_salary
  → Employment history entry

Fail (manual):
  → Deactivate current record
  → ProbationRecord(EVENT_FAILED, is_active=true)
  → Set all allocations to Inactive
  → Update end_probation_date if needed
```

### Impact on Funding Allocations

**On probation pass:** All active allocations are **closed and recreated** with new salary amounts based on `pass_probation_salary`. This is a full replacement, not an update. The old allocations become audit trail.

**On probation fail:** All active allocations are set to `Inactive` (reversible). They are not closed or recreated.

**On extension:** Allocations are NOT touched. Only the probation record and employment dates change.

### Salary Determination

`Employment::getSalaryTypeForDate($date)` drives all salary lookups:
- If `probation_required === false` → always `pass_probation_salary`
- If date < `pass_probation_date` → `probation_salary` (if set, else falls through)
- Otherwise → `pass_probation_salary`

---

## 15. Payroll Integration

### One Payroll Record Per Allocation Per Period

The payroll system creates **one record per funding allocation per pay period**. An employee with 3 allocations (20%/60%/20%) gets 3 payroll records per month, each with proportionally scaled deductions.

### Snapshot Fields

Every payroll record snapshots 9 fields at creation time: `snapshot_staff_id`, `snapshot_employee_name`, `snapshot_department`, `snapshot_position`, `snapshot_site`, `snapshot_grant_code`, `snapshot_grant_name`, `snapshot_budget_line_code`, `snapshot_fte`. These make payroll records self-contained and immune to future data changes.

### Calculation Pipeline (per allocation)

1. **Gross salary:** `Employment::getSalaryAmountForDate()` — handles probation/post-probation
2. **Gross by FTE:** `(adjustedGross / 30) * daysWorked * fte` — handles mid-month starts, resignations
3. **13th Month:** December only, YTD average for this specific allocation
4. **PVD/Saving Fund:** 7.5% after probation (Thai → PVD, Non-Thai → Saving Fund)
5. **Social Security:** 5% of full salary capped at 875, then x FTE (Expats exempt)
6. **Health Welfare:** Tiered by salary, FTE-proportional
7. **Tax:** Only on the highest-FTE allocation ("tax allocation")
8. **Study Loan / Retroactive:** Only on tax allocation
9. **Net salary / Total salary:** Standard arithmetic

### Inter-Organization Advances

When `employee.employment.organization !== allocation.grantItem.grant.organization`, the payroll is flagged as requiring an inter-organization advance.

### Budget History

`PayrollService::budgetHistory()` groups payroll records by `{employment_id}_{allocation_id}` and pivots by month. This is the report view showing "Under budget" per month — the equivalent of the Excel's monthly budget columns.

---

## 16. Grant Structure

### Hierarchy

```
Grant (org-level, has code, name, end_date)
  └── GrantItem (position slot within the grant)
        ├── grant_position — job title in the grant
        ├── budgetline_code — budget line reference
        ├── grant_position_number — maximum headcount (capacity)
        ├── grant_salary — budgeted salary
        ├── grant_benefit — budgeted benefits
        └── grant_level_of_effort — budgeted FTE
```

### Capacity Check

`store()` checks: count of active allocations for a grant_item_id vs `grant_position_number`. If at capacity, the allocation is rejected. `grant_position_number = 0` or `null` means unlimited.

### Hub Grants

Codes `'S0031'` (SMRU Other Fund) and `'S22001'` (BHF General Fund) are hub/general fund grants. They have items with `NULL` budgetline_code. The uniqueness constraint skips validation when `budgetline_code` is null.

### Deletion Protection

A grant cannot be soft-deleted while any of its items have active funding allocations (`getDeletionBlockers()`). On permanent deletion (after 90-day prune), `grant_item_id` is nullified in allocations to avoid FK violations.

---

## 17. Excel Comparison

### The Client's Excel: "Payroll SMRU NOOK.xlsx"

3 monthly sheets (Dec 25, Jan 26, Feb 26). Each sheet = complete payroll truth.

**268 unique employees, 305 data rows** (split-funded employees get multiple rows).

**One row = one funding split, containing ALL data:**

```
IDENTITY:        ID, Initial, Name, Full Name, Status of Staff (ID type)
EMPLOYMENT:      Pay Method, PVD/SVF, Status (staff type), Site, Dept, Section Dept
POSITION:        Actual Position, Category, Report To
GRANT/FUNDING:   FTE%, Position Under Grant, Budget Line, Under Budget (grant name)
SALARY:          Basic Salary, Salary by FTE, Compensation/Refund
PAYROLL CALC:    13-month, PVD 7.5%, Employer SI 5%, Employee SI 5%, HW, Tax, Balance
DATES:           Start Date, End Prob, Pass Prob, Promoted Date, Resigned Date
MONTHLY HISTORY: Under Budget for each month (Dec sheet has 12 monthly columns)
META:            Phone, Replace Whom, Notes
```

### Key Data Patterns from Excel

| Metric | Value |
|--------|-------|
| Unique employees | 268 |
| Total rows (split-funded = multiple rows) | 305 |
| Split-funded employees (2+ rows) | 29 (11%) |
| 2-way splits | 22 |
| 3-way splits | 6 |
| 4-way splits | 1 |
| Rows where Actual Position != Position Under Grant | **145 (48%)** |
| Employees whose grant changed during the year | **99 (33%)** |

### "Actual Position" vs "Position Under Grant"

In **48% of rows**, these differ. Examples:
- Employee 62: Actual = "MCH Coordinator", Grant = "M&E Assistant"
- Employee 877 (50/50 split): Two different grant positions across two different grants
- Employee 1099 (20/60/20 split): Three different grant positions across three grants

This distinction — what the person actually does vs what the grant is paying for — is a core operational concept the client works with daily.

### What the Excel Does That the App Doesn't

| Feature | Excel | App |
|---------|-------|----|
| Position + Grant + FTE in one view | One row | Two separate tabs |
| Split-funded = adjacent rows | Visible | Hidden in modal |
| Monthly grant history | 12 columns | No equivalent |
| Payroll per allocation in same row | Same row | Separate Payroll module |
| Add new employee | Type one row | 3-step, 3-save sequential process |
| Filter/sort any column | Native | Limited filters on list |

---

## 18. Known Bugs & Inconsistencies

### Backend

1. **`updateFundingAllocationsAfterProbation()` calculation bug** (Employment.php line 209):
   `($this->pass_probation_salary * $allocation->fte) / 100` — divides by 100 but `fte` is already a decimal (0.60). Result is 100x too small. This method appears to be dead code (unused in reviewed paths).

2. **`grant_fte` bug in `grantStructure()`** (EmployeeFundingAllocationService line 609):
   References `$item->grant_fte` but the column is `grant_level_of_effort`. This key always returns `null`.

3. **`FundingAllocationService` is schema-incompatible** (legacy service):
   References `start_date` and `end_date` columns on `employee_funding_allocations` that no longer exist. Would throw SQL errors if called.

4. **FTE tolerance inconsistency:**
   - `store()`, `update()`, `batchUpdate()` use `abs(total - 100) > 0.01` tolerance
   - `updateEmployeeAllocations()` uses strict `!= 100` with NO tolerance
   - 99.99% is rejected by one path but accepted by others

5. **`destroy()` vs `batchUpdate` delete behavior asymmetry:**
   - Single delete (`DELETE /allocation`) sets status to `Inactive` (reversible)
   - Batch delete (via `batchUpdate`) sets status to `Closed` (permanent)
   - Conceptually the same operation, different outcomes

6. **`salary_type` not returned in Resource:**
   The field exists in DB but `EmployeeFundingAllocationResource` does not include it. Frontend cannot know which salary basis was used.

7. **`organization` missing from EmploymentResource:**
   Required on create, used for filtering, but not included in the response.

8. **`EmployeeDataService::store()` not transactional:**
   If `EmployeeIdentification::create()` fails after `Employee::create()`, the employee exists without identification. Should wrap in `DB::beginTransaction()`.

9. **`allocation_change_logs` table is unused:**
   Migration creates it, but no service writes to it. The `employee_funding_allocation_history` table also appears to have no active writes.

### Frontend

10. **"Manage Allocations" button visibility gap:**
    Header button only shows when `employee.employment && employee.employee_funding_allocations?.length`. Disappears when there are zero allocations, forcing user to find the body "Add Allocation" button instead.

11. **No FTE 100% enforcement on save:**
    `saveAllocations()` does not validate the total equals 100%. The hint says "must total 100%" but the save proceeds regardless.

12. **Double FTE conversion for `show()` endpoint data:**
    The `show()` endpoint returns raw model (not Resource), so `fte` is the decimal value (0.60). The read-only table does `(record.fte * 100).toFixed(0)`. But `makeAllocRow()` also does `Math.round(Number(existing.fte) * 100)`. This works but is fragile — if `show()` ever switches to use the Resource (which already multiplies by 100), the frontend would display 6000% instead of 60%.

---

## 19. UX Analysis & Pain Points

### The Create Flow Problem

Creating a new employee with full assignment requires:

```
Step 1: Save employee (Basic Info tab)
  → POST /employees → page redirect → GET /employees/:id
  → 4 tabs become 8 tabs

Step 2: Navigate to Employment tab (tab 7 of 8)
  → Click "Add Employment" → 5 dropdown API calls
  → Fill modal → Click OK → POST /employments → GET /employees/:id

Step 3: Navigate to Funding tab (tab 8 of 8)
  → Click "Add Allocation" → GET /grant-structure
  → Fill modal → Click Save → PUT /batch → GET /employees/:id
```

**Minimum: 3 separate saves, 3 full page reloads, 9+ API calls, navigating across 3 tabs.**

In the Excel, this is: type one row. Done.

### Information Fragmentation

The user's mental model: "Employee X works at Position Y, funded by Grant Z at FTE%."

The app fragments this into:
- **Tab 7 (Employment):** Position, Department, Salary
- **Tab 8 (Funding):** Grant, Grant Position, FTE, Amount

To compare "Actual Position" vs "Position Under Grant" (which differ 48% of the time), the user must switch between two tabs.

### The Dependency Dead End

User navigates to Funding tab → sees "Add an employment record first" → must mentally backtrack to Employment tab → create employment → return to Funding tab. The dependency is enforced but not guided.

### Employment Tab Buried Deep

Employment (the most operationally important data) is tab 7 of 8. In the Excel, position is always visible. In the app, it requires navigating past 6 other tabs.

### No Inline Salary-by-FTE Visibility

The Excel shows `Salary by FTE = Basic Salary x FTE` in every row. The app requires opening the Funding modal and entering FTE to see the preview amount.

### Monthly Grant History Missing

The Excel's Dec sheet has 12 "Under Budget" columns showing which grant funded each month. Employees whose grant changed mid-year (33% of staff!) relied on this view. The app has no equivalent visible on the employee detail page.

### Dropdown Loading Deferred

Employment tab's dropdowns (5 API calls) only load when the modal opens. On slow connections, the user clicks "Add Employment" and waits for spinners.
