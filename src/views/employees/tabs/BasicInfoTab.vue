<template>
  <div>
    <template v-if="!readonly">
      <div class="form-section-title">Staff Details</div>
      <a-row :gutter="16">
        <a-col :span="6">
          <a-form-item label="Organization" required>
            <a-select
              v-model:value="form.organization"
              placeholder="Select"
            >
              <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="Staff ID" required>
            <a-input v-model:value="form.staff_id" placeholder="e.g. 0101" @blur="$emit('staff-id-blur')" />
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="Status" required>
            <a-select
              v-model:value="form.status"
              placeholder="Select status"
              :options="lookups.employee_status"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Name (English)</div>
      <a-row :gutter="16">
        <a-col :span="6">
          <a-form-item label="Initial">
            <a-select
              v-model:value="form.initial_en"
              placeholder="Select"
              allow-clear
              show-search
              :options="lookups.employee_initial_en"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="First Name" required>
            <a-input v-model:value="form.first_name_en" placeholder="First name" />
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="Last Name">
            <a-input v-model:value="form.last_name_en" placeholder="Last name" @blur="$emit('name-blur')" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Name (Thai)</div>
      <a-row :gutter="16">
        <a-col :span="6">
          <a-form-item label="Initial">
            <a-select
              v-model:value="form.initial_th"
              placeholder="เลือก"
              allow-clear
              show-search
              :options="lookups.employee_initial_th"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="First Name">
            <a-input v-model:value="form.first_name_th" placeholder="ชื่อ" />
          </a-form-item>
        </a-col>
        <a-col :span="9">
          <a-form-item label="Last Name">
            <a-input v-model:value="form.last_name_th" placeholder="นามสกุล" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Demographics</div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Gender" required>
            <a-select
              v-model:value="form.gender"
              placeholder="Select gender"
              :options="genderOptions"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Date of Birth" required>
            <a-date-picker
              v-model:value="form.date_of_birth"
              style="width: 100%"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              placeholder="DD/MM/YYYY"
              @blur="$emit('dob-change')"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Marital Status">
            <a-select
              v-model:value="form.marital_status"
              placeholder="Select"
              allow-clear
              :options="lookups.marital_status"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Nationality">
            <a-select
              v-model:value="form.nationality"
              placeholder="Select nationality"
              allow-clear
              show-search
              :options="lookups.nationality"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Religion">
            <a-select
              v-model:value="form.religion"
              placeholder="Select religion"
              allow-clear
              show-search
              :options="lookups.religion"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Military Status">
            <a-select v-model:value="form.military_status" placeholder="Select" allow-clear>
              <a-select-option :value="true">Completed</a-select-option>
              <a-select-option :value="false">Not Applicable</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </template>

    <template v-else>
      <div class="section-title">Staff Details</div>
      <div class="info-grid">
        <InfoField label="Organization" :value="form.organization" />
        <InfoField label="Staff ID" :value="form.staff_id" mono />
        <InfoField label="Status" :value="form.status" />
      </div>

      <div class="section-title">Name (English)</div>
      <div class="info-grid">
        <InfoField label="Initial" :value="form.initial_en" />
        <InfoField label="First Name" :value="form.first_name_en" />
        <InfoField label="Last Name" :value="form.last_name_en" />
      </div>

      <div class="section-title">Name (Thai)</div>
      <div class="info-grid">
        <InfoField label="Initial" :value="form.initial_th" />
        <InfoField label="First Name" :value="form.first_name_th" />
        <InfoField label="Last Name" :value="form.last_name_th" />
      </div>

      <div class="section-title">Demographics</div>
      <div class="info-grid">
        <InfoField label="Gender" :value="genderLabel(form.gender)" />
        <InfoField label="Date of Birth" :value="formatDate(form.date_of_birth)" />
        <InfoField label="DOB Thai Year (B.E.)" :value="form.date_of_birth ? String(formatThaiYear(form.date_of_birth)) : null" mono />
        <InfoField label="Age" :value="form.date_of_birth ? `${calcAge(form.date_of_birth)} years` : null" />
        <InfoField label="Marital Status" :value="form.marital_status" />
        <InfoField label="Nationality" :value="form.nationality" />
        <InfoField label="Religion" :value="form.religion" />
        <InfoField label="Military Status" :value="form.military_status === true ? 'Completed' : form.military_status === false ? 'Not Applicable' : null" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import InfoField from '@/components/common/InfoField.vue'
import { lookupApi } from '@/api'
import { ORG_OPTIONS } from '@/constants/organizations'
import { formatDate, genderLabel, calcAge, formatThaiYear } from '@/utils/formatters'

defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
})

defineEmits(['staff-id-blur', 'name-blur', 'dob-change'])

const lookups = ref({
  employee_status: [],
  employee_initial_en: [],
  employee_initial_th: [],
  gender: [],
  marital_status: [],
  nationality: [],
  religion: [],
})
const loadingLookups = ref(false)

// Gender needs custom labels: DB stores M/F but display should show Male/Female
const genderLabelMap = { M: 'Male', F: 'Female' }
const genderOptions = computed(() =>
  lookups.value.gender.map(o => ({ ...o, label: genderLabelMap[o.value] || o.value }))
)

function toLookupOptions(items) {
  return (items || []).map(l => ({ label: l.value, value: l.value }))
}

async function fetchLookups() {
  loadingLookups.value = true
  try {
    const { data } = await lookupApi.lists()
    const all = data?.data || {}
    for (const key of Object.keys(lookups.value)) {
      lookups.value[key] = toLookupOptions(all[key])
    }
  } catch { /* silent — selects still usable without options */ }
  finally { loadingLookups.value = false }
}

onMounted(fetchLookups)

</script>

<style scoped>
.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1.5px solid var(--color-border);
}
.form-section-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
.form-section-title:first-child { margin-top: 0; }
.form-section-title:not(:first-child) { margin-top: 8px; }

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1.5px solid var(--color-border);
}
.section-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
.section-title:first-child { margin-top: 0; }

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
@media (min-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.info-grid > :deep(:nth-child(n+4)) {
  border-top: 1px solid var(--color-border-light);
}
.info-grid :deep(.info-value) {
  border-right: 0.5px solid var(--color-border-light);
}
.info-grid > :deep(:nth-child(3n) .info-value) {
  border-right: none;
}
</style>
