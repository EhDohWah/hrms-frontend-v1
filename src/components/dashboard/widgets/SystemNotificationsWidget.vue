<template>
  <div class="notifications-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="notifications.length">
      <div class="notification-list">
        <router-link
          v-for="n in notifications"
          :key="n.id"
          to="/notifications"
          class="notification-item"
          :class="{ unread: !n.read_at }"
        >
          <div class="notif-icon" :class="n.data?.category || 'info'">
            <BellOutlined />
          </div>
          <div class="notif-content">
            <span class="notif-title">{{ n.data?.title || 'Notification' }}</span>
            <span class="notif-body">{{ n.data?.body || n.data?.message || '' }}</span>
            <span class="notif-time">{{ timeAgo(n.created_at) }}</span>
          </div>
          <span v-if="!n.read_at" class="unread-dot" />
        </router-link>
      </div>
    </template>
    <a-empty v-else description="No notifications" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { BellOutlined } from '@ant-design/icons-vue'
import { notificationApi } from '@/api'
import { timeAgo } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const notifications = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await notificationApi.list({ per_page: 10 })
    notifications.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.notification-list { display: flex; flex-direction: column; }
.notification-item {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  text-decoration: none;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
  position: relative;
}
.notification-item:last-child { border-bottom: none; }
.notification-item:hover { background: var(--color-bg-hover); }
.notification-item.unread { background: #f8fafc; }
.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
.notif-icon.success { background: #f0fdf4; color: #16a34a; }
.notif-icon.warning { background: #fef3c7; color: #d97706; }
.notif-icon.error { background: #fee2e2; color: #dc2626; }
.notif-icon.info { background: #eff6ff; color: #2563eb; }
.notif-content { flex: 1; min-width: 0; }
.notif-title { display: block; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-body { display: block; font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-time { font-size: 10px; color: var(--color-text-muted); }
.unread-dot {
  position: absolute;
  top: 12px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
}
</style>
