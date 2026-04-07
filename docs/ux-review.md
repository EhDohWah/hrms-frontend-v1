# UX Review — HRMS Frontend (v2)

> **Revised against the backend architecture.** The system's guiding principle is documented in `docs/architecture/HRMS_BACKEND_ARCHITECTURE.md`: **"This HRMS backend is fundamentally a data digitization system, not a workflow management system."** Approvals happen offline on paper; the app records final states. This review has been rewritten from scratch against that intent.

---

## 1. What the App Actually Is

The HRMS is a **digital filing cabinet** for HR paperwork. HR officers receive completed paper forms — leave requests signed by supervisors, resignation letters countersigned by managers, personnel action forms approved by department heads — and transcribe them into the system so the records exist, can be searched, and can be exported for compliance.

The app is not an approval pipeline. It is not where decisions get made. It is where decisions get *recorded* after they've been made somewhere else (usually in a room, on paper, with signatures).

This reframing matters because it changes what "good UX" means here. A workflow tool should feel like a conveyor belt. A data-entry tool should feel like a fast, accurate, forgiving typewriter with excellent search. They are different products and they deserve different critiques.

---

## 2. What Works Well

**The list-centric navigation is the right shape for this product.** Every module opens on a searchable, filterable table. For a records system, that's correct. Users come to find records, not to process work. The sidebar-to-list-to-record flow matches how HR staff actually think: "I need to update Somchai's leave balance" → Employees → find Somchai → open → edit. No detour, no ambiguity.

**Ctrl+K global search.** For a transcription workflow — HR officer has a paper form on their desk, needs to find the matching employee record — this is the single most valuable interaction in the app. Most HRMS tools bury employee lookup inside a module. You put it one keystroke away.

**The permission model is quiet and correct.** Users never see buttons they can't use. The sidebar shows only modules they have read access to. The system respects the fact that a data-entry clerk and an HR manager see different slices of the same records.

**Cross-tab session sync and real-time permission updates.** If an admin revokes a user's payroll permission, that user's tabs adjust immediately. This is the kind of reliability a records system earns trust with over years.

**The activity timeline on detail pages.** For a system whose purpose is "preserve the final state of HR actions," per-record audit history is not a nice-to-have. It's part of the job. The timeline is well-placed and well-scoped.

**Bulk payslip ZIP download and Excel import.** These are the two fastest paths from paper to digital (import) and digital to distribution (bulk payslips). They're built.

**The nested payroll table.** For an employee with multiple grant allocations, the expand-to-see-lines pattern preserves the mental model of "one employee, many funding sources." This is a good shape for the underlying data.

---

## 3. The Core Tension

**Several surfaces in the app pretend to be a workflow tool when the backend explicitly isn't one. The UI treats "status" like a workflow stage — gated by buttons, wrapped in confirmations, split into modals — when it is just a data field being updated from a paper decision.**

A leave request's "status" is a column the HR officer copies from a signed form. A resignation's "supervisor approval" is a checkbox she ticks because the supervisor's signature is on the letter in front of her. But the UI dresses those status updates in approval-flow theater: open record → "Approve" button → confirmation modal → status pill turns green. That choreography is borrowed from workflow apps, and in a records app it slows down transcription without adding safety.

Every confusing or heavy moment in the UX traces back to this: the app inherits workflow-tool conventions (dashboards with "pending" counts, Approve/Reject buttons, read-only status tags waiting for a button press, confirmation modals on status changes) in a system whose backend explicitly says "system stores final states."

The fix is not to add workflow features. The fix is to **stop pretending to be a workflow tool and fully embrace being a records system.** That simplifies the UI, speeds up data entry, and makes the frontend match the backend's architecture.

---

## 4. The User's Day

### The HR officer transcribing leave requests

**Today.** She has a stack of 12 signed leave request forms on her desk. She opens Leave Requests, clicks "Add Leave Request," selects the employee from a dropdown, types leave type, start date, end date, reason, clicks Submit. The modal closes. The list refreshes. She clicks "Add Leave Request" again. Twelve times. For the already-approved ones, she has to create the record, then click View on the row, then click Approve in the modal, then confirm — three more clicks per record just to mark a status the paper already tells her.

**What it should feel like.** The "Add Leave Request" form has a **Status** dropdown at the bottom: Draft / Submitted / Approved / Rejected. She picks "Approved" at entry time, because the form in her hand is already signed. Save and the record is correct in one pass. There's also a "Save and add another" button on the modal, and the employee field auto-focuses after each save. Twelve records in under five minutes, one modal at a time, no second trip.

**The gap.** The app makes status a two-step workflow when the backend treats it as a field. Separating "create record" from "set status" doubles the work for the 80% case where the paper already tells the officer the final status.

---

### The HR admin filing a resignation

**Today.** The resignation letter is signed by the employee, the supervisor, and the HR manager. She opens Resignations, clicks Add, fills employee/dates/notes, submits. The record lands in the list as "Pending Supervisor Approval" — which is *wrong*, because the supervisor already signed. She opens the record. There is no way to change the status in this UI. The approval fields are read-only. She closes the record, puzzled.

**What it should feel like.** The resignation form has two status fields: Supervisor Acknowledgement (Pending / Acknowledged / Declined) and HR Acknowledgement (Pending / Acknowledged / Declined), both editable at data entry time. She sets both to Acknowledged with the matching dates from the paper, types the approver names, saves. The record is complete.

**The gap.** The backend has no workflow; the UI imposes one by making status fields read-only. This is the sharpest example of frontend contradicting backend architecture. The status columns should be editable data fields like every other field on the form.

---

### The HR admin onboarding a new employee

**Today.** She has a new-hire packet: personal info sheet, national ID copy, family info form, bank details, employment contract. She opens `/employees/new`. She fills Basic Info, Identification, Contact & Family, Financial — four tabs — then clicks the top Save button at the header. The page reloads in edit mode. Three new tabs appear past a divider: Leave Balances, Records, Employment & Funding. The header behavior changes visibly at the divider: crossing into the live tabs, the "Save" button disappears and a "Saves per action" label takes its place. Back in the first four tabs, a red "Not Saved" badge sits next to the Save button whenever any field is dirty. Switching between tabs — Identification → Leave Balances → back to Financial — preserves her in-progress edits and keeps the "Not Saved" state visible, because the form component stays mounted.

The real exposure is at **page-level navigation**, not tab-level. If she clicks a sidebar link, clicks "← All Employees" in the breadcrumb, presses Back, or closes the tab while "Not Saved" is showing, the unsaved edits in the first four tabs are lost without a prompt. There's no `beforeRouteLeave` guard and no `beforeunload` listener to warn her.

**What it should feel like.** The two save models stay as they are — they're clearly signaled (Save button + "Not Saved" badge vs. "Saves per action" label) and tab switching is already safe. What's added: a route-leave guard and a browser-close listener that prompt "You have unsaved changes. Leave anyway?" only when the first-group form is dirty. The rest of the page's behavior doesn't change.

**The gap.** Narrow and targeted: no navigation-level guard against leaving the page with unsaved first-group edits. The hybrid save model itself is legible in the UI — state preservation across tabs and the visual signaling at the divider carry the load.

---

### The HR officer finding a record to update

**Today.** An employee calls asking to update their bank account. The officer presses Ctrl+K, types part of the name, hits Enter, lands on the employee page. Total: about 4 seconds. This path is excellent.

Alternative path: she navigates Sidebar → Employees, sees a table with 13 columns and horizontal scroll, searches by name, clicks the row. Slower, noisier, but works.

**What it should feel like.** The Ctrl+K path already does. The list view should become leaner to match — 4 default columns (name, staff ID, department, status) with a "Customize columns" control for power users who need more. No horizontal scroll in the default view.

**The gap.** Two parallel paths to the same record, one fast and one slow. The slow one is the default, which means new users develop the slow habit first.

---

### The payroll officer running the month's payroll

**Today.** She opens Payroll, clicks Bulk Payroll. A full-screen 4-step wizard opens. She picks the pay period date (typically the 25th), clicks Next. She selects SMRU or BHF, clicks Preview. A spinner says "Calculating payroll for all employees..." while the backend dry-runs the entire payroll calculation. The preview loads: a summary banner ("247 employees, 312 payroll records, Total Net: THB 14,234,567"), any warnings (missing probation dates, allocation issues), and a searchable, expandable table of every employee with 25 columns of allocation-level detail. She can spot-check any employee by name, expand rows to verify FTE and deductions, and scan warnings. When satisfied, she clicks "Confirm & Process." The wizard advances to a real-time progress screen with per-employee WebSocket updates. It completes; she clicks Done.

**What works well.** The population-based selection (pick an org, everyone's included) is correct — payroll is population-shaped, not individual-shaped. The server-side preview runs the actual payroll engine, so the numbers are accurate, not estimates. The expandable employee roster with search is exactly right for spot-checks. The real-time processing feedback with per-employee progress is well above what most payroll UIs provide.

**What's still missing from the preview.** The raw data is all there, but the *interpretation layer* — the part that turns a 400-row spreadsheet into a 10-second sanity check — is not:

- **No month-over-month comparison.** "Total Net: THB 14.2M" means nothing in isolation. "Up THB 187,000 from last month (+1.3%)" would give the officer instant confidence or instant alarm. The system has all historical payroll data to compute this.
- **No department breakdown.** The preview response already includes each employee's department. A compact summary table (department → employee count → total net) would let the officer catch anomalies without scanning 400 rows.
- **No bank account warnings.** The preview doesn't flag employees missing bank accounts. Payroll without a bank account means salary is calculated but can't be disbursed.
- **Pay period not redisplayed on the preview.** The officer selected the date on step 1 and arrives at the preview two clicks later. A wrong month (April instead of May) would generate payroll for the wrong period, and the preview doesn't prominently remind her which period she's reviewing.
- **Warnings are dead-ends.** A warning like "Employee EMP002 is missing probation pass date" doesn't link to the employee record. The officer can't fix it without closing the wizard and starting over. A link to the employee (opening in a new tab) plus a "Refresh Preview" button would close the loop.
- **Failed payrolls aren't identified by name on completion.** The processing screen shows "2 failed" but doesn't say which employees. The error download endpoint exists on the backend but isn't surfaced on the completion screen.

**The gap.** The wizard's structure is sound and the data is accurate. What's missing is the narrative that turns data into confidence: comparisons, groupings, and anomaly flags that tell the officer whether this run looks *normal* — so she doesn't have to hold last month's numbers in her head to feel safe clicking Confirm.

---

## 5. What to Cut

**The "Approve / Reject" button language in leave request modals.** Replace with a Status dropdown at data entry time. The paper form already states the status; the UI should accept it in one pass, not gate it behind a second modal.

**The confirmation modal on every status change.** Status changes are reversible (just edit the record again). Destructive permanent actions (delete from recycle bin, payroll submission, bulk delete) deserve confirmation. Status edits do not. Confirmation fatigue trains users to ignore the prompts that matter.

**The "Pending" count widgets on the dashboard as workflow signals.** They're framed as inbox counts — "12 pending leave requests" — which implies the app will route the user through them. It won't. Either reframe them as data-entry backlogs ("12 leave requests with status = Submitted — click to filter list") or demote them in favor of widgets that match the records-system framing: "Records added this week: 47," "Employees missing bank details: 3," "Payroll runs this month: 2."

**Horizontal-scroll 13-column default on employee list.** Default to four columns. Put the rest behind "Customize columns" with per-user persistence.

**Transfer and Resign buttons at equal visual weight with Save in the employee detail header.** Save is used every edit; the other two are used once in an employee's lifetime. Demote to a secondary actions menu.

**Read-only status fields on resignation detail.** Status is a data field; users with update permission should be able to edit it directly. The UI currently enforces a workflow that the backend doesn't have.

---

## 6. What's Missing

**"Save and add another" on every create modal.** Transcription workflows live on this button. Eight of the ten create modals in the app could have it.

**Keyboard-first data entry in create modals.** Tab order through fields, Enter to save, Escape to cancel, Ctrl+Enter for "save and add another." HR officers transcribing 30 forms in a row should not need to touch the mouse.

**Duplicate detection on employee create.** Before saving a new employee, the form should warn if a staff ID, national ID, or name+DOB match exists. In a records system, duplicate records are the enemy; the system should protect itself.

**Save-and-continue-to-related-record patterns.** After creating an employee, the natural next step is to create their Employment record. After creating a resignation, the natural next step is to look at their open leave balances. Offer these explicitly instead of leaving the user to navigate.

**A navigation-level "Unsaved changes" guard on the employee form.** Tab-switching already preserves state and the "Not Saved" badge signals the dirty state clearly — those parts work. What's missing is the two narrow guards at the page boundary: a Vue Router `beforeRouteLeave` hook on the employee detail component and a `window.onbeforeunload` listener, both gated on whether the first-group form is dirty. Together they prompt "You have unsaved changes — leave anyway?" when the user clicks a sidebar link, hits Back, follows the breadcrumb, or closes the tab. Small, targeted, high-trust.

**Inline computed feedback on date fields.** When she enters a leave start and end date, show "5 working days." When she enters a resignation date and last working date, show "60 days notice period." The backend computes these on submit; showing them live helps catch typos at entry time.

**Import preview improvements.** For bulk Excel import, show a row-by-row preview with validation errors inline before committing. Rejecting a whole import because of one bad row is punishing; surface fixable errors so the user can repair the Excel file in place.

**A "recent activity" shortcut.** For a records system, "what did I touch today" is a more useful dashboard widget than "what's pending." Show the last 10 records the current user created or edited, with quick links back.

**Contextual tooltips on domain jargon (FTE, PVD, fund type, budget line, grant allocation).** These terms are central to the data but undocumented in the UI. A new HR clerk's ramp-up time is the cost.

**Month-over-month comparison in the bulk payroll preview.** The preview shows accurate totals but no baseline. "Total Net: THB 14.2M" means nothing without "up 1.3% from last month." The system has all historical payroll data to compute this. This is the single highest-value addition to payroll confidence.

**Department/site breakdown in the bulk payroll preview.** The preview response already includes each employee's department and site. A compact summary table would let the officer catch department-level anomalies without scanning 400 rows.

**Actionable warnings and Refresh Preview in the bulk payroll wizard.** Warnings currently show text but don't link to the employee record. Adding links (open in new tab) and a "Refresh Preview" button would let the officer fix a warning and verify the fix without restarting the wizard.

**Bank account warnings in the bulk payroll preview.** Payroll without a bank account is calculated but can't be disbursed. The preview should flag employees missing bank details.

**Failure details on bulk payroll completion.** The processing screen counts failures but doesn't name them. The error download endpoint exists on the backend; it should be surfaced as a "Download Error Report" button on the completion screen, with failed employee names shown inline.

---

## 7. Priorities

Ordered by how much they improve data-entry speed, accuracy, and trust — the three things that matter in a records system.

1. **Make status fields editable at data entry time.** Leave request status, resignation acknowledgement — turn them into form fields, not buttons. Single biggest alignment with backend architecture, and removes the sharpest UX friction.

2. **Add navigation-level unsaved-changes guards on the employee form.** Vue Router `beforeRouteLeave` + `window.onbeforeunload`, gated on the first-group dirty state. A targeted two-hook fix. Tab-switching already works; this closes the remaining data-loss surface at page navigation.

3. **Add "Save and add another" + keyboard-first entry to create modals.** This is the transcription workflow's productivity lever. Compound win across every module.

4. **Add duplicate detection on employee create.** Prevents the one class of error that a records system cannot tolerate: duplicate truth.

5. **Enhance bulk payroll preview with comparison and breakdown.** The preview wizard exists and works well. Add month-over-month comparison, department breakdown, bank account warnings, and actionable warning links to turn the accurate data into a confident 10-second sanity check.

6. **Reframe dashboard widgets around records activity, not pending workflows.** Remove the implication that the app drives approvals.

7. **Cut employee list default columns; add column customization.** Make the default view match what users actually do at a glance.

8. **Inline computed feedback on date fields.** Catches typos at entry time.

9. **Improve import preview with inline validation.** Unlocks the bulk entry path the backend explicitly supports.

Item 1 is the structural alignment work — it fixes the contradiction between this UI and the backend's architecture. Item 2 is a small targeted fix at the one remaining data-loss boundary. Items 3–4 compound speed and safety on the data-entry hot path. Item 5 adds the interpretation layer that turns the existing bulk payroll preview from accurate data into confident decisions. Items 6–9 are refinements that pay off once the structure is right.

---

## What Changed From the First Review

The first version of this review proposed turning the app into a workflow tool: inbox queues, inline approve/reject, "next item" routing after actions. That recommendation was wrong for this system. The backend explicitly states "No Workflow Automation — business logic and approvals happen offline; system stores final states," and the frontend is the data entry and display surface for exactly that philosophy.

Everything in the original review about "the app knows 12 pending requests but makes the user scan for them" was arguing for a workflow feature the backend architecture deliberately excludes. That critique has been removed.

What remains, reframed: the UI currently *borrows the language and choreography* of a workflow tool (approve buttons, pending counts, read-only status, confirmation modals) without being one. That borrowed theater slows data entry without providing workflow value. The fix is to drop the workflow theater and fully embrace being a fast, accurate records system — which is what the backend already is.

---

## Closing Note

The foundations are strong, and they are well-matched to the system's real purpose once you see it clearly. The design system is clean. The permission model is disciplined. Search, audit trails, and cross-tab sync are genuinely well-done for a records tool.

The work ahead is to **align the UX with the architecture**: edit status fields like data, optimize for transcription speed, catch duplicate and unsaved data before it corrupts the record, and add the interpretation layer to bulk payroll that turns accurate data into confident decisions. Do that, and this app becomes what it's designed to be — a fast, trustworthy digital filing cabinet for HR — without needing to become anything it isn't.

---

## 8. Module-by-Module Review

This section walks each module as a user would experience it, noting what works, what drags, and what's specifically mis-shaped for a data-entry system. Think of it as a punch list organized by module.

---

### Dashboard

**What works:** The greeting ("Good morning, [name]") plus the date lands people in context. The permission-gated widget grid means each user sees only their world. The Quick Stats row across the top is legible at a glance.

**What drags:**
- The four headline stats ("Total Employees," "On Leave Today," "Pending Requests," "Payroll This Month") all show `—` during initial load rather than skeletons. The page looks broken for the first second every visit.
- "Pending Requests" is a single number that conflates leave requests, personnel actions, and job offers. A user clicking that count doesn't know what they're about to see.
- No refresh button or "as of HH:mm" timestamp on any widget. The data is potentially stale the moment the user stops looking.
- "Quick Actions" widget is just a menu of buttons to create leave requests / employees / etc. For a data-entry tool, these are fine; for dashboard real estate, they earn their spot only if they're the most-used five actions. They aren't labeled by frequency.

**Data-entry lens:** Replace "Pending" widgets (which imply workflow queues) with records-activity widgets: "Records you added this week: 47," "Unfinished employment records: 3," "Employees missing bank details: 5," "Next scheduled payroll: April 2026."

**Clicks to do anything productive:** 1–2 (sidebar or widget click → list). That's fine.

---

### Notifications

**What works:** The bell badge and popover (recent 8) is a standard shape that works. Mark-all-read and Clear-read are appropriately prominent.

**What drags:**
- Notifications don't link to the record they reference. A notification saying "Leave request for Somchai was updated" doesn't let the user jump to that record. The notification is informational trivia, not navigation.
- 50 per page with no pagination control visible — the full-page view just dumps everything. For a long-running system this list will eventually become slow.
- Clicking a notification only marks it read; it doesn't take the user anywhere. This is a dead interaction.
- Error-detail notifications are truncated to 3 lines with no "see more" to expand inline. If an import failed with 14 row errors, the user sees 3.

**Data-entry lens:** Each notification should carry a "View record" link to the subject record (employee, leave request, payroll run). In a records system, notifications without a destination are noise.

---

### Leave Requests (UPDATED — improvements implemented)

**What works:** The multi-item grid inside the create/edit modal — where a single request can contain Annual + Sick leave items with different date ranges — matches how people actually take leave. The inline balance badge (green/orange/red) and the overlap-detection alert are genuinely excellent.

**Implemented improvements:**
- Status now defaults to "Pending" on create (explicit, not empty). User can change to Approved/Declined/Cancelled at entry time if the paper is already signed.
- **"Create & Add Another" button** added — saves, resets form, auto-focuses employee field. Separate loading states per button.
- Approval section renamed to **"Acknowledgement Information"** — labels say "Supervisor Acknowledged" / "HR/Site Admin Acknowledged" to match the data-entry framing. Record View section updated to match.
- Days display now shows **"5 working days"** with explicit unit label instead of bare number.
- Submit button changed from generic "Create" to **"Create Leave Request"**.
- Shared `validateForm()` / `buildPayload()` / `submitForm()` eliminate duplication between save and save-another.
- Employee debounce timer cleaned up on unmount.

**Remaining observations:**
- The three status representations (dropdown + two checkboxes + dates) are still present. They serve different purposes: Status = overall outcome, checkboxes = who signed the paper. Consider whether the checkboxes should auto-set Status (e.g., both acknowledged → Status auto-becomes "Approved").
- Two viewing modes (Record View modal + Edit modal) still exist. Consider merging into one surface with an Edit toggle.

---

### Leave Types (UPDATED — improvements implemented)

**What works:** Simple, clean CRUD form. Four fields match backend exactly. Sortable by name.

**Implemented improvements:**
- **"Create & Add Another" button** added — saves, resets form, auto-focuses Name field. Uses shared `submitForm()` pattern.
- Submit button changed from generic "OK" to **"Create Leave Type"** (create) / **"Save Changes"** (edit).
- Custom modal footer with Cancel / Create & Add Another / Create Leave Type buttons.
- `show-count` added to Description textarea.
- `destroy-on-close` on modal for clean state.

**Remaining observations:**
- Deleting a leave type doesn't warn about existing records or balances referencing it. The backend has guards, but the user gets a generic error rather than "3 employees have balances for this type."
- `default_duration` isn't explained — is it an annual entitlement? A single-use grant? The label says "days" but not what it governs.

---

### Leave Balances (UPDATED — improvements implemented)

**What works:** The nested table (employee → per-leave-type balances) is the right shape. Color-coded remaining days (red ≤0, orange ≤3, green >3) is scannable.

**Implemented improvements:**
- **Balance adjustment modal** added — "Adjust" button on each inner-table row (permission-gated on `leave_balances.update`). Opens a modal with Total Days / Used Days inputs and a live-computed **Remaining preview** with color coding. Calls `PUT /leave-balances/{id}` matching backend's `UpdateLeaveBalanceRequest`.
- **API methods added** — `balanceStore()` and `balanceUpdate()` in `leaveApi.js` to match backend's existing but previously uncalled endpoints.
- **Employee count tag** added to page header.
- **Improved layout** — header now has stats row (year selector + count) and filter row (org + search) with consistent spacing.
- **Inner table actions column** — conditionally shown only if user has update permission.
- **Better empty state copy** — "No leave balances for this employee" instead of generic "No leave balances".
- Cell class names aligned with project conventions (`cell-sub` instead of `cell-staff-id`).

**Remaining observations:**
- Client-side pagination (per_page: 10000) is still in use. The backend supports server-side pagination and sorting, but the grouping-by-employee logic requires all records upfront. A proper fix requires a backend endpoint that returns pre-grouped data. For now the 10k fetch works for typical HR datasets (< 500 employees × 10 leave types = 5000 records).
- No way to *create* a new balance from this page (only adjust existing). The backend's `POST /leave-balances` is wired but needs a create form if manual balance creation is required (currently auto-created when leave types are added).
- No export capability. For year-end reporting, HR may want to download the balance summary as Excel.

---

### Leave Types

**What works:** Simple CRUD, handles what it needs to handle. "Requires Attachment" toggle is a good affordance for configuring downstream behavior.

**What drags:**
- No preview of how "Default Duration" is actually used. A user setting "Annual Leave: 12 days" may not know if that's an initial balance, a monthly accrual, or an annual grant.
- Deleting a leave type doesn't warn about existing records using it. If 300 leave requests reference "Sick Leave," deleting that type should at least say so.

---

### Attendance

**What works:** Clean status field (Present / Absent / Late / Half Day / On Leave), clock-in/clock-out times, notes. Fits the daily transcription pattern.

**What drags:**
- No total-hours auto-calc visible in the modal — user enters clock-in and clock-out, but the Hours column in the table reads from server. Show the computed hours in the form as the user types.
- No "Bulk add for this date" — HR transcribing Monday's attendance for 50 employees has to open the modal 50 times. The form has a date field, an employee field, and a status. A bulk surface that lets her pick a date then rapid-fire status + times per employee would be the single biggest speed-up here.
- Status drives nothing conditionally — "On Leave" and "Absent" still show Clock In/Out fields that make no sense for them.

**Data-entry lens:** This is one of the highest-volume transcription tasks in the system. It deserves a dedicated bulk-entry mode (grid view: rows = employees, cols = date/status/in/out/notes, tab-to-next-field).

---

### Holidays

**What works:** Simple form — Name, Date, Type, Description. Good.

**What drags:**
- HR officers typically enter a year's worth of public holidays at once (10–15 records). The form is single-entry with no "Save and add another" and no Excel paste-in. "Bulk by date range" exists in the API but isn't surfaced as a form.
- No duplicate warning if a holiday already exists on that date.
- "Type" column uses tag colors (blue/purple/default) but the labels (Public/Company/Optional) aren't explained anywhere — a new user doesn't know which to pick.

---

### Grants

**What works:** The expandable row showing Grant Positions with columns for Position Title, Budget Line, Salary, Benefit, Effort %, and a computed Monthly Cost is the right shape. The monthly cost calculation is useful inline.

**What drags:**
- There's no guard on total effort exceeding 100% across positions within a grant. A user can accidentally allocate 3 × 50% = 150% effort with no warning.
- "Effort" is stored as a decimal (0.0–1.0) but displayed as a percentage. If the user sees 100% and types 100 into the input, it becomes 10000%. (Whether this happens depends on precision handling — worth testing.)
- No summary row at the bottom of the positions table (total monthly cost, total effort committed).
- No visibility *from a grant* into which employees are currently funded by it. The grant-to-employee relationship lives in funding allocations on the employee side only.

**Data-entry lens:** Total-effort validation and a summary row are safety features for a records system dealing with budget data.

---

### Payroll

**What works:** The 4-step bulk payroll wizard (Date → Organization → Preview → Processing) is well-structured. The population-based selection is correct — pick an org and everyone's included. The server-side preview dry-runs the actual payroll engine, so numbers are accurate. The expandable employee roster with per-allocation detail (25 columns of income, deductions, contributions) gives full transparency. The search/filter bar in the preview lets the officer spot-check by name. Real-time WebSocket progress during processing with per-employee updates and running stats (successful / failed / advances) is excellent feedback. The payroll list view's Budget History mode and fund-type badges are useful analytical tools.

**What drags:**
- The preview summary banner shows raw totals ("247 employees, THB 14.2M net") but no comparison to last month. The officer has to remember or look up last month's number to know if this looks right.
- No department or site breakdown in the preview. The data is in the response (each employee has department and site) but isn't aggregated into a summary table. The officer scans 400 rows to catch a department-level anomaly.
- The pay period date is selected on step 1 but not prominently redisplayed on the preview screen. A wrong month would generate payroll for the wrong period.
- Warnings (missing probation dates, allocation issues) are text-only with no links to the affected employee records. The officer can't fix a warning without closing the wizard and starting over.
- No "Refresh Preview" button. After fixing a warning in another tab, the officer must restart the wizard from step 1.
- The completion screen shows failure counts but not which employees failed. The error download endpoint exists but isn't surfaced.
- Bank account presence isn't checked in the preview. Payroll without a bank account is calculated but can't be disbursed.
- The 25-column inner table in the preview draws attention as the primary review mechanism, but no officer reviews 25 columns across 300+ allocations. The summary banner and warnings are what actually drive the confirm/reject decision. Consider defaulting rows to collapsed.
- The payroll list view fetches all records at once (per_page: 10000) for client-side grouping. Works now, but will slow down as the organization grows.
- Individual payroll records can't be edited in-place. The detail drawer is read-only; corrections require the separate correction workflow.

**Data-entry lens:** The wizard structure is sound. The next step is adding an interpretation layer: month-over-month comparison, department breakdown, bank account warnings, actionable warning links, and failure details on completion. These turn accurate data into a confident 10-second sanity check.

---

### Interviews

**What works:** Candidate + Position + Date + Interviewer pattern matches how interviews are logged on paper. Allowing both select and freetext for Position is pragmatic.

**What drags:**
- Two status concepts — "Status" (Completed / Pending / Scheduled / Cancelled) and "Hired Status" (Hired / Rejected / Pending) — are neighbors in the form with no visual grouping or explanation. They're asking different questions (did the interview happen? did we hire?) and deserve to be separated.
- Interview Date + Start Time + End Time are three fields. Most users will fill Date and skip times.
- Score is a 0–100 number input with precision 2 — "87.50" is possible. A scale that precise for interview scoring usually isn't the reality on the paper form. An integer 1–10 scale would match typical interview rubrics better, but that depends on org practice.
- No "Save and add another" — interviews are typically entered in batches after a hiring day.

---

### Job Offers

**What works:** The PDF preview modal (iframe rendering the generated offer letter) with Download and Close buttons is a genuine feature. Two salary fields (Probation + Post-Probation) match employment contract structure.

**What drags:**
- "Note" is required on the form with no explanation of what belongs there. A required field with no guidance is a trap — users type "N/A" or a single character to get past it.
- Acceptance Status is gated-looking (Pending / Accepted / Rejected / Withdrawn) but is just data. Good that it's a dropdown, consistent with the data-entry model.
- No "Send offer" action — the PDF is generated on-demand but the user has to email it themselves. For a data-entry system that's fine; for a user whose next step is "send this PDF," it's a missing handoff.

---

### Training (+ Detail Page)

**What works:** The detail page with Info Cards (Organizer, Start, End, Enrolled count) plus an Attendance table is a solid shape. Enrolling and editing attendance inline on the detail page is the right UX.

**What drags:**
- **Three ways to enroll an employee in training:**
  1. Training detail page → Enroll Employee button
  2. Employee Training list view → Enroll Employee button
  3. Employee detail → Training tab (if exists)
  Each of these is legitimate as a browsing view, but the create form in all three does the same thing. Users will pick inconsistently.
- The list view has both a **Record View modal** (triggered by "View") and a **detail page** (triggered by clicking the title). Two ways to "see the training" with different levels of detail and different actions. Pick one primary read surface.
- The detail page's attendance table has no pagination — if a training has 200 attendees, it loads them all.
- No bulk enrollment — for a mandatory training applied to an entire department, the user adds attendees one at a time.

**Data-entry lens:** A "Bulk enroll" mode (pick department/organization → preview list of affected employees → confirm) would eliminate the biggest pain point here.

---

### Training Types

**What works:** Tiny, simple CRUD. Client-side filtering is appropriate for a small lookup list.

**What drags:** Nothing significant. This module is the right size.

---

### Employee Training

**What drags:**
- This view is just the reverse index of the Training module — employees as rows instead of trainings. It's a valid browsing surface, but it creates the third entry point for the same enrollment data and the third different column set describing the same thing.

**Data-entry lens:** If this view stays, it should be framed explicitly as "All enrollments across all trainings" with filters leading the user to subset it. Right now it looks like a peer of Training, which confuses the mental model.

---

### Personnel Actions

**What works:** The form structure — Current Information (read-only) → Action → New Information — is a clean representation of "what's changing." Showing current state before asking for new values prevents errors. Reference Number in mono gives each record a fixed identifier to search by.

**What drags:**
- The Approvals column in the list uses **four colored dots** (Dept Head / COO / HR / Accountant) that visually imply a sequential workflow. In reality these are independent data fields. A user seeing this pattern for the first time will interpret it as a pipeline.
- The form has conditional sections depending on Action Type (Transfer Subtype only shows for transfers, salary fields only for salary changes). That's good in principle, but it also means the form feels different every time — the user can't build muscle memory.
- There's no "clone previous action" capability. For a promotion that happens every December across multiple employees, re-entering the same fields 20 times is the reality.

**Data-entry lens:** The approval dots should either be labeled with dates (so users read them as "signed on X, Y, Z") or replaced with a more neutral progress indicator that doesn't suggest gating.

---

### Transfers

**What drags:**
- The page is **read-only**. There's no Add Transfer button. Records are created elsewhere (probably via Personnel Actions or the Transfer button on employee detail), but this isn't communicated on the page. A user arriving here expecting to create a transfer will leave confused.
- No link back to the source record (the Personnel Action that created the transfer, or the employee's detail page).
- The detail modal is just an Ant Descriptions block. No timeline, no related records, no "view employee" button.

**Data-entry lens:** If this page exists only as a read-only audit view, it should state that at the top ("Transfers are created from Personnel Actions. This page is a log.") with a link to where they *are* created. Currently it's an orphan.

---

### Resignations

**What works:** The detail page's computed cards (Notice Period, Days Until Last Working, Overdue) are useful at-a-glance reads for HR tracking. The Timeline card showing Submitted → Supervisor ack → HR ack is readable.

**What drags:**
- Same status-representation duplication as Leave Requests: a Status field at list level, plus Supervisor Approved + HR Manager Approved checkboxes in the form, plus a Timeline at detail level. Three representations of the same information.
- The list's "Status" column shows computed strings like "Pending Supervisor" or "Approved" — but the underlying fields are checkboxes. A user wanting to change the status from the list has to click through to Edit, find the right checkbox, and understand the mapping.
- Last Working Date is optional on the form but required for computing Notice Period, Days Until, and Overdue. If the user skips it, three computed fields show garbage or blank.
- No link from the resignation to the employee's detail page, despite being the most relevant cross-link in the app.

**Data-entry lens:** Make the Status column on the list view directly editable via an inline dropdown that writes both checkboxes at once. Or drop the checkboxes and make Status the only field.

---

### Reports

**What works:** The two-surface design — a searchable card grid of report types plus a right-side drawer for configuration — is a sensible shape. Staggered fade-in is polish that works.

**What drags:**
- No preview. User fills a date range, picks filters, clicks Generate, and either gets a file download or nothing. If the filter returns zero rows, the generated PDF might be empty with no warning.
- No "Recently generated" list. For a user who generates the same monthly payroll report every month, re-entering the same filters every time is unnecessary.
- No indication during generation. A slow report (5+ seconds for large date ranges) leaves the user wondering if anything is happening.
- No email delivery option. For distribution, the user downloads then attaches manually.
- No bookmarkable/shareable report configurations.
- "Generate" button label is vague — "Download PDF" / "Download Excel" (matching the selected format chip) would be clearer.

**Data-entry lens:** A records system's whole value is in getting data back out. This is one of two places in the app where that happens (Export buttons + this). It deserves saved configurations and a generation history.

---

### Data Import

**What works:** Three separate cards (Grant Import, Employee Import, Data Onboarding) with explicit purposes and template downloads. Clear explanation in each card description. The drag-drop uploader and file-type restrictions are standard.

**What drags:**
- The ordering constraint ("Grant Import must happen before Data Onboarding") is stated in card copy but not enforced by the UI. A user can upload Data Onboarding first and get confusing errors.
- No row-by-row preview before committing. User uploads, waits, and gets a result alert with success count and errors in a list. If the file has 200 rows and 14 have errors, they have to fix Excel offline and re-upload.
- No progress bar during processing — just a button spinner. A 10,000-row import looks frozen.
- No "Partial import with skip errors" option. It's all-or-nothing per card.
- No recent-imports history. If the user uploaded yesterday and wants to know whether that import actually took, they have to go elsewhere.

**Data-entry lens:** This is the **primary bulk-entry path** for a system whose backend explicitly supports Excel imports. It is the single most important data-entry surface in the entire app and it's the least polished. A row-level preview with inline error highlighting, commit-selected-rows, and an import history view would transform this module.

---

### Organization (Sites / Departments / Positions / Section Departments)

**What works:** Simple CRUD forms with consistent shapes. Switches for Active/Inactive are standard.

**What drags:**
- The organization hierarchy (Sites → Departments → Section Departments → Positions) is displayed as four flat lists. A user trying to understand "what departments exist at Site MWK" has to go to Departments and filter, rather than clicking into MWK from Sites to see its tree.
- No tree/outline view of the organization structure anywhere.
- Deleting a Site doesn't warn about employees still assigned to it.

**Data-entry lens:** An org-structure browse view (a nested tree) would serve HR staff better than four separate lists. Even as a read-only overview page, it would help people orient.

---

### Settings (Benefits / Tax / Tax Brackets / Tax Calculator / Payroll Policies)

**What drags:**
- These settings drive payroll calculations for the whole organization. Changing a tax bracket affects every subsequent payroll run. There's no audit trail surfaced in the UI ("Last changed by X on date Y"), no confirmation with before/after comparison, and no "test on sample employee" before saving.
- Five separate pages for what is effectively one configuration surface. A user setting up taxes has to navigate between Tax Settings, Tax Brackets, and Tax Calculator. They share a domain and probably belong grouped.

**Data-entry lens:** A "Last changed" header on every settings page (date + user) is a minimum for a records system handling financial rules.

---

### Admin (Users / Roles)

**What works:** The permissions editor (per-user fine-grained) is a thorough implementation of a messy problem. Avatar + role + last-login columns tell the story of each user at a glance.

**What drags:**
- Password strength requirements are only in hint text ("Min 8 chars, upper, lower, digit, special"). No real-time strength meter, no inline checklist showing which requirements are met as the user types.
- "Role" column shows only the first role if a user has multiple — a truncation that hides information.
- The Permissions editor route (`/admin/users/:id/permissions`) is a separate page from the user Edit modal. Editing a user and editing their permissions are two different trips. They should share a surface.

---

### Recycle Bin

**What works:** Model-based color coding (Employee=blue, Grant=green, etc.) makes the mixed list scannable. Bulk Restore and Bulk Delete are both present. "Deleted 2 days ago" time-ago formatting is friendly.

**What drags:**
- No filter by date (only by model type). To find "the employee I deleted last Tuesday" in a list of 200 deleted records, the user scrolls.
- No way to see *why* a record was deleted or by whom. Just "Deleted At."
- Permanent delete has a confirmation but doesn't show what the record actually was beyond its name — if two "John Smith" employees were deleted, the user can't tell them apart before permanently losing one.

---

### Activity Log

**What drags:**
- This exists as a standalone page, but the most useful place for activity is *on the detail pages of the records the activity refers to*. Employee detail already has an activity timeline — good. Other modules (leave requests, payroll, grants) don't surface per-record activity inline.
- No diff view shown in the current template read. Users need to see "field X changed from A to B" not just "record was updated."

**Data-entry lens:** For a records system, inline activity on every detail page is more valuable than a central log page. Keep the central page for audits, but ensure each detail view surfaces its own history.

---

### Profile

**What works:** Three clear cards (Info, Password, Permissions read-only). Avatar upload via camera-icon overlay. The Permissions card showing the user their own access rights is a nice trust-builder.

**What drags:**
- Password change is inline with Profile Info — no "re-authenticate to change password" step. Minor security concern.
- No session management ("log out other devices") despite the app having cross-tab sync infrastructure.

---

### Cross-Module Patterns Worth Naming

**The "OK" button problem.** Every create/edit modal uses Ant Design's default "OK" button. For a data-entry tool, this is too generic. "Create Leave Request," "Save Employee," "Update Grant" — labels that match the action make the user's intent visible to them before they click.

**The two-view pattern (Record View + Edit).** Leave Requests, Interviews, Job Offers, Training, Grants, and Employee Training all have both a Record View modal (triggered by "View") and an Edit modal (triggered by "Edit"). The user has to know which mode they need before clicking. A single modal with an "Edit" mode toggle inside would be simpler — and is closer to how most apps handle this.

**The "Save and add another" absence.** Every single create modal in the app saves and closes. For a transcription tool where users often have 10–30 paper forms to enter in one session, this is the single highest-impact missing feature. Add it once, add it everywhere.

**Inconsistent pagination reset.** Some filter changes reset the table to page 1, some don't. This is the kind of inconsistency users feel without being able to name.

**Status-field theater.** Documented throughout — the pattern repeats across Leave, Resignations, Personnel Actions, Interviews, Job Offers.

---

## 9. Per-Module Priorities (Beyond the Top-Level List)

If the primary priorities in §7 are about structural alignment, these are per-module quick wins that don't depend on them:

1. **Data Import:** Row-level preview with inline error highlighting + commit-selected-rows. This module is the entire system's bulk-entry path and it's under-built.
2. **Attendance:** Bulk-by-date grid entry mode.
3. **Dashboard:** Skeleton loading for stats (not `—`); replace "Pending" widgets with records-activity widgets.
4. **Notifications:** Make each notification a link to its subject record.
5. **Organization:** An org-tree browse view on top of the four flat lists.
6. **Settings:** "Last changed by / on" header on every settings page.
7. **Grants:** Total-effort validation across positions within a grant.
8. **Holidays:** Repeat-for-year / Excel-paste bulk entry.
9. **Transfers:** Either give it a create form, or add a clear "This page is a log" banner with links to where transfers are created.
10. **Leave Balances:** Make the balance cells inline-editable (or link to the employee's Leave Balances tab explicitly).
11. **Training:** Consolidate the three enrollment entry points into one primary surface; demote the other two to browsing-only.
12. **All modules:** Replace "OK" button label with action-specific verbs ("Create Leave Request," "Save Employee").

These are module-level polish on top of the cross-cutting priorities in §7. Do §7 first; it's structural. Then pick from here based on which modules the most users touch most often.

---

## Appendix A: Profile View — UX Review

> Reviewed: Profile page (`/profile`), backend profile APIs, auth store, header profile dropdown.

### What Works Well

**The sidebar-plus-main layout is a natural fit.** The left column shows identity (avatar, name, email, roles, timestamps) while the right column holds the editable forms. This mirrors how users think about it: "who am I" on the left, "what can I change" on the right. The information hierarchy is clear without any labels explaining the split.

**Avatar upload is discoverable and inline.** The camera icon overlay on the avatar is a well-understood pattern. No modal, no separate "upload" page — hover the photo, click, done. The 2MB client-side check with a human-readable warning ("Image must be under 2MB") prevents a frustrating round-trip to the server.

**Dirty tracking on the profile form.** The "Save Changes" button stays disabled until something actually changes. This is a small thing that prevents two real problems: accidental saves that fire unnecessary API calls, and the cognitive load of "did I change something? should I save?" The comparison runs against the auth store, so it stays accurate even if another tab updates the profile.

**Cross-tab synchronization.** Change your name in one tab, see it update in the header of another tab immediately. For an app where HR officers commonly have 3-4 tabs open (employee list, payroll, leave requests), this prevents the "stale name in the header" problem that erodes trust in data accuracy.

**The permissions table is genuinely useful.** Grouping by category with RCUD columns gives users a clear answer to "can I do X?" without asking their admin. The mobile card layout with R/C/U/D badges is a thoughtful adaptation — not just a squished table.

### Issues and Gaps

#### 1. Email Change Has No Verification — Silent Data Risk

When a user changes their email, it takes effect immediately. No confirmation email, no "verify your new address" step. If someone types `john@compnay.com` instead of `john@company.com`, they now have no way to receive password reset emails if they forget their password. The backend has email verification scaffolding (`email_verified_at` column exists, returned in the user resource), but nothing enforces it on change.

**What should happen:** After submitting a new email, show a notice: "We sent a verification link to your new address. Your email will update once you confirm." Keep the old email active until verified. This protects against typos and also against unauthorized email changes if a session is hijacked.

#### 2. Password Change: No Inline Feedback on Current Password

The "Current Password" field sends its value to the server and only fails after the full form submission. If the user misremembers their current password, they fill in all three fields, click "Update Password," wait for the round-trip, and get an error. Then they have to re-enter the new password and confirmation again (since the form clears on error through the catch block — actually it doesn't clear on error, only on success, which is correct).

**What would be better:** Validate the current password on blur (a lightweight POST to a verify endpoint) and show a check or X inline. This way the user knows they got the current password right before they bother typing the new one twice.

#### 3. Permissions Section Has No Explanation

The "My Permissions" card shows a matrix of green checks and grey X marks, but nowhere does it say "these are managed by your administrator" or "contact your admin to request changes." A user who sees they lack "Delete" on Employees might think the page is broken, or might try to click the X to toggle it. A single line of helper text would set expectations.

#### 4. No "Linked Employee Record" Connection

In an HRMS, the logged-in user often corresponds to an employee record. The profile page shows the user account (name, email, roles) but doesn't link to the employee record if one exists. An HR officer viewing their profile might want to see their own leave balance, employment record, or salary information. Right now, they'd have to go to the Employees list and search for themselves.

**What would be useful:** If the user has a linked employee record (by user_id on the employee table), show a "View My Employee Record" link in the sidebar card. This connects the system account to the HR identity — which is what the user actually cares about.

#### 5. No Session / Security Information

The page shows "Last Login" date but nothing about active sessions, login history, or connected devices. For a system that handles sensitive HR data (salaries, personal details), users should be able to see: when they last logged in, from what IP, and ideally a "Log out all other sessions" button. The backend already stores `last_login_at` and `last_login_ip` — they're just not all surfaced.

#### 6. Profile Picture Has No Preview Before Upload

When you select a file, it uploads immediately. There's no "here's what it'll look like, confirm?" step. For most cases this is fine, but if someone accidentally selects a screenshot or a wrong file, it's already uploaded and the old picture is deleted from storage. A brief preview with "Upload" / "Cancel" buttons would be more forgiving.

### Priority Order

1. **Add email verification on change** — prevents data loss (locked-out accounts). Low effort on the frontend (add a notice), moderate on the backend (send verification email, hold old email until confirmed).
2. **Add "Permissions are managed by administrators" helper text** — 5 minutes, prevents confusion.
3. **Add "View My Employee Record" link** — connects the two identities. Requires checking if user has a linked employee_id. High value for daily use.
4. **Surface login IP alongside last login date** — already available from the backend, just not displayed.
5. **Add upload preview for profile picture** — nice-to-have, prevents accidental uploads.
6. **Inline current password validation** — requires a new backend endpoint, lower priority since the current flow works correctly, just not optimally.

---

## Appendix B: Administrator Dashboard & Sidebar — UX Review

> Reviewed: Dashboard experience for admin role, sidebar navigation separation between HR Manager and Administrator, Lookup Data management.

### The Core Problem: Admin Sees an HR Dashboard

When an administrator logs in, they land on a dashboard designed for HR managers. Four stat cards — Total Employees, On Leave Today, Pending Leave, Payroll This Month — greet someone who has no access to any of those modules. The Quick Actions section offers links to "Add Employee," "Leave Requests," and "Payroll" — all of which lead to permission-denied dead ends. The admin's dashboard was functionally empty: a greeting, followed by widgets they can't interact with.

### What Was Fixed

**Dashboard is now role-aware.** The quick stat cards and Quick Actions section are hidden entirely when the user lacks the relevant permissions. An admin now sees: a greeting, the System Overview widget (login counts, failed attempts, lockouts), Recent Activity feed, and Notifications. No dead-end links, no irrelevant metrics.

**The stat refresh button stays useful.** The "As of HH:mm" timestamp and refresh icon only appear when there are stats to refresh. For an admin with no HR stats, the whole stats row is simply absent — clean, not broken-looking.

### Sidebar: Organization vs Lookup Data

**The issue:** The Organization section (Sites, Departments, Positions, Section Departments) is structural data that the admin maintains, but it sits alongside HR-centric modules in the sidebar. More importantly, the admin's primary data management job is **lookup values** — the dropdown options that appear across every form in the system (gender, nationality, bank names, employee statuses, interview modes, etc.). This had no UI at all. The backend supported full CRUD for lookups, but no frontend page existed to manage them.

**What changed:**
- A new **Lookup Data** page was added under Administration. It shows all 19 lookup types in a searchable, filterable table. Admins can create new values, edit existing ones, delete outdated options, and even create entirely new lookup types. The type field uses auto-complete so admins see existing types but can type a new one.
- This puts the admin's most frequent data task — "add a new bank name option," "update the nationality list," "fix a typo in employee status labels" — one click away in the sidebar instead of requiring a database query or developer request.

### What the Administrator's Sidebar Now Looks Like

**Administration section:**
- Users — account management, roles assignment
- Roles — custom role creation
- Lookup Data — predefined dropdown values (gender, bank names, statuses, etc.)
- Login History — who logged in, when, from where, success/failure
- User Activity — which users are active, stale accounts, usage volume

**System section:**
- Activity Log — full audit trail with CSV export
- Recycle Bin — restore or permanently delete records
- System Settings — runtime configuration (app name, security policies, notifications)

This gives the administrator a complete toolkit: manage users, manage reference data, monitor activity, audit changes, configure the system. No HR data visible unless explicitly granted.

### Remaining Consideration

The Organization section has been removed from the admin role's auto-assigned permissions (backend change applied). Admins no longer see Sites, Departments, or Positions in the sidebar.

---

## Appendix C: Administrator System Health & Monitoring — Gap Analysis

> Reviewed: What the administrator sees today, what they need to see to do their job (system health, errors, performance), and what features to build.

### The Administrator's Real Job

The administrator is the person who gets the call when something breaks. "The system is slow." "I can't log in." "The payroll import failed." "Something went wrong but I don't know what." Today, the admin has no way to investigate any of these without SSH access to the server and reading raw log files.

The admin dashboard currently shows login counts and failed attempts — useful for security monitoring, but that's one slice of a much bigger responsibility. The admin needs to answer three questions every day:

1. **Is the system healthy right now?** (Can users log in? Is the database responding? Are background jobs running?)
2. **What went wrong recently?** (Which errors happened? How often? Are they getting worse?)
3. **What needs my attention before it becomes a user complaint?** (Growing log files, stale jobs, disk space, slow queries)

None of these are answerable from the current admin interface.

### What the Admin Sees Today

After logging in, the admin lands on the dashboard and sees:
- A greeting with the date
- **System Overview widget** — login count today, failed attempts today/this week, lockouts today. Clickable to login history.
- **Recent Activity** — last 8 records created/updated/deleted across the system
- **Notifications** — recent system notifications

In the sidebar:
- **Administration** — Users, Roles, Lookup Data, Login History, User Activity
- **System** — Activity Log (with export), Recycle Bin, System Settings

This is a *user management console*, not a *system administration console*. The admin can tell you who logged in and what they changed, but not whether the application is healthy, whether background jobs are failing, or whether errors are piling up.

### What Goes Unnoticed Today

**Backend errors are invisible.** When an API endpoint throws a 500 error, it's written to a log file on the server that has grown to over 250MB. No admin sees it. No alert fires. The user sees "Something went wrong" and calls someone. The admin has to ask a developer to check the server logs.

**Failed background jobs disappear silently.** The system has two background jobs — bulk payroll processing and grant imports. When one fails, the record sits in a `failed_jobs` database table that no UI displays. The user who triggered the import sees a spinner that eventually times out. Nobody knows what happened.

**Slow queries are tracked but hidden.** A performance monitoring middleware already records slow queries (over 2 seconds) and caches hourly/daily metrics. But there's no page to view this data. It's collected, stored, and ignored.

**Frontend errors vanish.** When a JavaScript error occurs in a user's browser, it's caught by generic try/catch blocks that do nothing. No reporting, no logging, no counter. If ten users hit the same bug in the same hour, the admin has zero visibility.

**Disk and storage are unmonitored.** Profile pictures, import files, and export files accumulate in storage. The 250MB+ log file grows daily. Nobody knows when disk space will become a problem until it is one.

### Features to Build — Prioritized

#### Tier 1: Must-Have (the admin is flying blind without these)

**1. System Health Dashboard Widget**

A dashboard card that answers "is everything working?" at a glance. Four status indicators:
- **Database** — connection alive, response time in milliseconds
- **Cache** — Redis/file cache operational
- **Storage** — disk usage percentage, warning above 80%
- **Queue** — jobs pending, jobs failed in last 24h

Each shows green/yellow/red. Clicking any indicator opens a detail view. This widget replaces the need to SSH into the server for basic triage.

*Backend needed:* `GET /admin/system-health` endpoint that pings the database, checks cache, reads disk stats, and queries the failed_jobs table.

**2. Error Log Viewer**

A page under the System menu that shows recent application errors — not the full raw log file, but structured error entries: timestamp, error message, URL that triggered it, user who hit it, stack trace (collapsible). Filterable by severity (error, warning, critical) and date range.

The admin should be able to see: "There were 12 errors in the last hour, all on the payroll export endpoint, all the same database timeout." That's actionable. A 250MB text file is not.

*Backend needed:* Either parse the Laravel log into a `system_errors` table (a scheduled command that tails the log), or switch to a database logging channel for errors. `GET /admin/error-logs` with pagination and filters.

**3. Failed Jobs Monitor**

A page showing all failed background jobs: which job, when it failed, what the error was, which user triggered it, and a "Retry" button. The `failed_jobs` table already exists — it just needs a UI.

When a payroll import fails, the admin should see it here within seconds, understand what went wrong, and either retry it or inform the user. Today, nobody knows until the user complains.

*Backend needed:* `GET /admin/failed-jobs` (read the existing `failed_jobs` table), `POST /admin/failed-jobs/{id}/retry`, `DELETE /admin/failed-jobs/{id}`.

#### Tier 2: High Value (turns the admin from reactive to proactive)

**4. Slow Query / Performance Dashboard**

The backend already collects performance metrics via the PaginationMonitor middleware. Build a page that displays them: slowest endpoints (last 24h), average response times, memory usage trends. This lets the admin spot degradation before users notice it.

*Backend needed:* `GET /admin/performance-metrics` that reads the already-cached hourly/daily performance data.

**5. Frontend Error Tracking**

Add a global error handler on the frontend that catches unhandled exceptions and Vue component errors, then sends them to a backend endpoint. The admin sees these on a "Client Errors" tab of the error log page: which page, which browser, which user, what happened.

This closes the gap where users see "Something went wrong" and the admin has no idea what they're talking about.

*Backend needed:* `POST /admin/client-errors` to receive frontend error reports. *Frontend needed:* Global `app.config.errorHandler` and `window.onerror` that POST to the endpoint.

**6. Security Alerts**

Enhance the login history from a passive log into an active monitor. Flag suspicious patterns:
- More than 5 failed attempts from the same IP in 10 minutes
- Login from an IP that's never been seen before for that user
- Login outside business hours (configurable)
- Multiple users failing from the same IP (credential stuffing pattern)

Show these as alert cards on the admin dashboard, above the regular login stats. The admin shouldn't have to scan the login history table looking for patterns — the system should surface them.

*Backend needed:* A scheduled command or real-time check that analyzes login_histories and creates alert records.

#### Tier 3: Nice-to-Have (operational maturity)

**7. Log File Management**

The application log file is 250MB+ and growing. Add a "Maintenance" section to System Settings where the admin can: view current log file size, trigger log rotation, download the current log, and configure retention (keep last 7 days, etc.).

**8. Scheduled Task Monitor**

If the app uses Laravel's scheduler (cron jobs for cache cleanup, report generation, etc.), show a list of scheduled tasks with their last run time and status. The admin needs to know if the nightly cleanup stopped running three weeks ago.

**9. Storage Breakdown**

Show disk usage by category: profile pictures, import files, export files, logs, database backups. Let the admin see what's consuming space and clean up orphaned files.

### Recommended Admin Sidebar After Implementation

```
Administration
  ├── Users
  ├── Roles
  ├── Lookup Data
  ├── Login History
  └── User Activity

System
  ├── System Health          (NEW — Tier 1)
  ├── Error Logs             (NEW — Tier 1)
  ├── Failed Jobs            (NEW — Tier 1)
  ├── Performance            (NEW — Tier 2)
  ├── Activity Log
  ├── Recycle Bin
  └── System Settings
```

### Implementation Priority

| Priority | Feature | Why First |
|---|---|---|
| 1 | System Health dashboard widget | Answers "is it broken?" in 2 seconds — the most common admin question |
| 2 | Failed Jobs monitor | Silent job failures are the #1 source of "it didn't work" user complaints with no admin visibility |
| 3 | Error Log viewer | Replaces SSH + grep on a 250MB file — makes every error investigation 10x faster |
| 4 | Slow Query dashboard | Data already collected, just needs a UI — quick win |
| 5 | Frontend error tracking | Closes the last visibility gap — browser errors that the backend never sees |
| 6 | Security alerts | Transforms login history from a log you read to a monitor that watches for you |

Build #1-3 first. They transform the admin from someone who waits for complaints into someone who sees problems before users do. That's the difference between a user manager and a system administrator.
