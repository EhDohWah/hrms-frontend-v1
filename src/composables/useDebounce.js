import { ref, watch } from 'vue'

export function useDebounce(sourceRef, delay = 300) {
  const debouncedValue = ref(sourceRef.value)
  let timeout

  watch(sourceRef, (newVal) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedValue.value = newVal
    }, delay)
  })

  return debouncedValue
}
