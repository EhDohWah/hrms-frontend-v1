# Administrator Features — Analysis & Implementation Plan

> **Context:** The HRMS has two default roles: **HR Manager** (more control — accesses confidential HR data like salaries, leave, personnel actions) and **Administrator** (system-level — manages users, roles, permissions, and system health). HR Managers own the data; Administrators own the system that holds the data.

---

## 1. Current State

### What Administrators Can Do Today

| Feature | What It Does | Permission |
|---|---|---|
| **User Management** | Create/edit/delete users, assign roles | `users` |
| **Role Management** | Create custom roles, protected system roles | `roles` |
| **User Permissions** | Edit per-user RCUD permissions per module | `users` |
| **Activity Log** | View who did what, when, from which IP | `activity_logs` |
| **Recycle Bin** | Restore or permanently delete soft-deleted records | `recycle_bin` |
| **Data Import** | Bulk import grants, employees, onboarding data | `employees` / `grants` |
| **Organization** | Manage sites, departments, positions | `sites` / `departments` / `positions` |

### What's Missing

The Administrator has tools to manage **who can access what** but almost no tools to monitor **what the system is doing**. An admin today cannot:

- See who is currently logged in or how many active sessions exist
- Export the activity log for auditing or compliance
- See login history (successes, failures, lockouts) beyond the single `last_login_at` timestamp
- Monitor system health or storage usage
- Clear caches or perform maintenance
- See which users have been inactive for months
- Review permission changes over time

The role feels like half the job. It's a user manager, not yet a system administrator.

---

## 2. Role Boundary: HR Manager vs Administrator

This distinction matters for every feature below.

| Concern | HR Manager | Administrator |
|---|---|---|
| **Employee records** | Full access (confidential: salary, bank, personal) | No access or read-only |
| **Leave, payroll, training** | Full control | No access |
| **Grants, recruitment** | Full control | No access |
| **User accounts & roles** | No access (can't create users) | Full control |
| **Activity logs** | May view (audit own team) | Full control + export |
| **System health & sessions** | No access | Full control |
| **Recycle bin** | May restore HR records | Full control |
| **System settings** | No access | Full control |

**Principle:** HR Managers should never see system administration features. Administrators should never see confidential HR data (salaries, bank details, personal info) unless explicitly granted by the HR Manager.

---

## 3. Recommended Administrator Features — Prioritized

### Tier 1: High Value, Existing Backend Support (Build Now)

These features leverage data the backend already tracks or endpoints that partially exist.

#### 1.1 Login History & Session Monitoring

**What the user sees:** A new page under Administration showing a table of recent login events — who logged in, when, from which IP, success or failure. A summary row at the top showing "X active users today" and "Y failed attempts this week."

**Backend status:** `last_login_at` and `last_login_ip` are already stored on the User model. The AuthService already logs login attempts, failures, and lockouts to Laravel's log. What's missing is a `login_history` database table to persist these events instead of just logging them to file.

**Why it matters:** This is the single most asked-for admin feature in any multi-user system. "Who logged in last night?" is a question someone will ask after every security incident.

**Scope:**
- Backend: Create `login_histories` table (user_id, ip, user_agent, status [success/failed/locked_out], created_at). Log events in AuthService.
- Frontend: New view under Administration — table with filters (user, status, date range). Summary cards at top.

#### 1.2 Activity Log Export

**What the user sees:** An "Export" button on the existing Activity Log page. Clicking it exports the currently filtered view to Excel/CSV.

**Backend status:** The activity log API already supports all the filters needed. Missing only an export endpoint that returns a file instead of JSON.

**Why it matters:** Auditors ask for logs in spreadsheets. Today an admin would have to screenshot or manually copy the activity log page. That's not a real audit trail.

**Scope:**
- Backend: Add `GET /activity-logs/export` endpoint (same filters as list, returns CSV/Excel).
- Frontend: Add export button to ActivityLogListView toolbar.

#### 1.3 User Activity Summary Report

**What the user sees:** A new "User Activity" tab or report accessible from Administration. Shows a table of all users with columns: name, role, last login, login count (30 days), records created (30 days), last action date. Sortable by any column. Highlights users who haven't logged in for 30+ days in a warning color.

**Backend status:** All data exists — `last_login_at` on User, `activity_logs` table has per-user action counts. Needs a dedicated aggregation endpoint.

**Why it matters:** Administrators need to know which accounts are stale (security risk — unused accounts should be deactivated), which users are most active (capacity planning), and whether new users are actually using the system after onboarding.

**Scope:**
- Backend: New `GET /admin/reports/user-activity` endpoint with aggregated stats.
- Frontend: New view or card in the Administration section.

#### 1.4 Permission Change Audit Trail

**What the user sees:** When viewing a user's permissions page, a "Change History" section showing: "Admin set Employees.delete to granted — 3 days ago." Each entry shows who changed what, when.

**Backend status:** The `UserPermissionsUpdated` event is already broadcast when permissions change, but the change details aren't persisted to the activity log. The `LogsActivity` trait on User only logs user model changes (name, email), not permission pivot changes.

**Why it matters:** "Who gave John delete access to payroll?" is a question with compliance implications. Today there's no way to answer it.

**Scope:**
- Backend: Log permission changes to `activity_logs` when `UserPermissionService.updatePermissions()` runs. Store old/new permission diff in properties.
- Frontend: Show timeline on UserPermissionsView.

---

### Tier 2: Medium Value, Moderate Backend Work (Build Next)

#### 2.1 System Dashboard for Administrators

**What the user sees:** When an Administrator logs in, their dashboard shows system-health cards instead of HR widgets: active users today, failed logins this week, storage usage, records created this week, pending recycle bin items. Each card links to the relevant page.

**Why it matters:** The current dashboard shows HR metrics (employee count, leave requests, payroll) that are irrelevant to an Administrator who can't even access those modules. The dashboard should reflect what the role cares about.

**Scope:**
- Backend: New `GET /admin/dashboard/stats` endpoint.
- Frontend: Conditional dashboard widgets based on role, or a separate admin dashboard layout.

#### 2.2 Bulk User Management

**What the user sees:** On the User Management page, a "Bulk Actions" dropdown when rows are selected: Activate, Deactivate, Reset Password (sends email), Assign Role. Also an "Import Users" button that accepts a CSV of name/email/role.

**Why it matters:** When onboarding a new department (10-20 users at once), creating them one by one is painful. The "Save & Add Another" button helps but doesn't scale.

**Scope:**
- Backend: Bulk update endpoint, CSV import endpoint for users.
- Frontend: Checkbox selection on user table, bulk action dropdown, import modal.

#### 2.3 System Settings Page

**What the user sees:** A new "System Settings" page under Administration with grouped settings: General (app name, default timezone, fiscal year start), Security (password policy, session timeout, max login attempts), Notifications (email sender address, toggle notification types).

**Backend status:** Most of these are currently hardcoded in `.env` or config files. Moving them to a `system_settings` table with a key-value store makes them editable at runtime.

**Why it matters:** Today, changing the session timeout or password policy requires a code deploy. An administrator should be able to adjust these without developer involvement.

**Scope:**
- Backend: `system_settings` table, SystemSettingService, API endpoints.
- Frontend: New settings page with grouped form fields.

---

### Tier 3: Nice to Have (Backlog)

| Feature | Why | Effort |
|---|---|---|
| **Active session list + terminate** | See who's logged in now, force-logout specific sessions | Medium (backend: session table; frontend: list view) |
| **Cache management** | Clear app/config/route caches from UI | Low (backend: artisan commands via endpoint) |
| **Storage usage breakdown** | Show disk usage by module (profile pics, imports, exports) | Low-Medium |
| **Role cloning** | Duplicate a role's permissions as starting point for a new role | Low |
| **Scheduled report emails** | Auto-email user activity or audit reports weekly | Medium |
| **IP whitelist for admin access** | Restrict admin panel access to office IPs | Medium |
| **Two-factor authentication** | TOTP-based 2FA for admin/HR accounts | High |

---

## 4. Implementation Sequence

```
Phase 1 — Profile Fixes (from UX review)
  1. Add "Permissions managed by administrators" helper text
  2. Surface login IP alongside last login date on profile
  3. Add "View My Employee Record" link if linked employee exists
  4. Add profile picture preview before upload

Phase 2 — Core Admin Features (Tier 1)
  5. Login history table + backend logging + frontend view
  6. Activity log export (CSV/Excel button)
  7. User activity summary report
  8. Permission change audit trail

Phase 3 — Admin Dashboard & Bulk Ops (Tier 2)
  9. System-aware admin dashboard (replace HR widgets for admin role)
  10. Bulk user management (select, activate/deactivate, CSV import)
  11. System settings page (runtime config)

Phase 4 — Hardening (Tier 3, pick as needed)
  12. Active sessions + terminate
  13. Role cloning
  14. Cache management
  15. Storage usage
```

---

## 5. Sidebar Navigation Update

Current:
```
Administration
  ├── Users
  └── Roles

System
  ├── Activity Log
  └── Recycle Bin
```

Proposed:
```
Administration
  ├── Users
  ├── Roles
  ├── Login History        (new — Tier 1)
  └── User Activity        (new — Tier 1)

System
  ├── Activity Log          (add export button)
  ├── Recycle Bin
  └── System Settings       (new — Tier 2)
```

---

## 6. Backend Endpoints Needed

| Endpoint | Method | Purpose | Tier |
|---|---|---|---|
| `/admin/login-history` | GET | Paginated login events with filters | 1 |
| `/activity-logs/export` | GET | Export filtered logs to CSV/Excel | 1 |
| `/admin/reports/user-activity` | GET | Aggregated user activity stats | 1 |
| `/admin/dashboard/stats` | GET | Admin-specific dashboard metrics | 2 |
| `/admin/users/bulk-action` | POST | Bulk activate/deactivate/role-assign | 2 |
| `/admin/users/import` | POST | CSV user import | 2 |
| `/admin/system-settings` | GET/PUT | Runtime system configuration | 2 |
| `/admin/sessions` | GET/DELETE | Active sessions list + terminate | 3 |
| `/admin/cache/clear` | POST | Clear application caches | 3 |
| `/admin/storage/usage` | GET | Disk usage by module | 3 |
