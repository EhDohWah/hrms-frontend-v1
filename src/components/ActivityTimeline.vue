<template>
  <div class="activity-section">
    <h3 class="activity-title">Activity</h3>

    <a-spin :spinning="loading">
      <div v-if="logs.length" class="activity-list">
        <div v-for="log in logs" :key="log.id" class="activity-item">
          <!-- Dot + connector line -->
          <div class="activity-dot-col">
            <span class="activity-dot" :class="dotClass(log.action)" />
            <span class="activity-line" />
          </div>

          <!-- Content -->
          <div class="activity-content">
            <div class="activity-summary">
              <span class="activity-user">{{ log.user?.name || 'System' }}</span>
              {{ ' ' }}
              <span class="activity-action" :class="`action-${log.action}`">{{ actionLabel(log) }}</span>
              {{ ' ' }}
              <span class="activity-time">&middot; {{ relativeTime(log.created_at) }}</span>
            </div>

            <!-- Field-level changes -->
            <div
              v-if="log.action === 'updated' && log.properties?.changes?.length"
              class="activity-changes"
            >
              <div
                v-for="field in log.properties.changes"
                :key="field"
                class="change-row"
              >
                <span class="change-field">{{ formatFieldName(field) }}</span>
                <span class="change-old">{{ formatValue(log.properties.old?.[field]) }}</span>
                <span class="change-arrow">&rarr;</span>
                <span class="change-new">{{ formatValue(log.properties.new?.[field]) }}</span>
              </div>
            </div>

            <!-- Custom action description (transferred, imported, etc.) -->
            <div
              v-if="log.description && log.action !== 'updated'"
              class="activity-description"
            >
              {{ log.description }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="activity-empty">
        No activity recorded yet.
      </div>
    </a-spin>

    <!-- Load more -->
    <div v-if="hasMore && logs.length" class="activity-load-more">
      <a-button size="small" type="link" :loading="loadingMore" @click="loadMore">
        Load older activity
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { activityLogApi } from '@/api'
import { ACTION_COLOR_MAP, ACTION_LABEL_MAP, formatFieldName, formatValue } from '@/utils/activityLog'

const dayjs = inject('$dayjs')

const props = defineProps({
  subjectType: { type: String, required: true },
  subjectId: { type: Number, required: true },
  limit: { type: Number, default: 10 },
})

const logs = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const pagination = ref({ current_page: 1, last_page: 1 })

const hasMore = computed(() => pagination.value.current_page < pagination.value.last_page)

async function fetchLogs(page = 1) {
  const isFirstLoad = page === 1
  if (isFirstLoad) loading.value = true
  else loadingMore.value = true

  try {
    const { data } = await activityLogApi.forSubject(props.subjectType, props.subjectId, {
      page,
      per_page: props.limit,
    })
    const items = data.data?.data || data.data || []
    const pag = data.data?.meta || data.data

    if (isFirstLoad) {
      logs.value = items
    } else {
      logs.value.push(...items)
    }

    if (pag) {
      pagination.value.current_page = pag.current_page ?? 1
      pagination.value.last_page = pag.last_page ?? 1
    }
  } catch {
    // silent — activity log is non-critical
  }

  loading.value = false
  loadingMore.value = false
}

function loadMore() {
  fetchLogs(pagination.value.current_page + 1)
}

function dotClass(action) {
  const color = ACTION_COLOR_MAP[action]
  return color ? `dot-${color}` : 'dot-default'
}

function actionLabel(log) {
  return ACTION_LABEL_MAP[log.action] || log.action_label || log.action
}

function relativeTime(date) {
  return date ? dayjs(date).fromNow() : ''
}

// Re-fetch when subject changes (e.g. navigating between employees)
watch(
  () => [props.subjectType, props.subjectId],
  () => fetchLogs(),
  { flush: 'post' },
)

onMounted(() => fetchLogs())
</script>

<style scoped>
.activity-section {
  margin-top: 16px;
  padding: 20px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.activity-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 16px;
}

/* Timeline layout */
.activity-item {
  display: flex;
  gap: 12px;
  min-height: 40px;
}

.activity-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
  padding-top: 5px;
}
.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.activity-line {
  width: 1px;
  flex: 1;
  background: var(--color-border-light);
  margin-top: 4px;
}
.activity-item:last-child .activity-line { display: none; }

/* Dot colors */
.dot-green  { background: #52c41a; }
.dot-blue   { background: #1677ff; }
.dot-red    { background: #ff4d4f; }
.dot-orange { background: #fa8c16; }
.dot-purple { background: #722ed1; }
.dot-cyan   { background: #13c2c2; }
.dot-default { background: #d9d9d9; }

/* Content */
.activity-content {
  flex: 1;
  padding-bottom: 16px;
}
.activity-summary {
  font-size: 13.5px;
  line-height: 1.4;
}
.activity-user {
  font-weight: 600;
  color: var(--color-text);
}
.action-created { color: #52c41a; }
.action-updated { color: #1677ff; }
.action-deleted { color: #ff4d4f; }
.action-transferred { color: #fa8c16; }
.activity-action { font-weight: 500; }
.activity-time {
  color: var(--color-text-muted);
  font-size: 12.5px;
}

/* Field-level changes */
.activity-changes {
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--color-bg-subtle, #fafafa);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
}
.change-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 0;
  flex-wrap: wrap;
}
.change-field {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 100px;
}
.change-field::after { content: ':'; }
.change-old {
  color: var(--color-text-muted);
  text-decoration: line-through;
}
.change-arrow { color: var(--color-text-muted); }
.change-new {
  font-weight: 600;
  color: var(--color-primary);
}

.activity-description {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.activity-empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.activity-load-more {
  text-align: center;
  margin-top: 8px;
}
</style>
