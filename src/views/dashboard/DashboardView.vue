<template>
  <div class="page-container">
    <!-- Greeting -->
    <div class="dashboard-greeting">
      <div>
        <h2 class="greeting-title">{{ greetingText }}, {{ firstName }}</h2>
        <p class="greeting-subtitle">{{ todayFormatted }}</p>
      </div>
      <a-button @click="handleCustomize" v-if="!customizing">
        <template #icon><SettingOutlined /></template>
        Customize
      </a-button>
      <a-space v-else>
        <a-button @click="customizing = false">Cancel</a-button>
        <a-button type="primary" @click="saveWidgetOrder">Save Layout</a-button>
      </a-space>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in quickStats" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
          <component :is="stat.icon" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Widgets Grid -->
    <div class="grid-2-lg-col" v-if="!loading">
      <template v-for="widget in widgets" :key="widget.id">
        <div
          class="widget-wrapper"
          :class="[`widget-${widget.size || 'medium'}`, { 'widget-editing': customizing }]"
          v-if="widget.is_visible"
        >
          <a-card :title="widget.display_name" class="widget-card">
            <template #extra v-if="customizing">
              <a-space :size="4">
                <a-button size="small" type="text" @click="toggleWidgetVisibility(widget)">
                  <EyeInvisibleOutlined />
                </a-button>
              </a-space>
            </template>
            <component
              :is="getWidgetComponent(widget.component)"
              :config="widget.config"
              :user-config="widget.user_config"
            />
          </a-card>
        </div>
      </template>
    </div>

    <div v-else class="loading-state">
      <a-spin size="large" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, markRaw } from 'vue'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import {
  SettingOutlined, EyeInvisibleOutlined,
  TeamOutlined, CalendarOutlined, DollarOutlined, FileTextOutlined,
} from '@ant-design/icons-vue'
import WelcomeWidget from '@/components/dashboard/widgets/WelcomeWidget.vue'
import PlaceholderWidget from '@/components/dashboard/widgets/PlaceholderWidget.vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const widgets = ref([])
const loading = ref(true)
const customizing = ref(false)

const firstName = computed(() => authStore.userName?.split(' ')[0] || 'there')

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const todayFormatted = computed(() => dayjs().format('dddd, MMMM D, YYYY'))

const statsData = ref({ total_employees: '—', on_leave_today: '—', pending_requests: '—', payroll_this_month: '—' })

const quickStats = computed(() => [
  { label: 'Total Employees', value: statsData.value.total_employees, icon: markRaw(TeamOutlined), bg: '#eff6ff', color: '#2563eb' },
  { label: 'On Leave Today', value: statsData.value.on_leave_today, icon: markRaw(CalendarOutlined), bg: '#fef3c7', color: '#d97706' },
  { label: 'Pending Requests', value: statsData.value.pending_requests, icon: markRaw(FileTextOutlined), bg: '#fce7f3', color: '#db2777' },
  { label: 'Payroll This Month', value: statsData.value.payroll_this_month, icon: markRaw(DollarOutlined), bg: '#f0fdf4', color: '#16a34a' },
])

const widgetComponentMap = {
  WelcomeWidget: markRaw(WelcomeWidget),
}

function getWidgetComponent(componentName) {
  return widgetComponentMap[componentName] || markRaw(PlaceholderWidget)
}

function handleCustomize() {
  customizing.value = true
}

async function toggleWidgetVisibility(widget) {
  try {
    await dashboardApi.toggleVisibility(widget.id)
    widget.is_visible = !widget.is_visible
  } catch { /* silent */ }
}

async function saveWidgetOrder() {
  customizing.value = false
}

onMounted(async () => {
  appStore.setPageMeta('Dashboard')

  const signal = getSignal()

  // Fetch quick stats and widgets in parallel
  const [statsResult, widgetsResult] = await Promise.allSettled([
    dashboardApi.quickStats({ signal }),
    dashboardApi.myWidgets({ signal }),
  ])

  if (statsResult.status === 'fulfilled') {
    statsData.value = statsResult.value.data.data
  }

  if (widgetsResult.status === 'fulfilled') {
    widgets.value = widgetsResult.value.data.data || []
  } else if (widgetsResult.reason?.name !== 'CanceledError') {
    message.error('Failed to load dashboard')
  }

  loading.value = false
})
</script>

<style scoped>
.dashboard-greeting {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.greeting-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.greeting-subtitle {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 14px;
}

/* Quick stats */
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-content {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.stat-label {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

/* Widgets grid */
.widget-wrapper.widget-large,
.widget-wrapper.widget-full {
  grid-column: 1 / -1;
}
.widget-editing {
  outline: 2px dashed var(--color-border);
  outline-offset: 4px;
  border-radius: var(--radius-lg);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

</style>
