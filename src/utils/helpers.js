export function debounce(fn, delay = 300) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

export function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function cleanParams(params) {
  const cleaned = { ...params }
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === null || cleaned[key] === '' || cleaned[key] === undefined) {
      delete cleaned[key]
    }
  })
  return cleaned
}

/**
 * Parse error message from a blob response.
 * Axios returns error body as Blob when responseType is 'blob',
 * so we need to read and parse it manually.
 */
export async function parseBlobError(err) {
  try {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text()
      const json = JSON.parse(text)
      return json.message || null
    }
    return err.response?.data?.message || null
  } catch {
    return null
  }
}
