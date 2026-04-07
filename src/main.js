import { createApp } from 'vue'
import { createPinia } from 'pinia'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'ant-design-vue/dist/reset.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import '@/assets/fonts/fonts.css'
import './styles/global.less'

import App from './App.vue'
import router from './router'
import { vPermission } from './directives/vPermission'

dayjs.extend(relativeTime)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.provide('$dayjs', dayjs)

app.directive('permission', vPermission)

// ── Global error reporting ──────────────────────────────
let lastErrorReport = 0
function reportError(message, source, stack) {
  // Debounce: max 1 report per 10 seconds
  const now = Date.now()
  if (now - lastErrorReport < 10000) return
  lastErrorReport = now

  // Lazy import to avoid circular deps at startup
  import('./api/systemApi').then(({ systemApi }) => {
    systemApi.reportClientError({
      message: String(message).substring(0, 1000),
      source: source || null,
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      stack: stack ? String(stack).substring(0, 2000) : null,
    }).catch(() => { /* silent — don't loop on error reporting errors */ })
  }).catch(() => {})
}

app.config.errorHandler = (err, instance, info) => {
  const component = instance?.$options?.name || instance?.$options?.__name || 'Unknown'
  reportError(err?.message || String(err), `Vue: ${component} (${info})`, err?.stack)
}

window.addEventListener('error', (event) => {
  reportError(event.message, event.filename, event.error?.stack)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  reportError(reason?.message || String(reason), 'Unhandled Promise Rejection', reason?.stack)
})

app.mount('#app')
