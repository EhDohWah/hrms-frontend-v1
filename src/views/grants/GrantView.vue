<template>
  <div class="page-container">
    <div class="view-toolbar">
      <a-button type="text" @click="$router.push({ name: 'grants' })">
        <ArrowLeftOutlined /> Back to Grants
      </a-button>
    </div>

    <AppLoading v-if="isLoading" tip="Loading grant..." />

    <RecordView
      v-else-if="grant"
      :org="orgConfig"
      :title="grant.name"
      :ref-id="grant.code"
      icon="report-money"
      badge="Grant Record"
      :status="statusKey"
      :status-label="grant.status"
      :status-meta="statusMeta"
      :sections="sections"
      @print="handlePrint"
      @edit="handleEdit"
    />

    <AppEmpty v-else description="Grant not found" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { grantApi } from '@/api'
import { useApi } from '@/composables/useApi'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { ORG_RECORD_VIEW_CONFIG } from '@/constants/organizations'
import AppLoading from '@/components/common/AppLoading.vue'
import AppEmpty from '@/components/common/AppEmpty.vue'
import RecordView from '@/components/common/RecordView.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const { data: rawData, isLoading, execute } = useApi(grantApi.show)

const grant = computed(() => rawData.value?.data || rawData.value)

const orgConfig = computed(() => ORG_RECORD_VIEW_CONFIG[grant.value?.organization] ?? null)

const statusMap = { 'Active': 'active', 'Expired': 'expired', 'Ending Soon': 'ending-soon' }
const statusKey = computed(() => statusMap[grant.value?.status] || 'active')

const statusMeta = computed(() => {
  const g = grant.value
  if (!g) return []
  const meta = []
  if (g.end_date) {
    meta.push({ icon: 'calendar', text: `Ends ${formatDate(g.end_date)}` })
  } else {
    meta.push({ icon: 'calendar', text: 'No end date (open-ended)' })
  }
  if (g.days_until_expiration != null && g.days_until_expiration > 0) {
    meta.push({ icon: 'clock', text: `${g.days_until_expiration} days remaining` })
  }
  const itemsCount = g.grant_items_count ?? g.grant_items?.length ?? 0
  if (itemsCount > 0) {
    meta.push({ icon: 'users', text: `${itemsCount} position(s)` })
  }
  return meta
})

const sections = computed(() => {
  const g = grant.value
  if (!g) return []

  const result = []

  // Grant Overview
  result.push({
    title: 'Grant Overview', icon: 'report-money', type: 'fields',
    fields: [
      { label: 'Grant Code', value: g.code, mono: true },
      { label: 'Grant Name', value: g.name },
      { label: 'Organization', value: g.organization },
      { label: 'Status', value: g.status },
      { label: 'End Date', value: g.end_date ? formatDate(g.end_date) : 'Open-ended', mono: !!g.end_date },
      { label: 'Days Remaining', value: g.days_until_expiration != null ? `${g.days_until_expiration} days` : '—' },
      { label: 'Hub Grant', value: g.is_hub_grant ? 'Yes' : 'No' },
      { label: 'Items Count', value: String(g.grant_items_count ?? g.grant_items?.length ?? 0), mono: true },
      ...(g.description ? [{ label: 'Description', value: g.description, fullWidth: true }] : []),
    ],
  })

  // Grant Items (Positions) table
  if (g.grant_items?.length > 0) {
    const items = g.grant_items

    // Compute totals
    let totalLoe = 0
    let totalSalary = 0
    let totalBenefit = 0
    items.forEach(item => {
      totalLoe += Number(item.grant_level_of_effort) || 0
      totalSalary += Number(item.grant_salary) || 0
      totalBenefit += Number(item.grant_benefit) || 0
    })

    result.push({
      title: 'Grant Items (Positions)', icon: 'list-details', type: 'table',
      headers: ['#', 'Position', 'Budgetline', 'LOE', 'Salary', 'Benefit'],
      aligns: { 0: 'text-center', 3: 'text-center', 4: 'text-right', 5: 'text-right' },
      monoCols: [0, 2, 3, 4, 5],
      rows: items.map(item => [
        String(item.grant_position_number ?? '—'),
        item.grant_position ?? '—',
        item.budgetline_code ?? '—',
        item.grant_level_of_effort != null ? String(item.grant_level_of_effort) : '—',
        item.grant_salary != null ? formatCurrency(item.grant_salary) : '—',
        item.grant_benefit != null ? formatCurrency(item.grant_benefit) : '—',
      ]),
      summary: {
        label: `Total (${items.length} items)`,
        colspan: 3,
        values: [
          totalLoe ? totalLoe.toFixed(2) : '—',
          totalSalary ? formatCurrency(totalSalary) : '—',
          totalBenefit ? formatCurrency(totalBenefit) : '—',
        ],
      },
    })
  }

  // Record Information
  result.push({
    title: 'Record Information', icon: 'info-circle', type: 'fields',
    fields: [
      { label: 'Created By', value: g.created_by },
      { label: 'Updated By', value: g.updated_by },
      { label: 'Created At', value: formatDate(g.created_at), mono: true },
      { label: 'Updated At', value: formatDate(g.updated_at), mono: true },
    ],
  })

  return result
})

function handlePrint() {
  window.print()
}

function handleEdit() {
  router.push({ name: 'grant-detail', params: { id: route.params.id } })
}

onMounted(async () => {
  appStore.setPageMeta('Grant Record')
  try {
    await execute(route.params.id)
    if (grant.value) {
      appStore.setPageMeta(`Grant: ${grant.value.code}`)
    }
  } catch {
    // Error handled by useApi
  }
})
</script>

<style scoped>
.view-toolbar {
  margin-bottom: 16px;
}
</style>
