import axios from 'axios'
import router from '@/router'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  withCredentials: true,
  withXSRFToken: true,
})

// Separate axios instance for Sanctum CSRF cookie (root domain, no /api/v1 prefix)
export const csrfClient = axios.create({
  baseURL: import.meta.env.VITE_APP_URL || 'http://localhost:8000',
  withCredentials: true,
})

// ---- Response interceptor: handle 401, 403 ----
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const errorData = error.response?.data

    // --- 401: Unauthorized ---
    if (status === 401) {
      // Login-specific errors: don't redirect, throw immediately
      const loginErrors = ['INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE', 'RATE_LIMIT_ERROR', 'SESSION_CONFLICT']
      if (loginErrors.includes(errorData?.error_type)) {
        return Promise.reject(error)
      }

      // Session expired — clear local state and redirect to login
      clearAuthData()
      router.push({ name: 'login', query: { reason: 'session-expired' } })
      return Promise.reject(error)
    }

    // --- 409: Session conflict (let LoginView handle it) ---
    if (status === 409 && errorData?.error_type === 'SESSION_CONFLICT') {
      return Promise.reject(error)
    }

    // --- 403: Permission denied ---
    if (status === 403) {
      window.dispatchEvent(new CustomEvent('permission-denied', {
        detail: { message: errorData?.message || 'Permission denied' },
      }))
    }

    return Promise.reject(error)
  }
)

function clearAuthData() {
  localStorage.removeItem('user')
  localStorage.removeItem('userRole')
  localStorage.removeItem('permissions')
  localStorage.removeItem('justLoggedIn')

  // Sync Pinia store reactive state — without this, auth.isAuthenticated stays
  // true (loaded from localStorage at store creation) and the login route guard
  // redirects back to dashboard, causing a loop.
  window.dispatchEvent(new Event('auth:session-expired'))
}

export default client
