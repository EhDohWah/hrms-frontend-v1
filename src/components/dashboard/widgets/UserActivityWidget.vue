<template>
  <div class="activity-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="activities.length">
      <div class="activity-feed widget-scroll">
        <div v-for="a in activities" :key="a.id" class="activity-item">
          <div class="activity-dot" :class="actionClass(a.action)" />
          <div class="activity-content">
            <span class="activity-desc">
              <strong>{{ a.user?.name || 'System' }}</strong>
              {{ a.action_label?.toLowerCase() }}
              <span class="activity-subject">{{ a.subject_type_short }}</span>
              <template v-if="a.subject_name"> &middot; {{ a.subject_name }}</template>
            </span>
            <span class="activity-time">{{ timeAgo(a.created_at) }}</span>
          </div>
        </div>
      </div>
      <router-link to="/activity-logs" class="widget-view-all">View all activity &rarr;</router-link>
    </template>
    <a-empty v-else description="No recent activity" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { activityLogApi } from '@/api'
import { timeAgo } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const activities = ref([])
const loading = ref(true)

function actionClass(action) {
  if (action === 'created') return 'created'
  if (action === 'updated') return 'updated'
  if (action === 'deleted') return 'deleted'
  if (action === 'processed') return 'processed'
  if (action === 'imported') return 'imported'
  return ''
}

onMounted(async () => {
  try {
    const res = await activityLogApi.recent({ limit: 8 })
    activities.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.activity-feed { display: flex; flex-direction: column; }
.activity-item {
  display: flex;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.activity-item:last-child { border-bottom: none; }
.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  flex-shrink: 0;
  margin-top: 5px;
}
.activity-dot.created { background: #16a34a; }
.activity-dot.updated { background: #2563eb; }
.activity-dot.deleted { background: #dc2626; }
.activity-dot.processed { background: #d97706; }
.activity-dot.imported { background: #7c3aed; }
.activity-content { min-width: 0; }
.activity-desc { display: block; font-size: 12px; line-height: 1.4; }
.activity-desc strong { font-weight: 500; }
.activity-subject { color: var(--color-accent); }
.activity-time { font-size: 10px; color: var(--color-text-muted); }
</style>
