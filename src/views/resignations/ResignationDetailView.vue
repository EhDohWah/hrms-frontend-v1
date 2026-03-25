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
            <a-tag v-if="item.employee?.organization" :color="getOrgColor(item.employee.organization)" size="small" style="margin-left: 8px; vertical-align: middle;">{{ item.employee.organization }}</a-tag>
          </h2>
        </div>
        <a-space v-if="item">
          <a-button
            v-if="authStore.canUpdate('resignation') && item.status === 'pending'"
            type="primary"
            :loading="acknowledging"
            @click="handleAcknowledge"
          >
            <CheckOutlined /> Acknowledge
          </a-button>
          <a-button
            v-if="authStore.canUpdate('resignation') && item.status === 'pending'"
            danger
            :loading="rejecting"
            @click="handleReject"
          >
            <CloseOutlined /> Reject
          </a-button>
          <a-button
            v-if="authStore.canRead('resignation') && item.status === 'acknowledged'"
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
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <div class="stat-label">Status</div>
              <a-tag :color="getResignationStatusColor(item.status)">{{ item.status }}</a-tag>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="Resignation Date" :value="formatDate(item.resignation_date)" />
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="Last Working Date" :value="formatDate(item.last_working_date)" />
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-card size="small">
              <a-statistic title="Department" :value="item.department?.name || '—'" />
              <div v-if="item.position" class="stat-secondary">{{ item.position.title }}</div>
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
            <a-card size="small" title="Details">
              <p>{{ item.reason_details || 'No additional details' }}</p>
            </a-card>
          </a-col>
        </a-row>

        <!-- Computed info -->
        <a-row :gutter="16" style="margin-top: 16px;">
          <a-col :span="8">
            <a-card size="small">
              <a-statistic title="Notice Period" :value="`${item.notice_period_days ?? 0} days`" />
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card size="small">
              <a-statistic title="Days Until Last Working" :value="`${item.days_until_last_working ?? 0} days`" />
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card size="small">
              <div class="stat-label">Overdue</div>
              <a-tag :color="item.is_overdue ? 'red' : 'green'">{{ item.is_overdue ? 'Yes' : 'No' }}</a-tag>
            </a-card>
          </a-col>
        </a-row>

        <a-card size="small" title="Timeline" style="margin-top: 16px;" v-if="item.created_at || item.acknowledged_at">
          <a-timeline>
            <a-timeline-item v-if="item.created_at" color="blue">
              Submitted on {{ formatDate(item.created_at) }}
              <span v-if="item.created_by" class="timeline-by"> by {{ item.created_by }}</span>
            </a-timeline-item>
            <a-timeline-item v-if="item.acknowledged_at" :color="item.status === 'rejected' ? 'red' : 'orange'">
              {{ item.status === 'rejected' ? 'Rejected' : 'Acknowledged' }} on {{ formatDate(item.acknowledged_at) }}
              <span v-if="item.acknowledged_by_user" class="timeline-by"> by {{ item.acknowledged_by_user.name }}</span>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, createVNode } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { resignationApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { getOrgColor } from '@/constants/organizations'
import { getResignationStatusColor } from '@/constants/resignations'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const item = ref(null)
const loading = ref(false)
const acknowledging = ref(false)
const rejecting = ref(false)
const downloading = ref(false)

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

function handleAcknowledge() {
  Modal.confirm({
    title: 'Acknowledge Resignation',
    icon: createVNode(ExclamationCircleOutlined),
    content: 'This will set the employment end date to the last working date and close active funding allocations. Continue?',
    okText: 'Acknowledge',
    async onOk() {
      acknowledging.value = true
      try {
        await resignationApi.acknowledge(route.params.id, { action: 'acknowledge' })
        message.success('Resignation acknowledged successfully')
        fetchItem()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to acknowledge')
      }
      acknowledging.value = false
    },
  })
}

function handleReject() {
  Modal.confirm({
    title: 'Reject Resignation',
    icon: createVNode(ExclamationCircleOutlined),
    content: 'Are you sure you want to reject this resignation?',
    okText: 'Reject',
    okType: 'danger',
    async onOk() {
      rejecting.value = true
      try {
        await resignationApi.acknowledge(route.params.id, { action: 'reject' })
        message.success('Resignation rejected')
        fetchItem()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to reject')
      }
      rejecting.value = false
    },
  })
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
.stat-secondary {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
.timeline-by {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
