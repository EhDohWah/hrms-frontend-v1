import { useAuthStore } from '@/stores/auth'
import NProgress from 'nprogress'

let hasVerifiedSession = false

export function setupGuards(router) {
  router.beforeEach(async (to, from) => {
    const auth = useAuthStore()

    // Only show NProgress for full page transitions (auth routes, initial load)
    // Skip it for in-app sidebar navigations to avoid the "page reload" feel
    const isInAppNav = from.matched.some(r => r.meta.requiresAuth) && to.matched.some(r => r.meta.requiresAuth)
    if (!isInAppNav) {
      NProgress.start()
    }

    // First load: verify stored session with the server.
    // Catches DB resets (migrate:fresh), expired sessions, and revoked tokens.
    // Uses a flag because the store constructor loads user from localStorage,
    // making isAuthenticated true before we've verified the session is still valid.
    if (!hasVerifiedSession) {
      hasVerifiedSession = true
      if (localStorage.getItem('user')) {
        await auth.initialize()
      }
    }

    // Guest routes (login, forgot-password)
    if (to.meta.guest) {
      return auth.isAuthenticated ? { name: 'dashboard' } : true
    }

    // Protected routes
    if (to.meta.requiresAuth || to.matched.some(r => r.meta.requiresAuth)) {
      if (!auth.isAuthenticated) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }

      // Permission check — uses canRead() with nested module permissions
      if (to.meta.permission && !auth.canRead(to.meta.permission)) {
        return { name: 'dashboard' }
      }
    }

    return true
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
