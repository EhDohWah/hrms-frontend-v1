<template>
  <div>
    <!-- ============ Section 1: Identification Documents ============ -->

    <!-- Edit mode: table + CRUD -->
    <template v-if="isEditMode">
      <div class="section-header">
        <div class="section-title" style="margin: 0; border: none; padding: 0;">Identification Documents</div>
        <a-button v-if="canCreate" size="small" @click="openModal()">
          <PlusOutlined /> Add
        </a-button>
      </div>

      <a-table
        v-if="identifications.length"
        :columns="columns"
        :data-source="identifications"
        :row-key="(r) => r.id"
        :pagination="false"
        :loading="loadingIdentifications"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'identification_type'">
            {{ idTypeLabel(record.identification_type) }}
            <a-tag v-if="record.is_primary" color="blue" style="margin-left: 6px;">Primary</a-tag>
          </template>
          <template v-else-if="column.key === 'name'">
            {{ [record.first_name_en, record.last_name_en].filter(Boolean).join(' ') || '—' }}
          </template>
          <template v-else-if="column.key === 'identification_issue_date'">
            {{ formatDate(record.identification_issue_date) }}
          </template>
          <template v-else-if="column.key === 'identification_expiry_date'">
            {{ formatDate(record.identification_expiry_date) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip v-if="canUpdate && !record.is_primary" title="Set as primary">
                <a-button type="link" size="small" @click="handleSetPrimary(record)"><StarOutlined /></a-button>
              </a-tooltip>
              <a-button v-if="canUpdate" type="link" size="small" @click="openModal(record)"><EditOutlined /></a-button>
              <a-button v-if="canDelete" type="link" size="small" danger @click="confirmDelete(record)"><DeleteOutlined /></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-empty v-else description="No identification documents" />
    </template>

    <!-- Readonly mode: InfoField display of primary identification -->
    <template v-else-if="readonly">
      <div class="section-title">Identification</div>
      <div class="info-grid">
        <InfoField label="ID Type" :value="idTypeLabel(form.identification_type)" />
        <InfoField label="ID Number" :value="form.identification_number" mono />
        <InfoField label="Issue Date" :value="formatDate(form.identification_issue_date)" />
        <InfoField label="Expiry Date" :value="formatDate(form.identification_expiry_date)" />
      </div>
    </template>

    <!-- Create mode: inline form fields -->
    <template v-else>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Identification Type">
            <a-select v-model:value="form.identification_type" placeholder="Select ID type" allow-clear>
              <a-select-option v-for="opt in idTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Identification Number" :required="!!form.identification_type">
            <a-input v-model:value="form.identification_number" placeholder="ID number" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Issue Date">
            <a-date-picker
              v-model:value="form.identification_issue_date"
              style="width: 100%"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              placeholder="DD/MM/YYYY"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Expiry Date">
            <a-date-picker
              v-model:value="form.identification_expiry_date"
              style="width: 100%"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              placeholder="DD/MM/YYYY"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </template>

    <!-- Divider between sections (edit mode only) -->
    <a-divider v-if="isEditMode" style="margin: 24px 0 16px;" />

    <!-- ============ Section 2: Tax & License ============ -->
    <template v-if="!readonly">
      <div class="section-title" :style="isEditMode ? '' : 'margin-top: 24px;'">Tax & License</div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Social Security No.">
            <a-input v-model:value="form.social_security_number" placeholder="SSN" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Tax Number">
            <a-input v-model:value="form.tax_number" placeholder="Tax ID" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Driver License No.">
            <a-input v-model:value="form.driver_license_number" placeholder="License number" />
          </a-form-item>
        </a-col>
      </a-row>
    </template>
    <template v-else>
      <div class="section-title">Tax & License</div>
      <div class="info-grid">
        <InfoField label="Social Security No." :value="form.social_security_number" mono />
        <InfoField label="Tax Number" :value="form.tax_number" mono />
        <InfoField label="Driver License" :value="form.driver_license_number" mono />
      </div>
    </template>

    <!-- ============ Add/Edit Identification Modal ============ -->
    <a-modal
      v-model:open="modal.visible"
      :title="modal.editing ? 'Edit Identification' : 'Add Identification'"
      @ok="handleSave"
      :confirm-loading="modal.saving"
      :width="'min(95vw, 640px)'"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
    >
      <a-form layout="vertical" class="modal-form">
        <div class="form-section-title">Document Details</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Identification Type" required>
              <a-select v-model:value="modal.form.identification_type" placeholder="Select ID type">
                <a-select-option v-for="opt in idTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Identification Number" required>
              <a-input v-model:value="modal.form.identification_number" placeholder="ID number" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Issue Date">
              <a-date-picker
                v-model:value="modal.form.identification_issue_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Expiry Date">
              <a-date-picker
                v-model:value="modal.form.identification_expiry_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="form-section-title">Name on Document</div>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Initial (EN)">
              <a-input v-model:value="modal.form.initial_en" placeholder="e.g. Mr" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="First Name (EN)">
              <a-input v-model:value="modal.form.first_name_en" placeholder="First name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Last Name (EN)">
              <a-input v-model:value="modal.form.last_name_en" placeholder="Last name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Initial (TH)">
              <a-input v-model:value="modal.form.initial_th" placeholder="e.g. นาย" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="First Name (TH)">
              <a-input v-model:value="modal.form.first_name_th" placeholder="ชื่อ" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Last Name (TH)">
              <a-input v-model:value="modal.form.last_name_th" placeholder="นามสกุล" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Notes" style="margin-top: 8px;">
          <a-textarea v-model:value="modal.form.notes" placeholder="Optional notes about this document" :rows="2" :maxlength="1000" show-count />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employeeIdentificationApi } from '@/api'
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  employee: { type: Object, default: null },
  isEditMode: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])

const canCreate = computed(() => authStore.canCreate('employees'))
const canUpdate = computed(() => authStore.canUpdate('employees'))
const canDelete = computed(() => authStore.canDelete('employees'))

// ======================== Identification Data ========================
const identifications = ref([])
const loadingIdentifications = ref(false)

async function loadIdentifications() {
  if (!props.employee?.id) return
  loadingIdentifications.value = true
  try {
    const { data } = await employeeIdentificationApi.list({ employee_id: props.employee.id })
    identifications.value = data.data || []
  } catch { /* silent */ }
  loadingIdentifications.value = false
}

watch(() => props.employee?.id, (id) => {
  if (id) loadIdentifications()
}, { immediate: true })

// ======================== Constants ========================
const idTypeOptions = [
  { value: 'ThaiID', label: 'Thai ID' },
  { value: 'Passport', label: 'Passport' },
  { value: 'BurmeseID', label: 'Burmese ID' },
  { value: '10YearsID', label: '10 Years ID' },
  { value: 'CI', label: 'CI' },
  { value: 'Borderpass', label: 'Border Pass' },
  { value: 'Other', label: 'Other' },
]

const idTypeLabelMap = Object.fromEntries(idTypeOptions.map(o => [o.value, o.label]))

// ======================== Table Columns ========================
const showActions = computed(() => canUpdate.value || canDelete.value)

const columns = computed(() => {
  const cols = [
    { title: 'Type', key: 'identification_type', width: 180 },
    { title: 'Number', dataIndex: 'identification_number', width: 160 },
    { title: 'Name (EN)', key: 'name' },
    { title: 'Issue Date', key: 'identification_issue_date', width: 120 },
    { title: 'Expiry Date', key: 'identification_expiry_date', width: 120 },
  ]
  if (showActions.value) cols.push({ title: '', key: 'actions', width: 120, align: 'right' })
  return cols
})

// ======================== Helpers ========================
function idTypeLabel(val) {
  return val ? (idTypeLabelMap[val] || val) : null
}

function formatDate(date) {
  return date ? dayjs(date).format('DD MMM YYYY') : null
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  if (resp?.errors) {
    const firstErr = Object.values(resp.errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

// ======================== Modal ========================
const defaultModalForm = {
  identification_type: undefined,
  identification_number: '',
  identification_issue_date: null,
  identification_expiry_date: null,
  first_name_en: '',
  last_name_en: '',
  first_name_th: '',
  last_name_th: '',
  initial_en: '',
  initial_th: '',
  notes: '',
}

const modal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { ...defaultModalForm },
})

function openModal(record) {
  if (record) {
    modal.editing = record
    Object.keys(defaultModalForm).forEach(key => {
      modal.form[key] = record[key] || defaultModalForm[key]
    })
  } else {
    modal.editing = null
    Object.assign(modal.form, { ...defaultModalForm })
    // Pre-fill name fields from employee's current working name
    if (props.employee) {
      modal.form.first_name_en = props.employee.first_name_en || ''
      modal.form.last_name_en = props.employee.last_name_en || ''
      modal.form.first_name_th = props.employee.first_name_th || ''
      modal.form.last_name_th = props.employee.last_name_th || ''
      modal.form.initial_en = props.employee.initial_en || ''
      modal.form.initial_th = props.employee.initial_th || ''
    }
  }
  modal.visible = true
}

async function handleSave() {
  if (!modal.form.identification_type) return message.warning('Identification Type is required')
  if (!modal.form.identification_number) return message.warning('Identification Number is required')

  modal.saving = true
  try {
    if (modal.editing) {
      await employeeIdentificationApi.update(modal.editing.id, { ...modal.form })
      message.success('Identification updated')
    } else {
      await employeeIdentificationApi.store({
        ...modal.form,
        employee_id: props.employee.id,
      })
      message.success('Identification added')
    }
    modal.visible = false
    loadIdentifications()
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save identification')
  }
  modal.saving = false
}

// ======================== Set Primary ========================
async function handleSetPrimary(record) {
  try {
    await employeeIdentificationApi.setPrimary(record.id)
    message.success('Primary identification updated')
    loadIdentifications()
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to set primary')
  }
}

// ======================== Delete ========================
function confirmDelete(record) {
  Modal.confirm({
    title: 'Delete Identification',
    content: record.is_primary
      ? 'This is the primary identification. Deleting it will promote another record as primary. Continue?'
      : 'Are you sure you want to delete this identification?',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await employeeIdentificationApi.destroy(record.id)
        message.success('Identification deleted')
        loadIdentifications()
        emit('refresh')
      } catch (err) {
        showApiError(err, 'Failed to delete identification')
      }
    },
  })
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
</style>
