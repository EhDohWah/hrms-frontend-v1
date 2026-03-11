# Login Page — Design Analysis

## Overview

The login page (`src/views/auth/LoginView.vue`) uses a **split-panel layout**: a dark branded panel on the left and a white form panel on the right. On mobile, only the form panel is shown. The page bypasses `AuthLayout.vue` — it manages its own full-viewport centering.

---

## Layout Architecture

```
┌──────────────────────────────────────────────────────────┐
│ .login-page (100vh, centered flex)                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │ .login-container (860px max, row on sm+)          │    │
│  │  ┌──────────────┬───────────────────────────┐     │    │
│  │  │ .login-brand │ .login-form-area           │     │    │
│  │  │  (340px)     │  (flex: 1)                 │     │    │
│  │  │  #171717 bg  │  .login-card (360px max)   │     │    │
│  │  │              │    - Title                  │     │    │
│  │  │  HRMS        │    - Description            │     │    │
│  │  │  Subtitle    │    - Error alert            │     │    │
│  │  │  Org badge   │    - Email input            │     │    │
│  │  │              │    - Password input          │     │    │
│  │  │              │    - Forgot password link    │     │    │
│  │  │  Footer text │    - Sign in button         │     │    │
│  │  └──────────────┴───────────────────────────┘     │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `< 640px` | Column layout. Brand panel hidden (`display: none`). Form panel has `padding: 32px 24px`. Container has `margin: 16px`. |
| `>= 640px` | Row layout. Brand panel visible (`display: flex`). Form panel has `padding: 48px`. Container has no margin, `min-height: 520px`. |

---

## Component Structure

### Template

```
.login-page
  .login-container
    .login-brand                   ← Left panel (hidden on mobile)
      .brand-content
        h1.brand-title             ← "HRMS"
        p.brand-subtitle           ← "Human Resource Management System"
        p.brand-org                ← "SMRU · BHF"
      .brand-footer                ← org full names
    .login-form-area               ← Right panel
      .login-card
        h2.login-title             ← "Sign in"
        p.login-desc               ← subtitle text
        a-alert (error)            ← conditional error message
        a-form (vertical layout)
          a-form-item (email)      ← with MailOutlined prefix icon
          a-form-item (password)   ← with LockOutlined prefix icon
          .form-actions            ← forgot password link (right-aligned)
          a-button (submit)        ← full-width primary button
```

### Script

- **State**: `form` (reactive: email, password), `loading` (ref), `errorMessage` (ref)
- **Auth flow**: `authStore.login()` → redirect to `route.query.redirect` or `/`
- **Security**: Safe redirect validation — must start with `/` and not `//` (prevents open redirect)
- **Error handling**: Displays `err.response?.data?.message` or fallback string
- **Icons**: `MailOutlined`, `LockOutlined` from `@ant-design/icons-vue`

---

## Complete CSS Reference

### CSS Variables Used (from `global.less`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg` | `#f4f5f6` | Page background |
| `--color-bg-surface` | `#ffffff` | Container background |
| `--color-primary` | `#171717` | Brand panel background, button color |
| `--color-primary-hover` | `#2d2d2d` | Button hover |
| `--color-text` | `#1f272e` | Title text |
| `--color-text-secondary` | `#6b7280` | Description, forgot link |
| `--color-text-muted` | `#9ca3af` | Input prefix icons |
| `--color-text-inverse` | `#ffffff` | Brand panel text |
| `--color-border` | `#e5e7eb` | Input borders (via global override) |
| `--radius-md` | `8px` | Input, button radius (via global override) |
| `--radius-lg` | `12px` | Brand logo radius |
| `--radius-xl` | `16px` | Container radius |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.08)` | Container shadow |

### Full Scoped CSS

```css
/* ===== Page wrapper ===== */
.login-page {
  min-height: 100vh;
  background: var(--color-bg);            /* #f4f5f6 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Main container ===== */
.login-container {
  display: flex;
  flex-direction: column;                  /* stacked on mobile */
  width: 100%;
  max-width: 860px;
  background: var(--color-bg-surface);     /* #ffffff */
  border-radius: var(--radius-xl);         /* 16px */
  box-shadow: var(--shadow-lg);            /* 0 8px 24px rgba(0,0,0,0.08) */
  overflow: hidden;
  margin: 16px;                            /* breathing room on mobile */
}
@media (min-width: 640px) {
  .login-container {
    flex-direction: row;                   /* side-by-side on desktop */
    min-height: 520px;
    margin: 0;
  }
}

/* ===== Left panel — Brand ===== */
.login-brand {
  width: 340px;
  flex-shrink: 0;
  background: var(--color-primary);        /* #171717 dark */
  color: var(--color-text-inverse);        /* #ffffff */
  padding: 48px 36px;
  display: none;                           /* hidden on mobile */
  flex-direction: column;
  justify-content: space-between;          /* pushes footer to bottom */
}
@media (min-width: 640px) {
  .login-brand {
    display: flex;                         /* visible on sm+ */
  }
}

/* Brand logo (not currently used in template, but styled) */
.brand-logo {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);  /* frosted white overlay */
  border-radius: var(--radius-lg);         /* 12px */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 24px;
}

/* "HRMS" heading */
.brand-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;                 /* tight tracking */
  margin: 0 0 8px;
}

/* "Human Resource Management System" */
.brand-subtitle {
  font-size: 14px;
  opacity: 0.7;
  margin: 0 0 12px;
  line-height: 1.5;
}

/* "SMRU · BHF" badge */
.brand-org {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.5;
  letter-spacing: 0.1em;                   /* wide tracking */
  text-transform: uppercase;
}

/* Footer text at bottom of brand panel */
.brand-footer {
  font-size: 12px;
  opacity: 0.4;
  line-height: 1.5;
}

/* ===== Right panel — Form ===== */
.login-form-area {
  flex: 1;
  display: flex;
  align-items: center;                     /* vertically center form */
  justify-content: center;
  padding: 32px 24px;                      /* compact on mobile */
}
@media (min-width: 640px) {
  .login-form-area {
    padding: 48px;                         /* more spacious on desktop */
  }
}

/* Inner card (constrains form width) */
.login-card {
  width: 100%;
  max-width: 360px;
}

/* "Sign in" heading */
.login-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

/* "Enter your credentials..." */
.login-desc {
  color: var(--color-text-secondary);      /* #6b7280 */
  margin: 0 0 28px;
  font-size: 14px;
}

/* Input prefix icons */
.input-icon {
  color: var(--color-text-muted);          /* #9ca3af */
}

/* Forgot password row */
.form-actions {
  display: flex;
  justify-content: flex-end;               /* link pushed right */
  margin-bottom: 20px;
}
.forgot-link {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.forgot-link:hover {
  color: var(--color-text);
}

/* Submit button — overrides Ant Design defaults */
.login-btn {
  height: 44px !important;                 /* taller than default */
  font-size: 15px !important;
  font-weight: 600 !important;
}
```

### Inherited Global Styles (from `global.less`)

These Ant Design overrides apply automatically to form elements inside the login:

```css
/* Input fields get 8px radius and #e5e7eb border */
.ant-input, .ant-input-affix-wrapper, .ant-select-selector, .ant-picker {
  border-radius: 8px !important;
  border-color: #e5e7eb !important;
}

/* Focus state: dark border + subtle shadow */
.ant-input:focus, .ant-input-affix-wrapper-focused {
  border-color: #171717 !important;
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.08) !important;
}

/* Primary button: dark background */
.ant-btn-primary {
  background: #171717 !important;
  border-color: #171717 !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
}
```

### Ant Design Theme Overrides (from `vite.config.js`)

```js
modifyVars: {
  'primary-color': '#171717',
  'border-radius-base': '8px',
  'font-family': "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
}
```

---

## Design Tokens Summary

| Property | Value |
|----------|-------|
| Container max-width | `860px` |
| Container border-radius | `16px` |
| Container shadow | `0 8px 24px rgba(0,0,0,0.08)` |
| Brand panel width | `340px` fixed |
| Brand panel background | `#171717` |
| Form card max-width | `360px` |
| Form padding (mobile) | `32px 24px` |
| Form padding (desktop) | `48px` |
| Title size | `24px / 700` |
| Submit button height | `44px` |
| Input border-radius | `8px` (global) |
| Breakpoint | `640px` |
| Font | DM Sans |

---

## Relationship to AuthLayout

`AuthLayout.vue` provides a simpler centered wrapper (`max-width: 480px`), but `LoginView.vue` **does not use it** — the login page has its own `.login-page` full-viewport wrapper because the split-panel layout (860px) exceeds the AuthLayout constraint. `ForgotPasswordView.vue` also manages its own layout independently.

Both auth pages share the same `.login-page` base class for the full-viewport centered background.

---

## Dead CSS

`.brand-logo` is styled but not referenced in the template (no element uses this class). It was likely from an earlier design iteration with a logo icon above the title.
