<template>
  <div class="payroll-summary-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="payroll-month">{{ data.current_month }}</div>
      <div class="payroll-stats">
        <div class="payroll-stat">
          <span class="payroll-stat-value">{{ data.total_records }}</span>
          <span class="payroll-stat-label">Records</span>
        </div>
        <div class="payroll-stat">
          <span class="payroll-stat-value">{{ data.total_employees }}</span>
          <span class="payroll-stat-label">Employees</span>
        </div>
      </div>
      <div v-if="orgEntries.length" class="org-breakdown">
        <div v-for="[org, count] in orgEntries" :key="org" class="org-row">
          <a-tag :color="getOrgColor(org)" size="small">{{ org }}</a-tag>
          <span class="org-count">{{ count }} records</span>
        </div>
      </div>
    </template>
    <a-empty v-else description="No payroll data" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { getOrgColor } from '@/constants/organizations'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const data = ref(null)
const loading = ref(true)

const orgEntries = computed(() => {
  if (!data.value?.by_organization) return []
  return Object.entries(data.value.by_organization)
})

onMounted(async () => {
  try {
    const res = await dashboardApi.payrollSummary()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.payroll-month { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; }
.payroll-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.payroll-stat {
  text-align: center;
  padding: 14px 8px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.payroll-stat-value { display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--color-text); }
.payroll-stat-label { font-size: 11px; color: var(--color-text-secondary); }
.org-breakdown { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--color-border-light); }
.org-row { display: flex; align-items: center; justify-content: space-between; }
.org-count { font-size: 12px; color: var(--color-text-secondary); }
</style>
