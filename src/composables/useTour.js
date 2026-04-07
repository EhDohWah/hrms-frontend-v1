import { ref, nextTick } from 'vue'
import { userApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

// Module-level cache — lives for the page session, avoids redundant API calls.
// Must be reset on logout to prevent leaking between user sessions.
let completedKeysCache = null

/**
 * Reset the tour cache. Call this on logout to prevent
 * the previous user's completion state leaking to the next user.
 */
export function resetTourCache() {
  completedKeysCache = null
}

/**
 * Composable for Ant Design Vue <a-tour> integration with backend tracking.
 *
 * Uses data-tour="key" attributes on DOM elements as targets,
 * so it works across components (sidebar, header, main content).
 *
 * @param {string} tourKey - Unique identifier stored in user_tours table
 */
export function useTour(tourKey) {
  const authStore = useAuthStore()
  const isTourOpen = ref(false)
  const currentStep = ref(0)
  let openTimer = null

  async function checkAndOpen() {
    try {
      if (authStore.needsPasswordChange) return

      if (completedKeysCache === null) {
        const { data } = await userApi.completedTours()
        completedKeysCache = data.data
      }
      if (!completedKeysCache.includes(tourKey)) {
        await nextTick()
        // Delay so sidebar/header elements are rendered and findable
        openTimer = setTimeout(() => {
          isTourOpen.value = true
        }, 600)
      }
    } catch {
      // silent — tour failing to check status is non-critical
    }
  }

  /**
   * Called when user finishes or closes/skips the tour.
   * Marks as complete so it won't show again.
   */
  async function markComplete() {
    isTourOpen.value = false
    currentStep.value = 0
    completedKeysCache = null
    try {
      await userApi.completeTour(tourKey)
    } catch {
      // silent — tour failing to save completion is non-critical
    }
  }

  /**
   * Manually re-open the tour (for "Restart Tour" button).
   */
  function restart() {
    currentStep.value = 0
    isTourOpen.value = true
  }

  /**
   * Clear pending timers. Call in onUnmounted() to prevent
   * stale writes after component unmount.
   */
  function cleanup() {
    clearTimeout(openTimer)
  }

  return {
    isTourOpen,
    currentStep,
    checkAndOpen,
    markComplete,
    restart,
    cleanup,
  }
}
