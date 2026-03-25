<template>
  <div class="employee-stats-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="mini-stats">
        <div class="mini-stat">
          <span class="mini-stat-value">{{ data.total }}</span>
          <span class="mini-stat-label">Total</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">{{ data.new_this_month }}</span>
          <span class="mini-stat-label">New This Month</span>
        </div>
      </div>

      <div class="breakdown-section">
        <div class="breakdown-title">By Organization</div>
        <div class="breakdown-bars">
          <div v-for="(count, org) in data.by_organization" :key="org" class="bar-row">
            <span class="bar-label">{{ org }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: barWidth(count, data.total), background: orgColor(org) }"
              />
            </div>
            <span class="bar-value">{{ count }}</span>
          </div>
        </div>
      </div>

      <div class="breakdown-section">
        <div class="breakdown-title">By Gender</div>
        <div class="gender-pills">
          <span v-for="(count, gender) in data.by_gender" :key="gender" class="gender-pill">
            {{ genderLabel(gender) }}
            <strong>{{ count }}</strong>
          </span>
        </div>
      </div>
    </template>
    <a-empty v-else description="No data" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { genderLabel } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const data = ref(null)
const loading = ref(true)

function barWidth(count, total) {
  if (!total) return '0%'
  return `${Math.max((count / total) * 100, 4)}%`
}

function orgColor(org) {
  const colors = { SMRU: '#2563eb', BHF: '#16a34a' }
  return colors[org] || '#6b7280'
}

onMounted(async () => {
  try {
    const res = await dashboardApi.employeeStats()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.mini-stat {
  text-align: center;
  padding: 12px 8px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.mini-stat-value { display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.mini-stat-label { font-size: 11px; color: var(--color-text-secondary); }
.breakdown-section { margin-bottom: 14px; }
.breakdown-section:last-child { margin-bottom: 0; }
.breakdown-title { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.breakdown-bars { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label { width: 48px; font-size: 12px; color: var(--color-text-secondary); flex-shrink: 0; }
.bar-track { flex: 1; height: 8px; background: var(--color-bg-muted); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.bar-value { width: 32px; font-size: 12px; font-weight: 600; text-align: right; }
.gender-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.gender-pill {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-subtle);
  padding: 4px 10px;
  border-radius: 12px;
}
.gender-pill strong { color: var(--color-text); margin-left: 4px; }
</style>
