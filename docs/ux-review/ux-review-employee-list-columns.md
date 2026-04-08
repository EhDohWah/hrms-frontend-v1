# UX Review: Employee List Column Customization

**Reviewing**: Employee List View — column overload and proposed column customization feature
**Date**: 2026-04-07

---

## What Works Well

The employee list is already well-built in several ways that matter for daily use:

- **The search and filter bar** is immediate and prominent. A user looking for a specific person can type a name or staff ID and narrow the list fast — without scrolling sideways through columns they don't care about.
- **The Staff ID and First Name columns are clickable links** that take you straight to the employee detail page. This is the right call — the list is a launching pad, not a destination.
- **Organization and Status columns use color-coded tags**, which means a user scanning the list can spot "Active" vs "Resigned" without reading the text. Visual encoding like this reduces cognitive load on the most-repeated task.
- **Virtual scrolling is enabled**, so even with hundreds of employees the list stays snappy. Users never wait for the table to render.
- **Row highlighting for resigned employees** is a subtle but effective signal — it visually deprioritizes records that are less likely to need attention.

These are the kind of details that show someone thought about how this screen gets used, not just what data it should show.

---

## The Core Tension

The employee list is trying to be two things at once: a **quick lookup tool** (find an employee, click through to their record) and a **data export preview** (show every field so you can scan across rows). These goals conflict — the lookup task needs 4-5 columns and zero scrolling, while the export preview needs all 16 data columns and horizontal scroll.

Right now, the export preview wins by default, which means the most common task — finding and opening an employee record — is burdened with visual noise on every single visit.

---

## The User's Day

### Today

An HR staff member opens the employee list. They see a table with 16 data columns plus an actions column. On a standard 1366px laptop screen, only the first 6-7 columns are visible — Organization, Staff ID, Initial, First Name, Last Name, and maybe Gender. Department, Position, and Status are hidden off-screen to the right.

To find someone, they either:
1. **Use the search bar** (fast path, works well), or
2. **Scroll the table** — drag right to see Department, Position, or Status, then scroll back left to click the name. On a 1920px monitor it's better, but still requires horizontal scrolling to see everything.

The irony: the columns most useful for identification — Department, Organization, and Status — are either pinned at the far left (Organization) or pushed off-screen (Department, Position, Status). The columns that take up prime real estate in the middle — Initial, Gender, Date of Birth, Age — are almost never what someone is scanning for when they're looking up an employee.

Even worse, columns like Social Security Number, Tax Number, and ID Number occupy space on every visit, but are only relevant for a very specific administrative task — not the daily "find and open" workflow.

**Friction count**: 1 horizontal scroll + 1 scroll back + 1 click to reach an employee record when using the table (vs. 0 scrolls + 1 click using search). New users who haven't discovered the search bar default to the table and build a slow habit.

### What It Should Feel Like

The employee list opens with 5-6 columns that fit comfortably on any screen: Employee Name (with avatar), Staff ID, Department, Organization, and Status. No horizontal scroll. The user sees everything they need to identify the right person and clicks through immediately.

A small "Columns" control sits near the table header — unobtrusive but discoverable. Clicking it reveals a checklist of all available columns. A user who needs to scan ID numbers or phone numbers across rows can toggle those columns on. Their choice persists across page refreshes, so they only configure once.

The default view is optimized for the 90% task. The customization serves the 10% task without penalizing everyone else.

### The Gap

- **Today**: 16 data columns, horizontal scroll required, most-used columns (Department, Status) buried off-screen on smaller monitors
- **Proposed**: 5-6 default columns, no horizontal scroll, all columns available on demand, preference persists

The change is structural, not cosmetic. It reframes the employee list from "everything we know about employees" to "find the right employee fast."

---

## What to Cut (from the default view)

These columns should be **hidden by default** — still available via column customization, but not shown on first load:

| Column | Why hide it |
|--------|-------------|
| Initial | Redundant when First Name is visible. Almost never a lookup criterion. |
| Gender | Useful for reports, not for finding a specific employee. |
| Date of Birth | Administrative detail, not an identification column. |
| Age | Derived from DoB — same argument. |
| Position | Borderline — could stay. But Department already narrows the context, and hiding Position keeps the default under 6 columns. |
| ID Type | Administrative. Needed only when verifying documents. |
| ID Number | Same as above. |
| Social Security Number | Sensitive data that shouldn't be visible by default anyway. |
| Tax Number | Administrative detail used in payroll tasks, not employee lookup. |
| Mobile | Contact info — useful but not for the primary "find and open" task. |

### Recommended Default Columns (5 columns + actions)

| # | Column | Why it stays |
|---|--------|-------------|
| 1 | **Employee Name** (First + Last, merged with avatar) | Primary identification. Merge First Name and Last Name into a single "Employee" column to save space and match how people think about names — as one unit, not two fields. |
| 2 | **Staff ID** | The unique identifier HR staff use constantly. |
| 3 | **Department** | The most common "which one?" disambiguator after name. |
| 4 | **Organization** | Multi-org environment — users need to see which entity. |
| 5 | **Status** | Active vs. Resigned is the first filter for relevance. |
| 6 | **Actions** | View/Delete — always needed. |

**Why merge First Name + Last Name**: Today they occupy two columns (160px + 140px = 300px). A single "Employee" column with avatar, full name, and optionally Staff ID as a subtitle would be more scannable and save 100+ pixels. This is a common pattern in HR software — the name is the anchor, not separate fields.

---

## What's Missing

### 1. Column Customization Control

The most important addition. A "Columns" button (gear icon or text button) near the table header that opens a checkbox list of all available columns. The user toggles columns on/off, and their choice is saved to localStorage so it persists.

This transforms the employee list from a fixed 16-column table into an adaptable tool that serves different roles differently. An HR admin who processes documents daily might pin ID Number and ID Type. A department manager might only want Name, Department, and Status. Each configures once and forgets.

**Impact**: High. Eliminates the horizontal scroll problem for all users while preserving access to every column.

### 2. "Reset to Default" Option

When a user has customized their columns, there should be a quick way to reset to the default set. This prevents the "I toggled too many things and now the table looks weird" moment that makes users distrust customization features.

**Impact**: Low effort, high confidence. Users are more willing to experiment when they know they can undo.

### 3. Column Order Persistence (Future)

For Phase 1, just show/hide is enough. But eventually, users will want to reorder columns — putting Department before Organization, for example. This is a natural Phase 2 follow-up and should be designed for but not built yet.

**Impact**: Medium. Nice-to-have after the core show/hide is working.

---

## Priorities

Ordered by user impact:

1. **Reduce default columns to 5-6** — Immediate improvement for every user on every visit. No customization UI needed for this step; just change the defaults. This alone eliminates horizontal scroll on standard screens.

2. **Add column customization UI** — A "Columns" popover with checkboxes, placed near the table header. Lets power users restore hidden columns without touching code.

3. **Persist column preferences in localStorage** — So the customization sticks. Use the existing `storage.js` utility wrapper. Key pattern: `employee_list_columns` storing an array of visible column keys.

4. **Merge First Name + Last Name into a single Employee column** — Optional but recommended. Saves space, matches mental model, and makes the default view even cleaner. This is a slightly bigger change since it affects the cell template and sort behavior, so it can follow the core column customization work.

5. **Extract a reusable composable** (`useColumnCustomization`) — Since every list view in the app has hardcoded columns, this pattern will be useful for Training, Attendance, Leave Requests, etc. Build it as a composable from the start rather than inlining it in the employee list.

---

## Implementation Notes (for the developer)

This section bridges the UX review into the Phase 2 implementation plan.

### Column Customization UI Recommendation

A **popover with checkboxes** (triggered by a small "Columns" button with a settings icon) is the right pattern here. It's:
- Lightweight — doesn't navigate away or open a modal
- Discoverable — visible near the table header
- Familiar — this is the pattern used by tools like Jira, Notion, and Google Sheets

The popover should show all available columns as checkboxes, grouped logically:
- **Identity**: Employee Name, Staff ID, Initial
- **Work**: Department, Position, Organization, Status
- **Personal**: Gender, Date of Birth, Age, Mobile
- **Documents**: ID Type, ID Number, SSN, Tax Number

A "Reset to Default" link at the bottom of the popover restores the original 5-column set.

### localStorage Structure

```json
{
  "key": "employee_list_columns",
  "value": ["staff_id", "first_name", "department", "organization", "status"]
}
```

Store only the visible column keys. On load, if the key doesn't exist in localStorage, use the hardcoded defaults. This way, existing users get the new clean defaults automatically, and anyone who customizes gets their preference saved.

### Composable Shape

A `useColumnCustomization(storageKey, allColumns, defaultVisibleKeys)` composable that returns:
- `visibleColumns` — computed array of column definitions filtered by visibility
- `visibleKeys` — ref of currently visible column keys
- `toggleColumn(key)` — show/hide a column
- `resetToDefault()` — restore default column set
- `isVisible(key)` — check if a column is currently shown

This composable handles localStorage read/write internally using the existing `storage.js` utility.

---

*Review generated for the HRMS Employee List column customization initiative.*
