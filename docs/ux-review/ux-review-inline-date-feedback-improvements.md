# Inline Date Feedback — Improvement Analysis

**Date**: 2026-04-07
**Based on**: `docs/ux-review/ux-review-inline-date-feedback.md`
**Scope**: Implementation strategy for computed date feedback across 4 modules

---

## Executive Summary

The HRMS captures dates from paper forms across Leave Requests, Resignations, Attendance, and Personnel Actions. Three of four modules show **zero computed feedback** during data entry — the backend computes everything but only reveals it after submission. The fix is straightforward: small utility functions + a consistent inline hint style, wired into each form with `computed()` properties.

---

## Module-by-Module Improvements

### 1. Attendance — Hours Worked

**Current state**: Clock In and Clock Out are side-by-side `a-time-picker` fields (HH:mm strings). No duration shown. The list table shows `total_hours` from the API *after* submission.

**Improvement**: Show `Xh Ym` between the time row and the Notes field. Pure subtraction of two HH:mm strings — zero API dependency.

**Computation logic**:
```
Given clock_in = "09:00", clock_out = "17:30"
→ Parse both as minutes-since-midnight (540, 1050)
→ Difference = 510 minutes → "8h 30m"

Edge: clock_out < clock_in (overnight) → add 24h → show with "(overnight)" label
Edge: same time → "0h 0m"
```

**Where to insert in template** (`AttendanceListView.vue`):
- After the Clock In / Clock Out `<a-row>` (line 162), before the Notes `<a-form-item>` (line 163)
- Full-width hint spanning both columns

**Warning conditions**:
- Duration > 16 hours → amber hint ("Unusually long shift")
- Duration = 0 → muted hint ("Same time entered")
- Overnight crossover → informational note

**Effort**: Lowest of all four. ~15 lines of computed logic, ~5 lines of template.

---

### 2. Resignations — Notice Period + Days Until Last Working

**Current state**: `resignation_date` and `last_working_date` are side-by-side date pickers. No computation in the form. The detail page shows `notice_period_days`, `days_until_last_working`, and `is_overdue` — all from the backend API response. No validation that last_working_date >= resignation_date.

**Improvement**: Show two computed values below the date row, plus a warning for invalid ranges.

**Computation logic**:
```
notice_period_days = dayjs(last_working_date).diff(dayjs(resignation_date), 'day')
days_until_last_working = dayjs(last_working_date).diff(dayjs(), 'day')

Display:
- "X calendar days notice" (notice_period_days)
- "X days until last working day" / "X days overdue" (days_until_last_working)

Warning: if notice_period_days < 0 → "Last working date is before resignation date"
```

**Where to insert in template**:
- `ResignationListView.vue` (line 146): After the date `<a-row>`, before the Notes `<a-form-item>`
- `ResignationModal.vue` (line 32): After the date `<a-row>`, before the Notes `<a-form-item>`
- Both forms have identical structure — same hint markup applies to both

**Warning conditions**:
- last_working_date < resignation_date → red warning
- days_until_last_working < 0 → amber "overdue" indicator
- notice_period_days < 30 → informational (short notice)

**Effort**: Two forms to update (admin + employee modal), but identical logic. Calendar day math only — no holidays needed.

---

### 3. Personnel Actions — Effective Date Context

**Current state**: `effective_date` is a standalone date picker in a two-column row alongside action_type. No context about whether the date is past or future.

**Improvement**: Show relative context below the date picker: "in X days" or "X days ago".

**Computation logic**:
```
diff = dayjs(effective_date).diff(dayjs(), 'day')

Display:
- diff > 0 → "in X days" (future)
- diff === 0 → "Today"
- diff < 0 → "X days ago" (past)

Alternative: use dayjs(effective_date).fromNow() which is already available via relativeTime plugin
→ "in 23 days", "15 days ago", "in 3 months"
```

**Where to insert in template** (`PersonnelActionListView.vue`):
- Inside the `<a-col :span="12">` containing the Effective Date picker (lines 181-190)
- Below the `<a-date-picker>`, before the closing `</a-form-item>`
- Or directly after the `</a-form-item>` as a standalone hint div

**Warning conditions**:
- Date > 6 months in the future → informational hint
- Date > 1 year in the past → amber hint ("Are you sure? This is over a year ago")
- No red warnings — backdated actions are legitimate

**Effort**: Minimal. Single `computed()`, single template line. The `relativeTime` plugin is already loaded.

---

### 4. Leave Requests — Working Days Enhancement

**Current state**: Already has backend-driven working days calculation via `leaveApi.calculateDays()`. Displays "X working days" in a dedicated column. The `holidayApi.inRange()` endpoint exists but is unused here.

**Improvement**: Add a client-side instant preview that shows while the API call is in flight. The backend response replaces it when it arrives.

**Computation logic**:
```
Client-side (instant, weekend-only):
  Count weekdays between start_date and end_date
  Show as "~X working days" (tilde indicates estimate)

Backend (authoritative, weekends + holidays):
  Already implemented — replaces the estimate when response arrives
  Show as "X working days" (no tilde)
```

**Where to modify in template** (`LeaveRequestListView.vue`):
- The `.days-display` div (lines 241-246) already exists
- Add a loading/estimate state: show client-side count with "~" prefix while `item.days === null` and dates are filled
- When `item.days` is populated by the API response, show the confirmed value

**Warning conditions**: None new — the balance warning already handles insufficient days.

**Effort**: Moderate. Needs a weekday-counting utility function. The template change is minimal since the display element already exists. This is a perceived-performance improvement, not a new feature.

---

## Shared Infrastructure

### Utility Functions (add to `src/utils/formatters.js`)

Four small functions, each under 10 lines:

| Function | Input | Output | Used By |
|---|---|---|---|
| `calcHoursWorked(clockIn, clockOut)` | Two `"HH:mm"` strings | `{ hours, minutes, isOvernight }` | Attendance |
| `calcNoticePeriod(resignDate, lastWorkDate)` | Two `"YYYY-MM-DD"` strings | `{ days, isInvalid }` | Resignations |
| `calcDaysFromToday(date)` | One `"YYYY-MM-DD"` string | `{ days, label, direction }` | Personnel Actions, Resignations |
| `calcWorkingDays(startDate, endDate)` | Two `"YYYY-MM-DD"` strings | `number` (weekdays only) | Leave Requests |

**Why `formatters.js` and not a new composable**: These are pure functions with no reactive state, no lifecycle hooks, no side effects. They take strings, return objects. They belong alongside `calcAge()` and `timeAgo()` which already live in `formatters.js`. A composable would be overengineering.

### Shared CSS Class (add to existing component styles or `global.less`)

A single `.date-feedback` class for the inline hint pattern:

```css
.date-feedback {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
}
.date-feedback--warning {
  color: var(--color-warning);
}
.date-feedback--danger {
  color: var(--color-danger);
}
```

This matches the existing `.field-hint` (12px, muted, 4px margin-top) and `.days-unit` (11px, muted) patterns already in the codebase. Subtle, not intrusive — feels like a helper, not an alert.

---

## Implementation Order

| Priority | Module | What | Why First |
|---|---|---|---|
| 1 | Attendance | Hours worked display | Highest impact-to-effort. Pure math. Every entry benefits. Catches AM/PM errors. |
| 2 | Resignations | Notice period + days until last working + date validation | Two forms but identical logic. Prevents a class of errors that currently survive to detail page. |
| 3 | Personnel Actions | Relative date context | Single line, single computed. relativeTime plugin already loaded. Lowest effort. |
| 4 | Leave Requests | Client-side working days preview | Already works. This is polish on an existing feature. |

Build utility functions first, then wire into each form sequentially.

---

## What NOT to Build

- **No new composable files** — these are pure utility functions, not reactive state managers
- **No holiday caching layer** — the Leave Request backend call already handles holidays; a client-side holiday cache adds complexity for marginal benefit
- **No toast/notification on suspicious values** — inline text hints are sufficient; popping alerts for data entry would disrupt flow
- **No form-level validation blocking** — warnings are informational, not gatekeepers. The officer knows their paper form better than the system does. Show the hint, let them proceed.
- **No new dayjs plugins** — basic `.diff()` and the already-loaded `relativeTime` cover all four modules
