<template>
  <div class="page-container">
    <!-- ── Greeting ───────────────────────────────────────── -->
    <div class="dashboard-greeting">
      <div>
        <h2 class="greeting-title">{{ greetingText }}, {{ firstName }}</h2>
        <p class="greeting-subtitle">{{ todayFormatted }}</p>
      </div>
    </div>

    <!-- ── Quick Stats ────────────────────────────────────── -->
    <div class="stats-grid" data-tour="stats-cards">
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

    <!-- ── Quick Actions ──────────────────────────────────── -->
    <a-card class="section-card section-actions" :bordered="false" data-tour="quick-actions">
      <QuickActionsWidget />
    </a-card>

    <!-- ── Main Sections (2-column grid, permission-gated) ── -->
    <div class="dashboard-sections">

      <!-- People -->
      <a-card v-if="can.employees" class="section-card" :bordered="false" data-tour="widget-people">
        <template #title>
          <span class="section-header">
            <span class="section-dot people" />
            People
          </span>
        </template>
        <EmployeeStatsWidget />
        <a-divider class="section-divider" />
        <div class="sub-header">Recent Hires</div>
        <RecentHiresWidget />
      </a-card>

      <!-- Leave -->
      <a-card v-if="can.leave" class="section-card" :bordered="false" data-tour="widget-leave">
        <template #title>
          <span class="section-header">
            <span class="section-dot leave" />
            Leave
          </span>
        </template>
        <LeaveSummaryWidget />
        <a-divider class="section-divider" />
        <div class="sub-header">Pending Requests</div>
        <PendingLeaveRequestsWidget />
      </a-card>

      <!-- Payroll -->
      <a-card v-if="can.payroll" class="section-card" :bordered="false" data-tour="widget-payroll">
        <template #title>
          <span class="section-header">
            <span class="section-dot payroll" />
            Payroll
          </span>
        </template>
        <PayrollSummaryWidget />
        <a-divider class="section-divider" />
        <UpcomingPayrollWidget />
      </a-card>

      <!-- Recruitment -->
      <a-card v-if="can.recruitment" class="section-card" :bordered="false" data-tour="widget-recruitment">
        <template #title>
          <span class="section-header">
            <span class="section-dot recruitment" />
            Recruitment
          </span>
        </template>
        <PendingInterviewsWidget />
        <a-divider class="section-divider" />
        <div class="sub-header">Open Positions</div>
        <OpenPositionsWidget />
      </a-card>

      <!-- Notifications (full width) -->
      <a-card class="section-card section-full" :bordered="false" data-tour="widget-notifications">
        <template #title>
          <span class="section-header">
            <span class="section-dot notifications" />
            Notifications
          </span>
        </template>
        <SystemNotificationsWidget />
      </a-card>
    </div>

    <!-- ── Floating Tour Button ───────────────────────────── -->
    <a-float-button
      tooltip="Take a tour"
      @click="restart"
      :style="{ right: '24px', bottom: '24px' }"
    >
      <template #icon><QuestionCircleOutlined /></template>
    </a-float-button>

    <!-- ── Onboarding Tour ────────────────────────────────── -->
    <a-tour
      v-model:current="currentStep"
      :open="isTourOpen"
      :steps="tourSteps"
      :scroll-into-view-options="{ behavior: 'instant', block: 'center' }"
      @close="markComplete"
      @finish="markComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, markRaw } from 'vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useTour } from '@/composables/useTour'
import {
  QuestionCircleOutlined,
  TeamOutlined, CalendarOutlined, DollarOutlined, FileTextOutlined,
} from '@ant-design/icons-vue'

// Widget components — static imports, developer-controlled
import QuickActionsWidget from '@/components/dashboard/widgets/QuickActionsWidget.vue'
import EmployeeStatsWidget from '@/components/dashboard/widgets/EmployeeStatsWidget.vue'
import RecentHiresWidget from '@/components/dashboard/widgets/RecentHiresWidget.vue'
import LeaveSummaryWidget from '@/components/dashboard/widgets/LeaveSummaryWidget.vue'
import PendingLeaveRequestsWidget from '@/components/dashboard/widgets/PendingLeaveRequestsWidget.vue'
import PayrollSummaryWidget from '@/components/dashboard/widgets/PayrollSummaryWidget.vue'
import UpcomingPayrollWidget from '@/components/dashboard/widgets/UpcomingPayrollWidget.vue'
import PendingInterviewsWidget from '@/components/dashboard/widgets/PendingInterviewsWidget.vue'
import OpenPositionsWidget from '@/components/dashboard/widgets/OpenPositionsWidget.vue'
import SystemNotificationsWidget from '@/components/dashboard/widgets/SystemNotificationsWidget.vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const auth = useAuthStore()
const getSignal = useAbortController()

// ── Permission gates ──────────────────────────────────────
const can = computed(() => ({
  employees: auth.canRead('employees'),
  leave: auth.canRead('leave_requests'),
  payroll: auth.canRead('employee_salaries'),
  recruitment: auth.canRead('interviews') || auth.canRead('job_offers'),
}))

// ── Tour ──────────────────────────────────────────────────
const { isTourOpen, currentStep, checkAndOpen, markComplete, restart, cleanup } = useTour('app_welcome')
onUnmounted(cleanup)

const el = (key) => () => document.querySelector(`[data-tour="${key}"]`)

// Sidebar targets live inside .sidebar-nav which has its own overflow-y scroll.
// This scrolls the sidebar BEFORE returning the element, so <a-tour> measures
// the correct position. Uses 'instant' so scroll completes synchronously.
let cachedSidebarNav = null
const sidebarEl = (key) => () => {
  if (!cachedSidebarNav) {
    cachedSidebarNav = document.querySelector('.sidebar-nav')
  }
  const target = document.querySelector(`[data-tour="${key}"]`)
  if (target && cachedSidebarNav?.contains(target)) {
    target.scrollIntoView({ behavior: 'instant', block: 'center' })
  }
  return target
}

// Helper: returns true if user has at least one of the given permissions
// (mirrors AppSidebar's visibleSections filter logic)
const canAny = (...perms) => perms.some((p) => auth.canRead(p))

// Tour steps are computed so they react to permission changes and only
// include sidebar sections the user can actually see in the DOM.
const tourSteps = computed(() => {
  const steps = [
    // Phase 1 — Sidebar Navigation (top to bottom)
    { title: 'Welcome to HRMS', description: 'This is your Dashboard — your starting point. It shows key metrics, pending tasks, and a quick overview of what needs your attention today.', target: sidebarEl('nav-dashboard'), placement: 'right' },
    { title: 'Notifications', description: 'Stay on top of approvals, payroll alerts, and system updates. A badge appears when you have unread items.', target: sidebarEl('nav-notifications'), placement: 'right' },
  ]

  // Sidebar sections — only include steps for sections the user can see.
  // Each entry mirrors the permission check in AppSidebar's visibleSections.
  const sidebarSteps = [
    { perms: ['grants'], title: 'Grants', description: 'Manage grant funding, track grant periods, and oversee grant-funded positions. View active grants and their budget allocations.', key: 'grants-menu' },
    { perms: ['interviews', 'job_offers'], title: 'Recruitment', description: 'Run your hiring pipeline — schedule and score interviews, then convert candidates into job offers with a few clicks.', key: 'recruitment-menu' },
    { perms: ['employees', 'employee_salaries'], title: 'Management', description: 'Your core HR hub. View all employee records, manage employment details, and process monthly payroll from here.', key: 'management-menu' },
    { perms: ['leave_requests', 'leave_balances', 'leave_types'], title: 'Leave', description: 'Submit, review, and approve leave requests. Monitor employee leave balances and configure leave types for your organization.', key: 'leave-menu' },
    { perms: ['attendance', 'holidays'], title: 'Attendance', description: 'Track daily attendance records and manage the holiday calendar for your sites.', key: 'attendance-menu' },
    { perms: ['trainings', 'employee_training'], title: 'Training', description: 'Organize training programs and track which employees have been enrolled or completed their courses.', key: 'training-menu' },
    { perms: ['personnel_actions', 'transfers', 'resignations'], title: 'HRM', description: 'Handle personnel actions like promotions and salary changes, process employee transfers, and manage resignations.', key: 'hrm-menu' },
    { perms: ['reports'], title: 'Reports', description: 'Generate and export HR reports — headcount, payroll summaries, leave usage, and more.', key: 'reports-menu' },
    { perms: ['employees'], title: 'Data Management', description: 'Bulk import employee data from spreadsheets to save time during initial setup or migrations.', key: 'data-management-menu' },
    { perms: ['sites', 'departments', 'positions'], title: 'Organization', description: 'Define your organizational structure — sites (locations), departments, and job positions.', key: 'organization-menu' },
    { perms: ['benefit_settings', 'tax_settings', 'payroll_items'], title: 'Settings', description: 'Configure benefits, tax brackets, tax calculation rules, and payroll policies that apply across the system.', key: 'settings-menu' },
    { perms: ['users', 'roles'], title: 'Administration', description: 'Manage user accounts and assign roles to control who can access what across the system.', key: 'admin-menu' },
    // System section: Activity Log has no permission, so always visible
    { perms: [], title: 'System', description: 'View the activity log to audit changes, and restore deleted records from the recycle bin.', key: 'system-menu' },
  ]

  for (const s of sidebarSteps) {
    // perms: [] means always visible (has items with no permission check)
    if (s.perms.length === 0 || canAny(...s.perms)) {
      steps.push({ title: s.title, description: s.description, target: sidebarEl(s.key), placement: 'right' })
    }
  }

  // Collapse button — always visible on desktop
  steps.push({ title: 'Collapse Sidebar', description: 'Click here to collapse or expand the sidebar menu. Gives you more screen space when you need it.', target: sidebarEl('sidebar-collapse'), placement: 'right' })

  // Phase 2 — Dashboard Content (row by row)
  steps.push(
    { title: 'Quick Stats', description: 'A snapshot of your key numbers — total employees, who\'s on leave today, pending requests, and this month\'s payroll status.', target: el('stats-cards'), placement: 'bottom' },
    { title: 'Quick Actions', description: 'Shortcuts to common tasks — add employees, manage leave, run payroll, and more. One click to get started.', target: el('quick-actions'), placement: 'bottom' },
  )

  // Widget cards — permission-gated, same conditions as the template v-if
  if (can.value.employees) {
    steps.push({ title: 'People', description: 'Employee headcount, organization breakdown, and your most recent hires at a glance.', target: el('widget-people'), placement: 'right' })
  }
  if (can.value.leave) {
    steps.push({ title: 'Leave', description: 'Pending, approved, and declined leave requests. See who\'s on leave today.', target: el('widget-leave'), placement: 'left' })
  }
  if (can.value.payroll) {
    steps.push({ title: 'Payroll', description: 'Current month payroll summary and upcoming payroll schedule.', target: el('widget-payroll'), placement: 'right' })
  }
  if (can.value.recruitment) {
    steps.push({ title: 'Recruitment', description: 'Upcoming interviews and vacant positions that need to be filled.', target: el('widget-recruitment'), placement: 'left' })
  }
  steps.push(
    { title: 'Notifications', description: 'Recent system notifications — approvals, imports, and alerts all in one place.', target: el('widget-notifications'), placement: 'top' },
  )

  // Phase 3 — Top Bar Utilities (always visible)
  steps.push(
    { title: 'Notification Bell', description: 'Quick access to your latest notifications without leaving the page. Click to see recent alerts at a glance.', target: el('notification-bell'), placement: 'bottom' },
    { title: 'Your Profile', description: 'View your profile, update your password, or sign out. You\'re all set — enjoy using HRMS!', target: el('profile-dropdown'), placement: 'bottomRight' },
  )

  return steps
})


// ── Greeting ──────────────────────────────────────────────
const firstName = computed(() => auth.userName?.split(' ')[0] || 'there')
const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})
const todayFormatted = computed(() => dayjs().format('dddd, MMMM D, YYYY'))

// ── Quick Stats ───────────────────────────────────────────
const statsData = ref({
  total_employees: '—',
  on_leave_today: '—',
  pending_requests: '—',
  payroll_this_month: '—',
})

const quickStats = computed(() => [
  { label: 'Total Employees', value: statsData.value.total_employees, icon: markRaw(TeamOutlined), bg: '#eff6ff', color: '#2563eb' },
  { label: 'On Leave Today', value: statsData.value.on_leave_today, icon: markRaw(CalendarOutlined), bg: '#fef3c7', color: '#d97706' },
  { label: 'Pending Requests', value: statsData.value.pending_requests, icon: markRaw(FileTextOutlined), bg: '#fce7f3', color: '#db2777' },
  { label: 'Payroll This Month', value: statsData.value.payroll_this_month, icon: markRaw(DollarOutlined), bg: '#f0fdf4', color: '#16a34a' },
])

// ── Init ──────────────────────────────────────────────────
onMounted(async () => {
  appStore.setPageMeta('Dashboard')

  try {
    const res = await dashboardApi.quickStats({ signal: getSignal() })
    statsData.value = res.data.data
  } catch { /* silent — stats show dashes until loaded */ }

  checkAndOpen()
})
</script>

<style scoped>
/* ── Greeting ──────────────────────────────────────────── */
.dashboard-greeting {
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

/* ── Section grid ──────────────────────────────────────── */
.dashboard-sections {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
@media (max-width: 1023px) {
  .dashboard-sections {
    grid-template-columns: 1fr;
  }
}
.section-full {
  grid-column: 1 / -1;
}

/* ── Section cards ─────────────────────────────────────── */
.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.section-actions {
  margin-bottom: 20px;
}

/* ── Section headers ───────────────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.section-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.section-dot.people { background: #2563eb; }
.section-dot.leave { background: #d97706; }
.section-dot.payroll { background: #16a34a; }
.section-dot.recruitment { background: #7c3aed; }
.section-dot.notifications { background: var(--color-primary, #002147); }

/* ── Inner content ─────────────────────────────────────── */
.section-divider {
  margin: 14px 0;
}
.sub-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.see-all-link {
  font-size: 12px;
  color: var(--color-accent, #2563eb);
  text-decoration: none;
}
.see-all-link:hover {
  text-decoration: underline;
}
</style>
