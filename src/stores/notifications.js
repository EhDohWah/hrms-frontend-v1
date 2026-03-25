import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationApi } from '@/api'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const stats = ref(null)
  const loading = ref(false)
  const meta = ref({})
  let pollInterval = null
  let pollIntervalMs = 30000
  let visibilityHandler = null
  let isFetching = false

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchUnreadCount() {
    if (isFetching) return
    isFetching = true
    try {
      const { data } = await notificationApi.unreadCount()
      unreadCount.value = data.data?.count || 0
    } catch {
      // Background polling — network errors are expected
    } finally {
      isFetching = false
    }
  }

  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const { data } = await notificationApi.list(params)
      notifications.value = data.data || []
      meta.value = data.meta || {}
      unreadCount.value = data.meta?.unread_count ?? unreadCount.value
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id) {
    await notificationApi.markAsRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n && !n.read_at) {
      n.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllAsRead() {
    await notificationApi.markAllAsRead()
    notifications.value.forEach(n => { n.read_at = n.read_at || new Date().toISOString() })
    unreadCount.value = 0
  }

  /**
   * Handle a real-time notification pushed via WebSocket.
   * Increments unread count and prepends to the list if loaded.
   */
  function handleRealtimeNotification(notification) {
    unreadCount.value += 1
    if (notifications.value.length > 0) {
      notifications.value.unshift({
        id: notification.id,
        type: notification.type,
        data: notification,
        message: notification.message,
        category: notification.category,
        category_label: notification.category_label,
        category_icon: notification.category_icon,
        category_color: notification.category_color,
        read_at: null,
        created_at: notification.created_at || new Date().toISOString(),
      })
    }
  }

  function stopTimer() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function resetTimer() {
    stopTimer()
    pollInterval = setInterval(fetchUnreadCount, pollIntervalMs)
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopTimer()
    } else {
      fetchUnreadCount()
      resetTimer()
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling()
    pollIntervalMs = intervalMs
    fetchUnreadCount()
    resetTimer()
    visibilityHandler = handleVisibilityChange
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  function stopPolling() {
    stopTimer()
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    notifications, unreadCount, stats, loading, meta, hasUnread,
    fetchUnreadCount, fetchNotifications, markAsRead, markAllAsRead,
    handleRealtimeNotification, startPolling, stopPolling,
  }
})
