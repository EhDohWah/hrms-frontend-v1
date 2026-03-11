<template>
  <div class="page-container">
    <div class="notifications-header">
      <div>
        <div class="notif-stats" v-if="notifStore.unreadCount">
          <a-badge :count="notifStore.unreadCount" :number-style="{ backgroundColor: 'var(--color-primary)' }" />
          <span class="text-secondary">unread</span>
        </div>
      </div>
      <a-space>
        <a-button @click="handleMarkAllRead" :disabled="!notifStore.hasUnread">
          <template #icon><CheckOutlined /></template>
          Mark all as read
        </a-button>
        <a-button @click="handleClearRead">
          <template #icon><DeleteOutlined /></template>
          Clear read
        </a-button>
      </a-space>
    </div>

    <!-- Filter tabs -->
    <a-radio-group v-model:value="filter" button-style="solid" style="margin-bottom: 16px">
      <a-radio-button value="all">All</a-radio-button>
      <a-radio-button value="unread">Unread</a-radio-button>
    </a-radio-group>

    <!-- Notification list -->
    <div class="notification-list" v-if="!notifStore.loading">
      <div
        v-for="notif in filteredNotifications"
        :key="notif.id"
        class="notification-item"
        :class="{ unread: !notif.read_at }"
        @click="handleClick(notif)"
      >
        <div class="notif-indicator" v-if="!notif.read_at" />
        <div class="notif-icon" :style="{ background: getCategoryBg(notif.category_color) }">
          <BellOutlined :style="{ color: notif.category_color || '#6b7280' }" />
        </div>
        <div class="notif-body">
          <p class="notif-message">{{ notif.message || notif.data?.message || 'Notification' }}</p>
          <div class="notif-meta">
            <a-tag v-if="notif.category_label" size="small">{{ notif.category_label }}</a-tag>
            <span class="notif-time">{{ dayjs(notif.created_at).fromNow() }}</span>
          </div>
        </div>
        <a-button type="text" size="small" @click.stop="handleDelete(notif)">
          <CloseOutlined />
        </a-button>
      </div>

      <a-empty v-if="!filteredNotifications.length" description="No notifications" />
    </div>

    <div v-else class="loading-state">
      <a-spin />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useNotificationStore } from '@/stores/notifications'
import { notificationApi } from '@/api'
import { BellOutlined, CheckOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons-vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const notifStore = useNotificationStore()

const filter = ref('all')

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') return notifStore.notifications.filter(n => !n.read_at)
  return notifStore.notifications
})

function getCategoryBg(color) {
  if (!color) return '#f3f4f6'
  return color + '18'
}

async function handleClick(notif) {
  if (!notif.read_at) await notifStore.markAsRead(notif.id)
}

async function handleMarkAllRead() {
  await notifStore.markAllAsRead()
  message.success('All notifications marked as read')
}

async function handleClearRead() {
  try {
    await notificationApi.clearRead()
    notifStore.notifications = notifStore.notifications.filter(n => !n.read_at)
    message.success('Read notifications cleared')
  } catch { message.error('Failed to clear notifications') }
}

async function handleDelete(notif) {
  try {
    await notificationApi.destroy(notif.id)
    notifStore.notifications = notifStore.notifications.filter(n => n.id !== notif.id)
    if (!notif.read_at) notifStore.unreadCount = Math.max(0, notifStore.unreadCount - 1)
  } catch { message.error('Failed to delete notification') }
}

onMounted(() => {
  appStore.setPageMeta('Notifications')
  notifStore.fetchNotifications({ per_page: 50 })
})
</script>

<style scoped>
.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.notif-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}
.notification-item:hover {
  box-shadow: var(--shadow-sm);
}
.notification-item.unread {
  background: var(--color-accent-light);
  border-color: #dbeafe;
}

.notif-indicator {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.notif-body { flex: 1; min-width: 0; }
.notif-message {
  font-size: 13.5px;
  font-weight: 500;
  margin: 0 0 6px;
  line-height: 1.4;
  color: var(--color-text);
}
.notif-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.notif-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style>
