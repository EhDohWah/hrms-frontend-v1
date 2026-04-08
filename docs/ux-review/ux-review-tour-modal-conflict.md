# UX Review: Tour + Password Change Modal Conflict

**Reviewed**: First-login experience for Admin/HR Manager accounts
**Date**: 2026-04-07

---

## 1. What Works Well

**The password change modal is correctly blocking.** It cannot be dismissed, clicked away, or escaped. This is the right call for a security-critical action — the user must handle it before doing anything else.

**The tour system is well-designed in isolation.** It checks backend persistence so users don't see the same tour twice. The 600ms delay gives the page time to render before highlighting elements. The steps are role-aware and permission-gated.

---

## 2. The Core Tension

Two first-time experiences compete for the same moment. The password change modal says "stop everything and secure your account." The onboarding tour says "let me show you around." They fire simultaneously, creating a screen where the user sees a locked modal *and* tour highlights peeking through behind it. The user can't interact with the tour (the modal blocks clicks), and the tour can't highlight elements properly (the dark modal mask covers them). Neither experience works.

---

## 3. The User's Day

### Today (First Login as HR Manager)

The user logs in for the first time. Within one second, two things happen at once:

1. A dark overlay appears with a red-bordered password change modal front and center
2. Behind it, an Ant Design tour spotlight tries to highlight the dashboard stats — a blue popover floats somewhere under the modal mask

The user stares at a layered mess. The tour popover is partially visible but untouchable. The modal demands a password change. The user changes their password, the success animation plays, the modal closes — and the tour is gone (it was rendered but never interactable, and may have auto-advanced or gotten into a broken state).

The onboarding tour — which is genuinely useful for a first-time user — is effectively lost.

### What It Should Feel Like

The user logs in. The password change modal appears cleanly, with nothing competing behind it. They change their password, see the "Account Secured" confirmation. The modal closes. Then, after a brief pause, the welcome tour begins — "Welcome to HRMS! Let me show you around." The two experiences happen in sequence, each getting the user's full attention.

### The Gap

- **Today**: Both fire at once, tour is wasted, user is confused
- **Ideal**: Password first, tour second, clean handoff between them

---

## 4. What to Fix

### Suppress tours while the password modal is active

The simplest and most robust fix: make `checkAndOpen()` in the tour composable aware of `needsPasswordChange`. If the user needs to change their password, the tour should not open — period. Once the password is changed and `needsPasswordChange` becomes `false`, the tour can open on the next page visit (or even immediately via a watcher).

This is a one-line check at the right chokepoint — no coordination queues, no event buses, no complex state machines. The tour already checks if it's been completed; adding "and the password modal isn't blocking" is the same kind of precondition.

---

## 5. Priorities

1. **Add `needsPasswordChange` guard to `checkAndOpen()`** — prevents the tour from opening while the modal is active (immediate fix, prevents the visual conflict)
2. **After password change, trigger the tour** — optional but valuable: watch `needsPasswordChange` transitioning from `true` to `false` and call `checkAndOpen()` so the user gets the tour immediately after securing their account, rather than waiting for a page refresh
