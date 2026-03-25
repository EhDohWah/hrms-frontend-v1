<template>
  <a-modal
    :open="open"
    title="Transfer Employee"
    :footer="null"
    :width="'min(95vw, 480px)'"
    destroy-on-close
    @cancel="$emit('update:open', false)"
  >
    <a-form :model="form" layout="vertical" class="modal-form">
      <a-form-item label="Current Organization">
        <a-tag :color="getOrgColor(currentOrg)">
          {{ currentOrg || '—' }}
        </a-tag>
      </a-form-item>

      <a-form-item label="Transfer To" required>
        <a-select v-model:value="form.to_organization" placeholder="Select new organization">
          <a-select-option v-for="org in availableOrgs" :key="org" :value="org">{{ org }}</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Transfer Start Date" required>
        <a-date-picker
          v-model:value="form.to_start_date"
          style="width: 100%"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>

      <a-form-item label="Reason">
        <a-textarea v-model:value="form.reason" placeholder="Reason for transfer" :rows="3" />
      </a-form-item>

      <div class="modal-footer">
        <a-button @click="$emit('update:open', false)">Cancel</a-button>
        <a-button type="primary" :loading="saving" @click="handleTransfer">Transfer</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { transferApi } from '@/api'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'transferred'])

const saving = ref(false)

const form = reactive({
  to_organization: undefined,
  to_start_date: null,
  reason: '',
})

const currentOrg = computed(() => props.employee?.organization)

const availableOrgs = computed(() => {
  return ORG_OPTIONS.map(o => o.code).filter((o) => o !== currentOrg.value)
})

async function handleTransfer() {
  if (!form.to_organization) return message.warning('Please select the new organization')
  if (!form.to_start_date) return message.warning('Transfer start date is required')

  saving.value = true
  try {
    await transferApi.store({
      employee_id: props.employee.id,
      ...form,
    })
    message.success(`Employee transferred to ${form.to_organization}`)
    emit('update:open', false)
    emit('transferred')
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to transfer employee')
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
