<template>
  <div class="quick-actions-grid">
    <router-link
      v-for="action in visibleActions"
      :key="action.label"
      :to="action.to"
      class="quick-action"
    >
      <div class="action-icon" :style="{ background: action.bg }">
        <component :is="action.icon" :style="{ color: action.color }" />
      </div>
      <span class="action-label">{{ action.label }}</span>
    </router-link>
  </div>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  UserAddOutlined, CalendarOutlined, DollarOutlined, TeamOutlined,
  FileTextOutlined, ScheduleOutlined, ApartmentOutlined, BarChartOutlined,
} from '@ant-design/icons-vue'

const auth = useAuthStore()

const allActions = [
  { label: 'Add Employee', to: '/employees/new', icon: markRaw(UserAddOutlined), bg: '#eff6ff', color: '#2563eb', permission: 'employees' },
  { label: 'Leave Requests', to: '/leave-requests', icon: markRaw(CalendarOutlined), bg: '#fef3c7', color: '#d97706', permission: 'leave_requests' },
  { label: 'Payroll', to: '/payroll', icon: markRaw(DollarOutlined), bg: '#f0fdf4', color: '#16a34a', permission: 'employee_salaries' },
  { label: 'Employees', to: '/employees', icon: markRaw(TeamOutlined), bg: '#fce7f3', color: '#db2777', permission: 'employees' },
  { label: 'Interviews', to: '/interviews', icon: markRaw(ScheduleOutlined), bg: '#f0f9ff', color: '#0284c7', permission: 'interviews' },
  { label: 'Departments', to: '/departments', icon: markRaw(ApartmentOutlined), bg: '#faf5ff', color: '#7c3aed', permission: 'departments' },
  { label: 'Reports', to: '/reports', icon: markRaw(BarChartOutlined), bg: '#fff7ed', color: '#ea580c', permission: 'reports' },
  { label: 'Holidays', to: '/holidays', icon: markRaw(FileTextOutlined), bg: '#f0fdfa', color: '#0d9488', permission: 'holidays' },
]

const visibleActions = computed(() =>
  allActions.filter(a => auth.canRead(a.permission))
)
</script>

<style scoped>
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 768px) {
  .quick-actions-grid { grid-template-columns: repeat(4, 1fr); }
}
.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.quick-action:hover { background: var(--color-bg-hover); }
.action-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}
.action-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
