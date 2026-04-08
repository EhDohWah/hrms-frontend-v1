<template>
  <a-modal
    :open="open"
    title="Submit Resignation"
    :footer="null"
    :width="'min(95vw, 520px)'"
    destroy-on-close
    @cancel="$emit('update:open', false)"
  >
    <a-form :model="form" layout="vertical" class="modal-form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Resignation Date" required>
            <a-date-picker
              v-model:value="form.resignation_date"
              style="width: 100%"
              format="DD MMM YYYY"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Last Working Date" required>
            <a-date-picker
              v-model:value="form.last_working_date"
              style="width: 100%"
              format="DD MMM YYYY"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <div v-if="resignationHint" class="date-feedback" :class="'date-feedback--' + resignationHint.level">
        {{ resignationHint.text }}
      </div>
      <a-form-item label="Notes">
        <a-textarea v-model:value="form.notes" placeholder="Notes (optional)" :rows="3" />
      </a-form-item>
      <!-- Acknowledgement Information -->
      <a-divider orientation="left" orientation-margin="0" style="font-size: 13px; color: var(--color-text-secondary)">
        Acknowledgement Information
      </a-divider>
      <div class="approval-hint">Record acknowledgement status and dates as shown on physical forms</div>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Supervisor Acknowledgement">
            <a-select
              v-model:value="form.supervisorStatus"
              :options="ACKNOWLEDGEMENT_OPTIONS"
              @change="(val) => onAcknowledgementChange(val, 'supervisor_approved_at')"
            />
          </a-form-item>
          <a-form-item v-if="form.supervisorStatus !== 'pending'" label="Date">
            <a-date-picker v-model:value="form.supervisor_approved_at" format="DD MMM YYYY" value-format="YYYY-MM-DD" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="HR Acknowledgement">
            <a-select
              v-model:value="form.hrStatus"
              :options="ACKNOWLEDGEMENT_OPTIONS"
              @change="(val) => onAcknowledgementChange(val, 'hr_manager_approved_at')"
            />
          </a-form-item>
          <a-form-item v-if="form.hrStatus !== 'pending'" label="Date">
            <a-date-picker v-model:value="form.hr_manager_approved_at" format="DD MMM YYYY" value-format="YYYY-MM-DD" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="modal-footer">
        <a-button @click="$emit('update:open', false)">Cancel</a-button>
        <a-button :loading="savingAnother" :disabled="savingMain" @click="handleSubmitAndAddAnother">Save &amp; Add Another</a-button>
        <a-button type="primary" danger :loading="savingMain" :disabled="savingAnother" @click="handleSubmit">Save Resignation</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { resignationApi } from '@/api'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { ACKNOWLEDGEMENT_OPTIONS, buildResignationPayload } from '@/constants/resignations'
import { formatResignationHint } from '@/utils/formatters'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'submitted'])

const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: () => emit('submitted'),
  reset: resetForm,
})

const resignationHint = computed(() => formatResignationHint(form.resignation_date, form.last_working_date))

const form = reactive({
  resignation_date: null,
  last_working_date: null,
  notes: '',
  supervisorStatus: 'pending',
  supervisor_approved_at: null,
  hrStatus: 'pending',
  hr_manager_approved_at: null,
})

function resetForm() {
  Object.assign(form, {
    resignation_date: null, last_working_date: null, notes: '',
    supervisorStatus: 'pending', supervisor_approved_at: null,
    hrStatus: 'pending', hr_manager_approved_at: null,
  })
}

function onAcknowledgementChange(val, dateField) {
  if (val === 'pending') form[dateField] = null
}

function validateForm() {
  if (!form.resignation_date) { message.warning('Resignation date is required'); return false }
  if (!form.last_working_date) { message.warning('Last working date is required'); return false }
  return true
}

async function handleSubmit() {
  if (!validateForm()) return
  await submitMain(async () => {
    await resignationApi.store(buildResignationPayload(form, props.employee.id))
    message.success('Resignation saved')
    emit('update:open', false)
  })
}

async function handleSubmitAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await resignationApi.store(buildResignationPayload(form, props.employee.id))
    message.success('Resignation saved')
  })
}
</script>

<style scoped>
.modal-form { margin-top: 16px; }
.approval-hint { font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; margin-top: -8px; }
</style>
