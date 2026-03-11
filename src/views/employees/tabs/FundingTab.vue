<template>
  <div>
    <div class="section-header" style="margin-bottom: 12px;">
      <div class="fte-summary">
        Funding Allocations
        <a-tag
          v-if="totalFte > 0"
          :color="totalFte === 100 ? 'green' : 'orange'"
          style="margin-left: 8px;"
        >{{ totalFte }}% FTE</a-tag>
      </div>
      <a-button v-if="canUpdate && employee.employment && employee.employee_funding_allocations?.length" size="small" type="primary" @click="openManageAllocations">
        <EditOutlined /> Manage Allocations
      </a-button>
    </div>

    <a-table
      v-if="employee.employee_funding_allocations?.length"
      :columns="fundingColumns"
      :data-source="employee.employee_funding_allocations"
      :row-key="(r) => r.id"
      :pagination="false"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'grant'">
          {{ record.grant_item?.grant?.name || '—' }}
          <div class="cell-sub">{{ record.grant_item?.grant?.code || '' }}</div>
        </template>
        <template v-else-if="column.key === 'position'">
          {{ record.grant_item?.grant_position || '—' }}
        </template>
        <template v-else-if="column.key === 'budgetline'">
          <span class="font-mono">{{ record.grant_item?.budgetline_code || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'fte'">
          <span class="font-mono">{{ record.fte != null ? `${(record.fte * 100).toFixed(0)}%` : '—' }}</span>
        </template>
        <template v-else-if="column.key === 'amount'">
          <span class="font-mono">{{ formatCurrency(record.allocated_amount) || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="allocationStatusColor(record.status)" size="small">{{ record.status }}</a-tag>
        </template>
      </template>
    </a-table>
    <a-empty v-else-if="!employee.employment" description="Add an employment record first to manage funding allocations" />
    <a-empty v-else description="No funding allocations">
      <a-button v-if="canCreate" type="primary" size="small" @click="openManageAllocations">
        <PlusOutlined /> Add Allocation
      </a-button>
    </a-empty>

    <!-- Manage Funding Allocations Modal -->
    <a-modal
      v-model:open="allocationModalVisible"
      title="Manage Funding Allocations"
      :width="'min(95vw, 1200px)'"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
      :footer="null"
      :maskClosable="false"
    >
      <div class="alloc-modal-header">
        <div class="fte-summary">
          <span>Allocations</span>
          <a-tag
            v-if="editFteTotal > 0"
            :color="editFteTotal === 100 ? 'green' : 'orange'"
            style="margin-left: 8px;"
          >{{ editFteTotal }}% FTE</a-tag>
          <span v-if="editFteTotal > 0 && editFteTotal !== 100" class="fte-hint">
            (must total 100%)
          </span>
        </div>
        <a-button size="small" @click="addAllocRow"><PlusOutlined /> Add Row</a-button>
      </div>

      <a-table
        :columns="editAllocColumns"
        :data-source="allocRows"
        :row-key="(r) => r._key"
        :pagination="false"
        :scroll="{ x: 1130 }"
        size="small"
        class="alloc-edit-table"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'grant'">
            <a-select
              v-model:value="record.grant_id"
              placeholder="Search grant name or code..."
              show-search
              :filter-option="filterGrantOption"
              :loading="loadingGrantStructure"
              style="width: 100%"
              size="small"
              :dropdown-match-select-width="false"
              :dropdown-style="{ minWidth: '420px' }"
              @change="onAllocGrantChange(record)"
            >
              <a-select-option
                v-for="opt in grantOptions"
                :key="opt.value"
                :value="opt.value"
                :label="opt.searchText"
              >
                <div class="grant-option">
                  <span class="grant-option-name">{{ opt.name }}</span>
                  <a-tag :color="opt.organization === 'SMRU' ? 'blue' : 'green'" size="small" class="grant-option-org">{{ opt.organization }}</a-tag>
                </div>
                <div class="grant-option-code">{{ opt.code }}</div>
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'position'">
            <a-select
              v-model:value="record.grant_item_id"
              placeholder="Search position..."
              show-search
              option-filter-prop="label"
              :options="getGrantItemOptions(record.grant_id)"
              :disabled="!record.grant_id"
              style="width: 100%"
              size="small"
              @change="onAllocItemChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'budgetline'">
            <span class="font-mono cell-sub">{{ getRowBudgetLine(record) }}</span>
          </template>
          <template v-else-if="column.key === 'fte'">
            <a-input-number
              v-model:value="record.fte"
              :min="0.01"
              :max="100"
              :precision="2"
              style="width: 100%; min-width: 80px"
              size="small"
              placeholder="100"
              suffix="%"
              @change="onAllocFteChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'amount'">
            <span class="font-mono">{{ record.previewAmount != null ? formatCurrency(record.previewAmount) : '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-switch
              v-if="record._id"
              :checked="record.status === 'active'"
              checked-children="Active"
              un-checked-children="Inactive"
              size="small"
              @change="(val) => record.status = val ? 'active' : 'inactive'"
            />
            <a-tag v-else color="green" size="small">active</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="link" size="small" danger @click="removeAllocRow(index)"><DeleteOutlined /></a-button>
          </template>
        </template>
      </a-table>

      <div class="alloc-modal-footer">
        <a-button @click="allocationModalVisible = false">Cancel</a-button>
        <a-button type="primary" :loading="savingAllocation" @click="saveAllocations">
          Save Allocations
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { fundingAllocationApi } from '@/api'
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const authStore = useAuthStore()

const props = defineProps({
  employee: { type: Object, required: true },
})

const emit = defineEmits(['refresh'])

const canCreate = computed(() => authStore.canCreate('employee_funding_allocations'))
const canUpdate = computed(() => authStore.canUpdate('employee_funding_allocations'))

// ---- Table Columns ----
const fundingColumns = [
  { title: 'Grant', key: 'grant', width: 260 },
  { title: 'Grant Position', key: 'position', width: 200 },
  { title: 'Budget Line', key: 'budgetline', width: 130 },
  { title: 'FTE %', key: 'fte', width: 90, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 90 },
]

const editAllocColumns = [
  { title: 'Grant', key: 'grant', width: 360, fixed: 'left' },
  { title: 'Grant Position', key: 'position', width: 220 },
  { title: 'Budget Line', key: 'budgetline', width: 110 },
  { title: 'FTE %', key: 'fte', width: 110, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 80 },
  { title: '', key: 'actions', width: 50, align: 'center' },
]

// ---- Allocation State ----
const allocationModalVisible = ref(false)
const savingAllocation = ref(false)
const grantStructure = ref([])
const loadingGrantStructure = ref(false)
const allocRows = ref([])
let allocRowKey = 0
let originalAllocIds = []

const totalFte = computed(() => {
  const allocs = props.employee?.employee_funding_allocations || []
  const sum = allocs
    .filter(a => a.status === 'active')
    .reduce((s, a) => s + (Number(a.fte) || 0), 0)
  return Math.round(sum * 100)
})

const editFteTotal = computed(() => {
  return Math.round(allocRows.value
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + (Number(r.fte) || 0), 0))
})

const grantOptions = computed(() => {
  const opts = grantStructure.value.map(g => ({
    value: Number(g.id),
    name: g.name,
    code: g.code,
    organization: g.organization || '—',
    searchText: `${g.name} ${g.code} ${g.organization || ''}`,
  }))
  for (const row of allocRows.value) {
    if (row.grant_id != null && row._grant_label && !opts.some(o => o.value === row.grant_id)) {
      opts.push({ value: row.grant_id, name: row._grant_label, code: '', organization: '—', searchText: row._grant_label })
    }
  }
  return opts
})

// ---- Helpers ----
function formatCurrency(val) {
  if (val == null) return null
  return `฿${Number(val).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function allocationStatusColor(status) {
  if (status === 'active') return 'green'
  if (status === 'inactive') return 'orange'
  if (status === 'closed') return 'default'
  return 'default'
}

function filterGrantOption(input, option) {
  const search = input.toLowerCase()
  const opt = grantOptions.value.find(o => o.value === option.value)
  return opt?.searchText?.toLowerCase().includes(search) ?? false
}

function getGrantItems(grantId) {
  if (!grantId) return []
  const grant = grantStructure.value.find(g => Number(g.id) === Number(grantId))
  return grant?.grant_items || []
}

function getGrantItemOptions(grantId) {
  const items = getGrantItems(grantId)
  const opts = items.map(gi => ({
    value: Number(gi.id),
    label: gi.grant_position || gi.name || `Position ${gi.id}`,
  }))
  for (const row of allocRows.value) {
    if (Number(row.grant_id) === Number(grantId) && row.grant_item_id != null) {
      if (!opts.some(o => o.value === row.grant_item_id)) {
        opts.push({
          value: row.grant_item_id,
          label: row._position_label || `Position ${row.grant_item_id}`,
        })
      }
    }
  }
  return opts
}

function getRowBudgetLine(row) {
  if (!row.grant_id || !row.grant_item_id) return 'Auto'
  const items = getGrantItems(row.grant_id)
  const item = items.find(gi => Number(gi.id) === Number(row.grant_item_id))
  return item?.budgetline_code || 'Auto'
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  const errors = resp?.errors

  // Backend returns { message, errors: [...] } for allocation failures
  if (Array.isArray(errors) && errors.length) {
    Modal.error({
      title: resp.message || fallback,
      content: errors.join('\n'),
    })
  } else if (errors && typeof errors === 'object') {
    // Laravel validation errors: { field: ['msg'] }
    const firstErr = Object.values(errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

// ---- Grant Structure ----
async function loadGrantStructureData() {
  if (grantStructure.value.length) return
  loadingGrantStructure.value = true
  try {
    const { data } = await fundingAllocationApi.grantStructure()
    grantStructure.value = data.data?.grants || data.grants || data.data || []
  } catch { /* silent */ }
  loadingGrantStructure.value = false
}

// ---- Allocation Row Management ----
function makeAllocRow(existing) {
  allocRowKey++
  if (existing) {
    const gi = existing.grant_item
    const g = gi?.grant
    return {
      _key: `existing-${existing.id}`,
      _id: existing.id,
      grant_id: g?.id != null ? Number(g.id) : undefined,
      grant_item_id: existing.grant_item_id != null ? Number(existing.grant_item_id) : (gi?.id != null ? Number(gi.id) : undefined),
      _grant_label: g ? `${g.name} (${g.code})` : undefined,
      _position_label: gi?.grant_position || gi?.name || undefined,
      fte: existing.fte != null ? Math.round(Number(existing.fte) * 100) : null,
      previewAmount: existing.allocated_amount != null ? Number(existing.allocated_amount) : null,
      status: existing.status || 'active',
    }
  }
  return {
    _key: `new-${allocRowKey}`,
    _id: null,
    grant_id: undefined,
    grant_item_id: undefined,
    _grant_label: undefined,
    _position_label: undefined,
    fte: null,
    previewAmount: null,
    status: 'active',
  }
}

async function openManageAllocations() {
  await loadGrantStructureData()
  const allocs = props.employee?.employee_funding_allocations || []
  if (allocs.length) {
    allocRows.value = allocs.map(a => makeAllocRow(a))
    originalAllocIds = allocs.map(a => a.id)
  } else {
    allocRows.value = [makeAllocRow(null)]
    originalAllocIds = []
  }
  allocationModalVisible.value = true
}

function addAllocRow() {
  allocRows.value.push(makeAllocRow(null))
}

function removeAllocRow(index) {
  if (allocRows.value.length <= 1) {
    Modal.confirm({
      title: 'Remove all allocations?',
      content: 'This will delete all funding allocations for this employee.',
      okText: 'Remove',
      okType: 'danger',
      onOk: () => { allocRows.value.splice(index, 1) },
    })
    return
  }
  allocRows.value.splice(index, 1)
}

function onAllocGrantChange(row) {
  row.grant_item_id = undefined
  row._position_label = undefined
  row.previewAmount = null
}

function onAllocItemChange(row) {
  if (row.fte) fetchPreviewAmount(row)
}

async function onAllocFteChange(row) {
  if (row.fte && row.grant_item_id) {
    fetchPreviewAmount(row)
  } else {
    row.previewAmount = null
  }
}

async function fetchPreviewAmount(row) {
  if (!props.employee?.employment?.id || !row.fte) return
  try {
    const { data } = await fundingAllocationApi.calculatePreview({
      employment_id: props.employee.employment.id,
      fte: row.fte,
    })
    row.previewAmount = data.data?.allocated_amount ?? null
  } catch {
    const emp = props.employee.employment
    const salary = Number(emp.pass_probation_salary) || Number(emp.probation_salary) || 0
    row.previewAmount = salary ? Math.round(salary * (row.fte / 100) * 100) / 100 : null
  }
}

async function saveAllocations() {
  for (const row of allocRows.value) {
    if (!row.grant_item_id) return message.warning('Please select a Grant Position for all rows')
    if (!row.fte || row.fte <= 0) return message.warning('FTE must be greater than 0 for all rows')
  }

  savingAllocation.value = true
  try {
    const existingRows = allocRows.value.filter(r => r._id)
    const newRows = allocRows.value.filter(r => !r._id)
    const currentIds = existingRows.map(r => r._id)
    const deletedIds = originalAllocIds.filter(id => !currentIds.includes(id))

    await fundingAllocationApi.batchUpdate({
      employee_id: props.employee.id,
      employment_id: props.employee.employment.id,
      updates: existingRows.map(r => ({
        id: r._id,
        grant_item_id: r.grant_item_id,
        fte: r.fte,
        status: r.status,
      })),
      creates: newRows.map(r => ({
        grant_item_id: r.grant_item_id,
        fte: r.fte,
      })),
      deletes: deletedIds,
    })

    message.success('Funding allocations saved')
    allocationModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save allocations')
  }
  savingAllocation.value = false
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.fte-summary {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.fte-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}
.cell-sub { font-size: 11.5px; color: var(--color-text-muted); font-family: 'JetBrains Mono', monospace; }

.alloc-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.alloc-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light, #f0f0f0);
}

.alloc-edit-table :deep(.ant-table-cell) {
  padding: 6px 8px !important;
  vertical-align: middle;
}
.alloc-edit-table :deep(.ant-select-selector),
.alloc-edit-table :deep(.ant-input-number) {
  font-size: 13px;
}

.grant-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.grant-option-name {
  font-weight: 500;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grant-option-org {
  flex-shrink: 0;
  margin: 0;
}
.grant-option-code {
  font-size: 11.5px;
  color: var(--color-text-muted);
  font-family: 'JetBrains Mono', monospace;
}
</style>
