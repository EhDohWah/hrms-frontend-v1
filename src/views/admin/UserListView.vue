<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search users..."
          allow-clear
          style="width: 220px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="roleFilter"
          placeholder="All Roles"
          allow-clear
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="r in roleOptions" :key="r.value" :value="r.value">
            {{ r.label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="statusFilter"
          placeholder="All Status"
          allow-clear
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="active">Active</a-select-option>
          <a-select-option value="inactive">Inactive</a-select-option>
        </a-select>
        <a-button v-if="authStore.canCreate('users')" type="primary" @click="openCreate">
          <PlusOutlined /> Add User
        </a-button>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedRowKeys.length > 0 && authStore.canUpdate('users')" class="bulk-bar">
      <span class="bulk-count">{{ selectedRowKeys.length }} selected</span>
      <a-button size="small" @click="handleBulkStatus('active')">Activate</a-button>
      <a-button size="small" @click="handleBulkStatus('inactive')">Deactivate</a-button>
      <a-select
        placeholder="Assign role..."
        size="small"
        style="width: 160px"
        @change="handleBulkRole"
      >
        <a-select-option v-for="r in roleOptions" :key="r.value" :value="r.value">
          {{ r.label }}
        </a-select-option>
      </a-select>
      <a-button size="small" type="link" @click="selectedRowKeys = []">Clear</a-button>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :row-selection="authStore.canUpdate('users') ? { selectedRowKeys, onChange: onSelectChange } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div style="display: flex; align-items: center; gap: 8px">
              <a-avatar :src="record.profile_picture" :size="28">
                {{ record.name?.charAt(0)?.toUpperCase() }}
              </a-avatar>
              <span>{{ record.name }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag color="blue">{{ record.roles?.[0]?.name || 'No Role' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'" size="small">
              {{ record.status || 'active' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'last_login_at'">
            {{ record.last_login_at ? formatDate(record.last_login_at) : 'Never' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="authStore.canUpdate('users')"
                size="small"
                type="link"
                @click="openEdit(record)"
              >
                Edit
              </a-button>
              <a-button
                v-if="authStore.canUpdate('users')"
                size="small"
                type="link"
                @click="$router.push({ name: 'admin-user-permissions', params: { id: record.id } })"
              >
                Permissions
              </a-button>
              <a-button
                v-if="authStore.canDelete('users')"
                size="small"
                type="link"
                danger
                @click="handleDelete(record)"
              >
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit User' : 'Add User'"
      :footer="null"
      :width="520"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Full Name" required>
          <a-input v-model:value="form.name" placeholder="Enter full name" />
        </a-form-item>
        <a-form-item label="Email" required>
          <a-input v-model:value="form.email" placeholder="Enter email address" type="email" />
        </a-form-item>
        <a-form-item v-if="!editingItem" label="Password" required>
          <a-input-password v-model:value="form.password" placeholder="Choose a strong password" />
        </a-form-item>
        <PasswordRequirements v-if="!editingItem" :password="form.password" />
        <a-form-item v-if="!editingItem" label="Confirm Password" required>
          <a-input-password v-model:value="form.password_confirmation" placeholder="Confirm password" />
        </a-form-item>
        <a-form-item v-if="editingItem" label="New Password (leave blank to keep current)">
          <a-input-password v-model:value="form.password" placeholder="Enter new password" />
        </a-form-item>
        <PasswordRequirements v-if="editingItem && form.password" :password="form.password" />
        <a-form-item v-if="editingItem && form.password" label="Confirm New Password" required>
          <a-input-password v-model:value="form.password_confirmation" placeholder="Confirm new password" />
        </a-form-item>
        <a-form-item label="Role" required>
          <a-select v-model:value="form.role" placeholder="Select role">
            <a-select-option v-for="r in roleOptions" :key="r.value" :value="r.value">
              {{ r.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { adminApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import PasswordRequirements from '@/components/common/PasswordRequirements.vue'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const roleOptions = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const roleFilter = ref(undefined)
const statusFilter = ref(undefined)
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: undefined,
})

const { allMet: pwAllMet } = usePasswordStrength(() => form.password)

watch(() => form.password, (val) => {
  if (!val) form.password_confirmation = ''
})

const columns = [
  { title: 'Name', key: 'name', width: 220 },
  { title: 'Email', dataIndex: 'email', width: 240 },
  { title: 'Role', key: 'role', width: 150 },
  { title: 'Status', key: 'status', width: 100, align: 'center' },
  { title: 'Last Login', key: 'last_login_at', width: 120 },
  { title: '', key: 'actions', width: 220, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} users`,
  pageSizeOptions: ['10', '20', '50'],
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(roleFilter.value && { role: roleFilter.value }),
      ...(statusFilter.value && { status: statusFilter.value }),
    }
    const { data } = await adminApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load users')
  }
  loading.value = false
}

async function fetchRoleOptions() {
  try {
    const { data } = await adminApi.roleOptions()
    roleOptions.value = data.data || data || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load roles')
  }
}

// ── Bulk actions ──
const selectedRowKeys = ref([])

function onSelectChange(keys) {
  selectedRowKeys.value = keys
}

async function handleBulkStatus(status) {
  if (!selectedRowKeys.value.length) return
  Modal.confirm({
    title: `${status === 'active' ? 'Activate' : 'Deactivate'} ${selectedRowKeys.value.length} users?`,
    onOk: async () => {
      try {
        await adminApi.bulkStatus({ user_ids: selectedRowKeys.value, status })
        message.success(`${selectedRowKeys.value.length} users updated`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Bulk action failed')
      }
    },
  })
}

async function handleBulkRole(roleName) {
  if (!selectedRowKeys.value.length || !roleName) return
  Modal.confirm({
    title: `Assign role "${roleName}" to ${selectedRowKeys.value.length} users?`,
    onOk: async () => {
      try {
        await adminApi.bulkRole({ user_ids: selectedRowKeys.value, role: roleName })
        message.success(`Role assigned to ${selectedRowKeys.value.length} users`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Bulk action failed')
      }
    },
  })
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
  Object.assign(form, { name: '', email: '', password: '', password_confirmation: '', role: undefined })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    name: record.name || '',
    email: record.email || '',
    password: '',
    password_confirmation: '',
    role: record.roles?.[0]?.name || undefined,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.name || !form.email || !form.role) { message.warning('Name, email, and role are required'); return false }
  if (!editingItem.value && !form.password) { message.warning('Password is required'); return false }
  if (form.password) {
    if (!pwAllMet.value) { message.warning('Password does not meet all requirements'); return false }
    if (!form.password_confirmation) { message.warning('Please confirm the new password'); return false }
    if (form.password !== form.password_confirmation) { message.warning('Passwords do not match'); return false }
  }
  return true
}

function buildPayload() {
  const payload = { name: form.name, email: form.email, role: form.role }
  if (form.password) {
    payload.password = form.password
    payload.password_confirmation = form.password_confirmation
  }
  return payload
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await adminApi.update(editingItem.value.id, buildPayload())
      message.success('User updated')
      // Refresh auth store when editing own account so header/profile update immediately
      if (editingItem.value.id === authStore.user?.id) {
        await Promise.all([authStore.fetchUser(), authStore.fetchPermissions()])
      }
    } else {
      await adminApi.store(buildPayload())
      message.success('User created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await adminApi.store(buildPayload())
    message.success('User created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete User',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okType: 'danger',
    onOk: async () => {
      try {
        await adminApi.destroy(record.id)
        message.success('User deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('User Management')
  fetchItems()
  fetchRoleOptions()
})
</script>

