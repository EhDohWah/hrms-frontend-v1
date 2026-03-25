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
      <a-form-item label="Reason" required>
        <a-input v-model:value="form.reason" placeholder="Enter reason for resignation" :maxlength="50" show-count />
      </a-form-item>
      <a-form-item label="Details">
        <a-textarea v-model:value="form.reason_details" placeholder="Additional details (optional)" :rows="3" />
      </a-form-item>

      <div class="modal-footer">
        <a-button @click="$emit('update:open', false)">Cancel</a-button>
        <a-button type="primary" danger :loading="saving" @click="handleSubmit">Submit Resignation</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { resignationApi } from '@/api'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'submitted'])

const saving = ref(false)

const form = reactive({
  resignation_date: null,
  last_working_date: null,
  reason: '',
  reason_details: '',
})

async function handleSubmit() {
  if (!form.resignation_date) return message.warning('Resignation date is required')
  if (!form.last_working_date) return message.warning('Last working date is required')
  if (!form.reason) return message.warning('Reason is required')

  saving.value = true
  try {
    await resignationApi.store({
      employee_id: props.employee.id,
      ...form,
    })
    message.success('Resignation submitted')
    emit('update:open', false)
    emit('submitted')
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to submit resignation')
    }
  }
  saving.value = false
}
</script>

<style scoped>
.modal-form { margin-top: 16px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
