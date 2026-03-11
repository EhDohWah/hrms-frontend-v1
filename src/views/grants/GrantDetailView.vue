<template>
  <div class="page-container">
    <a-spin :spinning="loading">
      <!-- Header -->
      <div class="detail-header">
        <div>
          <a-button type="text" @click="$router.push({ name: 'grants' })">
            <ArrowLeftOutlined /> Back to Grants
          </a-button>
          <h2 class="detail-title" v-if="grant">
            {{ grant.name }}
            <span class="detail-code font-mono">{{ grant.code }}</span>
          </h2>
        </div>
        <a-space v-if="grant && authStore.canUpdate('grants_list')">
          <a-button @click="openEditGrant">Edit Grant</a-button>
        </a-space>
      </div>

      <template v-if="grant">
        <!-- Info Cards -->
        <a-row :gutter="16" class="info-row">
          <a-col :span="6">
            <a-card size="small">
              <div class="stat-label">Organization</div>
              <a-tag :color="grant.organization === 'SMRU' ? 'blue' : 'green'">{{ grant.organization }}</a-tag>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Grant Code" :value="grant.code" class="font-mono" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="End Date" :value="formatDate(grant.end_date)" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Positions" :value="(grant.grant_items || []).length" />
            </a-card>
          </a-col>
        </a-row>

        <a-card size="small" title="Description" style="margin-bottom: 16px;" v-if="grant.description">
          <p>{{ grant.description }}</p>
        </a-card>

        <!-- Grant Positions Table -->
        <a-card title="Grant Positions" :body-style="{ padding: 0 }">
          <template #extra>
            <a-button v-if="authStore.canCreate('grants_list')" size="small" type="primary" @click="openCreatePosition">
              <PlusOutlined /> Add Position
            </a-button>
          </template>
          <a-table
            :columns="positionColumns"
            :data-source="grant.grant_items || []"
            :row-key="(r) => r.id"
            :pagination="false"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'budgetline_code'">
                <a-tag v-if="record.budgetline_code" color="blue" size="small">{{ record.budgetline_code }}</a-tag>
                <span v-else class="text-muted">—</span>
              </template>
              <template v-else-if="column.key === 'grant_salary'">
                {{ record.grant_salary ? `฿${Number(record.grant_salary).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—' }}
              </template>
              <template v-else-if="column.key === 'grant_benefit'">
                {{ record.grant_benefit ? `฿${Number(record.grant_benefit).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—' }}
              </template>
              <template v-else-if="column.key === 'grant_level_of_effort'">
                {{ record.grant_level_of_effort != null ? `${(Number(record.grant_level_of_effort) * 100).toFixed(0)}%` : '—' }}
              </template>
              <template v-else-if="column.key === 'cost_monthly'">
                {{ calcMonthlyCost(record) }}
              </template>
              <template v-else-if="column.key === 'cost_yearly'">
                {{ calcYearlyCost(record) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button v-if="authStore.canUpdate('grants_list')" size="small" type="link" @click="openEditPosition(record)">Edit</a-button>
                  <a-button v-if="authStore.canDelete('grants_list')" size="small" type="link" danger @click="handleDeletePosition(record)">Delete</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </template>
    </a-spin>

    <!-- Edit Grant Modal -->
    <a-modal
      v-model:open="grantModalVisible"
      title="Edit Grant"
      @ok="handleSaveGrant"
      :confirm-loading="savingGrant"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="grantForm" layout="vertical" class="modal-form">
        <a-form-item label="Organization" required>
          <a-select v-model:value="grantForm.organization" placeholder="Select organization">
            <a-select-option value="SMRU">SMRU</a-select-option>
            <a-select-option value="BHF">BHF</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Grant Name" required>
          <a-input v-model:value="grantForm.name" placeholder="e.g., UNICEF-EP" />
        </a-form-item>
        <a-form-item label="Grant Code" required>
          <a-input v-model:value="grantForm.code" placeholder="e.g., B-24004" />
        </a-form-item>
        <a-form-item label="End Date">
          <a-date-picker v-model:value="grantForm.end_date" style="width: 100%" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="grantForm.description" placeholder="Enter description..." :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Position Modal -->
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
              <a-input-number v-model:value="posForm.effort_percent" placeholder="0" style="width: 100%" :min="0" :max="100" :precision="0" />
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
import { ref, reactive, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { grantApi, grantItemApi } from '@/api'

const dayjs = inject('$dayjs')
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const grant = ref(null)
const loading = ref(false)

// Grant edit
const grantModalVisible = ref(false)
const savingGrant = ref(false)
const grantForm = reactive({ organization: undefined, name: '', code: '', end_date: null, description: '' })

// Position edit
const posModalVisible = ref(false)
const savingPosition = ref(false)
const editingPosition = ref(null)
const posForm = reactive({
  grant_position: '', budgetline_code: '',
  grant_salary: null, grant_benefit: null,
  effort_percent: null, grant_position_number: null,
})

const positionColumns = [
  { title: 'Position Title', dataIndex: 'grant_position', width: 160 },
  { title: 'Budget Line', key: 'budgetline_code', width: 130 },
  { title: 'Salary (THB)', key: 'grant_salary', width: 130, align: 'right' },
  { title: 'Benefit (THB)', key: 'grant_benefit', width: 130, align: 'right' },
  { title: 'Effort (%)', key: 'grant_level_of_effort', width: 100, align: 'center' },
  { title: 'Position No.', dataIndex: 'grant_position_number', width: 110, align: 'center' },
  { title: 'Cost Monthly', key: 'cost_monthly', width: 140, align: 'right' },
  { title: 'Cost Yearly', key: 'cost_yearly', width: 140, align: 'right' },
  { title: '', key: 'actions', width: 130, align: 'right' },
]

function formatDate(d) { return d ? dayjs(d).format('DD/MM/YYYY') : '—' }

function calcMonthlyCost(pos) {
  const salary = Number(pos.grant_salary) || 0
  const benefit = Number(pos.grant_benefit) || 0
  const effort = Number(pos.grant_level_of_effort) || 0
  const count = Number(pos.grant_position_number) || 0
  const monthly = (salary + benefit) * effort * count
  return monthly ? `฿${monthly.toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'
}

function calcYearlyCost(pos) {
  const salary = Number(pos.grant_salary) || 0
  const benefit = Number(pos.grant_benefit) || 0
  const effort = Number(pos.grant_level_of_effort) || 0
  const count = Number(pos.grant_position_number) || 0
  const yearly = (salary + benefit) * effort * count * 12
  return yearly ? `฿${yearly.toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'
}

async function fetchGrant() {
  loading.value = true
  try {
    const { data } = await grantApi.show(route.params.id)
    grant.value = data.data || data
    appStore.setPageMeta(`Grant: ${grant.value.code}`)
  } catch {
    message.error('Failed to load grant')
    router.push({ name: 'grants' })
  }
  loading.value = false
}

// ---- Grant Edit ----
function openEditGrant() {
  const g = grant.value
  Object.assign(grantForm, {
    organization: g.organization || undefined,
    name: g.name || '',
    code: g.code || '',
    end_date: g.end_date || null,
    description: g.description || '',
  })
  grantModalVisible.value = true
}

async function handleSaveGrant() {
  if (!grantForm.organization) return message.warning('Organization is required')
  if (!grantForm.name) return message.warning('Name is required')
  if (!grantForm.code) return message.warning('Code is required')
  savingGrant.value = true
  try {
    await grantApi.update(route.params.id, { ...grantForm })
    message.success('Grant updated')
    grantModalVisible.value = false
    fetchGrant()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to update')
  }
  savingGrant.value = false
}

// ---- Position CRUD ----
function resetPosForm() {
  Object.assign(posForm, {
    grant_position: '', budgetline_code: '',
    grant_salary: null, grant_benefit: null,
    effort_percent: null, grant_position_number: null,
  })
}

function openCreatePosition() {
  editingPosition.value = null
  resetPosForm()
  posModalVisible.value = true
}

function openEditPosition(record) {
  editingPosition.value = record
  Object.assign(posForm, {
    grant_position: record.grant_position || '',
    budgetline_code: record.budgetline_code || '',
    grant_salary: record.grant_salary != null ? Number(record.grant_salary) : null,
    grant_benefit: record.grant_benefit != null ? Number(record.grant_benefit) : null,
    effort_percent: record.grant_level_of_effort != null ? Math.round(Number(record.grant_level_of_effort) * 100) : null,
    grant_position_number: record.grant_position_number != null ? Number(record.grant_position_number) : null,
  })
  posModalVisible.value = true
}

async function handleSavePosition() {
  savingPosition.value = true
  try {
    const payload = {
      grant_id: Number(route.params.id),
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
    fetchGrant()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save position')
  }
  savingPosition.value = false
}

function handleDeletePosition(record) {
  Modal.confirm({
    title: 'Delete Position',
    content: `Are you sure you want to delete "${record.grant_position || 'this position'}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await grantItemApi.destroy(record.id)
        message.success('Position deleted')
        fetchGrant()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Grant Detail')
  fetchGrant()
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
.detail-code {
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
.modal-form { margin-top: 16px; }
</style>
