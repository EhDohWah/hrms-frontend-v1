# Bulk Payroll Modal — UI Research & Bug Report

**File:** `src/views/payroll/BulkPayrollModal.vue`
**Date:** 2026-03-06

---

## 1. Overview

The Bulk Payroll Modal is a 4-step wizard:
1. **Pay Period** — select pay date (typically 25th of month)
2. **Organization** — select SMRU or BHF
3. **Review** — preview all employee payroll calculations with expandable allocation details
4. **Processing** — async job with WebSocket/polling progress tracking

The preview table shows employee-level summary rows that expand to show per-allocation breakdowns (Income, Deductions, Employer Contributions).

---

## 2. Bugs Found

### Bug 1: Employee-level aggregation fields missing from API

**Severity:** HIGH — columns show "—" instead of values

The preview table columns reference `record.total_gross`, `record.total_net`, and `record.allocation_count`, but the backend API response does NOT include these at the employee level. The API only provides an `allocations[]` array.

**API response (employee level):**
```json
{
  "employment_id": 1,
  "staff_id": "0096",
  "name": "Ruby Huels",
  "organization": "SMRU",
  "allocations": [...]
  // NO total_gross, total_net, allocation_count
}
```

**Frontend references (broken):**
- Line 112: `record.allocation_count` — undefined
- Line 115: `record.total_gross` — undefined
- Line 121: `record.total_net` — undefined

**Fix:** Compute these from allocations array:
```js
record.allocations?.length                                           // allocation_count
record.allocations?.reduce((s, a) => s + (a.gross_salary_by_fte || 0), 0)  // total_gross
record.allocations?.reduce((s, a) => s + (a.net_salary || 0), 0)           // total_net
```

---

### Bug 2: `study_loan` missing from deductions UI

**Severity:** MEDIUM — deduction exists in API response but not displayed

The backend includes `deductions.study_loan` in each allocation, but the frontend Deductions column doesn't render it.

**API response:**
```json
"deductions": {
  "pvd": 909,
  "saving_fund": 0,
  "study_loan": 500,      // <-- EXISTS but not shown
  "employee_ss": 606,
  "employee_hw": 80,
  "tax": 0,
  "total": 1595
}
```

**Fix:** Add `study_loan` row after Income Tax, before Total Deductions. Only show when value is non-zero (study loan is only on the tax allocation).

---

### Bug 3: Zero-value income additions always displayed

**Severity:** LOW — visual clutter, shows `฿0.00` rows

The Income column always shows all four income additions even when their values are 0:
- `retroactive_salary` — only non-zero when HR manually sets an adjustment
- `thirteen_month` — only non-zero in December
- `salary_bonus` — only non-zero when set by HR/import (annual increase)

**Current behavior:** 4 rows always visible, most showing `฿0.00`
**Expected behavior:** Only show rows with non-zero values

---

### Bug 4: `saving_fund` / `saving_fund_employer` always shown

**Severity:** LOW — visual clutter

Saving Fund rows in Deductions and Employer Contributions always show even when 0. Most employees don't use saving fund. Should be conditional like other optional fields.

---

## 3. Backend Calculation Flow

### Income Additions
| Field | When Non-Zero | Source |
|-------|---------------|--------|
| `salary_bonus` | January only (annual increase), or manually set by HR | `PayrollPolicySetting::KEY_SALARY_INCREASE` rate |
| `retroactive_salary` | When HR sets `Employment.retroactive_salary` (manual adjustment) | `Employment.retroactive_salary` field |
| `thirteen_month` | December only (YTD gross / 12) | Auto-calculated per allocation |
| `deferred_salary` | Employee starts day >= 16, folded into next month's `gross_salary_by_fte` | Auto-calculated, NOT a separate line item |

### Deductions
| Field | When Non-Zero | Source |
|-------|---------------|--------|
| `pvd` | Post-probation, 7.5% of salary | Auto-calculated |
| `saving_fund` | Post-probation, when `Employment.saving_fund_toggle` is true | Auto-calculated |
| `study_loan` | When `Employment.study_loan > 0` (tax allocation only, not FTE-proportional) | `Employment.study_loan` field |
| `employee_ss` | Always (5%, capped at 875/month, FTE-proportional) | Auto-calculated |
| `employee_hw` | Always (tiered by salary and nationality) | Auto-calculated |
| `tax` | Highest FTE allocation only (ACM method) | Auto-calculated |

### Key Rules
- **Tax allocation:** Assigned to allocation with highest FTE (lowest ID as tiebreaker). Only this allocation carries `tax`, `study_loan`, and `retroactive_salary`.
- **Deferred salary:** Already baked into `gross_salary_by_fte`. The `income_additions.deferred_salary` field is for transparency only.
- **Annual increase (January):** Applied to `adjusted_gross_salary` BEFORE FTE calculation. The increase amount appears in the `calculation_breakdown.step_1_salary_determination.annual_increase_rate` field.

---

## 4. Changes Required

### 4.1 Fix employee-level computed values

Add computed helpers for the preview table:
```js
function getEmployeeGross(record) {
  return (record.allocations || []).reduce((s, a) => s + (Number(a.gross_salary_by_fte) || 0), 0)
}
function getEmployeeNet(record) {
  return (record.allocations || []).reduce((s, a) => s + (Number(a.net_salary) || 0), 0)
}
```

Use `record.allocations?.length` for allocation count.

### 4.2 Add study_loan to deductions

After Income Tax row, before Total Deductions:
```html
<div v-if="alloc.deductions?.study_loan" class="alloc-row">
  <span>Study Loan</span>
  <span class="font-mono">{{ fmtCurrency(alloc.deductions.study_loan) }}</span>
</div>
```

### 4.3 Conditionally show income additions

Only show when non-zero:
```html
<div v-if="alloc.income_additions?.retroactive_salary" class="alloc-row">...</div>
<div v-if="alloc.income_additions?.thirteen_month" class="alloc-row">...</div>
<div v-if="alloc.income_additions?.salary_bonus" class="alloc-row">...</div>
```

### 4.4 Conditionally show saving fund rows

```html
<div v-if="alloc.deductions?.saving_fund" class="alloc-row">...</div>
<div v-if="alloc.contributions?.saving_fund_employer" class="alloc-row">...</div>
```

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/views/payroll/BulkPayrollModal.vue` | Fix employee-level computed values, add study_loan row, make income additions conditional, make saving fund conditional |

No backend changes needed — the API already returns all required fields.
