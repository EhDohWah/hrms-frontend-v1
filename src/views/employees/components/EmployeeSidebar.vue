<template>
  <div class="employee-sidebar">
    <!-- Avatar -->
    <div class="sidebar-avatar-section">
      <div class="avatar-wrapper">
        <a-avatar
          :size="80"
          :src="profilePictureUrl"
          :style="!profilePictureUrl ? { backgroundColor: 'var(--color-primary)', fontSize: '28px', fontWeight: 700 } : {}"
        >
          {{ !profilePictureUrl ? initials : '' }}
        </a-avatar>
        <label v-if="canUpload" class="avatar-upload" title="Upload photo">
          <CameraOutlined />
          <input type="file" accept="image/*" @change="$emit('upload', $event)" hidden />
        </label>
      </div>
    </div>

    <!-- Name -->
    <div class="sidebar-name">{{ displayNameEn || 'New Employee' }}</div>
    <div v-if="displayNameTh" class="sidebar-name-th">{{ displayNameTh }}</div>

    <!-- Meta tags -->
    <div class="sidebar-meta">
      <div v-if="form.staff_id" class="sidebar-meta-item">
        <span class="meta-label">Staff ID</span>
        <span class="meta-value font-mono">{{ form.staff_id }}</span>
      </div>
      <div v-if="employee?.employment?.organization" class="sidebar-meta-item">
        <span class="meta-label">Organization</span>
        <a-tag :color="employee.employment.organization === 'SMRU' ? 'blue' : 'green'" size="small">
          {{ employee.employment.organization }}
        </a-tag>
      </div>
      <div v-if="form.status" class="sidebar-meta-item">
        <span class="meta-label">Status</span>
        <a-tag :color="statusColorMap[form.status] || 'default'" size="small">
          {{ form.status }}
        </a-tag>
      </div>
    </div>

    <!-- Timestamps (only for existing employees) -->
    <div v-if="employee" class="sidebar-timestamps">
      <div v-if="employee.created_at" class="timestamp-item">
        <span class="meta-label">Created</span>
        <span class="meta-value">{{ formatDate(employee.created_at) }}</span>
      </div>
      <div v-if="employee.updated_at" class="timestamp-item">
        <span class="meta-label">Updated</span>
        <span class="meta-value">{{ formatDate(employee.updated_at) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { CameraOutlined } from '@ant-design/icons-vue'

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'
const dayjs = inject('$dayjs')

const props = defineProps({
  form: { type: Object, required: true },
  employee: { type: Object, default: null },
  canUpload: { type: Boolean, default: false },
})

defineEmits(['upload'])

const statusColorMap = {
  'Local ID Staff': 'green',
  'Local non ID Staff': 'green',
  'Expats (Local)': 'purple',
}

const displayNameEn = computed(() => {
  const parts = [props.form.initial_en, props.form.first_name_en, props.form.last_name_en]
  return parts.filter(Boolean).join(' ')
})

const displayNameTh = computed(() => {
  const parts = [props.form.initial_th, props.form.first_name_th, props.form.last_name_th]
  return parts.filter(Boolean).join(' ')
})

const initials = computed(() => {
  const f = (props.form.first_name_en || '')[0] || ''
  const l = (props.form.last_name_en || '')[0] || ''
  return `${f}${l}`.toUpperCase()
})

const profilePictureUrl = computed(() => {
  const pic = props.employee?.profile_picture
  if (!pic) return null
  if (pic.startsWith('http')) return pic
  return `${PUBLIC_URL}/storage/${pic}`
})

function formatDate(date) {
  return date ? dayjs(date).format('DD MMM YYYY') : null
}
</script>

<style scoped>
.employee-sidebar {
  width: 100%;
  flex-shrink: 0;
  padding: 24px 20px;
  border-top: 1px solid var(--color-border-light);
  background: var(--color-bg-surface);
}
@media (min-width: 1024px) {
  .employee-sidebar {
    width: 240px;
    border-top: none;
    border-left: 1px solid var(--color-border-light);
  }
}

.sidebar-avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.avatar-wrapper {
  position: relative;
}

.avatar-upload {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 26px;
  height: 26px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}
.avatar-upload:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.sidebar-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  letter-spacing: -0.02em;
}

.sidebar-name-th {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 2px;
}

.sidebar-meta {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.sidebar-timestamps {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timestamp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
