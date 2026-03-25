<template>
  <div class="page-container">
    <a-spin :spinning="loading">
      <!-- Header -->
      <div class="detail-header">
        <div>
          <a-button type="text" @click="$router.push({ name: 'training' })">
            <ArrowLeftOutlined /> Back to Training
          </a-button>
          <h2 class="detail-title" v-if="training">{{ training.title }}</h2>
        </div>
        <a-space v-if="training && authStore.canUpdate('training_list')">
          <a-button @click="openEditTraining">Edit Training</a-button>
        </a-space>
      </div>

      <template v-if="training">
        <!-- Info Cards -->
        <a-row :gutter="[16, 16]" class="info-row">
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <div class="stat-label">Organizer</div>
              <div class="stat-value">{{ training.organizer || '—' }}</div>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="Start Date" :value="formatDate(training.start_date)" />
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="End Date" :value="formatDate(training.end_date)" />
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="Enrolled" :value="attendees.length" />
            </a-card>
          </a-col>
        </a-row>

        <!-- Attendance Table -->
        <a-card title="Attendance" :body-style="{ padding: 0 }">
          <template #extra>
            <a-space>
              <a-select
                v-model:value="statusFilter"
                placeholder="Filter status"
                allow-clear
                style="width: 150px"
                @change="fetchAttendance"
              >
                <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
              <a-button v-if="authStore.canCreate('employee_training')" size="small" type="primary" @click="openEnroll">
                <PlusOutlined /> Enroll Employee
              </a-button>
            </a-space>
          </template>
          <a-table
            :columns="attendanceColumns"
            :data-source="attendees"
            :loading="attendanceLoading"
            :row-key="(r) => r.id"
            :pagination="false"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'employee'">
                <div class="cell-employee">
                  <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
                  <span class="cell-sub font-mono">{{ record.employee?.staff_id }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getEnrollmentStatusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'enrolled_at'">
                {{ formatDate(record.created_at) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button v-if="authStore.canUpdate('employee_training')" size="small" type="link" @click="openEditEnrollment(record)">Edit</a-button>
                  <a-button v-if="authStore.canDelete('employee_training')" size="small" type="link" danger @click="handleDeleteEnrollment(record)">Remove</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </template>
    </a-spin>

    <!-- Edit Training Modal -->
    <a-modal
      v-model:open="trainingModalVisible"
      title="Edit Training"
      @ok="handleSaveTraining"
      :confirm-loading="savingTraining"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="trainingForm" layout="vertical" class="modal-form">
        <a-form-item label="Title" required>
          <a-input v-model:value="trainingForm.title" placeholder="Enter training title" />
        </a-form-item>
        <a-form-item label="Organizer" required>
          <a-input v-model:value="trainingForm.organizer" placeholder="Enter organizer name" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date" required>
              <a-date-picker v-model:value="trainingForm.start_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date" required>
              <a-date-picker v-model:value="trainingForm.end_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Enroll / Edit Enrollment Modal -->
    <a-modal
      v-model:open="enrollModalVisible"
      :title="editingEnrollment ? 'Edit Enrollment' : 'Enroll Employee'"
      @ok="handleSaveEnrollment"
      :confirm-loading="savingEnrollment"
      :width="'min(95vw, 480px)'"
    >
      <a-form :model="enrollForm" layout="vertical" class="modal-form">
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="enrollForm.employee_id"
            show-search
            :filter-option="false"
            placeholder="Search by name or staff ID..."
            :disabled="!!editingEnrollment"
            :loading="employeeSearching"
            :not-found-content="employeeSearching ? undefined : null"
            @search="handleEmployeeSearch"
          >
            <a-select-option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">
              {{ emp.first_name_en }} {{ emp.last_name_en || '' }}
              <span class="font-mono" style="color: var(--color-text-muted);">({{ emp.staff_id }})</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Status" required>
          <a-select v-model:value="enrollForm.status" placeholder="Select status">
            <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { trainingApi, employeeTrainingApi, employeeApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { ENROLLMENT_STATUSES, getEnrollmentStatusColor } from '@/constants/training'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const training = ref(null)
const loading = ref(false)

// Attendance
const attendees = ref([])
const attendanceLoading = ref(false)
const statusFilter = ref(undefined)

// Training edit
const trainingModalVisible = ref(false)
const savingTraining = ref(false)
const trainingForm = reactive({ title: '', organizer: '', start_date: null, end_date: null })

// Enrollment
const enrollModalVisible = ref(false)
const savingEnrollment = ref(false)
const editingEnrollment = ref(null)
const enrollForm = reactive({ employee_id: undefined, status: 'Pending' })
const employeeOptions = ref([])
const employeeSearching = ref(false)
let employeeSearchTimer = null

const attendanceColumns = [
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Status', key: 'status', width: 130, align: 'center' },
  { title: 'Enrolled On', key: 'enrolled_at', width: 150 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

async function fetchTraining() {
  loading.value = true
  try {
    const { data } = await trainingApi.show(route.params.id)
    training.value = data.data || data
    appStore.setPageMeta(`Training: ${training.value.title}`)
  } catch {
    message.error('Failed to load training')
    router.push({ name: 'training' })
  } finally {
    loading.value = false
  }
}

async function fetchAttendance() {
  attendanceLoading.value = true
  try {
    const params = cleanParams({ status_filter: statusFilter.value || null })
    const { data } = await employeeTrainingApi.attendanceList(route.params.id, params)
    attendees.value = data.data?.attendees || data.attendees || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load attendance')
  } finally {
    attendanceLoading.value = false
  }
}

// ---- Training Edit ----
function openEditTraining() {
  const t = training.value
  Object.assign(trainingForm, {
    title: t.title || '',
    organizer: t.organizer || '',
    start_date: t.start_date || null,
    end_date: t.end_date || null,
  })
  trainingModalVisible.value = true
}

async function handleSaveTraining() {
  if (!trainingForm.title) return message.warning('Title is required')
  if (!trainingForm.organizer) return message.warning('Organizer is required')
  savingTraining.value = true
  try {
    const payload = cleanParams({ ...trainingForm })
    await trainingApi.update(route.params.id, payload)
    message.success('Training updated')
    trainingModalVisible.value = false
    fetchTraining()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to update')
  } finally {
    savingTraining.value = false
  }
}

// ---- Enrollment CRUD ----
function handleEmployeeSearch(val) {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!val || val.length < 2) {
    employeeOptions.value = []
    return
  }
  employeeSearching.value = true
  employeeSearchTimer = setTimeout(async () => {
    try {
      const { data } = await employeeApi.list({ search: val, per_page: 10 })
      employeeOptions.value = data.data?.data || data.data || []
    } catch { /* ignore */ }
    employeeSearching.value = false
  }, 300)
}

function resetEnrollForm() {
  Object.assign(enrollForm, { employee_id: undefined, status: 'Pending' })
  employeeOptions.value = []
}

function openEnroll() {
  editingEnrollment.value = null
  resetEnrollForm()
  enrollModalVisible.value = true
}

function openEditEnrollment(record) {
  editingEnrollment.value = record
  if (record.employee) {
    employeeOptions.value = [{
      id: record.employee_id,
      staff_id: record.employee.staff_id,
      first_name_en: record.employee.first_name_en,
      last_name_en: record.employee.last_name_en,
    }]
  }
  Object.assign(enrollForm, {
    employee_id: record.employee_id || undefined,
    status: record.status || 'Pending',
  })
  enrollModalVisible.value = true
}

async function handleSaveEnrollment() {
  if (!enrollForm.employee_id) return message.warning('Please select an employee')
  if (!enrollForm.status) return message.warning('Status is required')
  savingEnrollment.value = true
  try {
    if (editingEnrollment.value) {
      await employeeTrainingApi.update(editingEnrollment.value.id, { status: enrollForm.status })
      message.success('Enrollment updated')
    } else {
      await employeeTrainingApi.store({
        employee_id: enrollForm.employee_id,
        training_id: Number(route.params.id),
        status: enrollForm.status,
      })
      message.success('Employee enrolled')
    }
    enrollModalVisible.value = false
    fetchAttendance()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save enrollment')
  } finally {
    savingEnrollment.value = false
  }
}

function handleDeleteEnrollment(record) {
  const name = `${record.employee?.first_name_en || ''} ${record.employee?.last_name_en || ''}`.trim()
  Modal.confirm({
    title: 'Remove Enrollment',
    content: `Are you sure you want to remove ${name || 'this employee'} from this training?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await employeeTrainingApi.destroy(record.id)
        message.success('Enrollment removed')
        fetchAttendance()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to remove enrollment')
      }
    },
  })
}

onMounted(async () => {
  appStore.setPageMeta('Training Detail')
  await fetchTraining()
  if (training.value) fetchAttendance()
})

onUnmounted(() => {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
})
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.detail-title {
  font-size: 20px;
  font-weight: 700;
  margin: 8px 0 0;
}
.info-row { margin-bottom: 16px; }
.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}
.stat-value {
  font-size: 16px;
  font-weight: 600;
}
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 14px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
