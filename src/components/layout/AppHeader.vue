<template>
  <header class="app-header" :style="{ left: appStore.sidebarWidth }">
    <div class="header-left">
      <!-- Hamburger (mobile only) -->
      <button
        class="hamburger-btn"
        @click="appStore.openMobileSidebar()"
      >
        <MenuOutlined style="font-size: 18px" />
      </button>
      <!-- Frappe-style breadcrumb -->
      <nav class="header-breadcrumb">
        <template v-for="(crumb, i) in appStore.breadcrumbs" :key="i">
          <router-link :to="crumb.to" class="breadcrumb-link">{{ crumb.label }}</router-link>
        </template>
        <span class="breadcrumb-current">{{ appStore.pageTitle || 'Dashboard' }}</span>
      </nav>
    </div>

    <div class="header-right">
      <!-- Global Search Trigger -->
      <button class="header-search-trigger" @click="searchVisible = true">
        <SearchOutlined class="search-trigger-icon" />
        <span class="search-trigger-text">Search...</span>
        <kbd class="search-trigger-kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
      </button>

      <GlobalSearchDropdown :visible="searchVisible" @close="searchVisible = false" />

      <!-- Notifications -->
      <div data-tour="notification-bell" style="display: inline-flex">
        <NotificationDropdown />
      </div>

      <!-- Profile -->
      <a-dropdown :trigger="['click']" placement="bottomRight">
        <div class="header-profile" data-tour="profile-dropdown">
          <a-avatar
            :size="32"
            :src="profilePictureUrl"
            :style="!profilePictureUrl ? { backgroundColor: 'var(--color-primary)', fontSize: '13px', fontWeight: 600 } : {}"
          >
            {{ !profilePictureUrl ? userInitials : '' }}
          </a-avatar>
          <div class="profile-info" v-if="authStore.user">
            <span class="profile-name">{{ authStore.userName }}</span>
          </div>
          <DownOutlined class="profile-arrow" style="font-size: 10px; color: var(--color-text-muted)" />
        </div>
        <template #overlay>
          <a-menu>
            <a-menu-item key="profile" @click="$router.push({ name: 'profile' })">
              <UserOutlined /> My Profile
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" @click="authStore.logout()" style="color: var(--color-danger)">
              <LogoutOutlined /> Sign Out
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import NotificationDropdown from './NotificationDropdown.vue'
import GlobalSearchDropdown from './GlobalSearchDropdown.vue'
import {
  SearchOutlined, DownOutlined,
  UserOutlined, LogoutOutlined, MenuOutlined,
} from '@ant-design/icons-vue'

const appStore = useAppStore()
const authStore = useAuthStore()

const searchVisible = ref(false)
const isMac = (navigator.userAgentData?.platform ?? navigator.platform ?? '').toUpperCase().includes('MAC')

function handleGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchVisible.value = !searchVisible.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'

const userInitials = computed(() => {
  const name = authStore.userName || ''
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
})

const profilePictureUrl = computed(() => {
  const pic = authStore.userAvatar
  if (!pic) return null
  if (pic.startsWith('http')) return pic
  return `${PUBLIC_URL}/storage/${pic}`
})
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  right: 0;
  height: var(--header-height);
  background: var(--header-bg);
  background-image: none;
  border-bottom: 1px solid var(--color-border-light);
  border-image: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 99;
  transition: left var(--transition-slow);
}

@media (max-width: 767px) {
  .app-header {
    padding: 0 12px;
  }
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  margin: 0;
}

.breadcrumb-link {
  color: var(--color-text-muted);
  font-weight: 500;
  text-decoration: none;
  transition: color var(--transition-fast);
}
.breadcrumb-link:hover {
  color: var(--color-text);
}
.breadcrumb-current {
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
}

/* Hamburger — mobile only */
.hamburger-btn {
  margin-right: 12px;
  padding: 6px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hamburger-btn:hover {
  background: var(--color-bg-hover);
}
@media (min-width: 768px) {
  .hamburger-btn {
    display: none;
  }
}

.header-search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  min-width: 220px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}
.header-search-trigger:hover {
  border-color: var(--color-text-muted);
  background: var(--color-bg-hover);
}
.header-search-trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.search-trigger-icon {
  font-size: 14px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.search-trigger-text {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: left;
}
.search-trigger-kbd {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  line-height: 1.3;
}

@media (max-width: 767px) {
  .header-search-trigger {
    min-width: auto;
    padding: 6px 8px;
  }
  .search-trigger-text,
  .search-trigger-kbd {
    display: none;
  }
}

.header-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.header-profile:hover {
  background: var(--color-bg-hover);
}

.profile-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

/* Hide profile info and arrow on small screens */
@media (max-width: 639px) {
  .profile-info,
  .profile-arrow {
    display: none;
  }
}
</style>
