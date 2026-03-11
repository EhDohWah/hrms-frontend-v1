# Ant Design Vue — Nested Table Pattern

## The Pattern

When implementing expandable/nested tables, follow the **exact** Ant Design nested table demo:
https://antdv.com/components/table/#components-table-demo-nested-table

```vue
<a-table :columns="columns" :data-source="data">
  <template #bodyCell="{ column }">
    <template v-if="column.key === 'operation'">
      <a>Publish</a>
    </template>
  </template>
  <template #expandedRowRender>
    <a-table :columns="innerColumns" :data-source="innerData" :pagination="false">
      <template #bodyCell="{ column }">
        <!-- inner cell rendering -->
      </template>
    </a-table>
  </template>
</a-table>
```

### Rules

1. **NO `:scroll`** on either table
2. **NO `fixed` columns** (`fixed: 'left'` / `fixed: 'right'`)
3. **NO `children` column groups** (grouped headers like Income / Deductions)
4. **NO explicit `width`** on columns — let the table auto-size
5. **Simple flat column definitions** — `{ title, key }` or `{ title, dataIndex, key }`
6. **One file** — keep the outer and inner table in the same component, no separate table component
7. **Action links as `<a>` tags** inside `<span class="table-operation">`

### Why These Rules Matter

When an inner table uses `:scroll="{ x: 2000 }"` with `fixed` columns and `children` groups, this chain reaction occurs:

1. Outer `<table>` uses CSS `table-layout: auto` (browser default without `:scroll`)
2. User expands a row — inner table renders in `<td colspan="all">`
3. Inner table's ~2000px width **pushes the `<td>` wider**
4. Browser **recalculates all outer column widths** across the wider table
5. Outer columns get redistributed — some pushed off-screen

The Ant Design demo avoids this because both tables use simple flat columns that fit naturally within their container. No scroll, no fixed, no width conflicts.

---

## Payroll Implementation

**File**: `src/views/payroll/PayrollListView.vue`

### Outer Table (grouped by employee)

| Column | Key | Notes |
|--------|-----|-------|
| Employee | `employee` | Name + staff_id (bodyCell) |
| Org | `org` | a-tag with color (bodyCell) |
| Department | `department` | Plain text via `dataIndex` |
| Records | `records` | Count of payroll records (bodyCell) |
| Total Gross | `gross` | Currency formatted (bodyCell) |
| Total Net | `net` | Currency formatted, bold (bodyCell) |

### Inner Table (individual payroll records)

| Column | Key | Data Field |
|--------|-----|------------|
| Pay Date | `pay_date` | `pay_period_date` |
| Grant / BL | `grant` | `employee_funding_allocation.grant_item.grant.code` + `budgetline_code` |
| FTE | `fte` | `employee_funding_allocation.fte` (displayed as %) |
| Gross (FTE) | `inner_gross` | `gross_salary_by_FTE` |
| Total Income | `total_income` | `total_income` |
| Deductions | `deductions` | `total_deduction` |
| Net Salary | `net_salary` | `net_salary` (green, bold) |
| Total Cost | `total_cost` | `total_salary` |
| Action | `operation` | View / Payslip / Delete links |

### Design Decision

The inner table shows **9 summary columns** instead of the previous 19+ detailed columns. The full financial breakdown (individual income items, deduction items, employer contributions) is accessible via the **"View" action** which opens `PayrollDetailDrawer`.

This keeps the nested table clean and prevents the inner table from needing horizontal scroll, which is what caused the outer table layout to break.

### Data Flow

```
payrollApi.list() → flat payroll records
       ↓
groupedData (computed) → groups records by employment_id
       ↓
Outer table: one row per employee
       ↓ (expand)
Inner table: individual payroll records for that employee
       ↓ (click "View")
PayrollDetailDrawer: full financial breakdown
```

### Row Selection (Bulk Delete)

Row selection is on the **inner table** via `:row-selection`. The `selectedRowKeys` ref is shared across all expanded inner tables. Selecting records from different employees works correctly because each payroll record has a unique `id`.

### Related Components

- `PayrollDetailDrawer.vue` — full payroll detail (all income, deduction, employer fields)
- `PayrollBudgetView.vue` — budget history pivot table (separate view mode)
- `BulkPayrollModal.vue` — bulk payroll creation wizard
