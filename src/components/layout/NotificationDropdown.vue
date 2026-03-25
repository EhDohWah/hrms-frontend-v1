<template>
  <a-popover
    v-model:open="visible"
    trigger="click"
    placement="bottomRight"
    overlay-class-name="notification-popover"
    :arrow="false"
    :overlay-inner-style="{ padding: 0 }"
  >
    <template #content>
      <div class="notif-panel">
        <!-- Header -->
        <div class="notif-panel-header">
          <div class="notif-panel-title">
            Notifications
            <a-badge
              v-if="notifStore.unreadCount"
              :count="notifStore.unreadCount"
              :number-style="{ backgroundColor: 'var(--color-accent)', fontSize: '11px' }"
            />
          </div>
          <a-button
            v-if="notifStore.hasUnread"
            type="link"
            size="small"
            class="mark-all-btn"
            @click="handleMarkAllRead"
          >
            Mark all read
          </a-button>
        </div>

        <!-- Loading -->
        <div v-if="notifStore.loading && !notifStore.notifications.length" class="notif-panel-empty">
          <a-spin size="small" />
        </div>

        <!-- Notification list -->
        <div v-else-if="recentNotifications.length" class="notif-panel-list">
          <div
            v-for="notif in recentNotifications"
            :key="notif.id"
            class="notif-item"
            :class="{ unread: !notif.read_at }"
            @click="handleItemClick(notif)"
          >
            <div class="notif-dot" v-if="!notif.read_at" />
            <div class="notif-item-icon" :style="{ background: getCategoryBg(notif.category_color) }">
              <component :is="getCategoryIcon(notif.category)" :style="{ color: notif.category_color || '#6b7280' }" />
            </div>
            <div class="notif-item-body">
              <p class="notif-item-message">{{ notif.message || notif.data?.message || 'Notification' }}</p>
              <span class="notif-item-time">{{ timeAgo(notif.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="notif-panel-empty">
          <BellOutlined class="empty-bell" />
          <span>No notifications</span>
        </div>

        <!-- Footer -->
        <div class="notif-panel-footer">
          <router-link
            :to="{ name: 'notifications' }"
            class="view-all-link"
            @click="visible = false"
          >
            View all notifications
          </router-link>
        </div>
      </div>
    </template>

    <!-- Trigger: bell icon with badge -->
    <a-badge :count="notifStore.unreadCount" :offset="[-4, 4]">
      <div class="header-icon-btn">
        <BellOutlined />
      </div>
    </a-badge>
  </a-popover>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { message } from 'ant-design-vue'
import { useNotificationStore } from '@/stores/notifications'
import {
  BellOutlined,
  TeamOutlined,
  TrophyOutlined,
  DollarOutlined,
  CalendarOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue'

const dayjs = inject('$dayjs')
const notifStore = useNotificationStore()

const visible = ref(false)

const categoryIconMap = {
  employee: TeamOutlined,
  grants: TrophyOutlined,
  payroll: DollarOutlined,
  leaves: CalendarOutlined,
  system: SettingOutlined,
  import: FileTextOutlined,
}

const recentNotifications = computed(() => {
  return notifStore.notifications.slice(0, 8)
})

function getCategoryBg(color) {
  if (!color) return '#f3f4f6'
  return color + '18'
}

function getCategoryIcon(category) {
  return categoryIconMap[category] || BellOutlined
}

function timeAgo(date) {
  if (!date) return ''
  return dayjs(date).fromNow()
}

async function handleItemClick(notif) {
  if (!notif.read_at) {
    await notifStore.markAsRead(notif.id)
  }
}

async function handleMarkAllRead() {
  await notifStore.markAllAsRead()
  message.success('All notifications marked as read')
}

// Fetch notifications when dropdown opens
watch(visible, (open) => {
  if (open) {
    notifStore.fetchNotifications({ per_page: 10 })
  }
})
</script>

<style scoped>
.header-icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  font-size: 17px;
}
.header-icon-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.notif-panel {
  width: 380px;
  display: flex;
  flex-direction: column;
}

.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border-light);
}

.notif-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.mark-all-btn {
  font-size: 12px;
  padding: 0;
  height: auto;
  color: var(--color-accent);
}

.notif-panel-list {
  overflow-y: auto;
  max-height: 420px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--color-border-light);
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-item:hover {
  background: var(--color-bg-hover);
}
.notif-item.unread {
  background: var(--color-accent-light);
}
.notif-item.unread:hover {
  background: #dbeafe;
}

.notif-dot {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}

.notif-item-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.notif-item-body {
  flex: 1;
  min-width: 0;
}

.notif-item-message {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  margin: 0 0 3px;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-item-time {
  font-size: 11px;
  color: var(--color-text-muted);
}

.notif-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: var(--color-text-muted);
  font-size: 13px;
}
.empty-bell {
  font-size: 28px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.notif-panel-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--color-border-light);
  text-align: center;
}
.view-all-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
}
.view-all-link:hover {
  text-decoration: underline;
}
</style>
