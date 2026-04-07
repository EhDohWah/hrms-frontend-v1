import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authApi'
import { userApi } from '@/api'
import { csrfClient } from '@/api/axios'
import { resetTourCache } from '@/composables/useTour'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // ---- State ----
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const permissions = ref(JSON.parse(localStorage.getItem('permissions') || '{}'))
  const loading = ref(false)
  const error = ref(null)

  let authChannel = null

  // Listen for session invalidation from the axios interceptor.
  // When the interceptor handles a 401 (e.g. after migrate:fresh), it clears localStorage
  // but can't access Pinia state directly (circular import). This event syncs the reactive
  // state so isAuthenticated becomes false and the route guard redirects to login.
  window.addEventListener('auth:session-expired', () => {
    user.value = null
    permissions.value = {}
  })

  // ---- Computed ----
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.name || '')
  const userEmail = computed(() => user.value?.email || '')
  const userAvatar = computed(() => user.value?.profile_picture)
  const userRoles = computed(() => user.value?.roles?.map(r => r.name) || [])

  // True when user has a default role (admin/hr-manager) and has never changed their password.
  // Backend must include `password_changed_at` (null = still using default password).
  const needsPasswordChange = computed(() => {
    if (!user.value) return false
    const isDefaultUser = userRoles.value.some(r => ['admin', 'hr-manager'].includes(r))
    return isDefaultUser && !user.value.password_changed_at
  })

  // ---- Nested object permission checks ----
  // Backend /me/permissions returns: { module_name: { read, create, update, delete, ... } }
  function hasPermission(module, type = 'read') {
    return permissions.value?.[module]?.[type] === true
  }

  function canRead(module) {
    return permissions.value?.[module]?.read === true
  }

  function canCreate(module) {
    return permissions.value?.[module]?.create === true
  }

  function canUpdate(module) {
    return permissions.value?.[module]?.update === true
  }

  function canDelete(module) {
    return permissions.value?.[module]?.delete === true
  }

  // Backward-compatible: true if user has ANY write permission (create OR update OR delete)
  function canEdit(module) {
    const m = permissions.value?.[module]
    return m?.create === true || m?.update === true || m?.delete === true
  }

  function hasRole(role) {
    return userRoles.value.includes(role)
  }

  // ---- Auth actions ----
  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      // Fetch CSRF cookie before login (Sanctum SPA authentication)
      await csrfClient.get('/sanctum/csrf-cookie')

      const { data } = await authApi.login(email, password)
      if (data.success) {
        // Store user metadata for UI (session cookie handles auth)
        user.value = data.user
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('userRole', data.user.roles?.[0]?.name || '')
        localStorage.setItem('justLoggedIn', 'true')

        await fetchPermissions()
        initCrossTabSync()
        return data
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    // GET /user returns { success, message, data: { id, name, ... } }
    // Let errors propagate — initialize() handles cleanup on failure.
    const { data } = await userApi.me()
    const userData = data.data || data
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  async function fetchPermissions() {
    try {
      // GET /me/permissions returns { success: true, data: { module: { read, create, update, delete, ... } } }
      const { data } = await userApi.myPermissions()
      permissions.value = data.data || {}
      localStorage.setItem('permissions', JSON.stringify(permissions.value))
    } catch { /* fail silently */ }
  }

  async function initialize() {
    // Check if we have stored user data and verify with server
    const storedUser = localStorage.getItem('user')
    if (!storedUser) return

    loading.value = true
    try {
      await Promise.all([fetchUser(), fetchPermissions()])
      initCrossTabSync()
    } catch {
      clearAllData()
    } finally {
      loading.value = false
    }
  }

  // ---- Server-side auth verification for route guards ----
  async function checkAuth() {
    try {
      const { data } = await userApi.me()
      const userData = data.data || data
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    broadcastLogout()
    clearAllData()
    router.push({ name: 'login' })
  }

  function updateUserFromEvent(eventData) {
    if (user.value) {
      Object.assign(user.value, eventData)
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  // ---- Cross-tab sync via BroadcastChannel ----
  function initCrossTabSync() {
    if (authChannel) authChannel.close()
    authChannel = new BroadcastChannel('hrms-auth-channel')

    authChannel.onmessage = (event) => {
      const { type, payload } = event.data

      switch (type) {
        case 'LOGOUT':
          user.value = null
          permissions.value = {}
          clearLocalStorage()
          router.push({ name: 'login' })
          break

        case 'PERMISSION_UPDATE':
          permissions.value = payload.permissions
          localStorage.setItem('permissions', JSON.stringify(payload.permissions))
          break

        case 'PROFILE_UPDATE':
          if (user.value) {
            Object.assign(user.value, payload)
            localStorage.setItem('user', JSON.stringify(user.value))
          }
          break
      }
    }
  }

  function broadcastLogout() {
    authChannel?.postMessage({ type: 'LOGOUT' })
  }

  function broadcastPermissionUpdate() {
    authChannel?.postMessage({
      type: 'PERMISSION_UPDATE',
      payload: { permissions: permissions.value },
    })
  }

  function broadcastProfileUpdate(data) {
    authChannel?.postMessage({
      type: 'PROFILE_UPDATE',
      payload: data,
    })
  }

  // ---- Cleanup helpers ----
  function clearLocalStorage() {
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('permissions')
    localStorage.removeItem('justLoggedIn')
  }

  function clearAllData() {
    user.value = null
    permissions.value = {}
    resetTourCache()
    clearLocalStorage()
  }

  return {
    // State
    user, permissions, loading, error,
    // Computed
    isAuthenticated, userName, userEmail, userAvatar, userRoles, needsPasswordChange,
    // Permission checks
    hasPermission, canRead, canCreate, canUpdate, canDelete, canEdit, hasRole,
    // Actions
    login, logout, fetchUser, fetchPermissions, initialize, checkAuth,
    updateUserFromEvent,
    // Cross-tab sync
    initCrossTabSync, broadcastPermissionUpdate, broadcastProfileUpdate,
  }
})
