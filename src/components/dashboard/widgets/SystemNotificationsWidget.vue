<template>
  <div class="notifications-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else>
      <!-- Summary stats -->
      <div class="notif-stats-row">
        <div class="notif-stat">
          <span class="notif-stat-value unread">{{ stats.unread }}</span>
          <span class="notif-stat-label">Unread</span>
        </div>
        <div class="notif-stat">
          <span class="notif-stat-value read">{{ stats.read }}</span>
          <span class="notif-stat-label">Read</span>
        </div>
        <div class="notif-stat">
          <span class="notif-stat-value total">{{ stats.total }}</span>
          <span class="notif-stat-label">Total</span>
        </div>
      </div>

      <a-divider class="section-divider" />
      <div class="sub-header">Recent</div>

      <!-- Recent notifications list -->
      <template v-if="notifications.length">
        <div class="notification-list widget-scroll">
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
        <router-link to="/notifications" class="widget-view-all">View all notifications &rarr;</router-link>
      </template>
      <a-empty v-else description="No notifications" :image="simpleImage" />
    </template>
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
const stats = ref({ total: 0, unread: 0, read: 0 })
const loading = ref(true)

onMounted(async () => {
  const [listResult, statsResult] = await Promise.allSettled([
    notificationApi.list({ per_page: 5 }),
    notificationApi.stats(),
  ])
  if (listResult.status === 'fulfilled') {
    notifications.value = listResult.value.data.data || []
  }
  if (statsResult.status === 'fulfilled') {
    stats.value = statsResult.value.data.data || { total: 0, unread: 0, read: 0 }
  }
  loading.value = false
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }

/* Stats row */
.notif-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.notif-stat {
  text-align: center;
  padding: 12px 8px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.notif-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.notif-stat-value.unread { color: var(--color-accent); }
.notif-stat-value.read { color: var(--color-text-muted); }
.notif-stat-value.total { color: var(--color-text); }
.notif-stat-label { font-size: 11px; color: var(--color-text-secondary); }

/* Notification list */
.notification-list { display: flex; flex-direction: column; }
.notification-item {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  text-decoration: none;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
}
.notification-item:last-child { border-bottom: none; }
.notification-item:hover { background: var(--color-bg-hover); }
.notification-item.unread { background: var(--color-bg-subtle); }
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
.notif-icon.success { background: var(--color-success-bg); color: var(--color-success); }
.notif-icon.warning { background: var(--color-warning-bg); color: var(--color-warning); }
.notif-icon.error { background: var(--color-danger-bg); color: var(--color-danger); }
.notif-icon.info { background: var(--color-info-bg); color: var(--color-info); }
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
  background: var(--color-accent);
}
</style>
