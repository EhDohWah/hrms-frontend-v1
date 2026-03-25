<template>
  <div>
    <!-- ============ Education ============ -->
    <div class="section-header">
      <div class="section-title">Education</div>
      <a-button v-if="canCreate" size="small" @click="openEducationModal()">
        <PlusOutlined /> Add
      </a-button>
    </div>
    <a-table
      v-if="employee.employee_education?.length"
      :columns="educationColumns"
      :data-source="employee.employee_education"
      :row-key="(r) => r.id"
      :pagination="false"
      size="small"
      style="margin-bottom: 24px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'start_date'">
          {{ formatDate(record.start_date) }}
        </template>
        <template v-else-if="column.key === 'end_date'">
          {{ formatDate(record.end_date) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button v-if="canUpdate" type="link" size="small" @click="openEducationModal(record)"><EditOutlined /></a-button>
            <a-button v-if="canDelete" type="link" size="small" danger @click="confirmDelete('education', record)"><DeleteOutlined /></a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="No education records" style="margin-bottom: 24px;" />

    <!-- ============ Children ============ -->
    <div class="section-header">
      <div class="section-title">Children</div>
      <a-button v-if="canCreate" size="small" @click="openChildModal()">
        <PlusOutlined /> Add
      </a-button>
    </div>
    <a-table
      v-if="employee.employee_children?.length"
      :columns="childrenColumns"
      :data-source="employee.employee_children"
      :row-key="(r) => r.id"
      :pagination="false"
      size="small"
      style="margin-bottom: 24px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'date_of_birth'">
          {{ formatDate(record.date_of_birth) }}
        </template>
        <template v-else-if="column.key === 'gender'">
          {{ genderLabel(record.gender) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button v-if="canUpdate" type="link" size="small" @click="openChildModal(record)"><EditOutlined /></a-button>
            <a-button v-if="canDelete" type="link" size="small" danger @click="confirmDelete('child', record)"><DeleteOutlined /></a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="No children records" style="margin-bottom: 24px;" />

    <!-- ============ Languages ============ -->
    <div class="section-header">
      <div class="section-title">Languages</div>
      <a-button v-if="canCreate" size="small" @click="openLanguageModal()">
        <PlusOutlined /> Add
      </a-button>
    </div>
    <template v-if="employee.employee_languages?.length">
      <a-space wrap style="margin-bottom: 24px;">
        <a-tag
          v-for="lang in employee.employee_languages"
          :key="lang.id"
          color="blue"
          :closable="canDelete"
          @close.prevent="confirmDelete('language', lang)"
        >
          {{ lang.language || lang.name }}
          <template v-if="lang.proficiency_level"> ({{ lang.proficiency_level }})</template>
        </a-tag>
      </a-space>
    </template>
    <a-empty v-else description="No language records" style="margin-bottom: 24px;" />

    <!-- ============ Beneficiaries ============ -->
    <div class="section-header">
      <div class="section-title">Beneficiaries</div>
      <a-button v-if="canCreate" size="small" @click="openBeneficiaryModal()">
        <PlusOutlined /> Add
      </a-button>
    </div>
    <a-table
      v-if="employee.employee_beneficiaries?.length"
      :columns="beneficiaryColumns"
      :data-source="employee.employee_beneficiaries"
      :row-key="(r) => r.id"
      :pagination="false"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button v-if="canUpdate" type="link" size="small" @click="openBeneficiaryModal(record)"><EditOutlined /></a-button>
            <a-button v-if="canDelete" type="link" size="small" danger @click="confirmDelete('beneficiary', record)"><DeleteOutlined /></a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="No beneficiaries" />

    <!-- ============ Education Modal ============ -->
    <a-modal
      v-model:open="eduModal.visible"
      :title="eduModal.editing ? 'Edit Education' : 'Add Education'"
      @ok="saveEducation"
      :confirm-loading="eduModal.saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="School Name" required>
              <a-input v-model:value="eduModal.form.school_name" placeholder="School / University" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Degree" required>
              <a-select
                v-model:value="eduModal.form.degree"
                placeholder="Select degree"
                allow-clear
                show-search
                :options="educationOptions"
                :loading="loadingLookups"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date" required>
              <a-date-picker
                v-model:value="eduModal.form.start_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date" required>
              <a-date-picker
                v-model:value="eduModal.form.end_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- ============ Child Modal ============ -->
    <a-modal
      v-model:open="childModal.visible"
      :title="childModal.editing ? 'Edit Child' : 'Add Child'"
      @ok="saveChild"
      :confirm-loading="childModal.saving"
      :width="'min(95vw, 480px)'"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="Name" required>
          <a-input v-model:value="childModal.form.name" placeholder="Child's full name" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Date of Birth" required>
              <a-date-picker
                v-model:value="childModal.form.date_of_birth"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Gender">
              <a-select
                v-model:value="childModal.form.gender"
                placeholder="Select"
                allow-clear
                :options="genderOptions"
                :loading="loadingLookups"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- ============ Language Modal ============ -->
    <a-modal
      v-model:open="langModal.visible"
      :title="langModal.editing ? 'Edit Language' : 'Add Language'"
      @ok="saveLanguage"
      :confirm-loading="langModal.saving"
      :width="'min(95vw, 420px)'"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="Language" required>
          <a-select
            v-model:value="langModal.form.language"
            placeholder="Select language"
            allow-clear
            show-search
            :options="languageOptions"
            :loading="loadingLookups"
          />
        </a-form-item>
        <a-form-item label="Proficiency Level" required>
          <a-select v-model:value="langModal.form.proficiency_level" placeholder="Select level">
            <a-select-option value="Basic">Basic</a-select-option>
            <a-select-option value="Conversational">Conversational</a-select-option>
            <a-select-option value="Fluent">Fluent</a-select-option>
            <a-select-option value="Native">Native</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ============ Beneficiary Modal ============ -->
    <a-modal
      v-model:open="beneModal.visible"
      :title="beneModal.editing ? 'Edit Beneficiary' : 'Add Beneficiary'"
      @ok="saveBeneficiary"
      :confirm-loading="beneModal.saving"
      :width="'min(95vw, 480px)'"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="Name" required>
          <a-input v-model:value="beneModal.form.beneficiary_name" placeholder="Full name" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Relationship" required>
              <a-input v-model:value="beneModal.form.beneficiary_relationship" placeholder="e.g. Spouse, Child" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Phone">
              <a-input v-model:value="beneModal.form.phone_number" placeholder="Phone number" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import {
  employeeEducationApi,
  employeeChildApi,
  employeeLanguageApi,
  employeeBeneficiaryApi,
  lookupApi,
} from '@/api'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { formatDate, genderLabel } from '@/utils/formatters'

const authStore = useAuthStore()

// ======================== Lookup Options ========================
const educationOptions = ref([])
const languageOptions = ref([])
const genderOptions = ref([])
const loadingLookups = ref(false)

const genderLabelMap = { M: 'Male', F: 'Female' }

onMounted(async () => {
  loadingLookups.value = true
  try {
    const [eduRes, langRes, genderRes] = await Promise.all([
      lookupApi.byType('employee_education'),
      lookupApi.byType('employee_language'),
      lookupApi.byType('gender'),
    ])
    educationOptions.value = (eduRes.data?.data || []).map(l => ({ label: l.value, value: l.value }))
    languageOptions.value = (langRes.data?.data || []).map(l => ({ label: l.value, value: l.value }))
    genderOptions.value = (genderRes.data?.data || []).map(l => ({
      label: genderLabelMap[l.value] || l.value,
      value: l.value,
    }))
  } catch { /* silent */ }
  finally { loadingLookups.value = false }
})

const props = defineProps({
  employee: { type: Object, required: true },
})

const emit = defineEmits(['refresh'])

const canCreate = computed(() => authStore.canCreate('employees'))
const canUpdate = computed(() => authStore.canUpdate('employees'))
const canDelete = computed(() => authStore.canDelete('employees'))

// ======================== Helpers ========================
function showApiError(err, fallback) {
  const resp = err.response?.data
  if (resp?.errors) {
    const firstErr = Object.values(resp.errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

// ======================== Table Columns ========================
const showActions = computed(() => canUpdate.value || canDelete.value)

const educationColumns = computed(() => {
  const cols = [
    { title: 'School', dataIndex: 'school_name' },
    { title: 'Degree', dataIndex: 'degree' },
    { title: 'Start', key: 'start_date', width: 120 },
    { title: 'End', key: 'end_date', width: 120 },
  ]
  if (showActions.value) cols.push({ title: '', key: 'actions', width: 80, align: 'right' })
  return cols
})

const childrenColumns = computed(() => {
  const cols = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Date of Birth', key: 'date_of_birth', width: 140 },
    { title: 'Gender', key: 'gender', width: 100 },
  ]
  if (showActions.value) cols.push({ title: '', key: 'actions', width: 80, align: 'right' })
  return cols
})

const beneficiaryColumns = computed(() => {
  const cols = [
    { title: 'Name', dataIndex: 'beneficiary_name' },
    { title: 'Relationship', dataIndex: 'beneficiary_relationship', width: 160 },
    { title: 'Phone', dataIndex: 'phone_number', width: 140 },
  ]
  if (showActions.value) cols.push({ title: '', key: 'actions', width: 80, align: 'right' })
  return cols
})

// ======================== Education Modal ========================
const eduModal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { school_name: '', degree: '', start_date: null, end_date: null },
})

function openEducationModal(record) {
  if (record) {
    eduModal.editing = record
    eduModal.form.school_name = record.school_name || ''
    eduModal.form.degree = record.degree || ''
    eduModal.form.start_date = record.start_date || null
    eduModal.form.end_date = record.end_date || null
  } else {
    eduModal.editing = null
    eduModal.form.school_name = ''
    eduModal.form.degree = ''
    eduModal.form.start_date = null
    eduModal.form.end_date = null
  }
  eduModal.visible = true
}

async function saveEducation() {
  if (!eduModal.form.school_name) return message.warning('School Name is required')
  if (!eduModal.form.degree) return message.warning('Degree is required')
  if (!eduModal.form.start_date) return message.warning('Start Date is required')
  if (!eduModal.form.end_date) return message.warning('End Date is required')

  eduModal.saving = true
  try {
    const payload = { ...eduModal.form, employee_id: props.employee.id }
    if (eduModal.editing) {
      await employeeEducationApi.update(eduModal.editing.id, payload)
      message.success('Education updated')
    } else {
      await employeeEducationApi.store(payload)
      message.success('Education added')
    }
    eduModal.visible = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save education')
  }
  eduModal.saving = false
}

// ======================== Child Modal ========================
const childModal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { name: '', date_of_birth: null, gender: undefined },
})

function openChildModal(record) {
  if (record) {
    childModal.editing = record
    childModal.form.name = record.name || ''
    childModal.form.date_of_birth = record.date_of_birth || null
    childModal.form.gender = record.gender || undefined
  } else {
    childModal.editing = null
    childModal.form.name = ''
    childModal.form.date_of_birth = null
    childModal.form.gender = undefined
  }
  childModal.visible = true
}

async function saveChild() {
  if (!childModal.form.name) return message.warning('Name is required')
  if (!childModal.form.date_of_birth) return message.warning('Date of Birth is required')

  childModal.saving = true
  try {
    const payload = { employee_id: props.employee.id, name: childModal.form.name, date_of_birth: childModal.form.date_of_birth }
    if (childModal.form.gender) payload.gender = childModal.form.gender
    if (childModal.editing) {
      await employeeChildApi.update(childModal.editing.id, payload)
      message.success('Child record updated')
    } else {
      await employeeChildApi.store(payload)
      message.success('Child record added')
    }
    childModal.visible = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save child record')
  }
  childModal.saving = false
}

// ======================== Language Modal ========================
const langModal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { language: '', proficiency_level: undefined },
})

function openLanguageModal(record) {
  if (record) {
    langModal.editing = record
    langModal.form.language = record.language || record.name || ''
    langModal.form.proficiency_level = record.proficiency_level || undefined
  } else {
    langModal.editing = null
    langModal.form.language = ''
    langModal.form.proficiency_level = undefined
  }
  langModal.visible = true
}

async function saveLanguage() {
  if (!langModal.form.language) return message.warning('Language is required')
  if (!langModal.form.proficiency_level) return message.warning('Proficiency Level is required')

  langModal.saving = true
  try {
    const userName = authStore.user?.name || 'System'
    const payload = {
      employee_id: props.employee.id,
      language: langModal.form.language,
      proficiency_level: langModal.form.proficiency_level,
      created_by: userName,
      updated_by: userName,
    }
    if (langModal.editing) {
      await employeeLanguageApi.update(langModal.editing.id, payload)
      message.success('Language updated')
    } else {
      await employeeLanguageApi.store(payload)
      message.success('Language added')
    }
    langModal.visible = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save language')
  }
  langModal.saving = false
}

// ======================== Beneficiary Modal ========================
const beneModal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { beneficiary_name: '', beneficiary_relationship: '', phone_number: '' },
})

function openBeneficiaryModal(record) {
  if (record) {
    beneModal.editing = record
    beneModal.form.beneficiary_name = record.beneficiary_name || ''
    beneModal.form.beneficiary_relationship = record.beneficiary_relationship || ''
    beneModal.form.phone_number = record.phone_number || ''
  } else {
    beneModal.editing = null
    beneModal.form.beneficiary_name = ''
    beneModal.form.beneficiary_relationship = ''
    beneModal.form.phone_number = ''
  }
  beneModal.visible = true
}

async function saveBeneficiary() {
  if (!beneModal.form.beneficiary_name) return message.warning('Name is required')
  if (!beneModal.form.beneficiary_relationship) return message.warning('Relationship is required')

  beneModal.saving = true
  try {
    const payload = { ...beneModal.form, employee_id: props.employee.id }
    if (beneModal.editing) {
      await employeeBeneficiaryApi.update(beneModal.editing.id, payload)
      message.success('Beneficiary updated')
    } else {
      await employeeBeneficiaryApi.store(payload)
      message.success('Beneficiary added')
    }
    beneModal.visible = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save beneficiary')
  }
  beneModal.saving = false
}

// ======================== Delete ========================
const apiMap = {
  education: employeeEducationApi,
  child: employeeChildApi,
  language: employeeLanguageApi,
  beneficiary: employeeBeneficiaryApi,
}

const labelMap = {
  education: 'education record',
  child: 'child record',
  language: 'language',
  beneficiary: 'beneficiary',
}

function confirmDelete(type, record) {
  Modal.confirm({
    title: `Delete ${labelMap[type]}`,
    content: `Are you sure you want to delete this ${labelMap[type]}?`,
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await apiMap[type].destroy(record.id)
        message.success(`${labelMap[type].charAt(0).toUpperCase() + labelMap[type].slice(1)} deleted`)
        emit('refresh')
      } catch (err) {
        showApiError(err, `Failed to delete ${labelMap[type]}`)
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
  padding-bottom: 8px;
  border-bottom: 1.5px solid var(--color-border);
}
.section-header:not(:first-child) {
  margin-top: 24px;
}
.section-header .section-title {
  margin: 0;
  padding: 0;
  border: none;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.section-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
.modal-form { margin-top: 8px; }
</style>
