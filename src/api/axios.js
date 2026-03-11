import axios from 'axios'
import router from '@/router'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  withCredentials: true, // Send HttpOnly auth cookies automatically
})

// No request interceptor needed — cookies are sent automatically via withCredentials

// ---- CSRF cookie initialization ----
export async function initCsrf() {
  await axios.get(`${PUBLIC_URL}/sanctum/csrf-cookie`, { withCredentials: true })
}

// ---- Response interceptor: handle 401, 419, 403 ----
let isRefreshing = false
let failedQueue = []
const MAX_QUEUE_SIZE = 10

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve()
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const errorData = error.response?.data

    // --- 401: Unauthorized ---
    if (status === 401) {
      // Login-specific errors: don't refresh, throw immediately
      const loginErrors = ['EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_INACTIVE']
      if (loginErrors.includes(errorData?.error_type)) {
        return Promise.reject(error)
      }

      // Auth requests (login, logout, refresh) — don't attempt token refresh, just expire
      const isAuthRequest = ['/login', '/logout', '/refresh-token'].some(
        path => originalRequest.url?.includes(path)
      )
      if (isAuthRequest) {
        clearAuthData()
        router.push({ name: 'login' })
        return Promise.reject(error)
      }

      // Session expired: try refresh
      if (!originalRequest._retry) {
        if (isRefreshing) {
          if (failedQueue.length >= MAX_QUEUE_SIZE) {
            return Promise.reject(error)
          }
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(() => client(originalRequest))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          await client.post('/refresh-token')
          processQueue(null)
          return client(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError)
          clearAuthData()
          router.push({ name: 'login' })
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
    }

    // --- 419: CSRF token mismatch ---
    if (status === 419 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true
      await initCsrf() // Re-fetch CSRF cookie
      return client(originalRequest) // Retry original request
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
  localStorage.removeItem('tokenExpiration')
  localStorage.removeItem('justLoggedIn')

  // Sync Pinia store reactive state — without this, auth.isAuthenticated stays
  // true (loaded from localStorage at store creation) and the login route guard
  // redirects back to dashboard, causing a loop.
  window.dispatchEvent(new Event('auth:session-expired'))
}

export default client
