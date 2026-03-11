import client, { initCsrf } from './axios'

export const authApi = {
  async login(email, password) {
    await initCsrf() // Must set XSRF-TOKEN cookie before login
    return client.post('/login', { email, password })
  },
  logout() {
    return client.post('/logout')
  },
  refreshToken() {
    return client.post('/refresh-token')
  },
  forgotPassword(email) {
    return client.post('/forgot-password', { email })
  },
  resetPassword(payload) {
    return client.post('/reset-password', payload)
  },
}
