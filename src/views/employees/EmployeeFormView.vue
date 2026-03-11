<template>
  <div class="page-container">
    <!-- Back link -->
    <router-link :to="{ name: 'employees' }" class="back-link">
      <ArrowLeftOutlined /> All Employees
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="loading-state"><a-spin size="large" /></div>

    <!-- 404 for existing employee that failed to load -->
    <a-result v-else-if="isEditMode && !employee" status="404" title="Employee not found" sub-title="The employee record could not be loaded.">
      <template #extra>
        <a-button type="primary" @click="$router.push({ name: 'employees' })">Back to Employees</a-button>
      </template>
    </a-result>

    <!-- Main form -->
    <template v-else>
      <!-- Page header bar -->
      <div class="form-header">
        <div class="form-header-left">
          <h2 class="form-title">{{ pageTitle }}</h2>
          <a-tag v-if="isDirty && !isLiveTab" color="orange" class="dirty-tag">Not Saved</a-tag>
          <span v-if="isLiveTab" class="live-tab-badge">
            <DatabaseOutlined />
            Saves per action
          </span>
        </div>
        <div class="form-header-right">
          <a-button
            v-if="isEditMode && authStore.canCreate('transfer')"
            @click="transferModalOpen = true"
          >
            <SwapOutlined /> Transfer
          </a-button>
          <a-button
            v-if="canSave && !isLiveTab"
            type="primary"
            :loading="saving"
            @click="handleSave"
          >
            Save
          </a-button>
        </div>
      </div>

      <!-- Content: tabs + sidebar -->
      <div class="form-body">
        <div class="form-main">
          <a-form :model="form" layout="vertical">
            <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
              <!-- ── Group 1: Form tabs (saved via top Save button) ── -->
              <a-tab-pane key="basic_info" tab="Basic Info">
                <BasicInfoTab :form="form" :readonly="!canSave" />
              </a-tab-pane>
              <a-tab-pane key="identification" tab="Identification">
                <IdentificationTab
                  :form="form"
                  :readonly="!canSave"
                  :employee="employee"
                  :is-edit-mode="isEditMode"
                  @refresh="loadEmployee"
                />
              </a-tab-pane>
              <a-tab-pane key="contact_family" tab="Contact & Family">
                <ContactFamilyTab :form="form" :readonly="!canSave" />
              </a-tab-pane>
              <a-tab-pane key="financial" tab="Financial">
                <FinancialTab :form="form" :readonly="!canSave" />
              </a-tab-pane>

              <!-- ── Divider (decorative separator between the two tab groups) ── -->
              <a-tab-pane v-if="isEditMode" key="__divider__" disabled>
                <template #tab>
                  <span class="tab-group-divider" @click.stop.prevent />
                </template>
              </a-tab-pane>

              <!-- ── Group 2: Live tabs (each saves independently per action) ── -->
              <a-tab-pane v-if="isEditMode" key="leave">
                <template #tab>
                  <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
                    <span class="live-tab-label">Leave Balances</span>
                  </a-tooltip>
                </template>
                <LeaveTab :employee="employee" />
              </a-tab-pane>
              <a-tab-pane v-if="isEditMode" key="records">
                <template #tab>
                  <a-tooltip title="Saves immediately per action — not affected by the Save button" placement="bottom">
                    <span class="live-tab-label">Records</span>
                  </a-tooltip>
                </template>
                <RecordsTab :employee="employee" @refresh="loadEmployee" />
              </a-tab-pane>
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
            </a-tabs>
          </a-form>
        </div>

        <!-- Right sidebar -->
        <EmployeeSidebar
          :form="form"
          :employee="employee"
          :can-upload="isEditMode && canSave"
          @upload="handleProfileUpload"
        />
      </div>

      <!-- Activity Log (only for existing employees) -->
      <ActivityTimeline
        v-if="isEditMode && employee"
        subject-type="employee"
        :subject-id="employee.id"
      />

      <!-- Transfer Modal -->
      <TransferModal
        v-model:open="transferModalOpen"
        :employee="employee"
        @transferred="loadEmployee"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { createVNode } from 'vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { employeeApi } from '@/api'
import { ArrowLeftOutlined, DatabaseOutlined, SwapOutlined } from '@ant-design/icons-vue'

import ActivityTimeline from '@/components/ActivityTimeline.vue'
import EmployeeSidebar from './components/EmployeeSidebar.vue'
import TransferModal from './components/TransferModal.vue'
import BasicInfoTab from './tabs/BasicInfoTab.vue'
import IdentificationTab from './tabs/IdentificationTab.vue'
import ContactFamilyTab from './tabs/ContactFamilyTab.vue'
import FinancialTab from './tabs/FinancialTab.vue'
import EmploymentTab from './tabs/EmploymentTab.vue'
import FundingTab from './tabs/FundingTab.vue'
import LeaveTab from './tabs/LeaveTab.vue'
import RecordsTab from './tabs/RecordsTab.vue'

const dayjs = inject('$dayjs')
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

// ======================== Core State ========================
const employee = ref(null)
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic_info')

const transferModalOpen = ref(false)
const isEditMode = computed(() => !!route.params.id)
const canSave = computed(() => isEditMode.value ? authStore.canUpdate('employees') : authStore.canCreate('employees'))

const allTabs = ['basic_info', 'identification', 'contact_family', 'financial', 'leave', 'records', 'employment', 'funding']

// Tabs that manage their own data — the top Save button is irrelevant for these
const LIVE_TABS = new Set(['leave', 'records', 'employment', 'funding'])
const isLiveTab = computed(() => LIVE_TABS.has(activeTab.value))

// ======================== Form ========================
const defaultFormValues = {
  staff_id: '', first_name_en: '', gender: undefined,
  date_of_birth: null, status: undefined,
  initial_en: '', initial_th: '', last_name_en: '', first_name_th: '', last_name_th: '',
  nationality: '', religion: '', military_status: undefined, marital_status: undefined,
  identification_type: undefined, identification_number: '',
  identification_issue_date: null, identification_expiry_date: null,
  social_security_number: '', tax_number: '', driver_license_number: '',
  mobile_phone: '', permanent_address: '', current_address: '',
  spouse_name: '', spouse_phone_number: '',
  father_name: '', father_occupation: '', father_phone_number: '',
  mother_name: '', mother_occupation: '', mother_phone_number: '',
  emergency_contact_person_name: '', emergency_contact_person_relationship: '', emergency_contact_person_phone: '',
  bank_name: '', bank_branch: '', bank_account_name: '', bank_account_number: '',
  remark: '',
}

const form = reactive({ ...defaultFormValues })
const savedSnapshot = ref(JSON.stringify(defaultFormValues))

const isDirty = computed(() => JSON.stringify(form) !== savedSnapshot.value)

// ======================== Page Title ========================
const pageTitle = computed(() => {
  if (!isEditMode.value) return 'New Employee'
  const parts = [form.initial_en, form.first_name_en, form.last_name_en]
  return parts.filter(Boolean).join(' ') || 'Employee'
})

// ======================== URL Hash Sync ========================
function syncTabFromHash() {
  const hash = route.hash?.replace('#', '')
  if (hash && allTabs.includes(hash)) {
    // For new employees, only allow tabs 1-4
    if (!isEditMode.value && allTabs.indexOf(hash) > 3) return
    activeTab.value = hash
  }
}

function onTabChange(key) {
  router.replace({ hash: `#${key}` })
}

watch(() => route.hash, syncTabFromHash)

// ======================== Dirty Guard ========================
onBeforeRouteLeave((_to, _from, next) => {
  // Only warn when there are unsaved form-tab changes (live tabs save per action)
  if (isDirty.value && !isLiveTab.value) {
    Modal.confirm({
      title: 'Unsaved Changes',
      icon: createVNode(ExclamationCircleOutlined),
      content: 'You have unsaved changes. Are you sure you want to leave this page?',
      okText: 'Leave',
      okType: 'danger',
      cancelText: 'Stay',
      onOk() { next() },
      onCancel() { next(false) },
    })
  } else {
    next()
  }
})

function onBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// ======================== Ctrl+S ========================
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isDirty.value && canSave.value) handleSave()
  }
}

// ======================== Load Employee ========================
function populateFormFromEmployee(emp) {
  const fields = Object.keys(defaultFormValues)
  for (const key of fields) {
    const val = emp[key]
    if (val != null) {
      form[key] = val
    } else {
      // Reset to default for empty fields
      form[key] = defaultFormValues[key]
    }
  }
  takeSnapshot()
}

function takeSnapshot() {
  savedSnapshot.value = JSON.stringify(form)
}

async function loadEmployee() {
  if (!isEditMode.value) return
  loading.value = true
  try {
    const { data } = await employeeApi.show(route.params.id)
    employee.value = data.data
    populateFormFromEmployee(employee.value)
    const name = employee.value ? `${employee.value.first_name_en} ${employee.value.last_name_en || ''}`.trim() : 'Employee'
    appStore.setPageMeta(name)
  } catch {
    employee.value = null
  }
  loading.value = false
}

// ======================== Save ========================
const IDENTIFICATION_FIELDS = new Set([
  'identification_type', 'identification_number',
  'identification_issue_date', 'identification_expiry_date',
])

function buildPayload() {
  const payload = {}
  for (const [key, val] of Object.entries(form)) {
    if (isEditMode.value && IDENTIFICATION_FIELDS.has(key)) continue
    if (val !== '' && val !== undefined && val !== null) {
      payload[key] = val
    }
  }
  return payload
}

function validateForm() {
  if (!form.staff_id) { activeTab.value = 'basic_info'; message.warning('Staff ID is required'); return false }
  if (!form.first_name_en) { activeTab.value = 'basic_info'; message.warning('First Name (EN) is required'); return false }
  if (!form.gender) { activeTab.value = 'basic_info'; message.warning('Gender is required'); return false }
  if (!form.date_of_birth) { activeTab.value = 'basic_info'; message.warning('Date of Birth is required'); return false }
  if (!form.status) { activeTab.value = 'basic_info'; message.warning('Status is required'); return false }

  if (form.identification_type && !form.identification_number) {
    activeTab.value = 'identification'
    message.warning('ID Number is required when ID Type is selected')
    return false
  }
  return true
}

async function handleSave() {
  if (!validateForm()) return

  saving.value = true
  try {
    if (isEditMode.value) {
      await employeeApi.update(route.params.id, buildPayload())
      message.success('Employee updated')
      await loadEmployee()
    } else {
      const { data } = await employeeApi.store(buildPayload())
      message.success('Employee created')
      takeSnapshot()
      const newId = data.data?.id || data.id
      router.replace({ name: 'employee-detail', params: { id: newId } })
    }
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to save employee')
    }
  }
  saving.value = false
}

// ======================== Profile Picture ========================
async function handleProfileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return message.warning('Please select an image file')
  if (file.size > 2 * 1024 * 1024) return message.warning('Image must be under 2MB')

  const formData = new FormData()
  formData.append('profile_picture', file)
  try {
    await employeeApi.uploadProfilePicture(route.params.id, formData)
    message.success('Profile picture updated')
    loadEmployee()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to upload picture')
  }
  event.target.value = ''
}

// ======================== Init ========================
onMounted(() => {
  if (isEditMode.value) {
    loadEmployee()
  } else {
    appStore.setPageMeta('New Employee')
  }
  syncTabFromHash()
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: 16px;
}
.back-link:hover { color: var(--color-text); }

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* Header bar */
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}
.form-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.form-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}
.dirty-tag {
  font-size: 12px;
}
.live-tab-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}

/* Body: tabs + sidebar */
.form-body {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
@media (min-width: 1024px) {
  .form-body {
    flex-direction: row;
  }
}
.form-main {
  flex: 1;
  min-width: 0;
  padding: 0 20px;
}
.form-main :deep(.ant-tabs-nav) { margin-bottom: 0; }
.form-main :deep(.ant-tabs-content-holder) { padding: 20px 0; }

/* Tab group separator — vertical rule between form tabs and live tabs */
.tab-group-divider {
  display: inline-block;
  width: 1px;
  height: 14px;
  background: var(--color-border);
  margin: 0 2px;
  vertical-align: middle;
  pointer-events: none;
}

/* Live tab labels — slightly muted to hint they're a different group */
.live-tab-label {
  color: var(--color-text-secondary);
}
.form-main :deep(.ant-tabs-tab-active) .live-tab-label {
  color: var(--color-primary);
}

</style>
