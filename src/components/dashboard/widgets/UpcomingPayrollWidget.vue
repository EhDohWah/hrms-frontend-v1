<template>
  <div class="upcoming-payroll-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="payroll-card">
        <div class="payroll-icon-wrap">
          <CalendarOutlined class="payroll-icon" />
        </div>
        <div class="payroll-details">
          <span class="payroll-label">Next Payroll</span>
          <span class="payroll-date">{{ formatDate(data.estimated_next_date) }}</span>
          <span v-if="daysUntil != null" class="payroll-countdown">
            {{ daysUntil <= 0 ? 'Due now' : `${daysUntil} days away` }}
          </span>
        </div>
      </div>
      <div class="payroll-meta">
        <div class="meta-item">
          <span class="meta-label">Last Processed</span>
          <span class="meta-value">{{ formatDate(data.last_payroll_date) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Active Employees</span>
          <span class="meta-value">{{ data.active_employees }}</span>
        </div>
      </div>
    </template>
    <a-empty v-else description="No payroll history" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { Empty } from 'ant-design-vue'
import { CalendarOutlined } from '@ant-design/icons-vue'
import { dashboardApi } from '@/api'
import { formatDate } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const dayjs = inject('$dayjs')
const data = ref(null)
const loading = ref(true)

const daysUntil = computed(() => {
  if (!data.value?.estimated_next_date) return null
  return dayjs(data.value.estimated_next_date).diff(dayjs(), 'day')
})

onMounted(async () => {
  try {
    const res = await dashboardApi.upcomingPayroll()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.payroll-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
}
.payroll-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #16a34a;
  flex-shrink: 0;
}
.payroll-details { display: flex; flex-direction: column; }
.payroll-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.payroll-date { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
.payroll-countdown { font-size: 12px; color: var(--color-text-secondary); }
.payroll-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 11px; color: var(--color-text-muted); }
.meta-value { font-size: 13px; font-weight: 500; }
</style>
