# UX Review: Payroll Module

**Scope:** PayrollListView, Create Payroll Wizard, Payroll Table (Standard + Budget History), Payslip Generation, Detail Drawer

---

## 1. What Works Well

**The four-step payroll wizard is genuinely excellent.** The progression from date selection to organization to preview to processing mirrors exactly how a payroll administrator thinks about their task: "When am I paying? Who am I paying? Does this look right? Go." The preview step with its summary alert, department breakdown collapse, employee search, and expand-all toggle gives the administrator confidence before committing. That confidence is hard-won in payroll software and easy to get wrong.

**Real-time processing feedback with WebSocket + polling fallback.** During bulk payroll creation, the user sees a live progress circle with the current employee name, success/failure counts, and inter-org advance tracking. This is the kind of transparency that prevents the worst moment in payroll administration: not knowing if the system is still working or has silently failed. The fallback to 3-second polling when WebSocket is unavailable is a thoughtful safety net.

**The detail drawer's three-column breakdown grid is the best data presentation in the entire module.** When a user expands an allocation row, they see Income, Deductions, and Employer contributions laid out side by side with clear totals and visual hierarchy. Labels on the left, amounts on the right, totals separated by a border. This is how financial data wants to be read. The fact that this pattern exists makes the main table's approach to the same data even more striking by contrast.

**Budget History view solves a real analytical need.** Being able to see any employee's allocation-level costs across 12 months in a single horizontal scan, with column and row totals, is the kind of view that would otherwise require exporting to Excel. The field selector (Gross by FTE, Net Salary, Gross Salary) lets the same table serve budget planning, cost analysis, and payroll auditing. The summary footer row with grand totals across all employees and months is appropriately weighted.

**Fund type filter badges showing PVD and Saving Fund participant counts** immediately answer "how many employees are in each scheme?" before the user even applies the filter. Small detail, high value.

**Empty states guide rather than blame.** "No payroll records found -- Try adjusting your filters or run your first payroll" tells the user what to do next, not just what's missing.

---

## 2. The Core Tension

The payroll table tries to be a summary dashboard and a detailed spreadsheet at the same time, and achieves neither well. The outer table provides useful grouping, but the inner table's 29 columns of financial data create a horizontal scrolling experience that makes it nearly impossible to compare values across employees or even across allocations within the same employee. The detail drawer already solves this problem beautifully for individual records -- but the main table doesn't acknowledge that the drawer exists. Instead, it duplicates all the same data in a less readable format.

---

## 3. The User's Day

### Payroll Administrator: "Did last month's payroll look right?"

**Today:** The administrator logs in and navigates to the Payroll page. They see the standard view with a list of employee rows grouped by pay period. They set the Pay Period filter to last month and maybe filter by organization. Now they have a list of employees with Record counts and Total Net amounts. To check the details for a specific employee, they click the expand arrow on that row.

A 29-column table explodes horizontally inside the row. The grant code and grant name are visible at the left edge, but every monetary field -- Gross, Gross by FTE, Retroactive, 13th Month, 13th Accrued, Salary Increase, PVD Employee, PVD Employer, SF Employee, SF Employer, Employee SSF, Employer SSF, Employee H/W, Employer H/W, Tax, Student Loan, Total Salary, Total Income, Employer Contribution, Total Deduction, Net Salary, Notes, and Actions -- stretches far to the right. The user scrolls right to find Net Salary, losing sight of which grant code they're looking at because the fixed left column only pins Grant Code. They scroll back to check the grant, then scroll right again to check Tax. This back-and-forth is the tax paid on every detail check.

They click "View" to open the detail drawer. Suddenly the same data is presented beautifully: a clean 9-column summary table with expandable breakdowns in a three-column grid. The drawer is where understanding happens. The table is where confusion lives.

To check another employee, they close the drawer, collapse the expanded row, find the next employee, expand it, and either squint at 29 columns or click "View" again. For 10 employees, that's 10 expand-collapse-view cycles.

**What it should feel like:** The administrator opens the Payroll page, sets their filters, and sees a clean summary table with the 6-7 columns that matter at a glance: Employee, Organization, Department, Pay Period, Records, Total Deductions, and Net Salary. Clicking any employee row opens the detail drawer immediately -- no intermediate nested table to scroll through. The drawer is the drill-down, and the table is the scan. If the administrator needs the full spreadsheet view, a toggle or column picker lets them opt into the dense view. But the default respects the most common task: scanning the summary, then spotting-checking a few employees in detail.

**The gap:** Today, every detail check forces the user through a 29-column horizontal scroll or a two-step expand-then-view flow. The information architecture treats every financial field as equally important for scanning, when in practice, 80% of the time the user only needs 5-6 summary columns.

### Payroll Administrator: "Run this month's payroll"

**Today:** The user clicks "Run Payroll." A full-screen wizard opens. Step 0 asks for the pay period date. They pick the 25th. They click Next. Step 1 asks for the organization. They pick SMRU. They click Preview. Step 2 loads -- they see a summary alert with totals, a department breakdown, and an employee table. They can search, expand, and review individual allocations. When satisfied, they click "Confirm & Process." Step 3 shows real-time progress.

This works well, but steps 0 and 1 are two separate screens for two simple fields. The user clicks "Next" to go from a date picker to a radio button, then clicks "Preview." That's two screens and two button clicks for what is really one decision: "Run payroll for SMRU on March 25th."

**What it should feel like:** The wizard opens to a single "Configure" step with both the date picker and organization selector on one screen. One click to Preview. The rest of the wizard stays the same -- it's already well-designed.

**The gap:** One unnecessary screen transition. Minor, but multiplied by every payroll run, it's a small friction that's easy to remove.

### Grant Manager: "How much did we spend on Grant X across the last year?"

**Today:** The user switches to Budget History view using the small radio toggle. A date range picker and field selector appear inside the table card. They select 12 months and "Gross by FTE." The table shows employees as rows and months as columns, with totals. They can expand an employee to see per-allocation monthly data.

This is powerful but has a subtle problem: the main toolbar filters (Organization, Site, Department) above the table also apply to the budget view, but the user might not notice. The budget view has its own toolbar inside the card, creating a visual separation between "these filters apply" (main toolbar) and "these controls are for this view" (budget toolbar). The search field in the main toolbar works for budget history too, but there's no visual cue that the two toolbar areas are connected.

**What it should feel like:** The budget view inherits all active filters and makes it clear which ones are active. A small breadcrumb or filter summary bar at the top of the budget table ("Showing: SMRU / Finance Department / Jan 2025 -- Dec 2025 / Gross by FTE") would eliminate any ambiguity about what data the user is looking at. Right now, the user has to scan the toolbar above and the toolbar inside the card to reconstruct the active filter state.

---

## 4. What to Cut

### The 29-column inline nested table (demote, don't delete)

**What it is:** When a user expands an employee row in the Standard view, a second table appears inline with 29 columns covering every monetary field from Gross Salary to Notes to Actions.

**Why it should be demoted:** The detail drawer already presents the same data in a far more readable format. The inline table creates horizontal scroll that makes it impossible to correlate Grant Code (left edge) with Net Salary (far right). Users who need the full spreadsheet layout can be served by an export function; users who need to spot-check are better served by the drawer.

**What replaces it:** Two options worth considering:

- **Option A (Recommended): Direct-to-drawer.** Clicking an employee row opens the detail drawer. No inline expansion at all. The outer table stays clean and scannable. The drawer becomes the single place for detail. The "View" link in the nested table becomes unnecessary because the row itself is the trigger.

- **Option B: Slim nested table.** Keep inline expansion but show only 5-6 columns: Grant Code, FTE, Gross by FTE, Total Deductions, Net Salary, and an Action column with View and Payslip links. This gives a quick allocation summary without requiring horizontal scroll. Full details remain in the drawer.

### Two separate wizard steps for date and organization

**What it is:** Step 0 (Pay Period Date) and Step 1 (Organization) are separate screens in the payroll wizard, each requiring their own button click to advance.

**Why it should go:** These are two simple input fields with no dependencies. The date doesn't change based on the organization, and vice versa. Two screens for two fields creates a false sense of complexity.

**What replaces it:** A single "Configure" step with both inputs side by side. The step counter goes from 4 steps to 3: Configure, Review, Processing.

---

## 5. What's Missing

### Column visibility / profile selector

**What the user would see:** A small gear or columns icon in the table header area. Clicking it reveals a checklist of all available columns. The user checks the ones they want to see. Their selection persists across sessions (via localStorage or user preferences).

**Why it matters:** Different roles need different columns. A finance officer checking deductions doesn't need Grant Position or BL Code. A grant manager tracking FTE allocation doesn't need PVD Employer or Student Loan. Right now, everyone gets all 29 columns. A few saved column profiles ("Finance View," "Grant View," "Summary") would eliminate 70% of the horizontal scrolling.

**Impact:** Transforms the daily scanning workflow. Instead of scrolling through irrelevant columns, each role sees exactly the data they use.

### Table sorting

**What the user would see:** Clickable column headers on the outer table with sort arrows. Click "Total Net" to sort employees by their net payroll amount, highest first. Click "Department" to group employees visually by department.

**Why it matters:** The outer table currently has no sorting. Users cannot rank employees by cost, group by department, or find the highest/lowest payroll at a glance. For a table that can show hundreds of employees, the inability to sort is a significant scanning friction.

**Impact:** High for users who need to answer questions like "who are our highest-cost employees this month?" or "show me all employees sorted by department."

### Filtered data export (Standard view)

**What the user would see:** An "Export" button next to "Download Payslips" in the toolbar. Clicking it exports the currently filtered and visible data as an Excel file -- respecting all active filters (organization, department, site, pay period, fund type).

**Why it matters:** Right now, the only export options are individual payslip PDFs and bulk payslip PDFs. There is no way to get the table data -- the numbers the user is looking at on screen -- into a spreadsheet. Users who need to share payroll data with budget managers or auditors must currently screenshot the table or manually transcribe numbers. The Budget History view is especially export-worthy since it's essentially a pivot table.

**Impact:** Medium-high. Eliminates a manual data extraction step for any cross-team reporting.

### Filter summary / active filter indicators

**What the user would see:** After applying filters, a small bar below the toolbar showing active filters as removable chips: "SMRU x | Finance Dept x | Mar 2026 x | PVD x". Clicking the "x" on any chip removes that filter and refreshes.

**Why it matters:** With 5 filter dropdowns plus a search input, the user can easily lose track of which filters are active -- especially after switching between Standard and Budget History views. A filter chip bar makes the current data scope immediately visible and provides a faster way to remove individual filters than finding the right dropdown and clicking "clear."

**Impact:** Low-medium. A quality-of-life improvement that prevents "why am I seeing no data?" moments caused by forgotten filters.

### Per-employee combined payslip download

**What the user would see:** A "Payslip" download icon at the outer employee row level (not just in the nested allocation table). Clicking it generates a single combined payslip for all of that employee's allocations in the selected pay period.

**Why it matters:** Currently, the payslip download button appears in the nested table for each individual allocation record. An employee with 3 grant allocations gets 3 separate payslip downloads. The only way to get a combined payslip is through the bulk modal, which downloads payslips for ALL employees in an organization. There's no middle ground: the user can download one allocation's payslip or everyone's payslips, but not one employee's combined payslip.

**Impact:** Medium. Addresses a specific but recurring need when HR sends individual employees their pay documentation.

---

## 6. Priorities

Ordered by how much daily friction is removed, for the most users, most often:

### Priority 1: Simplify the nested table (Option A or B from section 4)

This affects every user, every time they use the payroll page. The 29-column nested table is the primary source of friction in the module. Either eliminate it in favor of direct-to-drawer (Option A) or slim it to 5-6 key columns (Option B). This single change would transform the payroll page from feeling like a spreadsheet that escaped Excel into a purpose-built payroll management interface.

### Priority 2: Add table sorting to the outer table

Zero-cost improvement in terms of UX complexity (users already expect sortable columns), high value for anyone scanning or comparing payroll data. Sort by Total Net, Department, Organization, or Pay Period.

### Priority 3: Add column visibility controls (if keeping the detailed nested table)

If Option B is chosen (slim nested table with optional full view), column visibility controls let power users access the full 29 columns when they need them without forcing it on everyone by default. If Option A is chosen (drawer-only), this becomes less critical.

### Priority 4: Merge wizard steps 0 and 1

Quick implementation. Removes one unnecessary screen from every payroll run. Small friction, zero downside.

### Priority 5: Add filtered data export

Addresses a real workflow gap. Users who need to share or analyze payroll data outside the app currently have no path from the filtered table to a spreadsheet. Excel/CSV export of the current view solves this cleanly.

### Priority 6: Add filter summary bar

Quality-of-life improvement that prevents filter confusion. Lower urgency because experienced users learn the filter layout, but valuable for reducing support questions and onboarding friction.

### Priority 7: Per-employee combined payslip

Fills the gap between "one allocation's payslip" and "everyone's payslips." Useful but affects a narrower set of interactions than the items above.

---

*Review based on analysis of PayrollListView.vue (653 lines), BulkPayrollModal.vue (713 lines), PayrollBudgetView.vue (337 lines), PayrollDetailDrawer.vue (287 lines), BulkPayslipModal.vue (119 lines), and supporting API/route/utility code.*
