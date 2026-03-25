<template>
  <div>
    <template v-if="!readonly">
      <div class="form-section-title">Bank Account</div>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Bank Name">
            <a-select
              v-model:value="form.bank_name"
              placeholder="Select bank"
              allow-clear
              show-search
              :options="bankNameOptions"
              :loading="loadingLookups"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Branch">
            <a-input v-model:value="form.bank_branch" placeholder="Branch name" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Account Name">
            <a-input v-model:value="form.bank_account_name" placeholder="Account holder name" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Account Number">
            <a-input v-model:value="form.bank_account_number" placeholder="Account number" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Notes</div>
      <a-form-item label="Remark">
        <a-textarea v-model:value="form.remark" placeholder="Any additional notes..." :rows="3" />
      </a-form-item>
    </template>

    <template v-else>
      <div class="section-title">Bank Account</div>
      <div class="info-grid">
        <InfoField label="Bank Name" :value="form.bank_name" />
        <InfoField label="Branch" :value="form.bank_branch" />
        <InfoField label="Account Name" :value="form.bank_account_name" />
        <InfoField label="Account Number" :value="form.bank_account_number" mono />
      </div>

      <div class="section-title">Notes</div>
      <div class="info-grid info-grid-single">
        <InfoField label="Remark" :value="form.remark" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import InfoField from '@/components/common/InfoField.vue'
import { lookupApi } from '@/api'

defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
})

const bankNameOptions = ref([])
const loadingLookups = ref(false)

onMounted(async () => {
  loadingLookups.value = true
  try {
    const { data } = await lookupApi.byType('bank_name')
    bankNameOptions.value = (data?.data || []).map(l => ({ label: l.value, value: l.value }))
  } catch { /* silent */ }
  finally { loadingLookups.value = false }
})
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
.info-grid-single {
  grid-template-columns: 1fr;
}
.info-grid-single :deep(.info-label) {
  flex: 0 0 12.67%;
}
</style>
