# Employment & Funding — Implementation Plan

> Created: 2026-03-15
> Depends on: `docs/assignment-funding/research.md`

---

## Table of Contents

1. [Goals](#1-goals)
2. [Architecture Overview](#2-architecture-overview)
3. [File Changes Summary](#3-file-changes-summary)
4. [Step 1: Create AssignmentTab.vue](#4-step-1-create-assignmenttabvue)
5. [Step 2: Modify EmployeeFormView.vue](#5-step-2-modify-employeeformviewvue)
6. [Step 3: Guided Create Flow](#6-step-3-guided-create-flow)
7. [Step 4: Backend Transaction Fix](#7-step-4-backend-transaction-fix)
8. [Step 5: Cleanup](#8-step-5-cleanup)
9. [Testing Checklist](#9-testing-checklist)
10. [Implementation Todo List](#10-implementation-todo-list)

---

## 1. Goals

### What we're solving

The client's Excel workflow showed employment assignment and funding allocations on one row. The current app splits these across two separate tabs (tab 7 "Employment" and tab 8 "Funding"), requiring:

1. Save employee (tabs 1-4) → wait for redirect
2. Navigate to Employment tab → fill modal → save → wait for refresh
3. Navigate to Funding tab → fill modal → save

**Three sequential saves, three tab navigations, three mental context switches.**

### What we're building

1. **Merge Employment + Funding into one "Employment & Funding" tab** — one place to see and manage both
2. **Guided create flow** — after creating a new employee, auto-navigate to the Employment & Funding tab and open the employment modal
3. **Backend fix** — wrap `EmployeeDataService::store()` in a DB transaction

### What we're NOT changing

- No backend API changes (all existing endpoints stay the same)
- No new API endpoints needed
- No database migrations
- No changes to how funding `batchUpdate` works
- No changes to probation flow
- Employment and Funding still save independently via their own modals (they're live-tab actions)

---

## 2. Architecture Overview

### Current State

```
EmployeeFormView.vue
  ├── Tab 7: EmploymentTab.vue (791 lines) — employment display + modals
  └── Tab 8: FundingTab.vue (516 lines) — funding display + modal
```

### Target State

```
EmployeeFormView.vue (modified — tab list, imports, guided flow)
  └── Tab 7: AssignmentTab.vue (NEW — ~1300 lines) — combined display + all modals
      ├── Section 1: Employment details (from EmploymentTab)
      ├── Section 2: Funding allocations table (from FundingTab)
      ├── Employment Modal (from EmploymentTab)
      ├── Probation Modal (from EmploymentTab)
      └── Funding Allocations Modal (from FundingTab)
```

### Why one file instead of sub-components?

Both EmploymentTab and FundingTab are already self-contained. They share the same `employee` prop and `refresh` emit. The combined file (~1300 lines) is within acceptable bounds for a single view component, and splitting into sub-components would add prop-drilling complexity with no real benefit. The two sections have shared dependencies (employment must exist before funding can be managed) that are cleaner to handle in one component.

---

## 3. File Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/views/employees/tabs/AssignmentTab.vue` | **CREATE** | ~1300 new |
| `src/views/employees/EmployeeFormView.vue` | **MODIFY** | ~30 lines |
| `src/views/employees/tabs/EmploymentTab.vue` | **KEEP** | 0 (keep for reference, delete after create the AssignmentTab) |
| `src/views/employees/tabs/FundingTab.vue` | **KEEP** | 0 (keep for reference, delete after create the AssignmentTab) |
| `EmployeeDataService.php` (backend) | **MODIFY** | ~10 lines |

---

## 4. Step 1: Create AssignmentTab.vue

### 4.1 Props & Emits

Same interface as both original tabs — the parent doesn't need to change how it communicates.

```vue
<script setup>
import { ref, reactive, computed, watch, nextTick, inject } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employmentApi, fundingAllocationApi, optionsApi, lookupApi } from '@/api'
import {
  EditOutlined, DeleteOutlined, PlusOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  employee: { type: Object, required: true },
  autoOpenEmployment: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])
</script>
```

**Key addition**: `autoOpenEmployment` prop — used by the guided create flow to auto-open the employment modal when the tab first mounts.

### 4.2 Template Structure

The template combines both tabs into a two-section layout:

```vue
<template>
  <div>
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- SECTION 1: EMPLOYMENT DETAILS                      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <template v-if="employee.employment">
      <div class="section-header">
        <div class="section-title" style="margin: 0; border: none; padding: 0;">Employment Details</div>
        <a-space>
          <a-button v-if="canUpdateEmployment" size="small" :loading="loadingOptions" @click="openEditEmployment">
            <EditOutlined /> Edit
          </a-button>
          <a-button v-if="canDeleteEmployment" size="small" danger @click="confirmDeleteEmployment">
            <DeleteOutlined /> Delete
          </a-button>
        </a-space>
      </div>
      <div class="info-grid">
        <InfoField label="Organization" :value="employee.employment.organization" />
        <InfoField label="Department" :value="employee.employment.department?.name" />
        <InfoField label="Section" :value="employee.employment.section_department?.name" />
        <InfoField label="Position" :value="employee.employment.position?.title" />
        <InfoField label="Site" :value="employee.employment.site?.name" />
        <InfoField label="Start Date" :value="formatDate(employee.employment.start_date)" />
        <InfoField label="Pay Method" :value="employee.employment.pay_method" />
        <InfoField label="Status" :value="employee.employment.end_date ? 'Inactive' : 'Active'" />
      </div>

      <div class="section-title">Salary</div>
      <div class="info-grid">
        <InfoField v-if="employee.employment.probation_required !== false" label="Probation Salary" :value="formatCurrency(employee.employment.probation_salary)" />
        <InfoField label="Pass-Probation Salary" :value="formatCurrency(employee.employment.pass_probation_salary)" />
      </div>

      <div class="section-title">Probation</div>
      <div class="info-grid">
        <InfoField label="Probation Required" :value="employee.employment.probation_required === false ? 'No' : 'Yes'" />
        <template v-if="employee.employment.probation_required !== false">
          <InfoField label="Pass Probation Date" :value="formatDate(employee.employment.pass_probation_date)" />
          <InfoField label="End Probation Date" :value="formatDate(employee.employment.end_probation_date)" />
        </template>
      </div>
      <div v-if="employee.employment.probation_required === false" class="no-probation-note">
        Employee skips probation — full salary and benefits from start date.
      </div>
      <a-space v-if="canUpdateEmployment && employee.employment.probation_required !== false && !employee.employment.end_probation_date" style="margin-top: 12px;">
        <a-button type="primary" size="small" @click="openProbationModal('passed')">
          <CheckOutlined /> Mark as Passed
        </a-button>
        <a-button danger size="small" @click="openProbationModal('failed')">
          <CloseOutlined /> Mark as Failed
        </a-button>
      </a-space>

      <div class="section-title">Benefits</div>
      <div class="info-grid">
        <InfoField label="Health Welfare" :value="employee.employment.health_welfare ? 'Yes' : 'No'" />
        <InfoField label="PVD" :value="employee.employment.pvd ? 'Yes' : 'No'" />
        <InfoField label="Saving Fund" :value="employee.employment.saving_fund ? 'Yes' : 'No'" />
        <InfoField label="Study Loan" :value="employee.employment.study_loan > 0 ? `฿${Number(employee.employment.study_loan).toLocaleString('en', { minimumFractionDigits: 2 })}/month` : 'None'" />
        <InfoField label="Retroactive Salary" :value="employee.employment.retroactive_salary != 0 && employee.employment.retroactive_salary != null ? `฿${Number(employee.employment.retroactive_salary).toLocaleString('en', { minimumFractionDigits: 2 })}` : 'None'" />
      </div>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- SECTION 2: FUNDING ALLOCATIONS                     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="section-divider" />

      <div class="section-header" style="margin-bottom: 12px;">
        <div class="fte-summary">
          Funding Allocations
          <a-tag
            v-if="totalFte > 0"
            :color="totalFte === 100 ? 'green' : 'orange'"
            style="margin-left: 8px;"
          >{{ totalFte }}% FTE</a-tag>
        </div>
        <a-button v-if="canUpdateAllocation && employee.employee_funding_allocations?.length" size="small" type="primary" @click="openManageAllocations">
          <EditOutlined /> Manage Allocations
        </a-button>
      </div>

      <a-table
        v-if="employee.employee_funding_allocations?.length"
        :columns="fundingColumns"
        :data-source="employee.employee_funding_allocations"
        :row-key="(r) => r.id"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grant'">
            {{ record.grant_item?.grant?.name || '—' }}
            <div class="cell-sub">{{ record.grant_item?.grant?.code || '' }}</div>
          </template>
          <template v-else-if="column.key === 'position'">
            {{ record.grant_item?.grant_position || '—' }}
          </template>
          <template v-else-if="column.key === 'budgetline'">
            <span class="font-mono">{{ record.grant_item?.budgetline_code || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'fte'">
            <span class="font-mono">{{ record.fte != null ? `${(record.fte * 100).toFixed(0)}%` : '—' }}</span>
          </template>
          <template v-else-if="column.key === 'amount'">
            <span class="font-mono">{{ formatCurrency(record.allocated_amount) || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="allocationStatusColor(record.status)" size="small">{{ record.status }}</a-tag>
          </template>
        </template>
      </a-table>
      <a-empty v-else description="No funding allocations">
        <a-button v-if="canCreateAllocation" type="primary" size="small" @click="openManageAllocations">
          <PlusOutlined /> Add Allocation
        </a-button>
      </a-empty>
    </template>

    <!-- NO EMPLOYMENT YET -->
    <a-empty v-else description="No employment record">
      <template #extra>
        <p style="color: var(--color-text-muted); margin-bottom: 12px;">
          Add an employment record to manage assignments and funding allocations.
        </p>
        <a-button v-if="canCreateEmployment" type="primary" @click="openAddEmployment">
          <PlusOutlined /> Add Employment
        </a-button>
      </template>
    </a-empty>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODALS                                             -->
    <!-- ═══════════════════════════════════════════════════ -->

    <!-- Employment Modal (Add/Edit) — copied from EmploymentTab -->
    <!-- ... (full employment modal template, identical to EmploymentTab lines 64-326) ... -->

    <!-- Probation Modal — copied from EmploymentTab -->
    <!-- ... (full probation modal template, identical to EmploymentTab lines 329-353) ... -->

    <!-- Manage Funding Allocations Modal — copied from FundingTab -->
    <!-- ... (full allocation modal template, identical to FundingTab lines 55-165) ... -->
  </div>
</template>
```

**Key structural decisions:**

1. When no employment exists, we show a single empty state with the "Add Employment" button. No funding section is shown at all (you can't have funding without employment).
2. When employment exists, both sections render together. The funding section appears below employment details, separated by a visual divider.
3. All three modals live in this one component — no prop-drilling needed.

### 4.3 Script — Combining Both Tabs

The script section merges the state and logic from both EmploymentTab and FundingTab. Here's the complete structure:

```vue
<script setup>
import { ref, reactive, computed, watch, nextTick, inject, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employmentApi, fundingAllocationApi, optionsApi, lookupApi } from '@/api'
import {
  EditOutlined, DeleteOutlined, PlusOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  employee: { type: Object, required: true },
  autoOpenEmployment: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])

// ════════════════════════════════════════════════════════
// PERMISSIONS
// ════════════════════════════════════════════════════════
const canCreateEmployment = computed(() => authStore.canCreate('employment_records'))
const canUpdateEmployment = computed(() => authStore.canUpdate('employment_records'))
const canDeleteEmployment = computed(() => authStore.canDelete('employment_records'))
const canCreateAllocation = computed(() => authStore.canCreate('employee_funding_allocations'))
const canUpdateAllocation = computed(() => authStore.canUpdate('employee_funding_allocations'))

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Modal State
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 382-411)
const employmentModalVisible = ref(false)
const editingEmployment = ref(false)
const savingEmployment = ref(false)
const departmentOptions = ref([])
const positionOptions = ref([])
const siteOptions = ref([])
const sectionDepartmentOptions = ref([])
const payMethodOptions = ref([])
const loadingOptions = ref(false)
const loadingPayMethods = ref(false)

const empForm = reactive({
  organization: undefined,
  department_id: undefined,
  section_department_id: undefined,
  position_id: undefined,
  site_id: undefined,
  start_date: null,
  probation_required: true,
  end_probation_date: null,
  pass_probation_date: null,
  pass_probation_salary: null,
  probation_salary: null,
  pay_method: undefined,
  health_welfare: false,
  pvd: false,
  saving_fund: false,
  study_loan: null,
  retroactive_salary: null,
})

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Computed & Watchers
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 413-470)
const filteredPositions = computed(() => {
  if (!empForm.department_id) return []
  const deptId = Number(empForm.department_id)
  return positionOptions.value.filter(p => Number(p.department_id) === deptId)
})

const filteredSectionDepartments = computed(() => {
  if (!empForm.department_id) return []
  const deptId = Number(empForm.department_id)
  return sectionDepartmentOptions.value.filter(sd => Number(sd.department_id) === deptId)
})

const probationPeriodText = computed(() => {
  if (!empForm.start_date || !empForm.end_probation_date) return null
  return `${dayjs(empForm.start_date).format('DD MMM YYYY')} — ${dayjs(empForm.end_probation_date).format('DD MMM YYYY')}`
})

const skipDateAutoFill = ref(false)
const skipDepartmentReset = ref(false)

watch(() => empForm.start_date, (newVal) => {
  if (skipDateAutoFill.value) return
  if (!empForm.probation_required) return
  if (newVal) {
    const start = dayjs(newVal)
    empForm.pass_probation_date = start.add(3, 'month').format('YYYY-MM-DD')
    empForm.end_probation_date = start.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD')
  } else {
    empForm.pass_probation_date = null
    empForm.end_probation_date = null
  }
})

watch(() => empForm.probation_required, (required) => {
  if (!required) {
    empForm.pass_probation_date = null
    empForm.end_probation_date = null
    empForm.probation_salary = null
  } else if (empForm.start_date) {
    const start = dayjs(empForm.start_date)
    empForm.pass_probation_date = start.add(3, 'month').format('YYYY-MM-DD')
    empForm.end_probation_date = start.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD')
  }
})

watch(() => empForm.department_id, () => {
  if (skipDepartmentReset.value) return
  if (empForm.position_id) {
    const valid = filteredPositions.value.some(p => Number(p.id) === Number(empForm.position_id))
    if (!valid) empForm.position_id = undefined
  }
  if (empForm.section_department_id) {
    const valid = filteredSectionDepartments.value.some(sd => Number(sd.id) === Number(empForm.section_department_id))
    if (!valid) empForm.section_department_id = undefined
  }
})

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Probation State
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 473-480)
const probationModalVisible = ref(false)
const savingProbation = ref(false)
const probationForm = reactive({
  action: '',
  decision_date: null,
  reason: '',
  notes: '',
})

// ════════════════════════════════════════════════════════
// FUNDING: Table & State
// ════════════════════════════════════════════════════════
// (Identical to FundingTab lines 188-213)
const fundingColumns = [
  { title: 'Grant', key: 'grant', width: 260 },
  { title: 'Grant Position', key: 'position', width: 200 },
  { title: 'Budget Line', key: 'budgetline', width: 130 },
  { title: 'FTE %', key: 'fte', width: 90, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 90 },
]

const editAllocColumns = [
  { title: 'Grant', key: 'grant', width: 300 },
  { title: 'Grant Position', key: 'position', width: 220 },
  { title: 'Budget Line', key: 'budgetline', width: 110 },
  { title: 'FTE %', key: 'fte', width: 110, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 80 },
  { title: '', key: 'actions', width: 50, align: 'center' },
]

const allocationModalVisible = ref(false)
const savingAllocation = ref(false)
const grantStructure = ref([])
const loadingGrantStructure = ref(false)
const allocRows = ref([])
let allocRowKey = 0
let originalAllocIds = []

const totalFte = computed(() => {
  const allocs = props.employee?.employee_funding_allocations || []
  const sum = allocs
    .filter(a => a.status === 'active')
    .reduce((s, a) => s + (Number(a.fte) || 0), 0)
  return Math.round(sum * 100)
})

const editFteTotal = computed(() => {
  return Math.round(allocRows.value
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + (Number(r.fte) || 0), 0))
})

const grantOptions = computed(() => {
  const opts = grantStructure.value.map(g => ({
    value: Number(g.id),
    name: g.name,
    code: g.code,
    organization: g.organization || '—',
    searchText: `${g.name} ${g.code} ${g.organization || ''}`,
  }))
  for (const row of allocRows.value) {
    if (row.grant_id != null && row._grant_label && !opts.some(o => o.value === row.grant_id)) {
      opts.push({ value: row.grant_id, name: row._grant_label, code: '', organization: '—', searchText: row._grant_label })
    }
  }
  return opts
})

// ════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════
function formatDate(date) {
  return date ? dayjs(date).format('DD MMM YYYY') : null
}

function formatCurrency(val) {
  if (val == null) return null
  return `฿${Number(val).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function filterOption(input, option) {
  const label = (option.children?.[0]?.children || option.label || '').toString().toLowerCase()
  return label.includes(input.toLowerCase())
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  const errors = resp?.errors
  if (Array.isArray(errors) && errors.length) {
    Modal.error({ title: resp.message || fallback, content: errors.join('\n') })
  } else if (errors && typeof errors === 'object') {
    const firstErr = Object.values(errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

function allocationStatusColor(status) {
  if (status === 'active') return 'green'
  if (status === 'inactive') return 'orange'
  return 'default'
}

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Dropdown Loading
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 508-526)
async function loadDropdownOptions() {
  if (departmentOptions.value.length) return
  loadingOptions.value = true
  try {
    const [depts, pos, sites, secDepts, payMethods] = await Promise.all([
      optionsApi.departments(),
      optionsApi.positions(),
      optionsApi.sites(),
      optionsApi.sectionDepartments(),
      lookupApi.byType('pay_method'),
    ])
    departmentOptions.value = depts.data.data || depts.data || []
    positionOptions.value = pos.data.data || pos.data || []
    siteOptions.value = sites.data.data || sites.data || []
    sectionDepartmentOptions.value = secDepts.data.data || secDepts.data || []
    payMethodOptions.value = (payMethods.data?.data || []).map(l => ({ label: l.value, value: l.value }))
  } catch { /* silent */ }
  loadingOptions.value = false
}

// ════════════════════════════════════════════════════════
// EMPLOYMENT: CRUD
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 529-657)
function resetEmpForm() {
  Object.assign(empForm, {
    organization: undefined,
    department_id: undefined, section_department_id: undefined,
    position_id: undefined, site_id: undefined,
    start_date: null, probation_required: true,
    end_probation_date: null, pass_probation_date: null,
    pass_probation_salary: null, probation_salary: null,
    pay_method: undefined, health_welfare: false, pvd: false, saving_fund: false,
    study_loan: null, retroactive_salary: null,
  })
}

function openAddEmployment() {
  resetEmpForm()
  editingEmployment.value = false
  employmentModalVisible.value = true
  loadDropdownOptions()
}

async function openEditEmployment() {
  await loadDropdownOptions()
  const emp = props.employee.employment
  skipDateAutoFill.value = true
  skipDepartmentReset.value = true

  const deptId = emp.department_id || emp.department?.id
  const posId = emp.position_id || emp.position?.id
  const siteId = emp.site_id || emp.site?.id
  const secDeptId = emp.section_department_id || emp.section_department?.id

  Object.assign(empForm, {
    organization: emp.organization || undefined,
    department_id: deptId != null ? Number(deptId) : undefined,
    section_department_id: secDeptId != null ? Number(secDeptId) : undefined,
    position_id: posId != null ? Number(posId) : undefined,
    site_id: siteId != null ? Number(siteId) : undefined,
    start_date: emp.start_date || null,
    probation_required: emp.probation_required !== false,
    end_probation_date: emp.end_probation_date || null,
    pass_probation_date: emp.pass_probation_date || null,
    pass_probation_salary: emp.pass_probation_salary != null ? Number(emp.pass_probation_salary) : null,
    probation_salary: emp.probation_salary != null ? Number(emp.probation_salary) : null,
    pay_method: emp.pay_method || undefined,
    health_welfare: !!emp.health_welfare,
    pvd: !!emp.pvd,
    saving_fund: !!emp.saving_fund,
    study_loan: emp.study_loan != null ? Number(emp.study_loan) : null,
    retroactive_salary: emp.retroactive_salary != null ? Number(emp.retroactive_salary) : null,
  })
  nextTick(() => {
    skipDateAutoFill.value = false
    skipDepartmentReset.value = false
  })
  editingEmployment.value = true
  employmentModalVisible.value = true
}

async function handleSaveEmployment() {
  // Validation (identical to EmploymentTab lines 589-599)
  if (!empForm.organization) return message.warning('Organization is required')
  if (!empForm.department_id) return message.warning('Department is required')
  if (!empForm.position_id) return message.warning('Position is required')
  if (!empForm.start_date) return message.warning('Start Date is required')
  if (empForm.pass_probation_salary == null || empForm.pass_probation_salary === '') {
    return message.warning(empForm.probation_required ? 'Pass-Probation Salary is required' : 'Salary is required')
  }
  if (empForm.probation_required && empForm.probation_salary != null && empForm.probation_salary !== '' &&
      Number(empForm.probation_salary) > Number(empForm.pass_probation_salary)) {
    return message.warning('Probation salary must be less than or equal to pass-probation salary')
  }

  // Build payload (identical to EmploymentTab lines 601-622)
  const payload = {
    employee_id: props.employee.id,
    organization: empForm.organization,
    department_id: empForm.department_id,
    position_id: empForm.position_id,
    start_date: empForm.start_date,
    probation_required: empForm.probation_required,
    pass_probation_salary: Number(empForm.pass_probation_salary),
    health_welfare: empForm.health_welfare,
    pvd: empForm.pvd,
    saving_fund: empForm.saving_fund,
    study_loan: empForm.study_loan || 0,
    retroactive_salary: empForm.retroactive_salary || 0,
  }
  if (empForm.section_department_id) payload.section_department_id = empForm.section_department_id
  if (empForm.site_id) payload.site_id = empForm.site_id
  if (empForm.probation_required && empForm.probation_salary != null && empForm.probation_salary !== '') {
    payload.probation_salary = Number(empForm.probation_salary)
  }
  if (empForm.pay_method) payload.pay_method = empForm.pay_method
  if (empForm.probation_required && empForm.pass_probation_date) payload.pass_probation_date = empForm.pass_probation_date
  if (empForm.probation_required && empForm.end_probation_date) payload.end_probation_date = empForm.end_probation_date

  savingEmployment.value = true
  try {
    if (editingEmployment.value) {
      await employmentApi.update(props.employee.employment.id, payload)
      message.success('Employment updated')
    } else {
      await employmentApi.store(payload)
      message.success('Employment created — you can now add funding allocations')
    }
    employmentModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save employment')
  }
  savingEmployment.value = false
}

function confirmDeleteEmployment() {
  Modal.confirm({
    title: 'Delete Employment',
    content: 'Are you sure you want to delete this employment record? This will also affect funding allocations. This action cannot be undone.',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await employmentApi.destroy(props.employee.employment.id)
        message.success('Employment deleted')
        emit('refresh')
      } catch (err) {
        showApiError(err, 'Failed to delete employment')
      }
    },
  })
}

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Probation
// ════════════════════════════════════════════════════════
// (Identical to EmploymentTab lines 660-685)
function openProbationModal(action) {
  Object.assign(probationForm, { action, decision_date: null, reason: '', notes: '' })
  probationModalVisible.value = true
}

async function handleProbationSubmit() {
  if (probationForm.action === 'failed' && !probationForm.reason) {
    return message.warning('Reason is required when failing probation')
  }
  const payload = { action: probationForm.action }
  if (probationForm.decision_date) payload.decision_date = probationForm.decision_date
  if (probationForm.reason) payload.reason = probationForm.reason
  if (probationForm.notes) payload.notes = probationForm.notes

  savingProbation.value = true
  try {
    await employmentApi.probationStatus(props.employee.employment.id, payload)
    message.success(`Probation marked as ${probationForm.action}`)
    probationModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to update probation status')
  }
  savingProbation.value = false
}

// ════════════════════════════════════════════════════════
// FUNDING: Grant Structure & Helpers
// ════════════════════════════════════════════════════════
// (Identical to FundingTab lines 259-325)
function filterGrantOption(input, option) {
  const search = input.toLowerCase()
  const opt = grantOptions.value.find(o => o.value === option.value)
  return opt?.searchText?.toLowerCase().includes(search) ?? false
}

function getGrantItems(grantId) {
  if (!grantId) return []
  const grant = grantStructure.value.find(g => Number(g.id) === Number(grantId))
  return grant?.grant_items || []
}

function getGrantItemOptions(grantId) {
  const items = getGrantItems(grantId)
  const opts = items.map(gi => ({
    value: Number(gi.id),
    label: gi.grant_position || gi.name || `Position ${gi.id}`,
  }))
  for (const row of allocRows.value) {
    if (Number(row.grant_id) === Number(grantId) && row.grant_item_id != null) {
      if (!opts.some(o => o.value === row.grant_item_id)) {
        opts.push({
          value: row.grant_item_id,
          label: row._position_label || `Position ${row.grant_item_id}`,
        })
      }
    }
  }
  return opts
}

function getRowBudgetLine(row) {
  if (!row.grant_id || !row.grant_item_id) return 'Auto'
  const items = getGrantItems(row.grant_id)
  const item = items.find(gi => Number(gi.id) === Number(row.grant_item_id))
  return item?.budgetline_code || 'Auto'
}

async function loadGrantStructureData() {
  if (grantStructure.value.length) return
  loadingGrantStructure.value = true
  try {
    const { data } = await fundingAllocationApi.grantStructure()
    grantStructure.value = data.data?.grants || data.grants || data.data || []
  } catch { /* silent */ }
  loadingGrantStructure.value = false
}

// ════════════════════════════════════════════════════════
// FUNDING: Row Management
// ════════════════════════════════════════════════════════
// (Identical to FundingTab lines 328-458)
function makeAllocRow(existing) {
  allocRowKey++
  if (existing) {
    const gi = existing.grant_item
    const g = gi?.grant
    return {
      _key: `existing-${existing.id}`,
      _id: existing.id,
      grant_id: g?.id != null ? Number(g.id) : undefined,
      grant_item_id: existing.grant_item_id != null ? Number(existing.grant_item_id) : (gi?.id != null ? Number(gi.id) : undefined),
      _grant_label: g ? `${g.name} (${g.code})` : undefined,
      _position_label: gi?.grant_position || gi?.name || undefined,
      fte: existing.fte != null ? Math.round(Number(existing.fte) * 100) : null,
      previewAmount: existing.allocated_amount != null ? Number(existing.allocated_amount) : null,
      status: existing.status || 'active',
    }
  }
  return {
    _key: `new-${allocRowKey}`,
    _id: null,
    grant_id: undefined,
    grant_item_id: undefined,
    _grant_label: undefined,
    _position_label: undefined,
    fte: null,
    previewAmount: null,
    status: 'active',
  }
}

async function openManageAllocations() {
  await loadGrantStructureData()
  const allocs = props.employee?.employee_funding_allocations || []
  if (allocs.length) {
    allocRows.value = allocs.map(a => makeAllocRow(a))
    originalAllocIds = allocs.map(a => a.id)
  } else {
    allocRows.value = [makeAllocRow(null)]
    originalAllocIds = []
  }
  allocationModalVisible.value = true
}

function addAllocRow() {
  allocRows.value.push(makeAllocRow(null))
}

function removeAllocRow(index) {
  if (allocRows.value.length <= 1) {
    Modal.confirm({
      title: 'Remove all allocations?',
      content: 'This will delete all funding allocations for this employee.',
      okText: 'Remove',
      okType: 'danger',
      onOk: () => { allocRows.value.splice(index, 1) },
    })
    return
  }
  allocRows.value.splice(index, 1)
}

function onAllocGrantChange(row) {
  row.grant_item_id = undefined
  row._position_label = undefined
  row.previewAmount = null
}

function onAllocItemChange(row) {
  if (row.fte) fetchPreviewAmount(row)
}

async function onAllocFteChange(row) {
  if (row.fte && row.grant_item_id) {
    fetchPreviewAmount(row)
  } else {
    row.previewAmount = null
  }
}

async function fetchPreviewAmount(row) {
  if (!props.employee?.employment?.id || !row.fte) return
  try {
    const { data } = await fundingAllocationApi.calculatePreview({
      employment_id: props.employee.employment.id,
      fte: row.fte,
    })
    row.previewAmount = data.data?.allocated_amount ?? null
  } catch {
    const emp = props.employee.employment
    const salary = Number(emp.pass_probation_salary) || Number(emp.probation_salary) || 0
    row.previewAmount = salary ? Math.round(salary * (row.fte / 100) * 100) / 100 : null
  }
}

async function saveAllocations() {
  for (const row of allocRows.value) {
    if (!row.grant_item_id) return message.warning('Please select a Grant Position for all rows')
    if (!row.fte || row.fte <= 0) return message.warning('FTE must be greater than 0 for all rows')
  }

  savingAllocation.value = true
  try {
    const existingRows = allocRows.value.filter(r => r._id)
    const newRows = allocRows.value.filter(r => !r._id)
    const currentIds = existingRows.map(r => r._id)
    const deletedIds = originalAllocIds.filter(id => !currentIds.includes(id))

    await fundingAllocationApi.batchUpdate({
      employee_id: props.employee.id,
      employment_id: props.employee.employment.id,
      updates: existingRows.map(r => ({
        id: r._id,
        grant_item_id: r.grant_item_id,
        fte: r.fte,
        status: r.status,
      })),
      creates: newRows.map(r => ({
        grant_item_id: r.grant_item_id,
        fte: r.fte,
      })),
      deletes: deletedIds,
    })

    message.success('Funding allocations saved')
    allocationModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save allocations')
  }
  savingAllocation.value = false
}

// ════════════════════════════════════════════════════════
// AUTO-OPEN (Guided Create Flow)
// ════════════════════════════════════════════════════════
onMounted(() => {
  if (props.autoOpenEmployment && !props.employee.employment) {
    openAddEmployment()
  }
})
</script>
```

### 4.4 Styles

Combine styles from both tabs. Add the section divider:

```vue
<style scoped>
/* From EmploymentTab */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 20px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border-light);
}
.section-title:first-child { margin-top: 0; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.modal-form { margin-top: 8px; }
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}
.form-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.form-warning {
  font-size: 12px;
  color: var(--color-danger, #ff4d4f);
  margin: -8px 0 12px;
}
.field-hint {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 12px;
}

.probation-indicator {
  background: var(--color-bg-hover, #fafafa);
  border: 1px solid var(--color-border-light, #f0f0f0);
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}
.probation-indicator-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: #1677ff;
}
.probation-indicator-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.probation-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}
.probation-dates {
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.probation-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.probation-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.probation-toggle-label.skip { color: #1677ff; }
.no-probation-note {
  font-size: 12px;
  color: #1677ff;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
}

/* From FundingTab */
.fte-summary {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.fte-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}
.cell-sub { font-size: 11.5px; color: var(--color-text-muted); font-family: 'JetBrains Mono', monospace; }

.alloc-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.alloc-edit-table :deep(.ant-table-cell) {
  padding: 6px 8px !important;
  vertical-align: middle;
}
.alloc-edit-table :deep(.ant-select-selector),
.alloc-edit-table :deep(.ant-input-number) {
  font-size: 13px;
}

.grant-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.grant-option-name {
  font-weight: 500;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grant-option-org { flex-shrink: 0; margin: 0; }
.grant-option-code {
  font-size: 11.5px;
  color: var(--color-text-muted);
  font-family: 'JetBrains Mono', monospace;
}

/* NEW: Section divider between Employment and Funding */
.section-divider {
  margin: 24px 0;
  border-top: 2px solid var(--color-border-light);
}
</style>
```

---

## 5. Step 2: Modify EmployeeFormView.vue

### 5.1 Import Changes

Replace the two tab imports with one:

```diff
- import EmploymentTab from './tabs/EmploymentTab.vue'
- import FundingTab from './tabs/FundingTab.vue'
+ import AssignmentTab from './tabs/AssignmentTab.vue'
```

### 5.2 Tab Registration

Update `allTabs` and `LIVE_TABS`:

```diff
- const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'employment', 'funding']
+ const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'assignment']

- const LIVE_TABS = new Set(['leave', 'records', 'employment', 'funding'])
+ const LIVE_TABS = new Set(['leave', 'records', 'assignment'])
```

### 5.3 Template — Replace Two Tab Panes with One

Remove the two separate tab panes (lines 97-112) and replace with:

```vue
<!-- BEFORE (lines 97-112): -->
<a-tab-pane v-if="isEditMode" key="employment">
  <template #tab>
    <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
      <span class="live-tab-label">Employment</span>
    </a-tooltip>
  </template>
  <EmploymentTab :employee="employee" @refresh="loadEmployee" />
</a-tab-pane>
<a-tab-pane v-if="isEditMode" key="funding">
  <template #tab>
    <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
      <span class="live-tab-label">Funding</span>
    </a-tooltip>
  </template>
  <FundingTab :employee="employee" @refresh="loadEmployee" />
</a-tab-pane>

<!-- AFTER: -->
<a-tab-pane v-if="isEditMode" key="assignment">
  <template #tab>
    <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
      <span class="live-tab-label">Employment & Funding</span>
    </a-tooltip>
  </template>
  <AssignmentTab
    :employee="employee"
    :auto-open-employment="guidedCreateActive"
    @refresh="loadEmployee"
  />
</a-tab-pane>
```

### 5.4 Complete EmployeeFormView.vue Diff

Here is the full set of changes to `EmployeeFormView.vue`:

```diff
--- a/src/views/employees/EmployeeFormView.vue
+++ b/src/views/employees/EmployeeFormView.vue
@@ -94,20 +94,14 @@
               <RecordsTab :employee="employee" @refresh="loadEmployee" />
             </a-tab-pane>
-              <a-tab-pane v-if="isEditMode" key="employment">
-                <template #tab>
-                  <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
-                    <span class="live-tab-label">Employment</span>
-                  </a-tooltip>
-                </template>
-                <EmploymentTab :employee="employee" @refresh="loadEmployee" />
-              </a-tab-pane>
-              <a-tab-pane v-if="isEditMode" key="funding">
+              <a-tab-pane v-if="isEditMode" key="assignment">
                 <template #tab>
                   <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
-                    <span class="live-tab-label">Funding</span>
+                    <span class="live-tab-label">Employment & Funding</span>
                   </a-tooltip>
                 </template>
-                <FundingTab :employee="employee" @refresh="loadEmployee" />
+                <AssignmentTab
+                  :employee="employee"
+                  :auto-open-employment="guidedCreateActive"
+                  @refresh="loadEmployee"
+                />
               </a-tab-pane>
@@ -151,8 +145,7 @@
 import { employeeApi } from '@/api'
 import { ArrowLeftOutlined, DatabaseOutlined, SwapOutlined } from '@ant-design/icons-vue'

-import EmploymentTab from './tabs/EmploymentTab.vue'
-import FundingTab from './tabs/FundingTab.vue'
+import AssignmentTab from './tabs/AssignmentTab.vue'
 import LeaveTab from './tabs/LeaveTab.vue'
 import RecordsTab from './tabs/RecordsTab.vue'

@@ -176,9 +169,12 @@
 const activeTab = ref('basic_info')
+const guidedCreateActive = ref(false)

 const transferModalOpen = ref(false)
 const isEditMode = computed(() => !!route.params.id)
 const canSave = computed(() => isEditMode.value ? authStore.canUpdate('employees') : authStore.canCreate('employees'))

-const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'employment', 'funding']
+const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'assignment']

-const LIVE_TABS = new Set(['leave', 'records', 'employment', 'funding'])
+const LIVE_TABS = new Set(['leave', 'records', 'assignment'])
 const isLiveTab = computed(() => LIVE_TABS.has(activeTab.value))

@@ -338,10 +334,14 @@
     } else {
       const { data } = await employeeApi.store(buildPayload())
-      message.success('Employee created')
       takeSnapshot()
       const newId = data.data?.id || data.id
-      router.replace({ name: 'employee-detail', params: { id: newId } })
+      // Guided create flow: navigate to edit mode on assignment tab
+      guidedCreateActive.value = true
+      message.success('Employee created — now add employment details')
+      router.replace({
+        name: 'employee-detail',
+        params: { id: newId },
+        hash: '#assignment',
+      })
     }
```

---

## 6. Step 3: Guided Create Flow

### 6.1 The Flow

1. User fills in Basic Info → clicks Save
2. Employee is created → `router.replace()` redirects to edit mode with `#assignment` hash
3. `guidedCreateActive` ref is set to `true`
4. Page reloads as edit mode → `syncTabFromHash()` opens the Assignment tab
5. `AssignmentTab` mounts with `autoOpenEmployment=true` → the employment modal opens automatically
6. User fills employment → saves → sees the combined view with funding section
7. User can immediately click "Add Allocation" since employment now exists

### 6.2 Key Implementation Detail

The `guidedCreateActive` ref is one-shot — it's set to `true` during the create flow and consumed by AssignmentTab's `onMounted`. It doesn't persist across page reloads (it's an in-memory ref), so:
- Direct navigation to an existing employee's assignment tab will NOT auto-open the modal
- Only the create → redirect flow triggers it
- If the user navigates away and comes back, the modal won't re-open

### 6.3 AssignmentTab Auto-Open Logic

```js
// In AssignmentTab.vue
onMounted(() => {
  if (props.autoOpenEmployment && !props.employee.employment) {
    openAddEmployment()
  }
})
```

This is the only new logic needed. The `openAddEmployment()` function already exists from the EmploymentTab code — it resets the form, sets `employmentModalVisible = true`, and calls `loadDropdownOptions()`.

### 6.4 Success Message After Employment Created

When the employment modal saves successfully during the guided flow (or any time), the success message now reads:

```
"Employment created — you can now add funding allocations"
```

This subtle change guides the user to the next logical step without any extra UI chrome.

---

## 7. Step 4: Backend Transaction Fix

### 7.1 The Problem

`EmployeeDataService::store()` creates an Employee, then creates an EmployeeIdentification. If the second operation fails, the Employee is orphaned in the database with no identification record.

### 7.2 The Fix

File: `app/Services/EmployeeDataService.php`, method `store()` (lines 131-155)

```php
// BEFORE:
public function store(array $validated): Employee
{
    $identificationData = $this->extractIdentificationData($validated);

    $employee = Employee::create($validated);

    if (! empty($identificationData)) {
        $createdBy = $validated['created_by'] ?? auth()->user()->name ?? 'System';
        $identificationData['employee_id'] = $employee->id;
        $identificationData['is_primary'] = true;
        $identificationData['created_by'] = $createdBy;
        $identificationData['updated_by'] = $createdBy;

        foreach (EmployeeIdentification::NAME_FIELDS as $field) {
            $identificationData[$field] = $validated[$field] ?? null;
        }

        EmployeeIdentification::create($identificationData);
    }

    $this->invalidateCache();
    $this->notifyAction('created', $employee);

    return $employee;
}

// AFTER:
public function store(array $validated): Employee
{
    $identificationData = $this->extractIdentificationData($validated);

    $employee = DB::transaction(function () use ($validated, $identificationData) {
        $employee = Employee::create($validated);

        if (! empty($identificationData)) {
            $createdBy = $validated['created_by'] ?? auth()->user()->name ?? 'System';
            $identificationData['employee_id'] = $employee->id;
            $identificationData['is_primary'] = true;
            $identificationData['created_by'] = $createdBy;
            $identificationData['updated_by'] = $createdBy;

            foreach (EmployeeIdentification::NAME_FIELDS as $field) {
                $identificationData[$field] = $validated[$field] ?? null;
            }

            EmployeeIdentification::create($identificationData);
        }

        return $employee;
    });

    $this->invalidateCache();
    $this->notifyAction('created', $employee);

    return $employee;
}
```

**Why `DB::transaction()` closure instead of manual begin/commit?**

The closure form is cleaner and automatically handles rollback on exception. The `invalidateCache()` and `notifyAction()` calls remain outside the transaction because:
1. Cache invalidation should only happen after the transaction commits
2. Notifications should only fire after the data is confirmed persisted
3. If either of those fails, we don't want to roll back the employee creation

**Note**: `DB` is already imported at line 14 of the file (`use Illuminate\Support\Facades\DB`).

---

## 8. Step 5: Cleanup

After the new AssignmentTab is working and verified:

1. **Delete** `src/views/employees/tabs/EmploymentTab.vue`
2. **Delete** `src/views/employees/tabs/FundingTab.vue`
3. **Verify** no other files import these two components:
   - Search for `EmploymentTab` and `FundingTab` across the codebase
   - The only consumer should have been `EmployeeFormView.vue`

Do NOT delete the old files until the new tab is fully tested. Keep them as reference during development.

---

## 9. Testing Checklist

### Employment (from EmploymentTab)

- [ ] **View**: Employment details display correctly when record exists
- [ ] **Create**: "Add Employment" button opens modal, all dropdowns load
- [ ] **Create validation**: Organization, Department, Position, Start Date, Salary required
- [ ] **Edit**: "Edit" button pre-fills modal with existing values
- [ ] **Edit**: Department change resets position/section if now invalid
- [ ] **Delete**: Confirmation dialog, successful deletion refreshes view
- [ ] **Probation dates**: Auto-calculate +3 months from start date
- [ ] **Probation toggle**: "No" clears probation fields, shows "Salary" label instead of "Pass-Probation Salary"
- [ ] **Probation pass/fail**: Buttons appear only when probation not yet completed
- [ ] **Benefits**: Checkboxes and currency fields save correctly

### Funding (from FundingTab)

- [ ] **View**: Funding table shows when allocations exist
- [ ] **FTE badge**: Shows correct total, green at 100%, orange otherwise
- [ ] **No employment**: Shows "No employment record" empty state (not the funding empty state)
- [ ] **No allocations**: Shows "No funding allocations" with "Add Allocation" button
- [ ] **Manage modal**: Opens with existing rows pre-filled
- [ ] **Grant search**: Search by name or code works in dropdown
- [ ] **Position dropdown**: Filters by selected grant
- [ ] **FTE change**: Triggers preview amount calculation
- [ ] **Add/remove rows**: "Add Row" adds, delete removes (with confirmation on last row)
- [ ] **Status toggle**: Switch between active/inactive for existing rows
- [ ] **Save**: Batch update sends correct creates/updates/deletes

### Combined Tab

- [ ] **Merged view**: Employment section appears above funding section with divider
- [ ] **Tab label**: Shows "Employment & Funding" (not "Employment" or "Funding")
- [ ] **Live tab badge**: "Saves per action" badge shows when on this tab
- [ ] **URL hash**: `#assignment` in URL selects this tab

### Guided Create Flow

- [ ] **New employee save**: Redirects to edit mode with `#assignment` hash
- [ ] **Auto-open**: Employment modal opens automatically after redirect
- [ ] **Success message**: Shows "Employee created — now add employment details"
- [ ] **After employment save**: Shows "Employment created — you can now add funding allocations"
- [ ] **No re-trigger**: Navigating away and back does NOT re-open the modal
- [ ] **Direct URL**: Visiting `/employees/123#assignment` does NOT auto-open the modal

### Backend

- [ ] **Transaction**: Create employee with invalid identification data → no orphaned employee record
- [ ] **Happy path**: Create employee with valid data → both employee and identification created
- [ ] **No identification**: Create employee without ID fields → only employee created (no error)

### Permissions

- [ ] **No employment_records create**: "Add Employment" button hidden
- [ ] **No employment_records update**: "Edit" button hidden, probation buttons hidden
- [ ] **No employment_records delete**: "Delete" button hidden
- [ ] **No employee_funding_allocations create**: "Add Allocation" button hidden
- [ ] **No employee_funding_allocations update**: "Manage Allocations" button hidden

### Edge Cases

- [ ] **Employee with employment but no funding**: Funding section shows empty state with "Add Allocation"
- [ ] **Employee with closed allocations**: FTE only counts active, closed allocations shown in table
- [ ] **Probation salary > pass-probation**: Warning shows in modal, save blocked
- [ ] **FTE > 100%**: No hard block (some employees can be over 100% per research doc), but orange badge
- [ ] **Split funding**: Multiple rows with different grants, FTE totals to 100%

---

## 10. Implementation Todo List

### Phase 1: Backend Transaction Fix
> Priority: Do first — independent of frontend, quick win, prevents data integrity issues

- [x] **1.1** Open `app/Services/EmployeeDataService.php`
- [x] **1.2** Wrap the `store()` method body in `DB::transaction()` closure (see Section 7.2 for exact code)
  - Move `Employee::create()` and `EmployeeIdentification::create()` inside the closure
  - Keep `invalidateCache()` and `notifyAction()` outside the closure
  - Return `$employee` from the closure
- [ ] **1.3** Manually test: create employee with valid data → both records created
- [ ] **1.4** Manually test: verify error handling still works (e.g., duplicate staff_id)

### Phase 2: Create AssignmentTab.vue — Template
> Build the merged component's visual structure first

- [x] **2.1** Create file `src/views/employees/tabs/AssignmentTab.vue`
- [x] **2.2** Define `<script setup>` with props (`employee`, `autoOpenEmployment`) and emits (`refresh`)
- [x] **2.3** Build Section 1 template: Employment details display
  - Copy the employment display template from `EmploymentTab.vue` lines 3-56
  - Includes: section header with Edit/Delete buttons, info grid (org, dept, section, position, site, start date, pay method, status), salary section, probation section with pass/fail buttons, benefits section
- [x] **2.4** Build Section 2 template: Funding allocations display
  - Add `<div class="section-divider" />` between sections
  - Copy the funding header with FTE badge and "Manage Allocations" button from `FundingTab.vue` lines 3-15
  - Copy the funding read-only table from `FundingTab.vue` lines 17-46
  - Copy the "no allocations" empty state from `FundingTab.vue` lines 48-52
- [x] **2.5** Build the "no employment" empty state
  - Single `<a-empty>` with message "No employment record" and "Add Employment" button
  - This replaces the separate empty states from both original tabs
- [x] **2.6** Copy Employment Modal template from `EmploymentTab.vue` lines 64-326
  - Assignment section (org, dept, position, section, site)
  - Contract & Probation section (start date, probation toggle, dates)
  - Salary section (probation salary, pass-probation salary)
  - Pay & Benefits section (pay method, checkboxes, study loan, retroactive)
- [x] **2.7** Copy Probation Modal template from `EmploymentTab.vue` lines 329-353
- [x] **2.8** Copy Manage Allocations Modal template from `FundingTab.vue` lines 55-165
  - Header with FTE total badge and "Add Row" button
  - Editable table with grant/position/budgetline/FTE/amount/status/actions columns

### Phase 3: Create AssignmentTab.vue — Script
> Wire up all the reactive state, computed properties, and methods

- [x] **3.1** Add all imports: `vue`, `ant-design-vue`, auth store, API modules, icons, InfoField
- [x] **3.2** Set up permission computeds
  - `canCreateEmployment` → `authStore.canCreate('employment_records')`
  - `canUpdateEmployment` → `authStore.canUpdate('employment_records')`
  - `canDeleteEmployment` → `authStore.canDelete('employment_records')`
  - `canCreateAllocation` → `authStore.canCreate('employee_funding_allocations')`
  - `canUpdateAllocation` → `authStore.canUpdate('employee_funding_allocations')`
- [x] **3.3** Copy employment modal state from `EmploymentTab.vue` lines 382-411
  - `employmentModalVisible`, `editingEmployment`, `savingEmployment`
  - Dropdown option refs: `departmentOptions`, `positionOptions`, `siteOptions`, `sectionDepartmentOptions`, `payMethodOptions`
  - Loading refs: `loadingOptions`, `loadingPayMethods`
  - `empForm` reactive object
- [x] **3.4** Copy employment computed & watchers from `EmploymentTab.vue` lines 413-470
  - `filteredPositions`, `filteredSectionDepartments`, `probationPeriodText`
  - `skipDateAutoFill`, `skipDepartmentReset` refs
  - Three watchers: `empForm.start_date`, `empForm.probation_required`, `empForm.department_id`
- [x] **3.5** Copy probation state from `EmploymentTab.vue` lines 473-480
  - `probationModalVisible`, `savingProbation`, `probationForm` reactive
- [x] **3.6** Copy funding table/state from `FundingTab.vue` lines 188-244
  - Column definitions: `fundingColumns`, `editAllocColumns`
  - Modal state: `allocationModalVisible`, `savingAllocation`, `grantStructure`, `loadingGrantStructure`, `allocRows`
  - Module-level vars: `allocRowKey`, `originalAllocIds`
  - Computed: `totalFte`, `editFteTotal`, `grantOptions`
- [x] **3.7** Add shared helpers
  - `formatDate()`, `formatCurrency()`, `filterOption()`, `showApiError()`, `allocationStatusColor()`
  - Merge the two slightly different `showApiError` implementations (FundingTab's handles array errors, EmploymentTab's doesn't — use FundingTab's version)
- [x] **3.8** Copy employment dropdown loading from `EmploymentTab.vue` lines 508-526
  - `loadDropdownOptions()` — loads depts, positions, sites, section depts, pay methods in parallel
- [x] **3.9** Copy employment CRUD methods from `EmploymentTab.vue` lines 529-657
  - `resetEmpForm()`, `openAddEmployment()`, `openEditEmployment()`
  - `handleSaveEmployment()` — update success message for create: "Employment created — you can now add funding allocations"
  - `confirmDeleteEmployment()` — update confirmation message to mention funding impact
- [x] **3.10** Copy probation methods from `EmploymentTab.vue` lines 660-685
  - `openProbationModal()`, `handleProbationSubmit()`
- [x] **3.11** Copy funding helpers from `FundingTab.vue` lines 259-325
  - `filterGrantOption()`, `getGrantItems()`, `getGrantItemOptions()`, `getRowBudgetLine()`
  - `loadGrantStructureData()`
- [x] **3.12** Copy funding row management from `FundingTab.vue` lines 328-458
  - `makeAllocRow()`, `openManageAllocations()`, `addAllocRow()`, `removeAllocRow()`
  - `onAllocGrantChange()`, `onAllocItemChange()`, `onAllocFteChange()`
  - `fetchPreviewAmount()`, `saveAllocations()`
- [x] **3.13** Add `onMounted` auto-open logic for guided create flow
  - If `props.autoOpenEmployment && !props.employee.employment` → call `openAddEmployment()`

### Phase 4: Create AssignmentTab.vue — Styles
> Merge CSS from both tabs

- [x] **4.1** Copy employment styles from `EmploymentTab.vue` lines 688-790
  - `.section-header`, `.section-title`, `.info-grid`, `.modal-form`, `.form-section-title`
  - `.form-hint`, `.form-warning`, `.field-hint`
  - Probation indicator styles, probation toggle styles, no-probation note
- [x] **4.2** Copy funding styles from `FundingTab.vue` lines 461-515
  - `.fte-summary`, `.fte-hint`, `.cell-sub`
  - `.alloc-modal-header`, `.alloc-edit-table` deep selectors
  - `.grant-option`, `.grant-option-name`, `.grant-option-org`, `.grant-option-code`
- [x] **4.3** Add new `.section-divider` style
- [x] **4.4** Verify no CSS class name conflicts between the two sets of styles

### Phase 5: Modify EmployeeFormView.vue
> Switch from two tabs to one merged tab

- [x] **5.1** Update imports: replace `EmploymentTab` + `FundingTab` imports with single `AssignmentTab` import
- [x] **5.2** Update `allTabs` array: remove `'employment'` and `'funding'`, add `'assignment'`
- [x] **5.3** Update `LIVE_TABS` set: remove `'employment'` and `'funding'`, add `'assignment'`
- [x] **5.4** Add `guidedCreateActive` ref (initialized to `false`)
- [x] **5.5** Replace the two `<a-tab-pane>` elements (keys `employment` and `funding`) with single `<a-tab-pane key="assignment">`
  - Tab label: `"Employment & Funding"`
  - Component: `<AssignmentTab>` with `:employee`, `:auto-open-employment="guidedCreateActive"`, `@refresh`
- [x] **5.6** Modify the create flow in `handleSave()`:
  - Change success message to `"Employee created — now add employment details"`
  - Set `guidedCreateActive.value = true` before `router.replace()`
  - Add `hash: '#assignment'` to the `router.replace()` call

### Phase 6: Smoke Testing
> Verify everything works before cleanup — manual testing required by developer

- [ ] **6.1** Test new employee creation guided flow:
  - Create new employee → verify redirect to `#assignment` tab → verify employment modal auto-opens
  - Fill employment → save → verify funding section appears → add allocation → save
- [ ] **6.2** Test existing employee with employment + funding:
  - Open employee → go to Employment & Funding tab → verify both sections display
  - Edit employment → verify pre-filled values → save → verify refresh
  - Manage allocations → add/remove/modify rows → save → verify refresh
- [ ] **6.3** Test existing employee without employment:
  - Verify "No employment record" empty state shows
  - Click "Add Employment" → verify modal opens
- [ ] **6.4** Test probation flow:
  - Mark as Passed → verify success
  - Mark as Failed (with reason) → verify success
- [ ] **6.5** Test permissions:
  - User without `employment_records` create → "Add Employment" hidden
  - User without `employee_funding_allocations` update → "Manage Allocations" hidden
- [ ] **6.6** Test URL hash navigation:
  - Direct visit to `/employees/123#assignment` → correct tab opens, no auto-modal
  - Tab switching → URL hash updates correctly
- [ ] **6.7** Test backend transaction:
  - Create employee with all fields → verify both employee + identification records exist
  - Verify no orphan records on failure

### Phase 7: Cleanup
> Completed — old files deleted, build verified

- [x] **7.1** Search codebase for remaining imports of `EmploymentTab` and `FundingTab`
  - `grep -r "EmploymentTab\|FundingTab" src/`
  - Should find zero results (only the old files themselves)
- [x] **7.2** Delete `src/views/employees/tabs/EmploymentTab.vue`
- [x] **7.3** Delete `src/views/employees/tabs/FundingTab.vue`
- [x] **7.4** Run `npm run build` to verify no broken imports
- [ ] **7.5** Do one final round of smoke testing after deletion to confirm nothing broke
