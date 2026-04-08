<template>
  <div class="page-container">
    <!-- ── Greeting ───────────────────────────────────────── -->
    <div class="dashboard-greeting">
      <div>
        <h2 class="greeting-title">{{ greetingText }}, {{ firstName }}</h2>
        <p class="greeting-subtitle">{{ todayFormatted }}</p>
      </div>
    </div>

    <!-- ── Quick Stats (only if user has relevant permissions) ── -->
    <template v-if="quickStats.length">
      <div class="stats-grid" data-tour="stats-cards">
        <router-link
          v-for="stat in quickStats"
          :key="stat.label"
          :to="stat.to"
          class="stat-card"
        >
          <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
            <component :is="stat.icon" />
          </div>
          <div class="stat-content">
            <template v-if="statsLoading">
              <a-skeleton-input :active="true" size="small" style="width: 40px; height: 24px;" />
              <span class="stat-label">{{ stat.label }}</span>
            </template>
            <template v-else>
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </template>
          </div>
        </router-link>
      </div>
      <div class="stats-meta">
        <span v-if="lastUpdated" class="stats-timestamp">
          As of {{ lastUpdated }}
        </span>
        <button class="stats-refresh" :disabled="statsLoading" @click="refreshStats">
          <ReloadOutlined :spin="statsLoading" />
        </button>
      </div>
    </template>

    <!-- ── Quick Actions (only if user has any HR permissions) ── -->
    <a-card v-if="quickStats.length" class="section-card section-actions" :bordered="false" data-tour="quick-actions">
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
        <a-divider class="section-divider" />
        <div class="sub-header">Probation Ending Soon</div>
        <ProbationTrackerWidget />
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
        <div class="sub-header">Pending Leave Requests</div>
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

      <!-- Resignation -->
      <a-card v-if="can.resignations" class="section-card" :bordered="false" data-tour="widget-resignation">
        <template #title>
          <span class="section-header">
            <span class="section-dot resignation" />
            Resignation
          </span>
        </template>
        <ResignationStatsWidget />
      </a-card>

      <!-- System Health (admin only) -->
      <a-card v-if="can.admin" class="section-card" :bordered="false" data-tour="widget-admin">
        <template #title>
          <span class="section-header">
            <span class="section-dot admin" />
            System Health
          </span>
        </template>
        <SystemHealthWidget />
      </a-card>

      <!-- Recent Errors (admin only) -->
      <a-card v-if="can.admin" class="section-card" :bordered="false" data-tour="widget-errors">
        <template #title>
          <span class="section-header">
            <span class="section-dot error" />
            Recent Errors
          </span>
        </template>
        <RecentErrorsWidget />
      </a-card>

      <!-- Failed Jobs (admin only) -->
      <a-card v-if="can.admin" class="section-card" :bordered="false" data-tour="widget-jobs">
        <template #title>
          <span class="section-header">
            <span class="section-dot warning" />
            Failed Jobs
          </span>
        </template>
        <FailedJobsWidget />
      </a-card>

      <!-- Recent Activity -->
      <a-card class="section-card" :bordered="false" data-tour="widget-activity">
        <template #title>
          <span class="section-header">
            <span class="section-dot activity" />
            Recent Activity
          </span>
        </template>
        <UserActivityWidget />
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
import { ref, computed, onMounted, onUnmounted, inject, markRaw, watch } from 'vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { STAT_COLORS } from '@/constants/colors'
import { useTour } from '@/composables/useTour'
import {
  QuestionCircleOutlined, ReloadOutlined,
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
import ResignationStatsWidget from '@/components/dashboard/widgets/ResignationStatsWidget.vue'
import ProbationTrackerWidget from '@/components/dashboard/widgets/ProbationTrackerWidget.vue'
import UserActivityWidget from '@/components/dashboard/widgets/UserActivityWidget.vue'
import SystemHealthWidget from '@/components/dashboard/widgets/SystemHealthWidget.vue'
import RecentErrorsWidget from '@/components/dashboard/widgets/RecentErrorsWidget.vue'
import FailedJobsWidget from '@/components/dashboard/widgets/FailedJobsWidget.vue'

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
  resignations: auth.canRead('resignations'),
  admin: auth.hasRole('admin'),
}))

// ── Tour ──────────────────────────────────────────────────
const { isTourOpen, currentStep, checkAndOpen, markComplete, restart, cleanup } = useTour('app_welcome')
onUnmounted(cleanup)

// After password change, needsPasswordChange transitions true→false.
// Trigger the tour so the user sees it immediately without a page refresh.
watch(
  () => auth.needsPasswordChange,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      checkAndOpen()
    }
  },
)

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
const isAdmin = computed(() => auth.hasRole('admin'))

const tourSteps = computed(() => {
  const steps = [
    // Phase 1 — Sidebar Navigation (top to bottom)
    {
      title: 'Welcome to HRMS',
      description: isAdmin.value
        ? 'This is your Dashboard — your starting point for monitoring system health, reviewing errors, and managing system configuration.'
        : 'This is your Dashboard — your starting point. It shows key metrics and a quick overview of your HR data.',
      target: sidebarEl('nav-dashboard'),
      placement: 'right',
    },
    { title: 'Notifications', description: 'Stay on top of system alerts and updates. A badge appears when you have unread items.', target: sidebarEl('nav-notifications'), placement: 'right' },
  ]

  // Sidebar sections — only include steps for sections the user can see.
  // Each entry can use perms (module permission check) or role (role check).
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
    { role: 'admin', title: 'Administration', description: 'Manage lookup data (dropdown values used across the system), review login history, and monitor user activity.', key: 'admin-menu' },
    { role: 'admin', title: 'System', description: 'Monitor system health, review errors and failed jobs, check API performance, view the audit trail, recover deleted records, and configure system settings.', key: 'system-menu' },
    { perms: ['activity_logs', 'recycle_bin'], title: 'System', description: 'View the activity log to audit changes, and restore deleted records from the recycle bin.', key: 'system-menu' },
  ]

  for (const s of sidebarSteps) {
    if (s.role) {
      if (auth.hasRole(s.role)) {
        steps.push({ title: s.title, description: s.description, target: sidebarEl(s.key), placement: 'right' })
      }
    } else if (s.perms.length === 0 || canAny(...s.perms)) {
      steps.push({ title: s.title, description: s.description, target: sidebarEl(s.key), placement: 'right' })
    }
  }

  // Collapse button — always visible on desktop
  steps.push({ title: 'Collapse Sidebar', description: 'Click here to collapse or expand the sidebar menu. Gives you more screen space when you need it.', target: sidebarEl('sidebar-collapse'), placement: 'right' })

  // Phase 2 — Dashboard Content (depends on role)
  if (isAdmin.value) {
    // Admin dashboard tour
    steps.push(
      { title: 'System Health', description: 'Live status of your database, cache, storage, and job queue. Green means healthy, yellow means degraded, red means down. Click any row for details.', target: el('widget-admin'), placement: 'bottom' },
    )
    steps.push(
      { title: 'Recent Errors', description: 'Application errors from the last 24 hours. Spot recurring issues before users report them.', target: el('widget-errors'), placement: 'right' },
      { title: 'Failed Jobs', description: 'Background jobs that failed — payroll processing, data imports. Retry or investigate from here.', target: el('widget-jobs'), placement: 'left' },
    )
  } else {
    // HR Manager dashboard tour
    if (quickStats.value.length) {
      steps.push(
        { title: 'Quick Stats', description: 'A snapshot of your key numbers — total employees, who\'s on leave today, pending leave requests, and this month\'s payroll records. Click any card to go to that section.', target: el('stats-cards'), placement: 'bottom' },
        { title: 'Quick Actions', description: 'Shortcuts to common tasks — add employees, manage leave, run payroll, and more. One click to get started.', target: el('quick-actions'), placement: 'bottom' },
      )
    }

    if (can.value.employees) {
      steps.push({ title: 'People', description: 'Employee headcount, organization breakdown, and your most recent hires at a glance.', target: el('widget-people'), placement: 'right' })
    }
    if (can.value.leave) {
      steps.push({ title: 'Leave', description: 'Leave request counts by status and who\'s on leave today.', target: el('widget-leave'), placement: 'left' })
    }
    if (can.value.payroll) {
      steps.push({ title: 'Payroll', description: 'Current month payroll summary and upcoming payroll schedule.', target: el('widget-payroll'), placement: 'right' })
    }
    if (can.value.recruitment) {
      steps.push({ title: 'Recruitment', description: 'Upcoming interviews and vacant positions that need to be filled.', target: el('widget-recruitment'), placement: 'left' })
    }
  }

  steps.push(
    { title: 'Recent Activity', description: 'The latest records created, updated, or deleted across the system.', target: el('widget-activity'), placement: 'top' },
    { title: 'Notifications', description: 'Recent system notifications — all in one place.', target: el('widget-notifications'), placement: 'top' },
  )

  // Phase 3 — Top Bar Utilities (always visible)
  steps.push(
    { title: 'Notification Bell', description: 'Quick access to your latest notifications without leaving the page.', target: el('notification-bell'), placement: 'bottom' },
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
  total_employees: 0,
  on_leave_today: 0,
  pending_requests: 0,
  payroll_this_month: 0,
})
const statsLoading = ref(true)
const lastUpdated = ref('')

const quickStats = computed(() => {
  const stats = []
  if (auth.canRead('employees')) {
    stats.push({ label: 'Total Employees', value: statsData.value.total_employees, icon: markRaw(TeamOutlined), ...STAT_COLORS.blue, to: '/employees' })
  }
  if (auth.canRead('leave_requests')) {
    stats.push({ label: 'On Leave Today', value: statsData.value.on_leave_today, icon: markRaw(CalendarOutlined), ...STAT_COLORS.amber, to: '/leave-requests' })
    stats.push({ label: 'Pending Leave', value: statsData.value.pending_requests, icon: markRaw(FileTextOutlined), ...STAT_COLORS.pink, to: '/leave-requests' })
  }
  if (auth.canRead('employee_salaries')) {
    stats.push({ label: 'Payroll This Month', value: statsData.value.payroll_this_month, icon: markRaw(DollarOutlined), ...STAT_COLORS.green, to: '/payroll' })
  }
  return stats
})

async function fetchQuickStats() {
  statsLoading.value = true
  try {
    const res = await dashboardApi.quickStats({ signal: getSignal() })
    statsData.value = res.data.data
    lastUpdated.value = dayjs().format('HH:mm')
  } catch { /* silent */ }
  finally { statsLoading.value = false }
}

function refreshStats() {
  if (!statsLoading.value) fetchQuickStats()
}

// ── Init ──────────────────────────────────────────────────
onMounted(async () => {
  appStore.setPageMeta('Dashboard')
  await fetchQuickStats()
  if (!auth.needsPasswordChange) {
    checkAndOpen()
  }
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
.section-dot.resignation { background: #dc2626; }
.section-dot.admin { background: #0d9488; }
.section-dot.error { background: #dc2626; }
.section-dot.warning { background: #d97706; }
.section-dot.activity { background: #6366f1; }
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
