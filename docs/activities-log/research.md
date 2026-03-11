# Activity Log System — Research

## Part 1: HRMS Backend (Current State)

### Overview

The HRMS backend implements a **custom, in-house activity logging system** (no external package). It automatically tracks CRUD operations on key models and supports custom actions (e.g., "transferred", "processed", "imported").

**Spatie packages installed (NOT activitylog):**
- `spatie/laravel-permission` (^6.13) — Role-based access control
- `spatie/laravel-query-builder` (^6.3) — Dynamic query filtering
- `spatie/laravel-deleted-models` (^1.1.2) — Soft delete tracking

`spatie/laravel-activitylog` is **NOT installed**.

---

### 1.1 Database Schema

**Table:** `activity_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (PK) | Auto-increment |
| `user_id` | FK → users | Nullable, nullOnDelete |
| `action` | varchar(50) | `created`, `updated`, `deleted`, `processed`, `imported`, `transferred` |
| `subject_type` | varchar(100) | Full model class (e.g., `App\Models\Grant`) |
| `subject_id` | unsigned bigint | ID of the model instance |
| `subject_name` | varchar, nullable | Human-readable name for display |
| `description` | text, nullable | Free-text description of what happened |
| `properties` | JSON, nullable | Stores old/new values and list of changed fields |
| `ip_address` | varchar(45), nullable | Request IP address for audit |
| `created_at` | timestamp | Auto-set via `useCurrent()` |

No `updated_at` — logs are immutable (write-once).

**Indexes:** `user_id`, `(subject_type, subject_id)`, `created_at`, `action`

### Properties JSON Structure

```json
{
  "old": { "salary": 15000, "department_id": 3 },
  "new": { "salary": 16500, "department_id": 5 },
  "changes": ["salary", "department_id"]
}
```

For custom actions (e.g., `transferred`), the structure is freeform:
```json
{
  "from_organization": "SMRU",
  "to_organization": "BHF",
  "effective_date": "2026-01-15",
  "reason": "Project reassignment"
}
```

---

### 1.2 API Endpoints

All routes under `api/v1/activity-logs`, authenticated via Sanctum. No module permission required.

| Method | URL | Description | Query Params |
|--------|-----|-------------|-------------|
| `GET` | `/activity-logs` | Paginated list with filters | `page`, `per_page` (max 100, default 20), `subject_type`, `subject_id`, `user_id`, `action`, `date_from`, `date_to` |
| `GET` | `/activity-logs/recent` | Recent logs (flat list) | `limit` (max 100, default 50) |
| `GET` | `/activity-logs/subject/{type}/{id}` | Logs for a specific record | `page`, `per_page` (max 100, default 20) |

**Subject type short names:** `grant(s)`, `employee(s)`, `employment(s)`, `payroll(s)`

### API Response Shape

```json
{
  "id": 42,
  "user_id": 1,
  "action": "updated",
  "subject_type": "App\\Models\\Grant",
  "subject_id": 7,
  "subject_name": "RG-2023-001",
  "description": "Grant updated",
  "properties": { "old": {...}, "new": {...}, "changes": [...] },
  "ip_address": "192.168.1.1",
  "created_at": "2026-03-09T10:30:00.000000Z",
  "subject_type_short": "Grant",
  "action_label": "Updated",
  "user": { "id": 1, "name": "Admin User", "email": "admin@example.com" }
}
```

---

### 1.3 LogsActivity Trait

Models use the custom `LogsActivity` trait to automatically log CRUD events.

**Smart filtering:**
- Timestamp-only changes skipped
- Sensitive fields auto-excluded (passwords, SSN, bank accounts, tokens)
- Per-model exclusion lists supported

**9 Models currently tracked:**

| # | Model | Display Name |
|---|-------|-------------|
| 1 | Employee | `first_name_en last_name_en` or `staff_id` |
| 2 | Employment | Class name + ID |
| 3 | User | `name` field |
| 4 | Grant | `code` or `title` |
| 5 | GrantItem | Default |
| 6 | Payroll | Default |
| 7 | LeaveRequest | Default |
| 8 | Position | `title` |
| 9 | Department | `name` |

**NOT tracked:** Attendance, Holiday, Interview, JobOffer, Training, Resignation, PersonnelAction, Transfer, FundingAllocation, Site, LeaveType, LeaveBalance.

---

## Part 2: Frappe Framework Activity System (Reference Architecture)

### Overview

Frappe uses **3 separate data models** that merge into a single unified timeline at the bottom of every document:

```
              Per-Document Timeline (unified feed)
                         |
          +--------------+--------------+
          |              |              |
       Comment        Version      Activity Log
    (event log)    (field diffs)  (auth/system)
```

---

### 2.1 Comment DocType — The Event Log

The Comment doctype is Frappe's **general-purpose event store** for documents. It stores not just user comments but also system-generated events.

**19 Comment Types:**

| Type | Purpose |
|------|---------|
| `Comment` | User-written comment |
| `Like` | User liked the document |
| `Info` | General system info |
| `Label` | Label/tag change |
| `Workflow` | Workflow state transition |
| `Created` | Document was created |
| `Submitted` | Document was submitted |
| `Cancelled` | Document was cancelled |
| `Updated` | Document was updated |
| `Deleted` | Document was deleted |
| `Assigned` | Task assigned to user |
| `Assignment Completed` | Assignment marked complete |
| `Attachment` | File attached |
| `Attachment Removed` | File removed |
| `Shared` | Document shared |
| `Unshared` | Sharing revoked |
| `Bot` | Automated bot message |
| `Relinked` | Document relinked |
| `Edit` | Document edited |

**Key fields:** `comment_type`, `comment_email`, `comment_by`, `content` (HTML), `reference_doctype`, `reference_name`, `ip_address`, `published`, `seen`

**Features:**
- Comments cached in parent document's `_comments` JSON column (last 100, truncated)
- HTML sanitized (removes forms, inputs, buttons)
- Real-time Socket.IO broadcasts on insert

---

### 2.2 Version DocType — Field-Level Change Tracking

Stores **field-level diffs** every time a document with `track_changes = True` is saved.

**Schema:** `ref_doctype`, `docname`, `data` (JSON), `table_html` (rendered diff)

**JSON diff structure:**
```json
{
  "changed": [
    ["status", "Draft", "Approved"],
    ["salary", 15000, 16500]
  ],
  "added": [
    ["child_table", { "row_data": "..." }]
  ],
  "removed": [
    ["child_table", { "row_data": "..." }]
  ],
  "row_changed": [
    ["items", 0, "row-name", [
      ["qty", 5, 10]
    ]]
  ]
}
```

**How it works:**
1. Before save, Frappe stores a deep copy as `_doc_before_save`
2. After database update, `save_version()` calls `get_diff(old, new)`
3. Diff compares all fields, skips virtual/metadata fields
4. For Link fields, stores human-readable title instead of ID
5. For long strings, generates side-by-side HTML diff via `difflib`
6. Only last **10 versions** returned to frontend

---

### 2.3 Activity Log DocType — Authentication & System Events

Primarily for login/logout/impersonation. Separate from the per-document timeline.

**Key fields:** `subject`, `content`, `operation` (Login/Logout/Impersonate), `status` (Success/Failed), `reference_doctype`, `reference_name`, `user`, `ip_address`

**Can optionally appear in document timelines** via `timeline_doctype`/`timeline_name` fields.

Old logs auto-cleaned after 90 days.

---

### 2.4 Server-Side Aggregation: `get_docinfo()`

When a form loads, the backend assembles ALL timeline data into one payload:

```python
docinfo = {
    "comments":            # User-written comments (Comment type)
    "versions":            # Last 10 field-change versions
    "communications":      # Emails (limited to 20, with Load More)
    "assignments":         # Active task assignments
    "assignment_logs":     # Assignment history
    "attachment_logs":     # File attachment history
    "info_logs":           # Info/Edit/Label events
    "like_logs":           # Likes
    "workflow_logs":       # Workflow state changes
    "shared":              # Share events
    "views":               # View logs (who viewed the doc)
    "milestones":          # Tracked field value milestones
    "user_info":           # Display names + avatars for all users
}
```

Comments are **split by type** into separate sub-lists for easier frontend rendering.

---

### 2.5 Frontend Timeline Component

**Component hierarchy:**
```
FormFooter
  ├── Comment Box (rich text + mentions)
  └── FormTimeline (extends BaseTimeline)
        └── VersionTimelineContentBuilder
```

**FormTimeline builds timeline from 13 content generators:**
1. `get_creation_message()` — "You created this · just now"
2. `get_modified_message()` — "You last edited this · 2 hours ago"
3. `get_communication_timeline_contents()` — Emails (max 20, Load More)
4. `get_comment_timeline_contents()` — User comments
5. `get_view_timeline_contents()` — Who viewed
6. `get_version_timeline_contents()` — Field change history
7. `get_share_timeline_contents()` — Sharing events
8. `get_workflow_timeline_contents()` — Workflow transitions
9. `get_like_timeline_contents()` — Likes
10. `get_custom_timeline_contents()` — Plugin hook
11. `get_assignment_timeline_contents()` — Assignments
12. `get_attachment_timeline_contents()` — File uploads
13. `get_milestone_timeline_contents()` — Milestones

**UX decisions:**
- **"Show all activity" toggle** — By default only communications show. Users click to see full audit trail (avoids noise).
- **Lazy loading** — Only 10 versions and 20 communications loaded initially.
- **Real-time** — Socket.IO pushes new items into correct chronological position.
- **First-person** — "You changed..." vs "[User] changed..."

**Version display formatting:**
- "changed Status from **Draft** to **Approved**"
- "added 3 rows to **Items**"
- "changed Qty from **5** to **10** in row 2 of **Items**"
- Values truncated to 40 chars, HTML-escaped, bolded

---

## Part 3: Comparison — HRMS Custom vs Frappe

| Aspect | HRMS Custom | Frappe |
|--------|-------------|--------|
| **Data models** | 1 table (`activity_logs`) | 3 tables (Comment, Version, Activity Log) |
| **Change tracking** | old/new values in single JSON column | Dedicated Version table with structured diff |
| **Comment system** | None | Built-in with 19 types, mentions, real-time |
| **Auth events** | Not tracked | Login/Logout/Impersonate logged separately |
| **Timeline UI** | None yet | Unified timeline with 13 content generators |
| **Real-time** | Not implemented | Socket.IO broadcasts on every event |
| **Child table diffs** | Not supported | Added/removed/changed rows tracked per field |
| **File attachments** | Not tracked | Attachment/removal events logged |
| **Assignments** | Not tracked | Assignment events in timeline |
| **"Show all" toggle** | N/A | Default hides noise, toggle reveals full audit |
| **Models tracked** | 9 models | Every DocType with `track_changes` |
| **Package** | Custom trait | Built into framework core |

---

## Part 4: Recommendation — What We Can Build

### Realistic Scope (using existing HRMS backend)

The existing custom `activity_logs` table + API already provides **80% of what Frappe shows in its "Activity" section**. We don't need Spatie or a rewrite. We need frontend components.

### What we CAN do now (no backend changes):

1. **Activity Timeline Component** — Vertical timeline at the bottom of employee detail pages
   - "Admin created this · 3 days ago"
   - "Admin updated this · 2 hours ago" with expandable field-level diffs
   - Uses `GET /activity-logs/subject/employee/{id}`

2. **Activity Log List Page** — Global activity feed with filters
   - Table with columns: User, Action, Subject, Date
   - Filters: subject type, action, user, date range
   - Uses `GET /activity-logs`

3. **Dashboard Widget** — Recent activity feed on dashboard
   - Compact timeline showing last 10 actions
   - Uses `GET /activity-logs/recent?limit=10`

### What would need backend changes (future):

| Feature | Backend Work Needed |
|---------|-------------------|
| Comment/reply system | New `comments` table + API endpoints |
| "Show all activity" toggle | Already possible (filter by action type) |
| Real-time updates | Laravel Echo broadcast on ActivityLog creation |
| Track more models | Add `use LogsActivity;` to remaining models |
| Child table diffs | Enhanced diff logic in trait |

### API Client

```js
// src/api/activityLogApi.js
export const activityLogApi = {
  list:       (params) => client.get('/activity-logs', { params }),
  recent:     (params) => client.get('/activity-logs/recent', { params }),
  forSubject: (type, id, params) => client.get(`/activity-logs/subject/${type}/${id}`, { params }),
}
```
