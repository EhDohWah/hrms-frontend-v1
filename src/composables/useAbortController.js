import { onUnmounted } from 'vue'

export function useAbortController() {
  let controller = null

  function getSignal() {
    if (controller) controller.abort()
    controller = new AbortController()
    return controller.signal
  }

  onUnmounted(() => {
    if (controller) controller.abort()
  })

  return getSignal
}
