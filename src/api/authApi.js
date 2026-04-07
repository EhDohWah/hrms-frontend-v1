import client from './axios'

export const authApi = {
  login(email, password) {
    return client.post('/login', { email, password })
  },
  logout() {
    return client.post('/logout')
  },
  forgotPassword(email) {
    return client.post('/forgot-password', { email })
  },
  resetPassword(payload) {
    return client.post('/reset-password', payload)
  },
}
