<template>
  <aside
    class="sidebar"
    :class="{
      collapsed: appStore.sidebarCollapsed && !appStore.isMobile,
      'sidebar-open': appStore.mobileSidebarOpen,
    }"
  >
    <!-- Mobile close button -->
    <div class="sidebar-mobile-header">
      <span class="sidebar-mobile-title">Menu</span>
      <button @click="appStore.closeMobileSidebar()" class="sidebar-mobile-close">
        <CloseOutlined />
      </button>
    </div>

    <!-- Logo (hidden on mobile since we have the close header) -->
    <div class="sidebar-logo">
      <div class="logo-mark">HR</div>
      <transition name="fade">
        <span v-if="!appStore.sidebarCollapsed" class="logo-text">HRMS</span>
      </transition>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="nav-section">
        <template v-for="item in mainNavItems" :key="item.key">
          <div
            v-if="!item.permission || authStore.canRead(item.permission)"
            class="nav-item"
            :class="{ active: isActive(item) }"
            :data-tour="item.tourKey || undefined"
            @click="navigate(item)"
          >
            <component :is="item.icon" class="nav-icon" />
            <transition name="fade">
              <span v-if="!appStore.sidebarCollapsed || appStore.isMobile" class="nav-label">{{ item.label }}</span>
            </transition>
            <a-badge
              v-if="item.badge && (!appStore.sidebarCollapsed || appStore.isMobile)"
              :count="item.badge()"
              :number-style="{ backgroundColor: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }"
              class="nav-badge"
            />
          </div>
        </template>
      </div>

      <template v-for="section in visibleSections" :key="section.title">
        <div class="nav-divider" />
        <div class="nav-section" :data-tour="section.tourKey || undefined">
          <div class="nav-section-title" v-if="!appStore.sidebarCollapsed || appStore.isMobile">{{ section.title }}</div>
          <template v-for="item in section.items" :key="item.key">
            <div
              v-if="isItemVisible(item)"
              class="nav-item"
              :class="{ active: isActive(item) }"
              @click="navigate(item)"
            >
              <component :is="item.icon" class="nav-icon" />
              <transition name="fade">
                <span v-if="!appStore.sidebarCollapsed || appStore.isMobile" class="nav-label">{{ item.label }}</span>
              </transition>
            </div>
          </template>
        </div>
      </template>
    </nav>

    <!-- Bottom: Collapse toggle (desktop only) -->
    <div class="sidebar-footer">
      <div class="nav-item" data-tour="sidebar-collapse" @click="appStore.toggleSidebar()">
        <MenuFoldOutlined v-if="!appStore.sidebarCollapsed" class="nav-icon" />
        <MenuUnfoldOutlined v-else class="nav-icon" />
        <transition name="fade">
          <span v-if="!appStore.sidebarCollapsed" class="nav-label">Collapse</span>
        </transition>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  ScheduleOutlined,
  AuditOutlined,
  CarryOutOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  FundOutlined,
  ReadOutlined,
  UserDeleteOutlined,
  BankOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  GiftOutlined,
  DollarOutlined,
  DeleteOutlined,
  SettingOutlined,
  HeartOutlined,
  PercentageOutlined,
  CloudUploadOutlined,
  TagsOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  UserOutlined,
  LockOutlined,
  FileProtectOutlined,
  SwapOutlined,
  FileDoneOutlined,
  BookOutlined,
  PartitionOutlined,
  OrderedListOutlined,
  HistoryOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  BugOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  MonitorOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const mainNavItems = computed(() => [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlined, route: 'dashboard', tourKey: 'nav-dashboard' },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: BellOutlined,
    route: 'notifications',
    tourKey: 'nav-notifications',
    badge: () => notifStore.unreadCount || 0,
  },
])

const navSections = computed(() => [
  {
    title: 'Grants',
    tourKey: 'grants-menu',
    items: [
      { key: 'grants', label: 'Grants', icon: FundOutlined, route: 'grants', permission: 'grants' },
      { key: 'grant-positions', label: 'Grant Positions', icon: SolutionOutlined, route: 'grant-positions', permission: 'grant_positions' },
    ],
  },
  {
    title: 'Recruitment',
    tourKey: 'recruitment-menu',
    items: [
      { key: 'interviews', label: 'Interviews', icon: TeamOutlined, route: 'interviews', permission: 'interviews' },
      { key: 'job-offers', label: 'Job Offers', icon: FileDoneOutlined, route: 'job-offers', permission: 'job_offers' },
    ],
  },
  {
    title: 'Management',
    tourKey: 'management-menu',
    items: [
      { key: 'employees', label: 'Employees', icon: UsergroupAddOutlined, route: 'employees', permission: 'employees' },
      { key: 'payroll', label: 'Payroll', icon: DollarOutlined, route: 'payroll', permission: 'employee_salaries' },
    ],
  },
  {
    title: 'Leave',
    tourKey: 'leave-menu',
    items: [
      { key: 'leave-requests', label: 'Leave Requests', icon: CalendarOutlined, route: 'leave-requests', permission: 'leave_requests' },
      { key: 'leave-balances', label: 'Leave Balances', icon: ScheduleOutlined, route: 'leave-balances', permission: 'leave_balances' },
      { key: 'leave-types', label: 'Leave Types', icon: FileTextOutlined, route: 'leave-types', permission: 'leave_types' },
    ],
  },
  {
    title: 'Attendance',
    tourKey: 'attendance-menu',
    items: [
      { key: 'attendance', label: 'Attendance', icon: CarryOutOutlined, route: 'attendance', permission: 'attendance' },
      { key: 'holidays', label: 'Holidays', icon: GiftOutlined, route: 'holidays', permission: 'holidays' },
    ],
  },
  {
    title: 'Training',
    tourKey: 'training-menu',
    items: [
      { key: 'training-types', label: 'Training Types', icon: TagsOutlined, route: 'training-types', permission: 'training_types' },
      { key: 'training', label: 'Training', icon: ReadOutlined, route: 'training', permission: 'trainings' },
      { key: 'employee-training', label: 'Employee Training', icon: BookOutlined, route: 'employee-training', permission: 'employee_training' },
    ],
  },
  {
    title: 'HRM',
    tourKey: 'hrm-menu',
    items: [
      { key: 'personnel-actions', label: 'Personnel Actions', icon: FileProtectOutlined, route: 'personnel-actions', permission: 'personnel_actions' },
      { key: 'transfers', label: 'Transfers', icon: SwapOutlined, route: 'transfers', permission: 'transfers' },
      { key: 'resignations', label: 'Resignations', icon: UserDeleteOutlined, route: 'resignations', permission: 'resignations' },
    ],
  },
  {
    title: 'Reports',
    tourKey: 'reports-menu',
    items: [
      { key: 'reports', label: 'Reports', icon: BarChartOutlined, route: 'reports', permission: 'reports' },
    ],
  },
  {
    title: 'Data Management',
    tourKey: 'data-management-menu',
    items: [
      { key: 'data-import', label: 'Data Import', icon: CloudUploadOutlined, route: 'data-import', permission: 'employees' },
    ],
  },
  {
    title: 'Organization',
    tourKey: 'organization-menu',
    items: [
      { key: 'sites', label: 'Sites', icon: BankOutlined, route: 'sites', permission: 'sites' },
      { key: 'departments', label: 'Departments', icon: ApartmentOutlined, route: 'departments', permission: 'departments' },
      { key: 'positions', label: 'Positions', icon: IdcardOutlined, route: 'positions', permission: 'positions' },
      { key: 'section-departments', label: 'Section Dept.', icon: PartitionOutlined, route: 'section-departments', permission: 'section_departments' },
    ],
  },
  {
    title: 'Settings',
    tourKey: 'settings-menu',
    items: [
      { key: 'benefit-settings', label: 'Benefit Settings', icon: HeartOutlined, route: 'benefit-settings', permission: 'benefit_settings' },
      { key: 'tax-settings', label: 'Tax Settings', icon: PercentageOutlined, route: 'tax-settings', permission: 'tax_settings' },
      { key: 'tax-brackets', label: 'Tax Brackets', icon: OrderedListOutlined, route: 'tax-brackets', permission: 'tax_settings' },
      { key: 'tax-calculator', label: 'Tax Calculator', icon: CalculatorOutlined, route: 'tax-calculator', permission: 'tax_settings' },
      { key: 'payroll-policy-settings', label: 'Payroll Policies', icon: SettingOutlined, route: 'payroll-policy-settings', permission: 'payroll_items' },
    ],
  },
  {
    title: 'Administration',
    tourKey: 'admin-menu',
    items: [
      { key: 'admin-users', label: 'Users', icon: UserOutlined, route: 'admin-users', permission: 'users' },
      { key: 'admin-roles', label: 'Roles', icon: LockOutlined, route: 'admin-roles', permission: 'roles' },
      { key: 'lookups', label: 'Lookup Data', icon: DatabaseOutlined, route: 'lookups', permission: 'lookups' },
      { key: 'login-history', label: 'Login History', icon: HistoryOutlined, route: 'login-history', role: 'admin' },
      { key: 'user-activity', label: 'User Activity', icon: LineChartOutlined, route: 'user-activity', role: 'admin' },
    ],
  },
  {
    title: 'System',
    tourKey: 'system-menu',
    items: [
      { key: 'system-health', label: 'System Health', icon: MonitorOutlined, route: 'system-health', role: 'admin' },
      { key: 'error-logs', label: 'Error Logs', icon: BugOutlined, route: 'error-logs', role: 'admin' },
      { key: 'failed-jobs', label: 'Failed Jobs', icon: WarningOutlined, route: 'failed-jobs', role: 'admin' },
      { key: 'performance', label: 'Performance', icon: ThunderboltOutlined, route: 'performance', role: 'admin' },
      { key: 'activity-logs', label: 'Activity Log', icon: AuditOutlined, route: 'activity-logs', permission: 'activity_logs' },
      { key: 'recycle-bin', label: 'Recycle Bin', icon: DeleteOutlined, route: 'recycle-bin', permission: 'recycle_bin' },
    ],
  },
])

function isItemVisible(item) {
  if (item.role) return authStore.hasRole(item.role)
  if (item.permission) return authStore.canRead(item.permission)
  return true
}

const visibleSections = computed(() =>
  navSections.value.filter((section) =>
    section.items.some((item) => isItemVisible(item))
  )
)

const activeSegment = computed(() => route.path.split('/')[1])

function isActive(item) {
  return route.name === item.route || activeSegment.value === item.key
}

function navigate(item) {
  router.push({ name: item.route })
  appStore.closeMobileSidebar()
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width var(--transition-slow);
  overflow: hidden;
}
.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* On mobile: off-screen by default, slide in when open */
@media (max-width: 767px) {
  .sidebar {
    width: var(--sidebar-width);
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
}

/* Logo */
.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}
.logo-mark {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}
.logo-text {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}
.nav-section {
  padding: 0 8px;
}
.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #374151;
  padding: 8px 12px 4px;
  white-space: nowrap;
}
.nav-divider {
  height: 1px;
  background: var(--sidebar-border);
  margin: 8px 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  margin: 2px 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: #1f2937;
  transition: all var(--transition-fast);
  position: relative;
  white-space: nowrap;
}
.nav-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}
.nav-item.active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-label {
  font-size: 13.5px;
  font-weight: 500;
  flex: 1;
}
.nav-badge {
  margin-left: auto;
}

/* Footer */
/* Mobile header with close button */
.sidebar-mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}
@media (min-width: 768px) {
  .sidebar-mobile-header {
    display: none;
  }
}
.sidebar-mobile-title {
  font-weight: 600;
  font-size: 14px;
}
.sidebar-mobile-close {
  padding: 4px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
}
.sidebar-mobile-close:hover {
  background: #f3f4f6;
}

/* Footer — hidden on mobile */
.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}
@media (max-width: 767px) {
  .sidebar-logo,
  .sidebar-footer {
    display: none;
  }
}

/* Collapsed state adjustments */
.collapsed .nav-item {
  justify-content: center;
  padding: 9px;
}
.collapsed .sidebar-logo {
  justify-content: center;
  padding: 0;
}
</style>
