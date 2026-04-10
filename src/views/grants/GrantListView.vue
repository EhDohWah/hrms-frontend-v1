<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by grant code..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('grants')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('grants')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Grant
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :row-selection="authStore.canDelete('grants') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :expandedRowKeys="expandedKeys"
        @expandedRowsChange="(keys) => expandedKeys = keys"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag :color="getOrgColor(record.organization)" size="small">
              {{ record.organization }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'code'">
            <span class="cell-code font-mono">{{ record.code }}</span>
          </template>
          <template v-else-if="column.key === 'end_date'">
            {{ formatDate(record.end_date) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openView(record)">View</a-button>
              <a-button v-if="authStore.canUpdate('grants')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('grants')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>

        <!-- Expanded row: Grant Positions
             The inner <a-table> must be the ONLY child so AntD's
             .ant-table-wrapper:only-child margin rule applies (left indent).
             The "Add Position" button goes in the #title slot instead. -->
        <template #expandedRowRender="{ record }">
          <a-table
            :columns="positionColumns"
            :data-source="record.grant_items || []"
            :row-key="(r) => r.id"
            :pagination="false"
            size="small"
          >
            <template v-if="authStore.canCreate('grants')" #title>
              <div class="expanded-add-btn">
                <a-button size="small" type="primary" @click="openCreatePosition(record)">
                  <PlusOutlined /> Add Position
                </a-button>
              </div>
            </template>
            <template #bodyCell="{ column, record: pos }">
              <template v-if="column.key === 'grant_salary'">
                {{ formatCurrency(pos.grant_salary) }}
              </template>
              <template v-else-if="column.key === 'grant_benefit'">
                {{ formatCurrency(pos.grant_benefit) }}
              </template>
              <template v-else-if="column.key === 'grant_level_of_effort'">
                {{ fmtFte(pos.grant_level_of_effort) }}
              </template>
              <template v-else-if="column.key === 'cost_monthly'">
                {{ calcMonthlyCost(pos) }}
              </template>
              <template v-else-if="column.key === 'pos_actions'">
                <a-space>
                  <a-button v-if="authStore.canUpdate('grants')" size="small" type="link" @click="openEditPosition(pos, record)">Edit</a-button>
                  <a-button v-if="authStore.canDelete('grants')" size="small" type="link" danger @click="handleDeletePosition(pos)">Delete</a-button>
                </a-space>
              </template>
            </template>
            <template #emptyText>
              <span class="text-muted">No positions added yet</span>
            </template>
          </a-table>
        </template>
      </a-table>
    </a-card>

    <!-- Grant Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Grant' : 'Add Grant'"
      :footer="null"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Organization" required>
          <a-select v-model:value="form.organization" placeholder="Select organization">
            <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Grant Name" required>
          <a-input v-model:value="form.name" placeholder="e.g., UNICEF-EP" />
        </a-form-item>
        <a-form-item label="Grant Code" required>
          <a-input v-model:value="form.code" placeholder="e.g., B-24004" />
        </a-form-item>
        <a-form-item label="End Date">
          <a-date-picker v-model:value="form.end_date" style="width: 100%" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter grant description and objectives..." :rows="3" />
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Position Create/Edit Modal -->
    <a-modal
      v-model:open="posModalVisible"
      :title="editingPosition ? 'Edit Position' : 'Add Position'"
      :footer="null"
      :width="'min(95vw, 600px)'"
    >
      <a-form :model="posForm" layout="vertical" class="modal-form" @submit.prevent="handleSavePosition">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Position Title">
              <a-input v-model:value="posForm.grant_position" placeholder="e.g., Medic" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Budget Line Code">
              <a-input v-model:value="posForm.budgetline_code" placeholder="e.g., BL1234" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Salary (THB)">
              <a-input-number v-model:value="posForm.grant_salary" placeholder="0.00" style="width: 100%" :min="0" :precision="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Benefit (THB)">
              <a-input-number v-model:value="posForm.grant_benefit" placeholder="0.00" style="width: 100%" :min="0" :precision="2" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Effort (%)">
              <a-input-number
                v-model:value="posForm.effort_percent"
                placeholder="0"
                style="width: 100%"
                :min="0" :max="100" :precision="0"
                addon-after="%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Position Number">
              <a-input-number v-model:value="posForm.grant_position_number" placeholder="0" style="width: 100%" :min="0" :precision="0" />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="modal-footer">
          <a-button @click="posModalVisible = false">Cancel</a-button>
          <a-button v-if="!editingPosition" :loading="savingPosAnother" :disabled="savingPosition" @click="handleSavePositionAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingPosition" :disabled="savingPosAnother">{{ editingPosition ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Grant Record View Modal -->
    <a-modal
      v-model:open="viewModalVisible"
      :footer="null"
      :width="'min(95vw, 920px)'"
      :body-style="{ padding: 0, background: 'transparent' }"
      :closable="false"
      :mask-closable="true"
      wrap-class-name="record-view-modal"
      centered
    >
      <div v-if="viewLoading" class="view-loading-state">
        <a-spin tip="Loading record..." />
      </div>
      <div v-else-if="viewGrant" class="view-modal-wrap">
        <button class="view-close-btn" @click="viewModalVisible = false" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
        <RecordView
          :org="viewOrgConfig"
          :title="viewGrant.name"
          :ref-id="viewGrant.code"
          icon="report-money"
          badge="Grant Record"
          :status="viewStatusKey"
          :status-label="viewGrant.status"
          :status-meta="viewStatusMeta"
          :sections="viewSections"
          @print="handleViewPrint"
          @edit="openEditFromView"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { grantApi, grantItemApi } from '@/api'
import { ORG_OPTIONS, getOrgColor, ORG_RECORD_VIEW_CONFIG } from '@/constants/organizations'
import { formatCurrency, formatDate, fmtFte } from '@/utils/formatters'
import RecordView from '@/components/common/RecordView.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

// ---- Grant list state ----
const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const expandedKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ organization: undefined, name: '', code: '', end_date: null, description: '' })

// ---- Position modal state ----
const posModalVisible = ref(false)
const {
  savingMain: savingPosition,
  savingAnother: savingPosAnother,
  submitMain: submitPosition,
  submitAnother: submitPositionAnother,
} = useSaveAnother({ refresh: fetchItems, reset: resetPosForm })
const editingPosition = ref(null)
const positionGrantId = ref(null)
const posForm = reactive({
  grant_position: '', budgetline_code: '',
  grant_salary: null, grant_benefit: null,
  effort_percent: null, grant_position_number: null,
})

const columns = [
  { title: 'Organization', key: 'organization', align: 'center' },
  { title: 'Grant Code', key: 'code' },
  { title: 'Grant Name', dataIndex: 'name', ellipsis: true },
  { title: 'Description', dataIndex: 'description', ellipsis: true },
  { title: 'End Date', key: 'end_date' },
  { title: '', key: 'actions', align: 'right' },
]

const positionColumns = [
  { title: 'Position Title', dataIndex: 'grant_position' },
  { title: 'Budget Line Code', dataIndex: 'budgetline_code' },
  { title: 'Salary (THB)', key: 'grant_salary', align: 'right' },
  { title: 'Benefit (THB)', key: 'grant_benefit', align: 'right' },
  { title: 'Effort (%)', key: 'grant_level_of_effort', align: 'center' },
  { title: 'Position No.', dataIndex: 'grant_position_number', align: 'center' },
  { title: 'Cost Monthly', key: 'cost_monthly', align: 'right' },
  { title: '', key: 'pos_actions', align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} grants`,
  pageSizeOptions: ['10', '20', '50'],
}))

function calcMonthlyCost(pos) {
  const salary = Number(pos.grant_salary) || 0
  const benefit = Number(pos.grant_benefit) || 0
  const effort = Number(pos.grant_level_of_effort) || 0
  const count = Number(pos.grant_position_number) || 0
  const monthly = (salary + benefit) * effort * count
  return monthly ? formatCurrency(monthly) : '—'
}

// ---- Grant CRUD ----
async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
    }
    const { data } = await grantApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load grants') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

function resetForm() {
  Object.assign(form, { organization: undefined, name: '', code: '', end_date: null, description: '' })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    organization: record.organization || undefined,
    name: record.name || '',
    code: record.code || '',
    end_date: record.end_date || null,
    description: record.description || '',
  })
  modalVisible.value = true
}

function validateGrantForm() {
  if (!form.organization) { message.warning('Organization is required'); return false }
  if (!form.name) { message.warning('Grant name is required'); return false }
  if (!form.code) { message.warning('Grant code is required'); return false }
  return true
}

async function handleSave() {
  if (!validateGrantForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await grantApi.update(editingItem.value.id, { ...form })
      message.success('Grant updated')
    } else {
      await grantApi.store({ ...form })
      message.success('Grant created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateGrantForm()) return
  await submitAnother(async () => {
    await grantApi.store({ ...form })
    message.success('Grant created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Grant',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await grantApi.destroy(record.id)
        message.success('Grant deleted')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${selectedRowKeys.value.length} selected record(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await grantApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

// ---- Grant Position CRUD ----
function resetPosForm() {
  Object.assign(posForm, {
    grant_position: '', budgetline_code: '',
    grant_salary: null, grant_benefit: null,
    effort_percent: null, grant_position_number: null,
  })
}

function openCreatePosition(grant) {
  editingPosition.value = null
  positionGrantId.value = grant.id
  resetPosForm()
  posModalVisible.value = true
}

function openEditPosition(pos, grant) {
  editingPosition.value = pos
  positionGrantId.value = grant.id
  Object.assign(posForm, {
    grant_position: pos.grant_position || '',
    budgetline_code: pos.budgetline_code || '',
    grant_salary: pos.grant_salary != null ? Number(pos.grant_salary) : null,
    grant_benefit: pos.grant_benefit != null ? Number(pos.grant_benefit) : null,
    effort_percent: pos.grant_level_of_effort != null ? Math.round(Number(pos.grant_level_of_effort) * 100) : null,
    grant_position_number: pos.grant_position_number != null ? Number(pos.grant_position_number) : null,
  })
  posModalVisible.value = true
}

function buildPositionPayload() {
  return {
    grant_id: positionGrantId.value,
    grant_position: posForm.grant_position || null,
    budgetline_code: posForm.budgetline_code || null,
    grant_salary: posForm.grant_salary,
    grant_benefit: posForm.grant_benefit,
    grant_level_of_effort: posForm.effort_percent != null ? posForm.effort_percent / 100 : null,
    grant_position_number: posForm.grant_position_number,
  }
}

async function handleSavePosition() {
  await submitPosition(async () => {
    const payload = buildPositionPayload()
    if (editingPosition.value) {
      await grantItemApi.update(editingPosition.value.id, payload)
      message.success('Position updated')
    } else {
      await grantItemApi.store(payload)
      message.success('Position added')
    }
    posModalVisible.value = false
  })
}

async function handleSavePositionAndAddAnother() {
  await submitPositionAnother(async () => {
    await grantItemApi.store(buildPositionPayload())
    message.success('Position added — ready for next entry')
  })
}

function handleDeletePosition(pos) {
  Modal.confirm({
    title: 'Delete Position',
    content: `Are you sure you want to delete "${pos.grant_position || 'this position'}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await grantItemApi.destroy(pos.id)
        message.success('Position deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

// ---- Record View Modal ----
const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewGrant = ref(null)

const viewOrgConfig = computed(() => ORG_RECORD_VIEW_CONFIG[viewGrant.value?.organization] ?? null)

const viewStatusMap = { 'Active': 'active', 'Expired': 'expired', 'Ending Soon': 'ending-soon' }
const viewStatusKey = computed(() => viewStatusMap[viewGrant.value?.status] || 'active')

const viewStatusMeta = computed(() => {
  const g = viewGrant.value
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

const viewSections = computed(() => {
  const g = viewGrant.value
  if (!g) return []

  const result = []

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

  if (g.grant_items?.length > 0) {
    const grantItems = g.grant_items
    let totalLoe = 0, totalSalary = 0, totalBenefit = 0
    grantItems.forEach(item => {
      totalLoe += Number(item.grant_level_of_effort) || 0
      totalSalary += Number(item.grant_salary) || 0
      totalBenefit += Number(item.grant_benefit) || 0
    })

    result.push({
      title: 'Grant Items (Positions)', icon: 'list-details', type: 'table',
      headers: ['#', 'Position', 'Budgetline', 'LOE', 'Salary', 'Benefit'],
      aligns: { 0: 'text-center', 3: 'text-center', 4: 'text-right', 5: 'text-right' },
      monoCols: [0, 2, 3, 4, 5],
      rows: grantItems.map(item => [
        String(item.grant_position_number ?? '—'),
        item.grant_position ?? '—',
        item.budgetline_code ?? '—',
        fmtFte(item.grant_level_of_effort),
        item.grant_salary != null ? formatCurrency(item.grant_salary) : '—',
        item.grant_benefit != null ? formatCurrency(item.grant_benefit) : '—',
      ]),
      summary: {
        label: `Total (${grantItems.length} items)`,
        colspan: 3,
        values: [
          totalLoe ? totalLoe.toFixed(2) : '—',
          totalSalary ? formatCurrency(totalSalary) : '—',
          totalBenefit ? formatCurrency(totalBenefit) : '—',
        ],
      },
    })
  }

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

async function openView(record) {
  viewGrant.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await grantApi.show(record.id)
    viewGrant.value = data.data || data
  } catch {
    message.error('Failed to load grant details')
    viewModalVisible.value = false
  }
  viewLoading.value = false
}

function handleViewPrint() {
  window.print()
}

function openEditFromView() {
  const id = viewGrant.value?.id
  viewModalVisible.value = false
  if (id) {
    const record = items.value.find(i => i.id === id)
    if (record) openEdit(record)
  }
}

onMounted(() => {
  appStore.setPageMeta('Grants')
  fetchItems()
})
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.page-header-stats { display: flex; gap: 6px; }
.cell-code { font-weight: 600; }
.modal-form { margin-top: 16px; }

.expanded-add-btn {
  display: flex;
  justify-content: flex-end;
}

/* ── Record View Modal ── */
.view-loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 64px 0;
}
.view-modal-wrap {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
}
.view-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}
.view-close-btn:hover {
  background: rgba(255,255,255,0.35);
  color: #fff;
  transform: scale(1.08);
}
.view-close-btn:focus-visible {
  outline: 2px solid rgba(255,255,255,0.6);
  outline-offset: 2px;
}
</style>

