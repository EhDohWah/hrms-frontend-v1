<template>
  <div class="page-container">
    <div style="margin-bottom: 16px">
      <a-button type="link" @click="$router.push({ name: 'admin-users' })" style="padding: 0">
        <ArrowLeftOutlined /> Back to Users
      </a-button>
    </div>

    <div v-if="userData" style="margin-bottom: 20px">
      <h2 style="margin: 0 0 4px">{{ userData.name }}</h2>
      <div style="color: #8c8c8c; font-size: 13px">
        {{ userData.email }} &middot;
        <a-tag color="blue" size="small">{{ userData.roles?.[0] || 'No Role' }}</a-tag>
      </div>
    </div>

    <div v-if="summary" class="summary-bar">
      <a-tag color="green">{{ summary.full_access }} Full Access</a-tag>
      <a-tag color="blue">{{ summary.partial_access }} Partial</a-tag>
      <a-tag color="orange">{{ summary.read_only }} Read Only</a-tag>
      <a-tag color="default">{{ summary.no_access }} No Access</a-tag>
      <span style="margin-left: auto; color: #8c8c8c; font-size: 12px">
        {{ summary.total_permissions }} / {{ summary.total_modules * 4 }} permissions
      </span>
    </div>

    <a-spin :spinning="loading">
      <div v-for="(modules, category) in modulesByCategory" :key="category" style="margin-bottom: 24px">
        <a-card
          :title="category"
          size="small"
          :body-style="{ padding: 0 }"
          :head-style="{ background: '#fafafa' }"
        >
          <template #extra>
            <a-space>
              <a-button size="small" type="link" @click="selectAllCategory(category)">Select All</a-button>
              <a-button size="small" type="link" @click="deselectAllCategory(category)">Deselect All</a-button>
            </a-space>
          </template>

          <a-table
            :columns="permissionColumns"
            :data-source="modules"
            :row-key="(r) => r.name"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'module'">
                {{ record.display_name }}
              </template>
              <template v-else-if="column.key === 'read'">
                <a-checkbox
                  :checked="getPermission(record.name, 'read')"
                  @change="(e) => onPermissionChange(record.name, 'read', e.target.checked)"
                />
              </template>
              <template v-else-if="column.key === 'create'">
                <a-checkbox
                  :checked="getPermission(record.name, 'create')"
                  @change="(e) => onPermissionChange(record.name, 'create', e.target.checked)"
                />
              </template>
              <template v-else-if="column.key === 'update'">
                <a-checkbox
                  :checked="getPermission(record.name, 'update')"
                  @change="(e) => onPermissionChange(record.name, 'update', e.target.checked)"
                />
              </template>
              <template v-else-if="column.key === 'delete'">
                <a-checkbox
                  :checked="getPermission(record.name, 'delete')"
                  @change="(e) => onPermissionChange(record.name, 'delete', e.target.checked)"
                />
              </template>
            </template>
          </a-table>
        </a-card>
      </div>
    </a-spin>

    <div class="save-bar">
      <a-button type="primary" :loading="saving" @click="handleSave" size="large">
        Save Permissions
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { adminApi } from '@/api'

const route = useRoute()
const appStore = useAppStore()

const userId = route.params.id
const userData = ref(null)
const summary = ref(null)
const modulesByCategory = ref({})
const permissionState = reactive({})
const loading = ref(false)
const saving = ref(false)

const permissionColumns = [
  { title: 'Module', key: 'module', width: 220 },
  { title: 'Read', key: 'read', width: 80, align: 'center' },
  { title: 'Create', key: 'create', width: 80, align: 'center' },
  { title: 'Update', key: 'update', width: 80, align: 'center' },
  { title: 'Delete', key: 'delete', width: 80, align: 'center' },
]

function getPermission(moduleName, action) {
  return permissionState[moduleName]?.[action] === true
}

function onPermissionChange(moduleName, action, checked) {
  if (!permissionState[moduleName]) {
    permissionState[moduleName] = { read: false, create: false, update: false, delete: false }
  }

  permissionState[moduleName][action] = checked

  // Checking any write permission auto-checks Read
  if (checked && action !== 'read') {
    permissionState[moduleName].read = true
  }

  // Unchecking Read unchecks all write permissions
  if (!checked && action === 'read') {
    permissionState[moduleName].create = false
    permissionState[moduleName].update = false
    permissionState[moduleName].delete = false
  }
}

function selectAllCategory(category) {
  const modules = modulesByCategory.value[category] || []
  for (const mod of modules) {
    if (!permissionState[mod.name]) {
      permissionState[mod.name] = { read: false, create: false, update: false, delete: false }
    }
    permissionState[mod.name].read = true
    permissionState[mod.name].create = true
    permissionState[mod.name].update = true
    permissionState[mod.name].delete = true
  }
}

function deselectAllCategory(category) {
  const modules = modulesByCategory.value[category] || []
  for (const mod of modules) {
    if (!permissionState[mod.name]) {
      permissionState[mod.name] = { read: false, create: false, update: false, delete: false }
    }
    permissionState[mod.name].read = false
    permissionState[mod.name].create = false
    permissionState[mod.name].update = false
    permissionState[mod.name].delete = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [permRes, modulesRes, summaryRes] = await Promise.all([
      adminApi.getUserPermissions(userId),
      adminApi.getModulesByCategory(),
      adminApi.getUserPermissionSummary(userId),
    ])

    const permData = permRes.data.data || permRes.data
    userData.value = permData.user

    const summaryData = summaryRes.data.data || summaryRes.data
    summary.value = summaryData.summary

    const categoriesData = modulesRes.data.data || modulesRes.data
    modulesByCategory.value = categoriesData

    const userModules = permData.modules || {}
    for (const [moduleName, access] of Object.entries(userModules)) {
      permissionState[moduleName] = {
        read: access.read || false,
        create: access.create || false,
        update: access.update || false,
        delete: access.delete || false,
      }
    }

    for (const modules of Object.values(categoriesData)) {
      for (const mod of modules) {
        if (!permissionState[mod.name]) {
          permissionState[mod.name] = { read: false, create: false, update: false, delete: false }
        }
      }
    }
  } catch (err) {
    message.error('Failed to load permission data')
    console.error(err)
  }
  loading.value = false
}

async function handleSave() {
  saving.value = true
  try {
    await adminApi.updateUserPermissions(userId, { modules: { ...permissionState } })
    message.success('Permissions saved successfully')

    const { data } = await adminApi.getUserPermissionSummary(userId)
    const summaryData = data.data || data
    summary.value = summaryData.summary
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save permissions')
  }
  saving.value = false
}

onMounted(() => {
  appStore.setPageMeta('User Permissions')
  fetchData()
})
</script>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.save-bar {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}
</style>
