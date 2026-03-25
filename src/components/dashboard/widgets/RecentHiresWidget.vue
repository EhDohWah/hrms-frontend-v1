<template>
  <div class="recent-hires-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="hires.length">
      <div class="hire-list widget-scroll">
        <router-link
          v-for="h in hires"
          :key="h.employee_id"
          :to="`/employees/${h.employee_id}`"
          class="hire-item"
        >
          <a-avatar :size="32" :style="{ background: avatarColor(h.staff_id), flexShrink: 0 }">
            {{ initials(h.name) }}
          </a-avatar>
          <div class="hire-info">
            <span class="hire-name">{{ h.name }}</span>
            <span class="hire-meta">{{ h.position || h.department || '—' }}</span>
          </div>
          <div class="hire-right">
            <a-tag :color="getOrgColor(h.organization)" size="small" class="org-tag">
              {{ h.organization }}
            </a-tag>
            <span class="hire-date">{{ formatDate(h.hire_date, 'DD MMM') }}</span>
          </div>
        </router-link>
      </div>
      <router-link to="/employees" class="widget-view-all">View all employees &rarr;</router-link>
    </template>
    <a-empty v-else description="No recent hires" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { getOrgColor } from '@/constants/organizations'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const hires = ref([])
const loading = ref(true)

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function avatarColor(staffId) {
  const colors = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0d9488']
  const hash = (staffId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

onMounted(async () => {
  try {
    const res = await dashboardApi.recentHires()
    hires.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.hire-list { display: flex; flex-direction: column; }
.hire-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  text-decoration: none;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}
.hire-item:last-child { border-bottom: none; }
.hire-item:hover { background: var(--color-bg-hover); }
.hire-info { flex: 1; min-width: 0; }
.hire-name { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hire-meta { font-size: 11px; color: var(--color-text-secondary); }
.hire-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.org-tag { margin: 0; font-size: 10px; line-height: 1; }
.hire-date { font-size: 11px; color: var(--color-text-muted); }
</style>
