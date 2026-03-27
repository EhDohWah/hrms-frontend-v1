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

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err)
  console.error('[Component]', instance?.$options?.name || instance?.$options?.__name || 'Unknown')
  console.error('[Info]', info)
}

app.mount('#app')
