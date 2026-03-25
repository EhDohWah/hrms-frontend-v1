<template>
  <div class="dept-overview-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="departments.length">
      <div class="dept-chart">
        <div v-for="dept in departments" :key="dept.id" class="dept-row">
          <span class="dept-name" :title="dept.name">{{ dept.name }}</span>
          <div class="dept-bar-track">
            <div
              class="dept-bar-fill"
              :style="{ width: barWidth(dept.employee_count) }"
            />
          </div>
          <span class="dept-count">{{ dept.employee_count }}</span>
        </div>
      </div>
      <div class="dept-total">
        Total: <strong>{{ totalEmployees }}</strong> employees across <strong>{{ departments.length }}</strong> departments
      </div>
    </template>
    <a-empty v-else description="No departments" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const departments = ref([])
const loading = ref(true)

const maxCount = computed(() => Math.max(...departments.value.map(d => d.employee_count), 1))
const totalEmployees = computed(() => departments.value.reduce((sum, d) => sum + d.employee_count, 0))

function barWidth(count) {
  return `${Math.max((count / maxCount.value) * 100, 2)}%`
}

onMounted(async () => {
  try {
    const res = await dashboardApi.departmentOverview()
    departments.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.dept-chart { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.dept-row { display: flex; align-items: center; gap: 8px; }
.dept-name {
  width: 100px;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.dept-bar-track { flex: 1; height: 10px; background: var(--color-bg-muted); border-radius: 5px; overflow: hidden; }
.dept-bar-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  transition: width 0.6s ease;
}
.dept-count { width: 28px; font-size: 12px; font-weight: 600; text-align: right; flex-shrink: 0; }
.dept-total { font-size: 11px; color: var(--color-text-muted); text-align: center; padding-top: 4px; border-top: 1px solid var(--color-border-light); }
</style>
