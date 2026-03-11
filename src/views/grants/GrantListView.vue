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
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('grants_list')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('grants_list')" type="primary" @click="openCreate">
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
        :row-selection="authStore.canDelete('grants_list') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :expandedRowKeys="expandedKeys"
        @expandedRowsChange="(keys) => expandedKeys = keys"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">
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
              <a-button v-if="authStore.canUpdate('grants_list')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('grants_list')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>

        <!-- Expanded row: Grant Positions -->
        <template #expandedRowRender="{ record }">
          <div class="expanded-section">
            <div class="expanded-header">
              <span class="expanded-title">Grant Positions</span>
              <a-button
                v-if="authStore.canCreate('grants_list')"
                size="small"
                type="primary"
                @click="openCreatePosition(record)"
              >
                <PlusOutlined /> Add Position
              </a-button>
            </div>
            <a-table
              :columns="positionColumns"
              :data-source="record.grant_items || []"
              :row-key="(r) => r.id"
              :pagination="false"
              size="small"
              :bordered="true"
            >
              <template #bodyCell="{ column, record: pos }">
                <template v-if="column.key === 'grant_salary'">
                  {{ pos.grant_salary ? `฿${Number(pos.grant_salary).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—' }}
                </template>
                <template v-else-if="column.key === 'grant_benefit'">
                  {{ pos.grant_benefit ? `฿${Number(pos.grant_benefit).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—' }}
                </template>
                <template v-else-if="column.key === 'grant_level_of_effort'">
                  {{ pos.grant_level_of_effort != null ? `${(Number(pos.grant_level_of_effort) * 100).toFixed(0)}%` : '—' }}
                </template>
                <template v-else-if="column.key === 'cost_monthly'">
                  {{ calcMonthlyCost(pos) }}
                </template>
                <template v-else-if="column.key === 'pos_actions'">
                  <a-space>
                    <a-button v-if="authStore.canUpdate('grants_list')" size="small" type="link" @click="openEditPosition(pos, record)">Edit</a-button>
                    <a-button v-if="authStore.canDelete('grants_list')" size="small" type="link" danger @click="handleDeletePosition(pos)">Delete</a-button>
                  </a-space>
                </template>
              </template>
              <template #emptyText>
                <span class="text-muted">No positions added yet</span>
              </template>
            </a-table>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- Grant Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Grant' : 'Add Grant'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Organization" required>
          <a-select v-model:value="form.organization" placeholder="Select organization">
            <a-select-option value="SMRU">SMRU</a-select-option>
            <a-select-option value="BHF">BHF</a-select-option>
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
      </a-form>
    </a-modal>

    <!-- Position Create/Edit Modal -->
    <a-modal
      v-model:open="posModalVisible"
      :title="editingPosition ? 'Edit Position' : 'Add Position'"
      @ok="handleSavePosition"
      :confirm-loading="savingPosition"
      :width="'min(95vw, 600px)'"
    >
      <a-form :model="posForm" layout="vertical" class="modal-form">
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
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { grantApi, grantItemApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

// ---- Grant list state ----
const items = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const expandedKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ organization: undefined, name: '', code: '', end_date: null, description: '' })

// ---- Position modal state ----
const posModalVisible = ref(false)
const savingPosition = ref(false)
const editingPosition = ref(null)
const positionGrantId = ref(null)
const posForm = reactive({
  grant_position: '', budgetline_code: '',
  grant_salary: null, grant_benefit: null,
  effort_percent: null, grant_position_number: null,
})

const columns = [
  { title: 'Organization', key: 'organization', width: 120, align: 'center' },
  { title: 'Grant Code', key: 'code', width: 150 },
  { title: 'Grant Name', dataIndex: 'name', ellipsis: true },
  { title: 'End Date', key: 'end_date', width: 140 },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const positionColumns = [
  { title: 'Position Title', dataIndex: 'grant_position', width: 160 },
  { title: 'Budget Line Code', dataIndex: 'budgetline_code', width: 140 },
  { title: 'Salary (THB)', key: 'grant_salary', width: 130, align: 'right' },
  { title: 'Benefit (THB)', key: 'grant_benefit', width: 130, align: 'right' },
  { title: 'Effort (%)', key: 'grant_level_of_effort', width: 100, align: 'center' },
  { title: 'Position No.', dataIndex: 'grant_position_number', width: 110, align: 'center' },
  { title: 'Cost Monthly', key: 'cost_monthly', width: 130, align: 'right' },
  { title: '', key: 'pos_actions', width: 130, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} grants`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatDate(d) { return d ? dayjs(d).format('DD/MM/YYYY') : '—' }

function calcMonthlyCost(pos) {
  const salary = Number(pos.grant_salary) || 0
  const benefit = Number(pos.grant_benefit) || 0
  const effort = Number(pos.grant_level_of_effort) || 0
  const count = Number(pos.grant_position_number) || 0
  const monthly = (salary + benefit) * effort * count
  return monthly ? `฿${monthly.toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'
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

async function handleSave() {
  if (!form.organization) return message.warning('Organization is required')
  if (!form.name) return message.warning('Grant name is required')
  if (!form.code) return message.warning('Grant code is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await grantApi.update(editingItem.value.id, { ...form })
      message.success('Grant updated')
    } else {
      await grantApi.store({ ...form })
      message.success('Grant created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  }
  saving.value = false
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

async function handleSavePosition() {
  savingPosition.value = true
  try {
    const payload = {
      grant_id: positionGrantId.value,
      grant_position: posForm.grant_position || null,
      budgetline_code: posForm.budgetline_code || null,
      grant_salary: posForm.grant_salary,
      grant_benefit: posForm.grant_benefit,
      grant_level_of_effort: posForm.effort_percent != null ? posForm.effort_percent / 100 : null,
      grant_position_number: posForm.grant_position_number,
    }
    if (editingPosition.value) {
      await grantItemApi.update(editingPosition.value.id, payload)
      message.success('Position updated')
    } else {
      await grantItemApi.store(payload)
      message.success('Position added')
    }
    posModalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save position')
  }
  savingPosition.value = false
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

.expanded-section {
  padding: 4px 0;
}
.expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.expanded-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
