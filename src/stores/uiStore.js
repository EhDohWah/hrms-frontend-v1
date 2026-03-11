import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')
  const mobileSidebarOpen = ref(false)
  const pageTitle = ref('')
  const breadcrumbs = ref([])

  // Track viewport width for JS logic (sidebar offset etc.)
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const isMobile = computed(() => windowWidth.value < 768)

  const sidebarWidth = computed(() => {
    if (isMobile.value) return '0px'
    return sidebarCollapsed.value ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed.value)
  }

  function openMobileSidebar() {
    mobileSidebarOpen.value = true
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  function handleResize() {
    windowWidth.value = window.innerWidth
    if (!isMobile.value) {
      mobileSidebarOpen.value = false
    }
  }

  function setPageMeta(title, crumbs = []) {
    pageTitle.value = title
    breadcrumbs.value = crumbs
    document.title = title ? `${title} — HRMS` : 'HRMS'
  }

  return {
    sidebarCollapsed, mobileSidebarOpen, pageTitle, breadcrumbs,
    sidebarWidth, isMobile, windowWidth,
    toggleSidebar, openMobileSidebar, closeMobileSidebar, setPageMeta, handleResize,
  }
})
