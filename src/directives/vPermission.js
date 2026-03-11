import { useAuthStore } from '@/stores/auth'

export const vPermission = {
  mounted(el, binding) {
    const authStore = useAuthStore()
    const [module, action] = Array.isArray(binding.value)
      ? binding.value
      : [binding.value, 'read']

    if (!authStore.hasPermission(module, action)) {
      el.style.display = 'none'
    }
  },
  updated(el, binding) {
    const authStore = useAuthStore()
    const [module, action] = Array.isArray(binding.value)
      ? binding.value
      : [binding.value, 'read']

    el.style.display = authStore.hasPermission(module, action) ? '' : 'none'
  },
}
