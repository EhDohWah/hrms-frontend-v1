<template>
  <div v-if="password" class="pw-requirements">
    <div
      v-for="req in requirements"
      :key="req.key"
      class="pw-req-item"
      :class="{ 'pw-req-met': req.met }"
    >
      <CheckCircleFilled v-if="req.met" class="pw-req-icon pw-req-icon--met" />
      <CloseCircleOutlined v-else class="pw-req-icon pw-req-icon--unmet" />
      <span>{{ req.label }}</span>
    </div>
    <div class="pw-strength-bar">
      <div class="pw-strength-track">
        <div
          class="pw-strength-fill"
          :class="strengthClass"
          :style="{ width: strengthPercent + '%' }"
        />
      </div>
      <span class="pw-strength-label" :class="strengthClass">{{ strengthLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { toRef } from 'vue'
import { CheckCircleFilled, CloseCircleOutlined } from '@ant-design/icons-vue'
import { usePasswordStrength } from '@/composables/usePasswordStrength'

const props = defineProps({
  password: { type: String, default: '' },
})

const { requirements, strengthPercent, strengthClass, strengthLabel } = usePasswordStrength(toRef(props, 'password'))
</script>
