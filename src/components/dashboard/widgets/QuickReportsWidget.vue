<template>
  <div class="quick-reports-widget">
    <div class="report-grid">
      <router-link
        v-for="report in visibleReports"
        :key="report.label"
        :to="report.to"
        class="report-item"
      >
        <component :is="report.icon" class="report-icon" :style="{ color: report.color }" />
        <span class="report-label">{{ report.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  FileTextOutlined, TeamOutlined, CalendarOutlined,
  DollarOutlined, ScheduleOutlined, SolutionOutlined,
} from '@ant-design/icons-vue'

const auth = useAuthStore()

const allReports = [
  { label: 'Leave Report', to: '/reports', icon: markRaw(CalendarOutlined), color: '#d97706', permission: 'report_list' },
  { label: 'Employee Report', to: '/reports', icon: markRaw(TeamOutlined), color: '#2563eb', permission: 'report_list' },
  { label: 'Payroll Report', to: '/reports', icon: markRaw(DollarOutlined), color: '#16a34a', permission: 'report_list' },
  { label: 'Interview Report', to: '/reports', icon: markRaw(ScheduleOutlined), color: '#7c3aed', permission: 'report_list' },
  { label: 'Job Offer Report', to: '/reports', icon: markRaw(SolutionOutlined), color: '#0d9488', permission: 'report_list' },
  { label: 'All Reports', to: '/reports', icon: markRaw(FileTextOutlined), color: '#6b7280', permission: 'report_list' },
]

const visibleReports = computed(() =>
  allReports.filter(r => auth.canRead(r.permission))
)
</script>

<style scoped>
.report-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.report-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.report-item:hover { background: var(--color-bg-hover); }
.report-icon { font-size: 20px; }
.report-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-align: center; }
</style>
