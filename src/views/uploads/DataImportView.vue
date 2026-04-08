<template>
  <div class="page-container">
    <div class="import-grid">
      <GrantImportCard
        v-if="authStore.canRead('grants')"
        :can-create="authStore.canCreate('grants')"
      />
      <EmployeeImportCard
        v-if="authStore.canRead('employees')"
        :can-create="authStore.canCreate('employees')"
      />
      <OnboardingImportCard
        v-if="authStore.canRead('employees')"
        :can-create="authStore.canCreate('employees')"
      />
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import GrantImportCard from './components/GrantImportCard.vue'
import EmployeeImportCard from './components/EmployeeImportCard.vue'
import OnboardingImportCard from './components/OnboardingImportCard.vue'

const authStore = useAuthStore()
</script>

<style scoped>
.import-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .import-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
