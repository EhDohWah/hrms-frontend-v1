<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ items.length }} Roles</a-tag>
      </div>
      <div class="filter-bar">
        <a-button v-if="authStore.canCreate('roles')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Role
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :row-key="(r) => r.id"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div style="display: flex; align-items: center; gap: 8px">
              <LockOutlined v-if="record.is_protected" style="color: #faad14" />
              <span>{{ record.display_name }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'slug'">
            <code style="font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px">
              {{ record.name }}
            </code>
          </template>
          <template v-else-if="column.key === 'users_count'">
            <a-tag>{{ record.users_count ?? 0 }} users</a-tag>
          </template>
          <template v-else-if="column.key === 'protected'">
            <a-tag :color="record.is_protected ? 'orange' : 'default'" size="small">
              {{ record.is_protected ? 'Protected' : 'Custom' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="!record.is_protected">
              <a-button
                v-if="authStore.canUpdate('roles')"
                size="small"
                type="link"
                @click="openEdit(record)"
              >
                Edit
              </a-button>
              <a-button
                v-if="authStore.canDelete('roles')"
                size="small"
                type="link"
                danger
                @click="handleDelete(record)"
              >
                Delete
              </a-button>
            </a-space>
            <a-tag v-else color="default" size="small">System Role</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Role' : 'Add Role'"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Role Name" required>
          <a-input v-model:value="form.name" placeholder="e.g. finance-officer" />
          <div style="margin-top: 4px; font-size: 12px; color: #8c8c8c">
            Use lowercase with hyphens. This becomes the internal slug.
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { adminApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ name: '' })

const columns = [
  { title: 'Role', key: 'name', width: 220 },
  { title: 'Slug', key: 'slug', width: 180 },
  { title: 'Users', key: 'users_count', width: 120, align: 'center' },
  { title: 'Type', key: 'protected', width: 120, align: 'center' },
  { title: '', key: 'actions', width: 160, align: 'right' },
]

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await adminApi.listRoles(undefined, { signal: getSignal() })
    items.value = data.data || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load roles')
  }
  loading.value = false
}

function openCreate() {
  editingItem.value = null
  form.name = ''
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  form.name = record.name || ''
  modalVisible.value = true
}

async function handleSave() {
  if (!form.name) return message.warning('Role name is required')

  saving.value = true
  try {
    if (editingItem.value) {
      await adminApi.updateRole(editingItem.value.id, { name: form.name })
      message.success('Role updated')
    } else {
      await adminApi.storeRole({ name: form.name })
      message.success('Role created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    const data = err.response?.data
    const firstError = data?.errors && Object.values(data.errors).flat()[0]
    message.error(firstError || data?.message || 'Failed to save')
  }
  saving.value = false
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Role',
    content: `Are you sure you want to delete the "${record.display_name}" role? Users assigned this role will lose it.`,
    okType: 'danger',
    onOk: async () => {
      try {
        await adminApi.destroyRole(record.id)
        message.success('Role deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Role Management')
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
.filter-bar { display: flex; gap: 8px; }
.modal-form { margin-top: 16px; }
</style>
