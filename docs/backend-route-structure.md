# Backend Route Structure

> **Last Updated:** February 2026

---

## Overview

The Laravel backend routes are organized into focused files under `routes/api/`, all loaded via `routes/api.php` under the `/api/v1` prefix.

---

## Route File Organization

```
routes/
  api.php                    # Entry point — loads all route files under v1 prefix
  api/
    auth.php                 # Public auth (login, forgot/reset password) + authenticated auth (logout, refresh)
    user.php                 # Current user: self-profile, notifications, activity logs, dashboard, lookups (read)
    admin.php                # Admin-only: user management, roles, permissions, modules, lookups (write)
    administration.php       # Organization structure (sites, departments, positions)
    employees.php            # Employee CRUD + sub-resources
    employment.php           # Employment records, salary, probation
    grants.php               # Grants and grant items
    payroll.php              # Payroll processing
    personnel_actions.php    # Interviews, job offers, training
    benefit-settings.php     # Benefit and tax settings
    uploads.php              # File uploads
    resignations.php         # Resignation management
    letter-templates.php     # Letter template management
    attendance.php           # Attendance and leave management
```

---

## Route Categories

### `auth.php` — Authentication

Public routes (no auth required) plus authenticated session management.

| Method | Endpoint | Purpose | Middleware |
|--------|----------|---------|------------|
| `POST` | `/login` | User login | `throttle:auth` |
| `POST` | `/forgot-password` | Send reset link | `throttle:sensitive` |
| `POST` | `/reset-password` | Reset password with token | `throttle:sensitive` |
| `POST` | `/logout` | Logout, revoke tokens | `auth:sanctum` |
| `POST` | `/refresh-token` | Refresh auth token | `auth:sanctum` |

### `user.php` — Current User (Self-Service)

Any authenticated user can access these — **no module permission required**.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/user` | Get authenticated user with roles & permissions |
| `POST` | `/user/profile-picture` | Upload own profile picture (2MB max) |
| `POST` | `/user/username` | Update own display name |
| `POST` | `/user/password` | Change own password |
| `POST` | `/user/email` | Change own email |
| `GET` | `/me/permissions` | Get own permissions (for frontend menu building) |

Also includes: notifications, activity logs, dashboard widgets (own), lookups (read-only).

### `admin.php` — Admin Management

All routes require `auth:sanctum` + specific `module.permission` middleware.

| Group | Permission | Routes |
|-------|-----------|--------|
| Module management | (none, avoids circular dep) | `admin/modules/*` |
| User management | `users` | `admin/users/*`, `admin/all-roles`, `admin/permissions` |
| Role management | `roles` | `admin/roles/*` |
| User permissions | `users` | `admin/user-permissions/*` |
| Dashboard (admin) | `users` | `admin/dashboard/*` |
| Lookups (write) | `lookup_list` | `lookups` (POST/PUT/DELETE) |

---

## Design Principles

1. **File name matches contents** — `auth.php` has auth routes, `admin.php` has admin routes
2. **Security clarity** — Easy to audit which routes need permissions vs open to all users
3. **No URL changes** — Route reorganization is purely file-level; all endpoints stay the same
4. **Scalability** — New self-service features go in `user.php`, new admin features go in `admin.php`

---

## Broadcast Events

Profile update operations dispatch `UserProfileUpdated` events via Laravel Reverb WebSocket. The service uses a `broadcastSafely()` pattern that wraps `event()` in a try-catch — if Reverb isn't running, the database save still succeeds and the broadcast failure is logged as a warning.

```php
// In UserProfileService
private function broadcastSafely(object $event): void
{
    try {
        event($event);
    } catch (\Throwable $e) {
        Log::warning('Broadcast failed: ' . $e->getMessage());
    }
}
```

Frontend listens on the user's private channel (`App.Models.User.{id}`) for `.user.profile-updated` events via Echo/Reverb.
