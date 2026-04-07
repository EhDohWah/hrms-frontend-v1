<template>
  <a-layout class="app-layout">
    <!-- Mobile overlay -->
    <div
      v-if="appStore.mobileSidebarOpen"
      class="mobile-overlay"
      @click="appStore.closeMobileSidebar()"
    />
    <AppSidebar />
    <a-layout class="main-area" :style="{ marginLeft: appStore.sidebarWidth }">
      <AppHeader />
      <a-layout-content class="main-content">
        <router-view />
      </a-layout-content>
    </a-layout>
    <PasswordChangeWarningModal v-if="authStore.needsPasswordChange" />
  </a-layout>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { subscribeUserChannels, destroyEcho } from '@/plugins/echo'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import PasswordChangeWarningModal from '@/components/layout/PasswordChangeWarningModal.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

function handlePermissionDenied(event) {
  message.warning(event.detail?.message || 'You do not have permission to access this resource.')
}

onMounted(async () => {
  window.addEventListener('resize', appStore.handleResize)
  window.addEventListener('permission-denied', handlePermissionDenied)
  notifStore.startPolling()

  if (authStore.user?.id) {
    await subscribeUserChannels(authStore.user.id, {
      authStore,
      notificationStore: notifStore,
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', appStore.handleResize)
  window.removeEventListener('permission-denied', handlePermissionDenied)
  notifStore.stopPolling()
  destroyEcho()
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--color-bg);
}
.main-area {
  transition: margin-left var(--transition-slow);
  background: var(--color-bg);
}
.main-content {
  margin-top: var(--header-height);
  min-height: calc(100vh - var(--header-height));
  background: var(--color-bg);
}
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}
@media (min-width: 768px) {
  .mobile-overlay {
    display: none;
  }
}
</style>
