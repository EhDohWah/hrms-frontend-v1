import { ref } from 'vue'

/**
 * Generic wrapper for any async API call.
 * Provides loading, error, and data state.
 *
 * Usage:
 *   const { data, error, isLoading, execute } = useApi(employeeApi.list)
 *   await execute({ page: 1 })
 */
export function useApi(apiFunction) {
  const data = ref(null)
  const error = ref(null)
  const isLoading = ref(false)

  async function execute(...args) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiFunction(...args)
      data.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data || err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    data.value = null
    error.value = null
    isLoading.value = false
  }

  return { data, error, isLoading, execute, reset }
}
