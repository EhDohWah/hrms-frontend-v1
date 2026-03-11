# Profile Page Architecture

> **Last Updated:** February 2026

---

## Overview

The profile page (`/profile`) allows authenticated users to manage their own account: upload a profile picture, edit display name and email, change password, and view their permissions. No module permission is required — any authenticated user can access it.

---

## File Structure

```
src/views/profile/
  ProfileView.vue             # Full profile page — sidebar + settings cards

src/api/
  userApi.js                  # API methods for self-profile operations

src/stores/
  auth.js                     # Auth store — holds user state, profile picture, roles

src/components/layout/
  AppHeader.vue               # Header — shows profile picture in avatar dropdown
```

---

## Page Layout

```
+----------------------------+---------------------------------------+
| [Avatar + Upload]          | Profile Information                   |
| HR Manager                 |   Display Name: [____]                |
| hrmanager@hrms.com         |   Email:        [____]                |
| [hr-manager]               |   [Save Changes]                     |
|                            +---------------------------------------+
| LAST LOGIN   24 Feb 2026   | Change Password                     |
| CREATED      24 Feb 2026   |   Current: [____]                   |
+----------------------------+   New: [____]  Confirm: [____]       |
                              |   [Update Password]                  |
                              +---------------------------------------+
                              | My Permissions                       |
                              |   [grid of module permission cards]  |
                              +---------------------------------------+
```

---

## API Endpoints

All self-profile endpoints are in `routes/api/user.php` (no module permission required).

| Frontend Method | HTTP | Endpoint | Backend Validation |
|----------------|------|----------|--------------------|
| `userApi.me()` | `GET` | `/user` | — |
| `userApi.updateUsername(payload)` | `POST` | `/user/username` | `name`: required, string, max 255 |
| `userApi.updateEmail(payload)` | `POST` | `/user/email` | `email`: required, email, unique |
| `userApi.updatePassword(payload)` | `POST` | `/user/password` | `current_password`: required; `new_password`: min 8, upper+lower+digit+special; `confirm_password`: same as new_password |
| `userApi.updateProfilePicture(formData)` | `POST` | `/user/profile-picture` | `profile_picture`: required, image, max 2MB |
| `userApi.myPermissions()` | `GET` | `/me/permissions` | — |

---

## Key Patterns

### Profile Picture

The sidebar shows the user's avatar with a camera upload overlay. The same `profilePictureUrl` pattern is used in both `ProfileView.vue` and `AppHeader.vue`:

```js
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'

const profilePictureUrl = computed(() => {
  const pic = authStore.userAvatar
  if (!pic) return null
  if (pic.startsWith('http')) return pic
  return `${PUBLIC_URL}/storage/${pic}`
})
```

After upload, the auth store is updated immediately so the header avatar reflects the change without page refresh:

```js
const updates = { profile_picture: data.data?.profile_picture || data.profile_picture }
authStore.updateUserFromEvent(updates)
authStore.broadcastProfileUpdate(updates)  // sync other tabs
```

### Form Sync with Auth Store

The profile form watches `authStore.user` to stay in sync when auth data loads asynchronously (e.g., after page refresh):

```js
const profileForm = reactive({ name: '', email: '' })

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    profileForm.name = newUser.name || ''
    profileForm.email = newUser.email || ''
  }
}, { immediate: true })
```

This is critical because on page refresh, the router guard awaits `authStore.initialize()` before mounting the component. Without the watch, the form would capture stale or empty values.

### Dirty Detection

The "Save Changes" button is disabled when the form values match the current auth store values:

```js
const isProfileDirty = computed(() => {
  return profileForm.name !== (authStore.userName || '')
    || profileForm.email !== (authStore.userEmail || '')
})
```

### Parallel Save

If both name and email change, they're saved in parallel:

```js
const promises = []
if (profileForm.name !== authStore.userName) {
  promises.push(userApi.updateUsername({ name: profileForm.name }))
}
if (profileForm.email !== authStore.userEmail) {
  promises.push(userApi.updateEmail({ email: profileForm.email }))
}
await Promise.all(promises)
```

---

## Auth Store: API Response Unwrapping

The `GET /user` endpoint returns `{ success: true, data: { id, name, email, ... } }`. The auth store must unwrap this correctly:

```js
async function fetchUser() {
  const { data } = await userApi.me()
  const userData = data.data || data  // unwrap, with fallback
  user.value = userData
  localStorage.setItem('user', JSON.stringify(userData))
}
```

**Important:** The `login()` method stores `data.user` (from the login response), while `fetchUser()` stores `data.data` (from the `/user` endpoint). Both must result in the same flat user object `{ id, name, email, roles, ... }` — not a wrapper like `{ success, data: { ... } }`.

This was a known bug where `fetchUser()` stored the wrapper, causing `user.value.name` to be `undefined` after page refresh. The `data.data || data` pattern handles both formats safely.

---

## Real-Time Updates

Profile changes broadcast a `UserProfileUpdated` event via Reverb (WebSocket). The frontend listens on the user's private channel:

```js
// In src/plugins/echo.js
userChannel.listen('.user.profile-updated', (e) => {
  authStore.updateUserFromEvent(e)
  authStore.broadcastProfileUpdate(e)  // notify other browser tabs
})
```

Cross-tab sync uses `BroadcastChannel('hrms-auth-channel')` with `PROFILE_UPDATE` messages.
