import { ref } from 'vue'
import { message } from 'ant-design-vue'

/**
 * Composable for "Save & Add Another" modal pattern.
 *
 * Provides dual loading refs (savingMain / savingAnother), a shared submit
 * wrapper with error handling, and a dedicated "save and add another" handler
 * that resets the form instead of closing the modal.
 *
 * @param {Object} options
 * @param {Function} options.refresh   - () => void – callback to refresh the list after save
 * @param {Function} options.reset     - () => void – callback to reset the form (called by submitAnother only)
 * @param {Function} [options.focus]   - () => void – optional callback to focus the first field
 * @param {Function} [options.onError] - (err) => void – optional custom error handler
 *
 * @returns {{ savingMain: Ref<boolean>, savingAnother: Ref<boolean>, submitMain: Function, submitAnother: Function }}
 */
export function useSaveAnother({ refresh, reset, focus, onError }) {
  const savingMain = ref(false)
  const savingAnother = ref(false)

  function handleError(err) {
    if (onError) {
      onError(err)
      return
    }
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to save')
    }
  }

  async function submitMain(apiFn) {
    savingMain.value = true
    try {
      await apiFn()
      refresh()
    } catch (err) {
      handleError(err)
    } finally {
      savingMain.value = false
    }
  }

  async function submitAnother(apiFn) {
    savingAnother.value = true
    try {
      await apiFn()
      refresh()
      reset()
      if (focus) focus()
    } catch (err) {
      handleError(err)
    } finally {
      savingAnother.value = false
    }
  }

  return { savingMain, savingAnother, submitMain, submitAnother }
}
