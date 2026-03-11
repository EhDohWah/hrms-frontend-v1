// Safe localStorage wrapper with JSON support
export const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return defaultValue
      return JSON.parse(value)
    } catch {
      return localStorage.getItem(key) || defaultValue
    }
  },

  set(key, value) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  },

  remove(key) {
    localStorage.removeItem(key)
  },

  clear() {
    localStorage.clear()
  },
}
