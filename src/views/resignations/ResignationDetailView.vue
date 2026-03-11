<template>
  <div class="page-container">
    <a-spin :spinning="loading">
      <!-- Header -->
      <div class="detail-header">
        <div>
          <a-button type="text" @click="$router.push({ name: 'resignations' })">
            <ArrowLeftOutlined /> Back to Resignations
          </a-button>
          <h2 class="detail-title" v-if="item">
            {{ item.employee?.first_name_en }} {{ item.employee?.last_name_en }}
            <span class="detail-sub font-mono">{{ item.employee?.staff_id }}</span>
          </h2>
        </div>
        <a-space v-if="item">
          <a-button
            v-if="authStore.canUpdate('resignation') && item.status === 'pending'"
            type="primary"
            @click="handleAcknowledge"
          >
            Acknowledge
          </a-button>
          <a-button
            v-if="authStore.canRead('resignation')"
            @click="handleDownloadLetter"
            :loading="downloading"
          >
            Recommendation Letter
          </a-button>
        </a-space>
      </div>

      <template v-if="item">
        <!-- Info Cards -->
        <a-row :gutter="16" class="info-row">
          <a-col :span="6">
            <a-card size="small">
              <div class="stat-label">Status</div>
              <a-tag :color="statusColor(item.status)">{{ item.status }}</a-tag>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Resignation Date" :value="formatDate(item.resignation_date)" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Last Working Date" :value="formatDate(item.last_working_date)" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Department" :value="item.employee?.employment?.department?.name || '—'" />
            </a-card>
          </a-col>
        </a-row>

        <!-- Details -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card size="small" title="Reason">
              <p>{{ item.reason || 'No reason provided' }}</p>
            </a-card>
          </a-col>
          <a-col :span="12">
            <a-card size="small" title="Notes">
              <p>{{ item.notes || 'No notes' }}</p>
            </a-card>
          </a-col>
        </a-row>

        <a-card size="small" title="Timeline" style="margin-top: 16px;" v-if="item.acknowledged_at || item.approved_at">
          <a-timeline>
            <a-timeline-item v-if="item.created_at" color="blue">
              Submitted on {{ formatDate(item.created_at) }}
            </a-timeline-item>
            <a-timeline-item v-if="item.acknowledged_at" color="orange">
              Acknowledged on {{ formatDate(item.acknowledged_at) }}
              <span v-if="item.acknowledged_by"> by {{ item.acknowledged_by }}</span>
            </a-timeline-item>
            <a-timeline-item v-if="item.approved_at" color="green">
              Approved on {{ formatDate(item.approved_at) }}
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { resignationApi } from '@/api'

const dayjs = inject('$dayjs')
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const item = ref(null)
const loading = ref(false)
const downloading = ref(false)

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { pending: 'orange', acknowledged: 'blue', approved: 'green', rejected: 'red', completed: 'default' }
  return map[status?.toLowerCase()] || 'default'
}

async function fetchItem() {
  loading.value = true
  try {
    const { data } = await resignationApi.show(route.params.id)
    item.value = data.data || data
    const emp = item.value.employee
    appStore.setPageMeta(`Resignation: ${emp?.first_name_en || ''} ${emp?.last_name_en || ''}`)
  } catch {
    message.error('Failed to load resignation')
    router.push({ name: 'resignations' })
  }
  loading.value = false
}

async function handleAcknowledge() {
  try {
    await resignationApi.acknowledge(route.params.id, {})
    message.success('Resignation acknowledged')
    fetchItem()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to acknowledge')
  }
}

async function handleDownloadLetter() {
  downloading.value = true
  try {
    const response = await resignationApi.recommendationLetter(route.params.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `recommendation-letter-${route.params.id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to download')
  }
  downloading.value = false
}

onMounted(() => {
  appStore.setPageMeta('Resignation Detail')
  fetchItem()
})
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.detail-title {
  font-size: 20px;
  font-weight: 700;
  margin: 8px 0 0;
}
.detail-sub {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: 8px;
}
.info-row { margin-bottom: 16px; }
.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}
</style>
