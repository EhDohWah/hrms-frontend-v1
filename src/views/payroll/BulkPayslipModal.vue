<template>
  <a-modal
    :open="open"
    title="Bulk Payslips"
    :width="480"
    :footer="null"
    :maskClosable="!downloading"
    :closable="!downloading"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" style="margin-top: 8px">
      <a-form-item label="Organisation" required>
        <a-radio-group v-model:value="form.organization" button-style="solid" size="large">
          <a-radio-button value="SMRU">SMRU</a-radio-button>
          <a-radio-button value="BHF">BHF</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="Pay Period" required>
        <a-date-picker
          v-model:value="form.payPeriodDate"
          picker="month"
          value-format="YYYY-MM"
          format="MMM YYYY"
          placeholder="Select month"
          style="width: 100%"
          :disabledDate="(d) => d && d.isAfter(today)"
        />
      </a-form-item>

      <a-alert type="info" show-icon style="margin-bottom: 0">
        <template #message>
          All payslips for the selected organisation and month will be combined into a single PDF file.
        </template>
      </a-alert>
    </a-form>

    <div class="modal-footer">
      <a-button :disabled="downloading" @click="handleCancel">Cancel</a-button>
      <a-button
        type="primary"
        :loading="downloading"
        :disabled="!canGenerate"
        @click="generate"
      >
        <FilePdfOutlined v-if="!downloading" />
        Generate PDF
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, inject } from 'vue'
import { message } from 'ant-design-vue'
import { FilePdfOutlined } from '@ant-design/icons-vue'
import { payrollApi } from '@/api'

const dayjs = inject('$dayjs')
const today = dayjs()

const props = defineProps({ open: Boolean })
const emit = defineEmits(['update:open'])

const downloading = ref(false)
const form = reactive({ organization: null, payPeriodDate: null })

const canGenerate = computed(() => !!form.organization && !!form.payPeriodDate)

async function generate() {
  downloading.value = true
  try {
    const res = await payrollApi.bulkPayslips({
      organization: form.organization,
      pay_period_date: form.payPeriodDate,
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `payslips-${form.organization}-${form.payPeriodDate}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    message.success('Payslips downloaded')
    emit('update:open', false)
    resetForm()
  } catch (err) {
    // The response body is a Blob (due to responseType: 'blob') — parse it to get the error message
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text()
        const json = JSON.parse(text)
        message.error(json?.message || 'No payslips found for this period')
      } catch {
        message.error('No payslips found for this period')
      }
    } else {
      message.error(err.response?.data?.message || 'Failed to generate payslips')
    }
  } finally {
    downloading.value = false
  }
}

function handleCancel() {
  if (downloading.value) return
  resetForm()
  emit('update:open', false)
}

function resetForm() {
  form.organization = null
  form.payPeriodDate = null
}
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light, #f0f0f0);
}
</style>
