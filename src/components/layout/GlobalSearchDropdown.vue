<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div v-if="visible" class="global-search-overlay" @mousedown.self="emit('close')">
        <div class="global-search-panel" role="dialog" aria-modal="true" aria-label="Global search">
          <div class="search-input-row">
            <SearchOutlined class="search-input-icon" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="search-input"
              placeholder="Where do you want to go?"
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-label="Search modules"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls="search-results"
              :aria-activedescendant="activeItemId"
              @keydown="handleKeydown"
            />
            <kbd class="search-esc-key" @click="emit('close')">ESC</kbd>
          </div>

          <div class="search-body" ref="bodyRef" id="search-results" role="listbox">
            <template v-if="filteredGroups.length">
              <template v-for="group in filteredGroups" :key="group.title">
                <div class="search-section-label">{{ group.title }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.key"
                  :id="`search-item-${item.key}`"
                  :ref="el => setItemRef(item._flatIndex, el)"
                  class="search-item"
                  :class="{ 'is-active': activeIndex === item._flatIndex }"
                  role="option"
                  :aria-selected="activeIndex === item._flatIndex"
                  @click="navigateTo(item)"
                  @mouseenter="activeIndex = item._flatIndex"
                >
                  <component :is="item.icon" class="search-item-icon" />
                  <span class="search-item-label" v-html="highlightMatch(item.label)"></span>
                  <ArrowRightOutlined class="search-item-arrow" />
                </div>
              </template>
            </template>

            <div v-else-if="query" class="search-empty">
              No results for &ldquo;<strong>{{ query }}</strong>&rdquo;
            </div>
          </div>

          <!-- Footer hints -->
          <div class="search-footer">
            <div class="search-footer-hints">
              <span class="search-hint"><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
              <span class="search-hint"><kbd>&crarr;</kbd> open</span>
              <span class="search-hint"><kbd>esc</kbd> close</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  SearchOutlined,
  ArrowRightOutlined,
  DashboardOutlined,
  BellOutlined,
  TrophyOutlined,
  FundProjectionScreenOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  AuditOutlined,
  SmileOutlined,
  ReadOutlined,
  OrderedListOutlined,
  SwapOutlined,
  LogoutOutlined,
  BarChartOutlined,
  UploadOutlined,
  BankOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  BlockOutlined,
  SafetyCertificateOutlined,
  PercentageOutlined,
  CalculatorOutlined,
  SettingOutlined,
  UserOutlined,
  LockOutlined,
  HistoryOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  visible: Boolean,
})
const emit = defineEmits(['close'])

const router = useRouter()
const authStore = useAuthStore()

const inputRef = ref(null)
const bodyRef = ref(null)
const query = ref('')
const activeIndex = ref(0)
const itemRefs = ref({})

const SECTION_ORDER = [
  'Main', 'Grants', 'Recruitment', 'Management', 'Leave',
  'Attendance', 'Training', 'HRM', 'Reports', 'Data Management',
  'Organization', 'Settings', 'Administration', 'System',
]

const searchableItems = [
  // Main
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlined, route: 'dashboard', section: 'Main', keywords: ['home', 'overview', 'main'] },
  { key: 'notifications', label: 'Notifications', icon: BellOutlined, route: 'notifications', section: 'Main', keywords: ['alerts', 'messages', 'bell'] },
  // Grants
  { key: 'grants', label: 'Grants', icon: TrophyOutlined, route: 'grants', permission: 'grants', section: 'Grants', keywords: ['funding', 'projects', 'awards'] },
  { key: 'grant-positions', label: 'Grant Positions', icon: FundProjectionScreenOutlined, route: 'grant-positions', permission: 'grant_positions', section: 'Grants', keywords: ['funding positions'] },
  // Recruitment
  { key: 'interviews', label: 'Interviews', icon: UsergroupAddOutlined, route: 'interviews', permission: 'interviews', section: 'Recruitment', keywords: ['hiring', 'candidates', 'recruitment'] },
  { key: 'job-offers', label: 'Job Offers', icon: SolutionOutlined, route: 'job-offers', permission: 'job_offers', section: 'Recruitment', keywords: ['offers', 'hiring', 'employment'] },
  // Management
  { key: 'employees', label: 'Employees', icon: TeamOutlined, route: 'employees', permission: 'employees', section: 'Management', keywords: ['staff', 'workers', 'people', 'team'] },
  { key: 'payroll', label: 'Payroll', icon: DollarOutlined, route: 'payroll', permission: 'employee_salaries', section: 'Management', keywords: ['salary', 'wages', 'pay', 'compensation'] },
  // Leave
  { key: 'leave-requests', label: 'Leave Requests', icon: CalendarOutlined, route: 'leave-requests', permission: 'leave_requests', section: 'Leave', keywords: ['vacation', 'time off', 'absence', 'sick leave'] },
  { key: 'leave-balances', label: 'Leave Balances', icon: ScheduleOutlined, route: 'leave-balances', permission: 'leave_balances', section: 'Leave', keywords: ['remaining leave', 'balance', 'quota'] },
  { key: 'leave-types', label: 'Leave Types', icon: FileTextOutlined, route: 'leave-types', permission: 'leave_types', section: 'Leave', keywords: ['annual', 'sick', 'maternity'] },
  // Attendance
  { key: 'attendance', label: 'Attendance', icon: AuditOutlined, route: 'attendance', permission: 'attendance', section: 'Attendance', keywords: ['check in', 'check out', 'time tracking', 'clock'] },
  { key: 'holidays', label: 'Holidays', icon: SmileOutlined, route: 'holidays', permission: 'holidays', section: 'Attendance', keywords: ['public holidays', 'day off', 'calendar'] },
  // Training
  { key: 'training', label: 'Training', icon: ReadOutlined, route: 'training', permission: 'trainings', section: 'Training', keywords: ['courses', 'learning', 'development', 'workshops'] },
  { key: 'training-types', label: 'Training Types', icon: OrderedListOutlined, route: 'training-types', permission: 'training_types', section: 'Training', keywords: ['course types', 'categories'] },
  { key: 'employee-training', label: 'Employee Training', icon: SolutionOutlined, route: 'employee-training', permission: 'employee_training', section: 'Training', keywords: ['training records', 'courses completed'] },
  // HRM
  { key: 'personnel-actions', label: 'Personnel Actions', icon: SwapOutlined, route: 'personnel-actions', permission: 'personnel_actions', section: 'HRM', keywords: ['actions', 'changes', 'personnel'] },
  { key: 'transfers', label: 'Transfers', icon: SwapOutlined, route: 'transfers', permission: 'transfers', section: 'HRM', keywords: ['transfer', 'relocation', 'move'] },
  { key: 'resignations', label: 'Resignations', icon: LogoutOutlined, route: 'resignations', permission: 'resignations', section: 'HRM', keywords: ['resign', 'quit', 'termination', 'separation'] },
  // Reports
  { key: 'reports', label: 'Reports', icon: BarChartOutlined, route: 'reports', permission: 'reports', section: 'Reports', keywords: ['analytics', 'statistics', 'charts', 'data'] },
  // Data Management
  { key: 'data-import', label: 'Data Import', icon: UploadOutlined, route: 'data-import', permission: 'employees', section: 'Data Management', keywords: ['import', 'upload', 'csv', 'excel'] },
  // Organization
  { key: 'sites', label: 'Sites', icon: BankOutlined, route: 'sites', permission: 'sites', section: 'Organization', keywords: ['locations', 'offices', 'branches'] },
  { key: 'departments', label: 'Departments', icon: ApartmentOutlined, route: 'departments', permission: 'departments', section: 'Organization', keywords: ['divisions', 'units', 'teams'] },
  { key: 'positions', label: 'Positions', icon: IdcardOutlined, route: 'positions', permission: 'positions', section: 'Organization', keywords: ['roles', 'titles', 'job titles'] },
  { key: 'section-departments', label: 'Section Departments', icon: BlockOutlined, route: 'section-departments', permission: 'section_departments', section: 'Organization', keywords: ['sections', 'sub-departments'] },
  // Settings
  { key: 'benefit-settings', label: 'Benefit Settings', icon: SafetyCertificateOutlined, route: 'benefit-settings', permission: 'benefit_settings', section: 'Settings', keywords: ['benefits', 'insurance', 'perks'] },
  { key: 'tax-settings', label: 'Tax Settings', icon: PercentageOutlined, route: 'tax-settings', permission: 'tax_settings', section: 'Settings', keywords: ['tax', 'deductions', 'withholding'] },
  { key: 'tax-brackets', label: 'Tax Brackets', icon: OrderedListOutlined, route: 'tax-brackets', permission: 'tax_settings', section: 'Settings', keywords: ['tax rates', 'brackets', 'tiers'] },
  { key: 'tax-calculator', label: 'Tax Calculator', icon: CalculatorOutlined, route: 'tax-calculator', permission: 'tax_settings', section: 'Settings', keywords: ['calculate tax', 'compute', 'estimation'] },
  { key: 'payroll-policy-settings', label: 'Payroll Policies', icon: SettingOutlined, route: 'payroll-policy-settings', permission: 'payroll_items', section: 'Settings', keywords: ['payroll rules', 'policies', 'configuration'] },
  // Administration
  { key: 'admin-users', label: 'Users', icon: UserOutlined, route: 'admin-users', permission: 'users', section: 'Administration', keywords: ['admin', 'user management', 'accounts'] },
  { key: 'admin-roles', label: 'Roles', icon: LockOutlined, route: 'admin-roles', permission: 'roles', section: 'Administration', keywords: ['permissions', 'access control'] },
  // System
  { key: 'activity-logs', label: 'Activity Log', icon: HistoryOutlined, route: 'activity-logs', section: 'System', keywords: ['audit', 'history', 'changes', 'log'] },
  { key: 'recycle-bin', label: 'Recycle Bin', icon: DeleteOutlined, route: 'recycle-bin', permission: 'recycle_bin', section: 'System', keywords: ['deleted', 'trash', 'restore'] },
]

const accessibleItems = computed(() =>
  searchableItems.filter(item => !item.permission || authStore.canRead(item.permission))
)

const filteredItems = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return accessibleItems.value

  return accessibleItems.value.filter(item => {
    if (item.label.toLowerCase().includes(q)) return true
    if (item.section.toLowerCase().includes(q)) return true
    if (item.keywords?.some(kw => kw.toLowerCase().includes(q))) return true
    return false
  })
})

const filteredGroups = computed(() => {
  const map = new Map()
  let flatIndex = 0

  for (const item of filteredItems.value) {
    if (!map.has(item.section)) map.set(item.section, [])
    map.get(item.section).push({ ...item, _flatIndex: flatIndex++ })
  }

  return SECTION_ORDER
    .filter(title => map.has(title))
    .map(title => ({ title, items: map.get(title) }))
})

const activeItemId = computed(() => {
  const item = findItemByIndex(activeIndex.value)
  return item ? `search-item-${item.key}` : undefined
})

function handleKeydown(e) {
  const total = filteredItems.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (total === 0) return
    activeIndex.value = (activeIndex.value + 1) % total
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (total === 0) return
    activeIndex.value = (activeIndex.value - 1 + total) % total
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = findItemByIndex(activeIndex.value)
    if (item) navigateTo(item)
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function findItemByIndex(index) {
  for (const group of filteredGroups.value) {
    for (const item of group.items) {
      if (item._flatIndex === index) return item
    }
  }
  return null
}

function setItemRef(index, el) {
  if (el) {
    itemRefs.value[index] = el
  } else {
    delete itemRefs.value[index]
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = itemRefs.value[activeIndex.value]
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

function navigateTo(item) {
  router.push({ name: item.route })
  emit('close')
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const highlightRegex = computed(() => {
  const q = query.value.trim()
  if (!q) return null
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(${escaped})`, 'gi')
})

function highlightMatch(text) {
  const safe = escapeHtml(text)
  const regex = highlightRegex.value
  return regex ? safe.replace(regex, '<mark>$1</mark>') : safe
}

watch(() => props.visible, (val) => {
  if (val) {
    query.value = ''
    activeIndex.value = 0
    itemRefs.value = {}
    document.body.style.overflow = 'hidden'
    nextTick(() => inputRef.value?.focus())
  } else {
    document.body.style.overflow = ''
  }
})

watch(query, () => {
  activeIndex.value = 0
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ---- Overlay ---- */
.global-search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 15, 30, 0.45);
  display: flex;
  justify-content: center;
  padding-top: 10vh;
}

@supports (backdrop-filter: blur(4px)) {
  .global-search-overlay {
    backdrop-filter: blur(4px);
  }
}

/* ---- Panel ---- */
.global-search-panel {
  width: 100%;
  max-width: 560px;
  max-height: min(520px, 70vh);
  margin: 0 16px;
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 48px -12px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-self: flex-start;
}

/* ---- Search Input ---- */
.search-input-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
  flex-shrink: 0;
}

.search-input-icon {
  font-size: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 400;
  color: var(--color-text);
  background: transparent;
  line-height: 1.4;
}
.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-esc-key {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  padding: 3px 7px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  line-height: 1;
  transition: all var(--transition-fast);
  user-select: none;
}
.search-esc-key:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
}

/* ---- Results Body ---- */
.search-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
  border-top: 1px solid var(--color-border-light);
}

.search-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  padding: 12px 12px 6px;
}
.search-section-label:first-child {
  padding-top: 8px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.search-item:hover {
  background: var(--color-bg-hover);
}
.search-item.is-active {
  background: var(--color-accent-light);
}

.search-item-icon {
  font-size: 16px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-item.is-active .search-item-icon {
  color: var(--color-accent);
}

.search-item-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}
.search-item-label :deep(mark) {
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-accent);
  padding: 0 1px;
  border-radius: 2px;
  font-weight: 600;
}

.search-item-arrow {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  flex-shrink: 0;
}
.search-item:hover .search-item-arrow,
.search-item.is-active .search-item-arrow {
  opacity: 1;
}
.search-item.is-active .search-item-arrow {
  color: var(--color-accent);
  transform: translateX(2px);
}

/* ---- Empty state ---- */
.search-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

/* ---- Footer ---- */
.search-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.search-footer-hints {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-hint kbd {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  min-width: 20px;
  text-align: center;
  line-height: 1.4;
}

/* ---- Transitions ---- */
@media (prefers-reduced-motion: no-preference) {
  .search-fade-enter-active {
    transition: opacity 150ms ease;
  }
  .search-fade-enter-active .global-search-panel {
    animation: search-panel-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .search-fade-leave-active {
    transition: opacity 120ms ease;
  }
  .search-fade-leave-active .global-search-panel {
    animation: search-panel-out 120ms ease forwards;
  }
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

@keyframes search-panel-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
}

@keyframes search-panel-out {
  to {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
}

/* ---- Mobile ---- */
@media (max-width: 639px) {
  .global-search-overlay {
    padding-top: 0;
    align-items: flex-start;
  }
  .global-search-panel {
    max-width: 100%;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
  }
  .search-footer-hints {
    gap: 12px;
  }
}
</style>
