# Organization Field — Issue Fix & Consistency Plan

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Issues Found](#2-issues-found)
3. [Fix 1: Make `employees.organization` NOT NULL](#fix-1-make-employeesorganization-not-null)
4. [Fix 2: Remove Accessor Fallback](#fix-2-remove-accessor-fallback)
5. [Fix 3: Dashboard Stats — Query `employees` Instead of `employments`](#fix-3-dashboard-stats--query-employees-instead-of-employments)
6. [Fix 4: `Payroll::getUniqueSubsidiaries()` — Query `employees` Instead of `employments`](#fix-4-payrollgetuniquesubsidiaries--query-employees-instead-of-employments)
7. [Fix 5: `PayrollsImport.php` — Compound Key Lookup](#fix-5-payrollsimportphp--compound-key-lookup)
8. [Fix 6: `DevEmployeesImport.php` — Compound Unique Rule](#fix-6-devemployeesimportphp--compound-unique-rule)
9. [Fix 7: `ResignationService.php` — Remove Hardcoded SMRU Fallback](#fix-7-resignationservicephp--remove-hardcoded-smru-fallback)
10. [Fix 8: `PayrollService.php` — Remove Defensive Fallback Chain](#fix-8-payrollservicephp--remove-defensive-fallback-chain)
11. [Fix 9: Factory & Seeder — Populate `organization`](#fix-9-factory--seeder--populate-organization)
12. [Implementation Order](#implementation-order)
13. [Verification Checklist](#verification-checklist)

---

## 1. Current State Summary

### Column Definitions

| Table | Column | Type | Nullable | Index | Purpose |
|-------|--------|------|----------|-------|---------|
| `employees` | `organization` | VARCHAR(10) | **YES** | Compound unique `(staff_id, organization)` filtered | Identity: "which org does this person belong to" |
| `employments` | `organization` | VARCHAR(10) | **NO** | Regular index | Contract: "which org is this employment under" |
| `payrolls` | `organization` | VARCHAR(10) | YES | Indexed | Snapshot: immutable copy at generation time |

### Source of Truth Rules (Established)

| Question | Read from |
|----------|-----------|
| "Which org does this employee belong to?" | `$employee->organization` |
| "Which org is this employment under?" | `$employment->organization` |
| "Which org is this payroll for?" | `$payroll->organization` |

### Sync Guarantee

Transfers update both tables atomically (`TransferService.php:47,52` and `EmployeeDataService.php:591,597`).

---

## 2. Issues Found

| # | Severity | File | Line(s) | Issue |
|---|----------|------|---------|-------|
| 1 | **High** | `employees` migration | 19 | `organization` is **nullable** but required by validation + unique index — allows ghost records |
| 2 | **High** | `Employee.php` | 325-328 | Accessor fallback to `employment->organization` masks NULL data bugs |
| 3 | **Medium** | `Employee.php` | 374-376 | Dashboard stats query `Employment` table instead of `Employee` |
| 4 | **Medium** | `Payroll.php` | 323-329 | `getUniqueSubsidiaries()` queries `Employment` instead of `Employee` |
| 5 | **High** | `PayrollsImport.php` | 56 | `Employee::pluck('id', 'staff_id')` — ambiguous now that staff_id isn't globally unique |
| 6 | **High** | `DevEmployeesImport.php` | 411 | `Rule::unique('employees', 'staff_id')` — no compound key, rejects cross-org duplicates |
| 7 | **Low** | `ResignationService.php` | 246 | Hardcoded `?? 'SMRU'` fallback — masks NULL org bugs, wrong for BHF employees |
| 8 | **Low** | `PayrollService.php` | 297 | Defensive fallback chain `$payroll->organization ?? $payroll->employment?->organization ?? 'N/A'` — unnecessary if data is clean |
| 9 | **Low** | Factories/Seeders | — | Don't populate `organization`, will create NULL records |

---

## Fix 1: Make `employees.organization` NOT NULL

### Why

`employees.organization` is validated as `required` in all request classes, enforced in the import, and needed for the compound unique index. But the migration declares it `nullable`, meaning raw SQL inserts, seeders, or bugs can create orphan records that bypass uniqueness.

### File

`database/migrations/2025_02_12_131510_create_employees_table.php`

### Current (line 19)

```php
$table->string('organization', 10)->nullable();
```

### Change to

```php
$table->string('organization', 10);
```

### Also update the filtered unique index (lines 66-70)

Since `organization` can no longer be NULL, we can simplify the filtered index:

**Current:**

```sql
CREATE UNIQUE INDEX [employees_staff_id_organization_unique]
ON [employees] ([staff_id], [organization])
WHERE [deleted_at] IS NULL AND [organization] IS NOT NULL
```

**Change to:**

```sql
CREATE UNIQUE INDEX [employees_staff_id_organization_unique]
ON [employees] ([staff_id], [organization])
WHERE [deleted_at] IS NULL
```

The `AND [organization] IS NOT NULL` filter is no longer needed since the column is NOT NULL.

### Impact

- Existing NULL-org employee records (if any) must be backfilled before this migration runs
- If deploying to an existing database, add a data migration step first:
  ```php
  // Backfill: assign org from employment, default to SMRU if no employment
  DB::statement("
      UPDATE employees
      SET organization = COALESCE(
          (SELECT TOP 1 organization FROM employments
           WHERE employments.employee_id = employees.id
           ORDER BY end_date DESC),
          'SMRU'
      )
      WHERE organization IS NULL
  ");
  ```
- Since migrations haven't deployed to production, this backfill is only needed if dev/staging data has NULLs

---

## Fix 2: Remove Accessor Fallback

### Why

The accessor silently papers over NULL `organization` values by falling back to the employment record. With Fix 1 making the column NOT NULL, this fallback is unnecessary and actively harmful — it hides data integrity bugs instead of surfacing them.

### File

`app/Models/Employee.php`

### Current (lines 321-328)

```php
/**
 * Organization accessor: prefers the employee's own organization column,
 * falls back to the active employment record for legacy data.
 */
public function getOrganizationAttribute($value)
{
    return $value ?? $this->employment?->organization;
}
```

### Change to

```php
/**
 * Organization accessor.
 *
 * The organization column is required (NOT NULL) and is the source of truth
 * for "which org does this employee belong to". The employments.organization
 * field tracks which org the employment contract is under.
 */
public function getOrganizationAttribute($value)
{
    return $value;
}
```

> **Alternative:** Remove the accessor entirely, since returning `$value` unchanged is what Eloquent does by default. However, keeping it as a no-op with the docblock serves as documentation for future developers.

### Impact

- If any employee record has a NULL organization in the database, `$employee->organization` will now return `null` instead of silently reading from employment. This is intentional — it exposes the data bug.
- Combined with Fix 1 (NOT NULL column), this scenario cannot occur for new records.

---

## Fix 3: Dashboard Stats — Query `employees` Instead of `employments`

### Why

The dashboard headcount queries the `employments` table for org counts, but every other org-based query in the system uses `employees.organization`. This is semantically inconsistent — the employee's identity org (employees table) should determine headcount, not the employment contract org.

Today the values are always in sync, so the numbers are identical. But if they ever diverge (e.g., employment record not yet created for a new hire), the dashboard would under-count.

### File

`app/Models/Employee.php`

### Current (lines 374-377)

```php
'organizationCount' => [
    'SMRU_count' => Employment::where('organization', 'SMRU')->whereNull('end_date')->count(),
    'BHF_count' => Employment::where('organization', 'BHF')->whereNull('end_date')->count(),
],
```

### Change to

```php
'organizationCount' => [
    'SMRU_count' => Employee::where('organization', 'SMRU')
        ->whereHas('employment', fn ($q) => $q->whereNull('end_date'))
        ->count(),
    'BHF_count' => Employee::where('organization', 'BHF')
        ->whereHas('employment', fn ($q) => $q->whereNull('end_date'))
        ->count(),
],
```

This reads the org from `employees` (source of truth) while still requiring an active employment (`end_date IS NULL`) to count as "active headcount".

### Alternative (simpler, if "active" means "not soft-deleted")

If the intent is just "how many employees per org exist" regardless of employment status:

```php
'organizationCount' => [
    'SMRU_count' => Employee::where('organization', 'SMRU')->count(),
    'BHF_count' => Employee::where('organization', 'BHF')->count(),
],
```

Choose based on business intent — "active employees with current employment" vs "all employees in org".

---

## Fix 4: `Payroll::getUniqueSubsidiaries()` — Query `employees` Instead of `employments`

### Why

This method provides the organization filter dropdown values in the payroll list UI. It currently queries `employments` for distinct organizations, but should query `employees` for consistency with the source-of-truth rules.

### File

`app/Models/Payroll.php`

### Current (lines 323-329)

```php
public static function getUniqueSubsidiaries()
{
    return Employment::select('organization')
        ->distinct()
        ->whereNotNull('organization')
        ->where('organization', '!=', '')
        ->whereNull('end_date')
        ->orderBy('organization')
        ->pluck('organization');
}
```

### Change to

```php
public static function getUniqueSubsidiaries()
{
    return Employee::select('organization')
        ->distinct()
        ->whereNotNull('organization')
        ->where('organization', '!=', '')
        ->orderBy('organization')
        ->pluck('organization');
}
```

### Note

Add `use App\Models\Employee;` at the top of `Payroll.php` if not already imported.

---

## Fix 5: `PayrollsImport.php` — Compound Key Lookup

### Why

`PayrollsImport.php` uses `Employee::pluck('id', 'staff_id')` to build a staff_id → employee_id map. Since staff_id is no longer globally unique (SMRU-EMP001 and BHF-EMP001 can coexist), this `pluck()` call will overwrite one entry with the other, causing payroll rows to link to the wrong employee.

Similarly, `Employment::pluck('employments.id', 'employees.staff_id')` has the same ambiguity.

### File

`app/Imports/PayrollsImport.php`

### Current (lines 54-65)

```php
// Prefetch staff_ids from DB
$this->existingStaffIds = Employee::pluck('id', 'staff_id')->toArray();

// Prefetch active employments (staff_id -> employment_id)
$this->existingEmployments = Employment::join('employees', 'employments.employee_id', '=', 'employees.id')
    ->whereNull('employments.end_date')
    ->pluck('employments.id', 'employees.staff_id')
    ->toArray();

// Prefetch funding allocations lookup
$this->fundingAllocations = EmployeeFundingAllocation::pluck('id')->toArray();
```

### Change to

```php
// Prefetch staff_id+org compound keys from DB
// Key format: "STAFF_ID|ORG" => employee_id (e.g., "EMP001|SMRU" => 42)
$this->existingStaffOrgKeys = [];
foreach (Employee::select('id', 'staff_id', 'organization')->get() as $emp) {
    $key = strtoupper($emp->staff_id) . '|' . strtoupper($emp->organization ?? '');
    $this->existingStaffOrgKeys[$key] = $emp->id;
}

// Prefetch active employments (staff_id+org -> employment_id)
$this->existingEmployments = [];
$employments = Employment::join('employees', 'employments.employee_id', '=', 'employees.id')
    ->whereNull('employments.end_date')
    ->select('employments.id as employment_id', 'employees.staff_id', 'employees.organization')
    ->get();
foreach ($employments as $emp) {
    $key = strtoupper($emp->staff_id) . '|' . strtoupper($emp->organization ?? '');
    $this->existingEmployments[$key] = $emp->employment_id;
}

// Prefetch funding allocations lookup
$this->fundingAllocations = EmployeeFundingAllocation::pluck('id')->toArray();
```

### Also update all lookup sites

Everywhere the import resolves `staff_id` to an employee/employment, update to use the compound key:

```php
// BEFORE
$employeeId = $this->existingStaffIds[$staffId] ?? null;
$employmentId = $this->existingEmployments[$staffId] ?? null;

// AFTER
$compoundKey = strtoupper($staffId) . '|' . strtoupper($organization);
$employeeId = $this->existingStaffOrgKeys[$compoundKey] ?? null;
$employmentId = $this->existingEmployments[$compoundKey] ?? null;
```

### Payroll Template Must Include Organization

The payroll import template (`PayrollTemplateExport.php`) needs an `organization` column so the importer knows which employee to match. Without this, there's no way to disambiguate `EMP001` when it exists in both SMRU and BHF.

**Add to `PayrollTemplateExport.php` headers:**

```php
// Add organization as the second column (after staff_id)
'organization',  // REQUIRED - SMRU or BHF
```

**Add to `PayrollsImport.php` validation rules:**

```php
'*.organization' => 'required|string|in:SMRU,BHF',
```

**Add to the row processing in `collection()` method:**

```php
$organization = strtoupper(trim($row['organization'] ?? ''));
$compoundKey = strtoupper($staffId) . '|' . $organization;
```

### Property declaration update

```php
// BEFORE
protected $existingStaffIds = [];

// AFTER
protected $existingStaffOrgKeys = [];
```

---

## Fix 6: `DevEmployeesImport.php` — Compound Unique Rule

### Why

`DevEmployeesImport.php` uses `Rule::unique('employees', 'staff_id')` which enforces global uniqueness on staff_id. This rejects valid imports where the same staff_id exists in a different organization.

### File

`app/Imports/DevEmployeesImport.php`

### Current (line 411)

```php
'*.staff_id' => ['required', 'string', Rule::unique('employees', 'staff_id')->whereNull('deleted_at')],
```

### Change to

```php
'*.staff_id' => ['required', 'string'],
```

Then add compound uniqueness validation in the row-level processing (same pattern as `EmployeesImport.php`):

```php
// In the collection() method, before inserting:
$compoundKey = strtoupper($row['staff_id']) . '|' . strtoupper($row['org'] ?? '');

// Check against DB
$existing = Employee::where('staff_id', $row['staff_id'])
    ->where('organization', $row['org'])
    ->whereNull('deleted_at')
    ->exists();

if ($existing) {
    $errors[] = "Row {$rowNumber}: Staff ID '{$row['staff_id']}' already exists for organization '{$row['org']}'";
    continue;
}
```

### Also ensure organization is set

The `DevEmployeesImport` uses a column called `org`. Make sure it maps to `employees.organization`:

```php
// In the employee data array being inserted:
'organization' => strtoupper(trim($row['org'] ?? 'SMRU')),
```

---

## Fix 7: `ResignationService.php` — Remove Hardcoded SMRU Fallback

### Why

Line 246 has `$employee->organization ?? 'SMRU'` which silently defaults BHF employees to SMRU if their organization is NULL. With Fix 1 (NOT NULL column), this fallback should never trigger, but the hardcoded 'SMRU' is wrong as a default.

### File

`app/Services/ResignationService.php`

### Current (line 246)

```php
'organization' => $employee->organization ?? 'SMRU',
```

### Change to

```php
'organization' => $employee->organization,
```

Since `organization` is NOT NULL after Fix 1, the null coalescing is unnecessary. Removing it ensures that if something is wrong, it fails visibly rather than silently misattributing to SMRU.

---

## Fix 8: `PayrollService.php` — Remove Defensive Fallback Chain

### Why

Line 297 has a triple fallback: `$payroll->organization ?? $payroll->employment?->organization ?? 'N/A'`. This masks data issues. If a payroll record has no organization, that's a bug — it shouldn't silently fall back.

Similarly, line 354 has `$payroll->organization ?? $payroll->employment?->organization`.

### File

`app/Services/PayrollService.php`

### Current (line 297)

```php
'organization' => $payroll->organization ?? $payroll->employment?->organization ?? 'N/A',
```

### Change to

```php
'organization' => $payroll->organization,
```

### Current (line 354)

```php
$view = ($payroll->organization ?? $payroll->employment?->organization) === 'BHF'
    ? 'pdf.bhf-payslip' : 'pdf.smru-payslip';
```

### Change to

```php
$view = $payroll->organization === 'BHF' ? 'pdf.bhf-payslip' : 'pdf.smru-payslip';
```

### Impact

If a payroll record has NULL organization (which is a data bug), the payslip will default to the SMRU template instead of silently reading from employment. This is acceptable — the real fix is ensuring payrolls always have organization set (which `ProcessBulkPayroll.php:448` already does).

---

## Fix 9: Factory & Seeder — Populate `organization`

### Why

After Fix 1 makes `employees.organization` NOT NULL, any factory or seeder that creates Employee records without setting `organization` will throw a database error.

### Files to update

Search for all files in `database/factories/` and `database/seeders/` that create Employee records.

### Pattern

```php
// In EmployeeFactory.php definition():
'organization' => fake()->randomElement(['SMRU', 'BHF']),

// In any seeder that creates employees:
Employee::create([
    'staff_id' => 'EMP001',
    'organization' => 'SMRU',  // ADD THIS
    // ... other fields
]);
```

### Specific check needed

Run this grep before implementation to find all affected files:

```bash
grep -rn "Employee::create\|Employee::factory\|Employee::insert" database/
```

---

## Implementation Order

Execute fixes in this order to avoid breaking changes:

```
Phase 1: Data Integrity (no behavior change)
├── Fix 9: Factory/Seeder — add organization field
├── Fix 1: Migration — make organization NOT NULL + simplify index
└── Fix 2: Remove accessor fallback

Phase 2: Consistency Fixes (align queries to source of truth)
├── Fix 3: Dashboard stats — query employees table
├── Fix 4: getUniqueSubsidiaries() — query employees table
├── Fix 7: ResignationService — remove SMRU fallback
└── Fix 8: PayrollService — remove fallback chains

Phase 3: Import Fixes (require template changes)
├── Fix 5: PayrollsImport — compound key lookup + template update
└── Fix 6: DevEmployeesImport — compound unique rule
```

**Phase 1** must go first because Fixes 2, 7, and 8 all depend on the column being NOT NULL.
**Phase 3** goes last because it requires updating Excel templates that users may have downloaded.

---

## Verification Checklist

### After Phase 1

- [ ] Run `php artisan migrate:fresh` — no errors
- [ ] Attempt to create employee without organization via Tinker — expect DB error
- [ ] Verify `$employee->organization` returns the column value directly (no employment fallback)
- [ ] Run all seeders — no NULL organization errors

### After Phase 2

- [ ] Dashboard shows correct SMRU/BHF counts
- [ ] Payroll organization filter dropdown still shows both orgs
- [ ] Create a resignation for a BHF employee — verify org is 'BHF' not 'SMRU'
- [ ] Generate a payslip — verify correct template selected

### After Phase 3

- [ ] Download payroll import template — verify `organization` column exists
- [ ] Import a payroll file with SMRU EMP001 and BHF EMP001 — both link to correct employees
- [ ] Import via DevEmployeesImport with same staff_id in different orgs — both created successfully
- [ ] Import via DevEmployeesImport with same staff_id AND same org — rejected with error

### Integration Test: Full Transfer Flow

1. Create employee `EMP001` in SMRU
2. Create employment for `EMP001` in SMRU
3. Transfer `EMP001` from SMRU to BHF
4. Verify `employees.organization` = 'BHF'
5. Verify new `employments.organization` = 'BHF'
6. Verify old employment record still shows `organization` = 'SMRU' (audit trail)
7. Create new employee `EMP001` in SMRU (should succeed — different org from transferred employee)
8. Generate payroll for both — verify correct org stamped on each payroll record

---

## Files Modified (Summary)

| Phase | File | Change |
|-------|------|--------|
| 1 | `database/migrations/2025_02_12_131510_create_employees_table.php` | Remove `->nullable()`, simplify index |
| 1 | `app/Models/Employee.php` | Remove accessor fallback |
| 1 | `database/factories/EmployeeFactory.php` | Add `organization` to definition |
| 1 | `database/seeders/*.php` | Add `organization` to all Employee creates |
| 2 | `app/Models/Employee.php` | Dashboard stats query from employees |
| 2 | `app/Models/Payroll.php` | `getUniqueSubsidiaries()` query from employees |
| 2 | `app/Services/ResignationService.php` | Remove `?? 'SMRU'` |
| 2 | `app/Services/PayrollService.php` | Remove fallback chains (lines 297, 354) |
| 3 | `app/Imports/PayrollsImport.php` | Compound key lookups |
| 3 | `app/Exports/PayrollTemplateExport.php` | Add `organization` column |
| 3 | `app/Imports/DevEmployeesImport.php` | Compound unique validation |
