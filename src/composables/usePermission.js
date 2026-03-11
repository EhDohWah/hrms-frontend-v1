import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const authStore = useAuthStore()

  const can = (module, action = 'read') => authStore.hasPermission(module, action)
  const hasRole = (role) => authStore.hasRole?.(role) ?? false
  const isAdmin = () => hasRole('admin') || hasRole('super_admin')

  return { can, hasRole, isAdmin }
}
