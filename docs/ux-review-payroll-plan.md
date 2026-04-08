# UX Review: PayrollListView Implementation Plan

**Scope:** Analysis of the 7-phase improvement plan against the current payroll module codebase and existing app-wide patterns.

---

## 1. What the Plan Gets Right

**The priority ordering is correct.** The plan leads with the single change that affects every user on every visit -- simplifying the nested table -- and ends with a backend-dependent feature that serves a narrower use case. This is exactly the right instinct: fix what the most people hit the most often first.

**Phase 1 (slim the inner table) is the highest-leverage change in the entire plan.** Right now, expanding an employee row reveals a wall of 29 financial columns that forces horizontal scrolling just to see Net Salary. The proposed 6-column slim table -- Grant Code, FTE, Gross by FTE, Total Deductions, Net Salary, Action -- captures the three questions a payroll administrator actually asks when scanning: "Which grant? How much of their time? What's the net?" Everything else is a drill-down question, and the detail drawer already answers those beautifully with its three-column Income/Deductions/Employer breakdown grid.

**Phase 4 (merging wizard steps) correctly identifies a false sense of complexity.** Picking a date and picking an organization are not separate decisions -- they're one thought: "Run payroll for SMRU on March 25th." Two screens for two fields creates a click tax on every single payroll run. Combining them into one "Configure" step respects how the administrator actually thinks.

**Phase 6 (filter summary bar) solves a real "invisible state" problem.** With five filter dropdowns plus a search box, the current page gives no summary of what's active. An administrator who filtered by SMRU and Finance last time might return to the page, see fewer records than expected, and waste time wondering why -- only to discover a forgotten filter buried in a dropdown. Closable chips make the active state visible at a glance and clearable in one click.

**The plan correctly identifies that existing patterns can be reused rather than invented.** The column customization composable, the sorting pattern from the employee list, the blob download utility, and the abort controller composable are all battle-tested across the app. Reusing them means less risk, faster delivery, and consistent behavior across modules.

---

## 2. The Core Tension in the Plan

The plan treats the inner table and the detail drawer as two separate concerns, but they are actually **the same user question answered in two different places**. The slim inner table shows Grant Code, FTE, Gross by FTE, Total Deductions, and Net Salary. The detail drawer shows... Grant Code, FTE, Gross by FTE, Total Deductions, Net Salary -- plus the full breakdown. The slim table is a preview of the drawer, not an independent view.

This creates a subtle question the plan doesn't address: **after slimming the inner table, is inline expansion still earning its existence?** If the user's primary action after expanding is clicking "View" to open the drawer anyway, the expansion step becomes a toll booth -- one click to reveal a preview, then another click to see the real thing. The plan should explicitly decide: is the slim table a **destination** (users get what they need without opening the drawer) or a **waypoint** (users always end up in the drawer)?

If it's a destination, the 6 columns need to be carefully chosen to answer the scanning question completely. If it's a waypoint, consider whether clicking the outer row should open the drawer directly -- eliminating the expansion step entirely for the most common case, while keeping expansion available for users who want the quick inline glance.

The plan currently hedges: it slims the table AND makes rows clickable to open the drawer. That's fine as a first step. But the review should acknowledge that after observing real usage, the expansion step itself might be the next thing to cut.

---

## 3. The User's Day: Before and After the Plan

### Payroll Administrator Checking Last Month's Payroll

**Today (before plan):**
The administrator opens the Payroll page, sets the Pay Period filter to last month, and sees employee rows. They need to check the tax deduction for a specific employee. They click the expand arrow. A 29-column table explodes horizontally. They scroll right past Gross, Gross by FTE, Retroactive, 13th Month, 13th Accrued, Salary Increase, PVD Employee, PVD Employer, SF Employee, SF Employer... finally reaching Tax. But now they can't see which grant they're looking at because Grant Code scrolled off the left edge. They scroll back. They scroll forward again. For one number. Then they close the expansion, find the next employee, and repeat.

**After Phase 1 (slim table):**
Same scenario. They click expand. Six columns appear: Grant Code, FTE, Gross by FTE, Total Deductions, Net Salary, Action. No horizontal scroll. They see the total deduction amount at a glance. If they need the specific tax breakdown, they click the row (or "View") and the detail drawer slides in with Income, Deductions, and Employer columns side by side. They find Tax instantly. They close the drawer, collapse the row, move to the next employee.

**The improvement:** The scroll-right-scroll-left cycle is eliminated entirely. The drill-down path goes from "expand, scroll, squint, scroll back" to "expand, glance, click for detail if needed." For the 80% case where the administrator just needs to confirm the net amount looks right, the expansion itself is the answer -- no drawer needed.

**After Phases 1 + 3 (slim table + column visibility):**
A finance officer who checks Tax and PVD every single day opens the Columns popover once, checks "Tax" and "PVD Employee," and never thinks about it again. Their inner table now shows 8 columns -- still no horizontal scroll -- and they never need the drawer for their daily task. A grant manager checks "Grant Name" and "BL Code" for their workflow. Each role customizes once, and the page remembers.

### Payroll Administrator Running Monthly Payroll

**Today (before plan):**
Click "Run Payroll." Full-screen wizard opens. Step 1 of 4: pick a date. Click "Next." Step 2 of 4: pick an organization. Click "Preview." Step 3 of 4: review the preview. Click "Confirm & Process." Step 4: watch progress. That's 4 screens and 4 button clicks before processing starts.

**After Phase 4 (merged wizard):**
Click "Run Payroll." Step 1 of 3: pick date AND organization on the same screen. Click "Preview." Step 2 of 3: review. Click "Confirm & Process." Step 3: watch progress. That's 3 screens and 3 button clicks. One fewer screen, one fewer click, and the mental model matches the task: "configure, review, go."

**The improvement:** Small but multiplied by every payroll run. More importantly, it signals to the user that this is a simple operation -- not a complex multi-stage wizard that demands caution at every step.

### Anyone Returning to a Filtered View

**Today (before plan):**
An administrator filtered by SMRU, Finance department, and March 2026 last time they visited. They come back (or switch from Budget History view back to Standard), see a subset of data, and have no summary of what's active. They scan the five dropdowns one by one to reconstruct the filter state. Sometimes they add a new filter without realizing an old one is still active, producing zero results and confusion.

**After Phase 6 (filter summary bar):**
Below the toolbar, a row of chips appears: "Org: SMRU x | Dept: Finance x | Period: Mar 2026 x". One glance, full clarity. Click the x on any chip to remove it. Click "Clear all" to start fresh. The user never has to scan dropdowns to understand what they're looking at.

---

## 4. What to Adjust in the Plan

### Phase 1: Add an "expand-to-drawer" shortcut, not just "click row to open drawer"

The plan says "add customRow to make inner rows clickable to open the detail drawer." This is good, but there's a subtlety: the inner table Action column still has a "View" link that does the same thing. With clickable rows, the "View" link becomes redundant. Consider replacing "View" with a small expand/detail icon and making the entire row the click target. This avoids the user wondering "do View and clicking the row do different things?"

Also consider: **should clicking the outer employee row itself open the drawer?** Many users will try this instinctively. If clicking the outer row expands the inner table, but clicking the inner row opens the drawer, there are two different click-to-reveal behaviors on the same page. That's learnable, but not intuitive. An alternative: the outer row expand arrow stays as-is (toggles inner table), but the inner row click opens the drawer. Or: add a "quick view" icon on the outer row that opens the drawer without expanding first.

### Phase 2: Consider what happens to client-side grouping when sorting

The plan correctly notes that the backend sorts before returning and JavaScript's Map preserves insertion order. But there's a catch the plan should address explicitly: **when the user sorts by "Total Net" (descending), they expect to see the highest-paid employees first.** The current grouping computes `totalNet` by summing all allocations client-side. But the backend sorts individual payroll records by `basic_salary`, not grouped totals. An employee with three 30K allocations (90K total) might sort below an employee with one 50K allocation -- because the backend sees three records of 30K, not one record of 90K.

This is a mismatch between what the user sees (grouped rows with summed totals) and what the backend sorts (individual flat records). The plan should acknowledge this limitation and either:
- Only enable sorting on fields that don't require grouping (Organization, Department, Employee Name, Pay Period)
- Or document that "Total Net" sorting is approximate when employees have multiple allocations

### Phase 3: Placement of the Columns popover matters

The plan says to put the Columns button "in the toolbar row, perhaps next to the view mode radio group." But the column picker affects the **inner** table, not the outer table. Placing it in the main toolbar -- which visually belongs to the outer table and page-level filters -- creates a spatial disconnect. The user changes a setting "up here" and the effect happens "down there, inside an expanded row."

Better placement: a small gear icon that appears at the top-right corner of the expanded inner table itself, or as part of the inner table's header row. This puts the control next to what it controls. The employee list can put its column picker in the toolbar because it controls the main (only) table. The payroll page has two table levels; the control should sit at the level it affects.

### Phase 5: CSV export should respect grouping, not dump flat records

The plan exports `items.value` -- the raw flat payroll records. But the user sees **grouped data**: one row per employee with multiple allocation sub-rows. If the CSV dumps flat records, the user gets a different structure than what they see on screen. They'll need to re-group in Excel, which defeats the purpose of "export what I'm looking at."

Two options:
- **Grouped CSV** (recommended): One section per employee, with allocation rows indented or grouped, matching the on-screen structure. Include the employee-level total net as a summary row.
- **Flat CSV with employee context**: Every row is one allocation, but includes the employee name, staff ID, organization, department -- so the user can pivot/group in Excel. This is simpler to implement and more flexible for analysis.

The flat approach is fine, but the plan should specify which approach and ensure the column headers are human-readable (not API field names like `gross_salary_by_FTE`).

### Phase 7: Validate the combined payslip need before building

The plan adds a backend endpoint and frontend UI for per-employee combined payslips. Before investing in this, it's worth checking: **does the existing bulk payslip endpoint already produce per-employee combined pages?** The bulk payslip generates one A5 page per payroll record. If an employee has 3 allocations, they already get 3 consecutive pages in the bulk PDF. The "combined" payslip endpoint would need to do something meaningfully different -- perhaps a single page that summarizes all allocations, or a cover sheet with totals. If it's just "the same 3 pages but in a separate PDF," the value is lower than the effort.

Clarify what "combined" means to the user before building: is it a **summary** payslip (one page, all allocations merged) or a **bundle** (same individual payslips, just downloaded separately from the bulk)?

---

## 5. What's Missing from the Plan

### The outer table itself needs attention

The plan focuses entirely on the inner table, sorting, and auxiliary features. But the **outer table has its own information density problem** that goes unaddressed. It shows 11 columns: Organization, Employee, Site, Department, Actual Position, Status, Start Date, Pass Probation Date, Pay Period, Records, Total Net.

Of these, **Start Date and Pass Probation Date are rarely relevant to payroll scanning.** These are employment lifecycle fields, not payroll fields. They're useful during the first few months of an employee's tenure (when proration matters), but for the 90% case -- checking established employees' monthly payroll -- they're noise. The column customization composable could be applied to the outer table as well, with Start Date and Pass Probation hidden by default.

### Empty state after the plan

After the slim table is implemented, the empty state message ("No payroll records found -- Try adjusting your filters or run your first payroll") remains adequate. But consider what happens when the user has filters active and gets zero results: the filter summary bar (Phase 6) will show active chips, and the empty state should acknowledge them. Something like "No payroll records match your filters" with a "Clear filters" button directly in the empty state, rather than requiring the user to find and clear chips above.

### Loading state refinement

When switching between Standard and Budget History views, there's a moment where the user is looking at stale Standard view data while Budget data loads (or vice versa). The plan doesn't address this. After implementing the view toggle, consider clearing the visible table immediately on switch and showing a centered spinner, so the user never sees stale data from the wrong view mode.

### Keyboard navigation in the slim inner table

With only 6 columns and clickable rows, the inner table becomes compact enough for keyboard navigation to be practical. Arrow keys to move between allocation rows, Enter to open the drawer, Escape to close it. This isn't a priority, but it's a natural follow-up once the table is slim enough to be navigable without scrolling.

---

## 6. Revised Priority Order

The plan's ordering is mostly right, but with two adjustments:

| Order | Phase | Rationale |
|-------|-------|-----------|
| **1** | **Phase 1: Slim inner table** | Affects every user, every visit. The single biggest friction reduction. |
| **2** | **Phase 6: Filter summary bar** | Prevents confusion for every user who uses filters (nearly everyone). Low effort, immediate clarity. Move this ahead of sorting because filter confusion causes more daily frustration than unsorted columns. |
| **3** | **Phase 2: Sorting** | Enables comparison and analysis workflows. Important but secondary to core scanning. |
| **4** | **Phase 4: Merge wizard steps** | Small friction reduction multiplied by every payroll run. Quick to implement. Move this ahead of column visibility because it's simpler and affects a high-frequency workflow. |
| **5** | **Phase 3: Column visibility** | Lets power users customize their view. Depends on Phase 1's column restructuring. |
| **6** | **Phase 5: CSV export** | Fills a real workflow gap. Lower urgency because it doesn't affect the primary scanning task. |
| **7** | **Phase 7: Combined payslip** | Requires backend work and serves a narrower use case. Validate the need before building. |

**Key change:** Filter summary bar moved from position 3 to position 2. Sorting moved from position 2 to position 3. Wizard merge moved from position 5 to position 4. The reasoning: filter confusion is a silent daily frustration (users don't report it, they just waste time), while sorting is a feature users consciously want but can work around. And the wizard merge is a quick win that shouldn't wait behind the more complex column visibility work.

---

## 7. Plan Verdict

**This is a well-structured plan.** The phases are correctly scoped, the dependencies are accurately mapped, and the implementation order respects user impact. The reuse of existing composables and patterns (column customization, sorting, blob downloads) means low risk and consistent behavior.

The main refinements needed are:
1. **Decide the role of expansion vs. drawer** -- is the slim table a destination or a waypoint?
2. **Limit sorting to non-aggregated fields** to avoid grouped-total mismatches
3. **Place the column picker at the inner table level**, not the page toolbar
4. **Specify CSV export structure** -- flat with context columns is the pragmatic choice
5. **Validate the combined payslip need** before building the backend endpoint

None of these are blockers. Phase 1 can start immediately as planned. The refinements can be incorporated as each phase begins.

---

*Review based on analysis of PayrollListView.vue, PayrollDetailDrawer.vue, BulkPayrollModal.vue, PayrollBudgetView.vue, BulkPayslipModal.vue, EmployeeListView.vue, useColumnCustomization.js, payrollApi.js, reportApi.js, formatters.js, helpers.js, and useAbortController.js.*
