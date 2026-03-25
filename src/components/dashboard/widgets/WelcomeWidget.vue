<template>
  <div class="welcome-widget">
    <div class="welcome-actions">
      <router-link
        v-for="action in actions"
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
  </div>
</template>

<script setup>
import { markRaw } from 'vue'
import {
  UserAddOutlined, CalendarOutlined, FileAddOutlined, TeamOutlined,
} from '@ant-design/icons-vue'

const actions = [
  { label: 'Add Employee', to: '/employees', icon: markRaw(UserAddOutlined), bg: '#eff6ff', color: '#2563eb' },
  { label: 'Leave Requests', to: '/leave-requests', icon: markRaw(CalendarOutlined), bg: '#fef3c7', color: '#d97706' },
  { label: 'New Payroll', to: '/', icon: markRaw(FileAddOutlined), bg: '#f0fdf4', color: '#16a34a' },
  { label: 'All Employees', to: '/employees', icon: markRaw(TeamOutlined), bg: '#fce7f3', color: '#db2777' },
]
</script>

<style scoped>
.welcome-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 768px) {
  .welcome-actions {
    grid-template-columns: repeat(4, 1fr);
  }
}
.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.quick-action:hover {
  background: var(--color-bg-hover);
}
.action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.action-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
</style>
