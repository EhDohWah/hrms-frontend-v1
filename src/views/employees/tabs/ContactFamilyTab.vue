<template>
  <div>
    <template v-if="!readonly">
      <div class="form-section-title">Contact</div>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Mobile Phone">
            <a-input v-model:value="form.mobile_phone" placeholder="e.g. 081-234-5678" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Permanent Address">
        <a-textarea v-model:value="form.permanent_address" placeholder="Home address..." :rows="2" />
      </a-form-item>
      <a-form-item label="Current Address">
        <a-textarea v-model:value="form.current_address" placeholder="Current residential address..." :rows="2" />
      </a-form-item>

      <div class="form-section-title">Spouse</div>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Spouse Name">
            <a-input v-model:value="form.spouse_name" placeholder="Full name" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Spouse Phone">
            <a-input v-model:value="form.spouse_phone_number" placeholder="Phone number" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Father</div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Father Name">
            <a-input v-model:value="form.father_name" placeholder="Full name" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Father Occupation">
            <a-input v-model:value="form.father_occupation" placeholder="Occupation" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Father Phone">
            <a-input v-model:value="form.father_phone_number" placeholder="Phone" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Mother</div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Mother Name">
            <a-input v-model:value="form.mother_name" placeholder="Full name" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mother Occupation">
            <a-input v-model:value="form.mother_occupation" placeholder="Occupation" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mother Phone">
            <a-input v-model:value="form.mother_phone_number" placeholder="Phone" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="form-section-title">Emergency Contact</div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Contact Person">
            <a-input v-model:value="form.emergency_contact_person_name" placeholder="Full name" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Relationship">
            <a-input v-model:value="form.emergency_contact_person_relationship" placeholder="e.g. Spouse, Parent" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Phone">
            <a-input v-model:value="form.emergency_contact_person_phone" placeholder="Phone number" />
          </a-form-item>
        </a-col>
      </a-row>
    </template>

    <template v-else>
      <div class="section-title">Contact</div>
      <div class="info-grid">
        <InfoField label="Mobile Phone" :value="form.mobile_phone" />
        <div class="info-field-wide">
          <InfoField label="Permanent Address" :value="form.permanent_address" />
        </div>
        <div class="info-field-wide">
          <InfoField label="Current Address" :value="form.current_address" />
        </div>
      </div>

      <div class="section-title">Spouse</div>
      <div class="info-grid">
        <InfoField label="Spouse Name" :value="form.spouse_name" />
        <InfoField label="Spouse Phone" :value="form.spouse_phone_number" />
      </div>

      <div class="section-title">Father</div>
      <div class="info-grid">
        <InfoField label="Name" :value="form.father_name" />
        <InfoField label="Occupation" :value="form.father_occupation" />
        <InfoField label="Phone" :value="form.father_phone_number" />
      </div>

      <div class="section-title">Mother</div>
      <div class="info-grid">
        <InfoField label="Name" :value="form.mother_name" />
        <InfoField label="Occupation" :value="form.mother_occupation" />
        <InfoField label="Phone" :value="form.mother_phone_number" />
      </div>

      <div class="section-title">Emergency Contact</div>
      <div class="info-grid">
        <InfoField label="Contact Person" :value="form.emergency_contact_person_name" />
        <InfoField label="Relationship" :value="form.emergency_contact_person_relationship" />
        <InfoField label="Phone" :value="form.emergency_contact_person_phone" />
      </div>
    </template>
  </div>
</template>

<script setup>
import InfoField from '@/components/common/InfoField.vue'

defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
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
.info-field-wide {
  grid-column: span 3;
}
.info-field-wide:not(:first-child) {
  border-top: 1px solid var(--color-border-light);
}
.info-field-wide :deep(.info-label) {
  flex: 0 0 12.67%;
}
</style>
