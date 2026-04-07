# Administrator System Monitoring — Implementation Plan

> **Role clarification:** The HR Manager manages users and HR data. The Administrator manages the system — health, errors, jobs, performance, reference data. The admin has NO access to HR modules (employees, leave, payroll, etc.) but full visibility into how the system itself is running.

---

## Current Admin Experience

### Dashboard
- Greeting + date
- System Overview widget (login counts, failed attempts, lockouts)
- Recent Activity feed (last 8 activity log entries)
- Notifications

### Sidebar
```
Administration
  ├── Users               ← manages user accounts
  ├── Roles               ← manages role definitions
  ├── Lookup Data          ← manages dropdown reference data
  ├── Login History        ← security audit: who logged in
  └── User Activity        ← usage audit: who's active/stale

System
  ├── Activity Log         ← data audit: who changed what (with CSV export)
  ├── Recycle Bin          ← recover deleted records
  └── System Settings      ← runtime configuration
```

### What's Missing
The admin can answer "who did what?" but NOT "is the system healthy?" There is zero visibility into:
- Application errors (500s, exceptions)
- Failed background jobs (payroll processing, grant imports)
- API performance (slow endpoints, response times)
- Storage/database health
- Frontend errors (JavaScript crashes in user browsers)

---

## Plan: 5 New Features

### Feature 1: System Health Dashboard Widget

**What the admin sees:** A card on the dashboard with 4 status indicators, each showing green/yellow/red:

| Indicator | Green | Yellow | Red |
|---|---|---|---|
| **Database** | Responds < 100ms | 100-500ms | > 500ms or unreachable |
| **Cache** | Operational | — | Unreachable |
| **Storage** | < 80% used | 80-90% | > 90% |
| **Queue** | 0 failed jobs (24h) | 1-5 failed | > 5 failed |

Below the indicators: "Last checked: HH:mm" with a refresh button.

**Where it appears:** Dashboard — replaces/enhances the current AdminStatsWidget. The login stats move into the health widget as a 5th row, so the admin gets everything in one card.

**Backend endpoint:** `GET /admin/system-health`

Returns:
```json
{
  "database": { "status": "healthy", "response_ms": 12 },
  "cache": { "status": "healthy", "driver": "file" },
  "storage": { "status": "warning", "used_percent": 82, "used_gb": 4.1, "total_gb": 5.0 },
  "queue": { "status": "healthy", "pending_jobs": 0, "failed_jobs_24h": 0 },
  "logins": { "today": 8, "failed_today": 2, "locked_out_today": 0 }
}
```

**Backend implementation:**
- New `SystemHealthService` with methods:
  - `check()` — runs all checks, returns combined status
  - `checkDatabase()` — `DB::select('SELECT 1')` with timing
  - `checkCache()` — `Cache::put/get` round-trip test
  - `checkStorage()` — `disk_total_space()` / `disk_free_space()` on storage path
  - `checkQueue()` — `DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count()`
  - `checkLogins()` — reuse existing `LoginHistoryService::summary()`
- New `SystemHealthController` with `check()` method
- Route: `GET /admin/system-health` under admin prefix, gated by `users` permission

**Frontend implementation:**
- New `SystemHealthWidget.vue` replacing current `AdminStatsWidget.vue` on dashboard
- 5-row status card with color-coded indicators
- Auto-refresh every 60 seconds (optional, configurable)
- Each row clickable: Database/Cache/Storage → System Health page, Queue → Failed Jobs page, Logins → Login History page

---

### Feature 2: Error Log Viewer

**What the admin sees:** A new page showing recent application errors in a structured table:

| Column | Example |
|---|---|
| Severity | `error` / `warning` / `critical` |
| Message | "SQLSTATE[HY000]: Connection refused" |
| URL | `POST /api/v1/payroll/bulk` |
| User | "John Smith" or "—" (unauthenticated) |
| Count | 12 (grouped occurrences in last hour) |
| Last Seen | "5 minutes ago" |

Clicking a row expands to show: full stack trace, request body (sanitized — no passwords), headers, and occurrence history.

Filters: severity, date range, search text, URL pattern.

**Why not just read the log file?** The `laravel.log` is 250MB+ of unstructured text. Finding the error a user reported 20 minutes ago means grep-ing through millions of lines. A structured table with search and filtering turns a 10-minute SSH session into a 5-second lookup.

**Backend implementation:**

Option A (recommended — database logging):
- Switch error-level logging to a database channel alongside the file channel
- New migration: `system_error_logs` table
  - `id`, `level` (error/warning/critical/emergency), `message` (text), `context` (json — URL, user_id, ip, request method), `trace` (longText, nullable), `fingerprint` (string — hash of message+file+line for grouping), `occurrences` (integer, default 1), `first_seen_at`, `last_seen_at`, `created_at`
- New `SystemErrorLogService`:
  - `log(level, message, context, trace)` — creates or increments by fingerprint
  - `list(filters)` — paginated, filterable list
  - `show(id)` — single error with full trace
  - `dismiss(id)` — marks as acknowledged (soft indicator, not deletion)
  - `cleanup(days)` — delete errors older than N days
- New `SystemErrorLogController`: `index`, `show`, `dismiss`, `cleanup`
- Custom log channel: `database` channel that calls `SystemErrorLogService::log()` for error+ levels
- Update `config/logging.php` stack to include both `single` and the new `database` channel
- Route: `GET /admin/error-logs`, `GET /admin/error-logs/{id}`, `POST /admin/error-logs/{id}/dismiss`, `POST /admin/error-logs/cleanup`

**Frontend implementation:**
- New `ErrorLogListView.vue` under `src/views/admin/`
- Summary cards at top: errors today, errors this week, most frequent error
- Table with expandable rows (click to see stack trace)
- Filters: severity, date range, search
- "Dismiss" button to acknowledge an error (removes from default view, still queryable)
- "Cleanup" button to purge old entries (with confirmation)
- Route: `/admin/error-logs`, permission: `users`
- Sidebar item: under System section, icon: `BugOutlined`

---

### Feature 3: Failed Jobs Monitor

**What the admin sees:** A page listing all failed background jobs:

| Column | Example |
|---|---|
| Job | "Process Bulk Payroll" |
| Queue | "default" |
| Error | "Trying to access array offset on null" |
| Failed At | "2 hours ago" |
| Actions | Retry / Delete |

Clicking a row shows: full exception message, stack trace, job payload (what data was being processed).

**Backend implementation:**
- New `FailedJobController`:
  - `index()` — paginated list from `failed_jobs` table, parsed payload to extract job class name
  - `show(id)` — single failed job with full exception and decoded payload
  - `retry(id)` — calls `Artisan::call('queue:retry', ['id' => $uuid])`
  - `destroy(id)` — deletes the failed job record
  - `retryAll()` — calls `Artisan::call('queue:retry', ['--all' => true])`
  - `flush()` — calls `Artisan::call('queue:flush')` (delete all failed jobs)
- Routes: under admin prefix
  - `GET /admin/failed-jobs`
  - `GET /admin/failed-jobs/{id}`
  - `POST /admin/failed-jobs/{id}/retry`
  - `DELETE /admin/failed-jobs/{id}`
  - `POST /admin/failed-jobs/retry-all`
  - `POST /admin/failed-jobs/flush`

**Frontend implementation:**
- New `FailedJobListView.vue` under `src/views/admin/`
- Summary: total failed jobs, oldest failure date
- Table with expandable rows (exception + payload)
- Action buttons: Retry (per-job), Delete (per-job), Retry All, Flush All (with confirmations)
- Route: `/admin/failed-jobs`, permission: `users`
- Sidebar item: under System section, icon: `WarningOutlined`
- Badge on sidebar item showing count of failed jobs (if > 0)

---

### Feature 4: Performance Metrics

**What the admin sees:** A page showing API performance data:

Top section — 3 summary cards:
- Average response time (today): "142ms"
- Slowest endpoint (today): "POST /payroll/bulk — 4,200ms"
- Total API requests (today): "1,847"

Below — a table of endpoints sorted by average response time (slowest first):
| Endpoint | Avg Time | Max Time | Requests | Slow (>2s) |
|---|---|---|---|---|
| POST /payroll/bulk | 3,200ms | 8,400ms | 12 | 8 |
| GET /employees | 450ms | 1,200ms | 234 | 0 |

**Backend implementation:**

The `PaginationMonitor` middleware already caches metrics. But it only tracks paginated endpoints. Extend it:

- New `PerformanceMetricService`:
  - `dailySummary()` — reads cached daily metrics, returns summary
  - `endpointBreakdown()` — returns per-endpoint stats (avg time, max time, request count, slow count)
  - `hourlySummary(date)` — hourly breakdown for trend viewing
- To make this work properly, store per-endpoint metrics in cache (keyed by route pattern) instead of just global aggregates
- New `PerformanceMetricController`: `summary`, `endpoints`, `hourly`
- Routes: `GET /admin/performance/summary`, `GET /admin/performance/endpoints`, `GET /admin/performance/hourly`

**Frontend implementation:**
- New `PerformanceView.vue` under `src/views/admin/`
- Summary cards at top
- Sortable table of endpoints
- Optional: simple bar chart showing hourly request volume (using pure CSS bars, no chart library needed)
- Route: `/admin/performance`, permission: `users`
- Sidebar item: under System section, icon: `DashboardOutlined`

---

### Feature 5: Frontend Error Tracking

**What the admin sees:** A tab or section within the Error Log page showing client-side JavaScript errors:

| Column | Example |
|---|---|
| Error | "Cannot read property 'name' of undefined" |
| Page | "/employees/42" |
| Browser | "Chrome 120" |
| User | "Jane Smith" |
| Count | 3 |
| Last Seen | "10 min ago" |

**Backend implementation:**
- New migration: `client_error_logs` table
  - `id`, `message` (text), `source` (string — file/component), `page_url` (string), `user_id` (nullable FK), `user_agent` (string), `fingerprint` (string — hash for grouping), `occurrences` (int), `stack` (text, nullable), `first_seen_at`, `last_seen_at`, `created_at`
- New `ClientErrorLogService`: `log(data)`, `list(filters)`
- New `ClientErrorLogController`: `store` (public-ish, auth:sanctum only), `index` (admin only)
- Routes:
  - `POST /client-errors` — any authenticated user can report (the browser sends errors automatically)
  - `GET /admin/client-errors` — admin reads them

**Frontend implementation:**
- Global error handler in `src/main.js` or `src/App.vue`:
  - `app.config.errorHandler` — catches Vue component errors
  - `window.addEventListener('error', ...)` — catches runtime JS errors
  - `window.addEventListener('unhandledrejection', ...)` — catches unhandled promise rejections
  - Debounce + deduplicate (don't flood the API — batch and send max 1 per 10 seconds)
  - POST to `/client-errors` with: message, source, page URL, user agent, stack trace
- Error log page: add a "Client Errors" tab alongside "Server Errors"
- Route: reuse `/admin/error-logs` page with a tab switcher

---

## Updated Admin Sidebar After Implementation

```
Administration
  ├── Users
  ├── Roles
  ├── Lookup Data
  ├── Login History
  └── User Activity

System
  ├── System Health         (NEW — Feature 1, page + dashboard widget)
  ├── Error Logs            (NEW — Feature 2 + 5, server + client tabs)
  ├── Failed Jobs           (NEW — Feature 3, with badge count)
  ├── Performance           (NEW — Feature 4)
  ├── Activity Log          (existing)
  ├── Recycle Bin           (existing)
  └── System Settings       (existing)
```

## Updated Admin Dashboard After Implementation

```
┌──────────────────────────────────────────┐
│ Good morning, Admin          April 6, 2026│
├──────────────────────────────────────────┤
│                                          │
│  ┌─ System Health ─────────────────────┐ │
│  │ ● Database    12ms         healthy  │ │
│  │ ● Cache       operational  healthy  │ │
│  │ ● Storage     4.1/5.0 GB   warning  │ │
│  │ ● Queue       0 failed     healthy  │ │
│  │ ● Logins      8 today, 2 failed     │ │
│  │            Last checked: 14:32  🔄  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Recent Errors ──┐ ┌─ Failed Jobs ──┐│
│  │ 3 errors today   │ │ 0 failed jobs  ││
│  │ 12 this week     │ │ All clear ✓    ││
│  │ View all →       │ │ View all →     ││
│  └──────────────────┘ └────────────────┘│
│                                          │
│  ┌─ Recent Activity (full width) ──────┐ │
│  │ ...                                 │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Notifications (full width) ────────┐ │
│  │ ...                                 │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## Implementation Order

| Phase | Feature | Backend | Frontend | Depends On |
|---|---|---|---|---|
| **1** | System Health widget + page | `SystemHealthService`, `SystemHealthController`, 1 route | `SystemHealthWidget.vue` (replace AdminStatsWidget), `SystemHealthView.vue` | Nothing |
| **2** | Failed Jobs monitor | `FailedJobController`, 6 routes | `FailedJobListView.vue`, sidebar item + badge | Nothing |
| **3** | Error Log viewer (server) | Migration, `SystemErrorLogService`, `SystemErrorLogController`, custom log channel, 4 routes | `ErrorLogListView.vue`, sidebar item | Nothing |
| **4** | Frontend error tracking | Migration, `ClientErrorLogController`, 2 routes | Global error handler in App.vue, "Client Errors" tab on Error Log page | Feature 3 (shares the page) |
| **5** | Performance metrics | `PerformanceMetricService`, `PerformanceMetricController`, 3 routes | `PerformanceView.vue`, sidebar item | PaginationMonitor middleware (already exists) |

**Phase 1-2 can be built in parallel.** Phase 3-4 are sequential (4 adds a tab to 3's page). Phase 5 is independent.

---

## New Backend Files Summary

| File | Type | Purpose |
|---|---|---|
| `database/migrations/xxxx_create_system_error_logs_table.php` | Migration | Server error storage |
| `database/migrations/xxxx_create_client_error_logs_table.php` | Migration | Frontend error storage |
| `app/Models/SystemErrorLog.php` | Model | Server error model |
| `app/Models/ClientErrorLog.php` | Model | Client error model |
| `app/Services/SystemHealthService.php` | Service | DB/cache/storage/queue checks |
| `app/Services/SystemErrorLogService.php` | Service | Error logging + querying |
| `app/Services/ClientErrorLogService.php` | Service | Client error logging + querying |
| `app/Services/PerformanceMetricService.php` | Service | Read cached perf metrics |
| `app/Http/Controllers/Api/V1/SystemHealthController.php` | Controller | Health check endpoint |
| `app/Http/Controllers/Api/V1/FailedJobController.php` | Controller | Failed jobs CRUD + retry |
| `app/Http/Controllers/Api/V1/SystemErrorLogController.php` | Controller | Error log endpoints |
| `app/Http/Controllers/Api/V1/ClientErrorLogController.php` | Controller | Client error endpoints |
| `app/Http/Controllers/Api/V1/PerformanceMetricController.php` | Controller | Performance endpoints |
| `app/Logging/DatabaseLogger.php` | Custom Logger | Writes error+ logs to DB |

## New Frontend Files Summary

| File | Type | Purpose |
|---|---|---|
| `src/components/dashboard/widgets/SystemHealthWidget.vue` | Widget | Dashboard health card (replaces AdminStatsWidget) |
| `src/components/dashboard/widgets/RecentErrorsWidget.vue` | Widget | Dashboard error summary card |
| `src/components/dashboard/widgets/FailedJobsWidget.vue` | Widget | Dashboard failed jobs card |
| `src/views/admin/SystemHealthView.vue` | Page | Detailed health check page |
| `src/views/admin/ErrorLogListView.vue` | Page | Server + client error logs |
| `src/views/admin/FailedJobListView.vue` | Page | Failed jobs with retry |
| `src/views/admin/PerformanceView.vue` | Page | API performance metrics |
| `src/api/systemApi.js` | API | System health, errors, jobs, performance endpoints |
