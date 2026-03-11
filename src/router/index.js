import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { routes } from './routes'
import { setupGuards } from './guards'

NProgress.configure({ showSpinner: false })

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    // Restore scroll on back/forward
    if (savedPosition) return savedPosition
    // Only scroll to top when navigating to a different base path
    if (to.path !== from.path) return { top: 0 }
    return false
  },
})

setupGuards(router)

export default router
