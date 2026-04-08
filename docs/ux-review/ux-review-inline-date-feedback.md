# UX Review: Inline Computed Feedback on Date Fields

**Reviewed**: 2026-04-07
**Scope**: Leave Requests, Resignations, Attendance, Personnel Actions — date field forms
**Phase**: Analysis (no code changes)

---

## What Works Well

The date entry pattern across all four modules is already solid in its fundamentals. Every date picker uses a consistent configuration — `format="DD MMM YYYY"` for display, `value-format="YYYY-MM-DD"` for storage — so users see human-readable dates while the system stores ISO strings. This consistency means HR officers who learn one form can predict how dates behave everywhere else.

The Leave Request form already shows the strongest version of computed feedback in the app today: when both dates are filled, the system calls the backend and displays "X working days" beside the date fields. This is exactly the right instinct — the HR officer types two dates and immediately sees what those dates *mean* for the request. The fact that it accounts for holidays via the backend calculation makes it trustworthy. The balance warning ("Insufficient balance — available: 5d, requested: 8d") compounds this by turning a number into a decision: should I submit this or fix it?

The Employment Assignment tab demonstrates that the codebase already knows how to do client-side date arithmetic: when a start date is entered, probation end dates auto-calculate using dayjs `.add(3, 'month')`. This proves the pattern is established and the tooling is ready.

---

## The Core Tension

The backend already computes every value the user needs to validate their entry — notice periods, hours worked, days from today — but it only reveals those computations *after* the form is submitted and the detail page is loaded. The user is flying blind during data entry, which is exactly the moment when catching a typo costs nothing. After submission, correcting a date means finding the record, opening an edit modal, and resubmitting. The gap between "the system knows" and "the user can see" is where transcription errors hide.

---

## The User's Day

### Leave Requests — Working Days Count

**Today**: This is the strongest of the four modules. When an HR officer fills in both start and end dates for a leave item, the form calls `POST /leave-requests/calculate-days` and displays the result as "X working days" in a dedicated column beside the dates. The calculation runs server-side, so it correctly excludes weekends and public holidays.

**The gap**: The computation is already present — but it's network-dependent. If the API is slow or fails, the field shows a dash and the user submits without knowing how many days they're requesting. There's no client-side fallback. Additionally, the `holidayApi.inRange()` endpoint exists but isn't used in this form — it could provide the holiday list for a local calculation that serves as an instant preview while the backend confirms.

**What the officer experiences**:
- Select employee, pick leave type, enter start date, enter end date
- Brief pause while the API calculates working days
- "7 working days" appears — officer can sanity-check against the paper form
- If the balance is insufficient, a warning appears immediately

**Verdict**: This module needs the *least* work. The feedback loop exists. The improvement would be adding a client-side instant preview (weekend-only exclusion) that's then corrected by the backend response (weekend + holiday exclusion), eliminating the blank moment during the API call.

#### Technical Details

| Attribute | Value |
|---|---|
| Form file | `src/views/leave/LeaveRequestListView.vue` (1,207 lines) |
| Date fields | `item.start_date` and `item.end_date` per leave item |
| Storage format | String `"YYYY-MM-DD"` via `value-format` |
| Existing computation | Yes — backend API call via `leaveApi.calculateDays()` on date change |
| Display location | Dedicated "days" column in the item grid (lines 241-246) |
| Holiday data available | `holidayApi.inRange(params)` endpoint exists but unused in this form |
| Trigger | `@change="onItemDateChange(index)"` on both date pickers |

---

### Resignations — Notice Period and Days Until Last Working

**Today**: The HR officer opens the resignation form (either from the Resignations list or from an employee's profile modal), enters a resignation date and a last working date, and submits. The form shows nothing about what those two dates mean together. No notice period calculation. No "days until last working day." No warning if the last working date is before the resignation date — which would be a clear data entry error.

After submission, the detail page displays three computed cards: notice period in days, days until last working day, and an overdue flag. These are all calculated by the backend and returned in the API response. The information exists — it just arrives one step too late.

**What the officer should feel**: The moment both dates are filled, the form should whisper: "42 calendar days notice period — 18 days until last working day." If someone accidentally enters a last working date *before* the resignation date, the form should say so immediately — not after the record is saved and someone notices the detail page looks wrong.

**The gap**: Two pieces of feedback that already exist on the detail page are completely absent from the form. The validation doesn't even check that last_working_date >= resignation_date. A simple subtraction (no holidays needed — notice period is calendar days) would catch the most common transcription errors.

#### Technical Details

| Attribute | Value |
|---|---|
| Form files | `src/views/resignations/ResignationListView.vue` (admin modal) and `src/views/employees/components/ResignationModal.vue` (employee modal) |
| Date fields | `form.resignation_date` and `form.last_working_date` |
| Storage format | String `"YYYY-MM-DD"` via `value-format` |
| Existing computation | None in form. Detail view (`ResignationDetailView.vue`) shows `notice_period_days`, `days_until_last_working`, `is_overdue` — all from backend API response |
| Display location | No inline display currently |
| Date validation | Only checks that both fields are non-null — no range validation |
| Layout | Two-column grid (`:span="12"` each), dates are the first row |

---

### Attendance — Hours Worked

**Today**: The HR officer selects an employee, picks a date, sets status, then enters clock-in and clock-out times. The form shows nothing about the duration those two times represent. The officer submits, and only in the list table does a "Hours" column appear (the `total_hours` field from the API response). During entry, they're mentally calculating "09:00 to 17:30... that's 8 hours 30 minutes" — or not calculating at all, and hoping the backend agrees with what they intended.

**What the officer should feel**: The instant both clock-in and clock-out are filled, a subtle label appears: "8h 30m". If someone accidentally enters clock-out as 07:30 instead of 17:30 (a common 24-hour clock mistake), seeing "-1h 30m" or "22h 00m" would immediately flag the error. Without this, the mistake survives until someone notices in the list view — or worse, in a payroll report.

**The gap**: This is pure arithmetic — no API call needed, no holidays to consider. Subtract two times. The fact that it requires zero backend involvement makes the absence especially noticeable.

#### Technical Details

| Attribute | Value |
|---|---|
| Form file | `src/views/attendance/AttendanceListView.vue` |
| Time fields | `form.clock_in` and `form.clock_out` |
| Storage format | String `"HH:mm"` via `value-format` |
| Existing computation | None in form. List table shows `total_hours` from API response |
| Display location | No inline display currently |
| Layout | Two-column row (`:span="12"` each), clock-in left, clock-out right |
| List column | `{ title: 'Hours', dataIndex: 'total_hours', width: 80 }` |

---

### Personnel Actions — Effective Date Context

**Today**: The HR officer fills out a personnel action form — transfer, promotion, salary adjustment — and enters an effective date. The date is a required field, but the form provides no context about it. Is this date in the past? How far in the future? For a promotion effective next month, the officer might want confirmation they picked the right month. For a backdated salary adjustment, seeing "47 days ago" would confirm intentionality.

**What the officer should feel**: Below the effective date picker, a small muted label: "in 23 days" or "15 days ago". Not a warning — just context. The officer glances at it and either nods ("yes, the promotion starts next month") or double-takes ("wait, that's 3 months ago — I meant 2026, not 2025").

**The gap**: This is the lightest-touch addition of the four. A single dayjs `.diff()` call against today, formatted as relative time. The `relativeTime` plugin is already loaded in `main.js`. The infrastructure is literally waiting to be used.

#### Technical Details

| Attribute | Value |
|---|---|
| Form file | `src/views/personnel-actions/PersonnelActionListView.vue` (1,178 lines) |
| Date field | `form.effective_date` |
| Storage format | String `"YYYY-MM-DD"` via `value-format` |
| Existing computation | None |
| Display location | No inline display currently |
| dayjs availability | Injected globally via `inject('$dayjs')`, `relativeTime` plugin loaded |
| Layout | Two-column row with action_type select (left) and effective_date picker (right) |
| Existing pattern | `AssignmentTab.vue` already uses `dayjs().add()` / `.subtract()` for probation date auto-fill — same arithmetic |

---

## Infrastructure Summary

### Date Library: dayjs 1.11.13

**Global setup** (`src/main.js`):
- `relativeTime` plugin loaded (enables `.fromNow()` and `.toNow()`)
- Provided globally: `app.provide('$dayjs', dayjs)`
- Available in components via `inject('$dayjs')`
- Also imported directly in `src/utils/formatters.js`

**Plugins NOT loaded** (may be needed):
- `isBetween` — for range checking
- `isoWeek` / `weekday` — for weekend detection in client-side working days calc
- None of these are required for the proposed features; basic dayjs arithmetic suffices

### Existing Date Patterns in Codebase

| Pattern | Location | What It Does |
|---|---|---|
| Backend working days calc | `LeaveRequestListView.vue` | Calls API, displays result |
| Client-side probation calc | `AssignmentTab.vue` | `dayjs().add(3, 'month')` auto-fills dates |
| Relative time display | `formatters.js` → `timeAgo()` | Uses `dayjs().fromNow()` |
| Age calculation | `formatters.js` → `calcAge()` | Uses `dayjs().diff(dob, 'year')` |

### Holiday Data Access

- `holidayApi.inRange({ start_date, end_date })` — returns holidays within a date range
- Currently used only in `HolidayListView.vue` (admin management)
- Could be leveraged for client-side working days calculation with holiday exclusion
- Holiday types: public, company, optional

### Date Value Storage Convention

All date pickers across all modules use the same pattern:
```
format="DD MMM YYYY"       → display format
value-format="YYYY-MM-DD"  → storage format (string, not dayjs object)
```

Time pickers use:
```
format="HH:mm"             → display format
value-format="HH:mm"       → storage format (string)
```

---

## Priorities

Ordered by user impact — how much friction each addition removes from the most common tasks:

### 1. Attendance — Hours Worked (highest impact-to-effort ratio)
Pure client-side arithmetic. No API calls, no holiday data, no edge cases beyond midnight crossover. The most common transcription error (AM/PM confusion in 24-hour format) becomes immediately visible. Every attendance entry benefits.

### 2. Resignations — Notice Period + Days Until Last Working
Calendar day subtraction — no weekends or holidays to consider. Two computations that already exist on the detail page, moved earlier into the form. The date range validation (last_working_date >= resignation_date) alone would prevent a class of data entry errors that currently survive to the detail page.

### 3. Personnel Actions — Effective Date Context
Single computation, single display line. The `relativeTime` plugin is already loaded. Lowest implementation effort of all four, but also the narrowest impact — it helps confirm intentionality rather than catching errors.

### 4. Leave Requests — Working Days Enhancement (lowest priority)
The feedback loop already exists via the backend API call. The improvement is adding a client-side instant preview as a perceived-performance optimization. This is polish on an already-working feature, not a new capability.

---

## What's Missing

Beyond the four specific modules, the analysis reveals a broader pattern: **the codebase has no shared composable for inline date feedback**. Each module would benefit from reusable computation functions:

- A working days calculator (with optional holiday exclusion)
- A duration calculator for time pairs
- A relative date formatter ("X days from today")
- A date range validator (end >= start)

These don't need to be a single monolithic composable — small, focused utility functions in `src/utils/` or lightweight composables in `src/composables/` would match the existing codebase patterns better than a heavy abstraction.

The styling pattern for these inline hints also doesn't exist yet. The closest precedent is the `.days-display` and `.days-unit` classes in the Leave Request form, and the `.field-hint` class in the Attendance form. A consistent "computed feedback" style — muted text, slightly smaller font, positioned below or beside the triggering field — should be established once and reused across all four modules.
