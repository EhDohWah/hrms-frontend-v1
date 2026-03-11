<template>
  <div class="page-container">
    <a-result
      status="404"
      title="Page Not Found"
      sub-title="The page you're looking for doesn't exist or has been moved."
    >
      <template #extra>
        <a-button type="primary" @click="$router.push({ name: 'dashboard' })">
          Back to Dashboard
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/uiStore'

const appStore = useAppStore()
onMounted(() => appStore.setPageMeta('Not Found'))
</script>
