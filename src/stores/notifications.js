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
  let lastFetchTime = 0
  let pollIntervalMs = 30000
  let visibilityHandler = null

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchUnreadCount() {
    const now = Date.now()
    if (now - lastFetchTime < 5000) return
    lastFetchTime = now
    try {
      const { data } = await notificationApi.unreadCount()
      unreadCount.value = data.data?.count || 0
    } catch {
      // Background polling — network errors are expected
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

  function pauseTimer() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function resumeTimer() {
    if (pollInterval) return
    pollInterval = setInterval(fetchUnreadCount, pollIntervalMs)
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      pauseTimer()
    } else {
      fetchUnreadCount()
      resumeTimer()
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling()
    pollIntervalMs = intervalMs
    fetchUnreadCount()
    resumeTimer()
    visibilityHandler = handleVisibilityChange
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  function stopPolling() {
    pauseTimer()
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    notifications, unreadCount, stats, loading, meta, hasUnread,
    fetchUnreadCount, fetchNotifications, markAsRead, markAllAsRead,
    startPolling, stopPolling,
  }
})
