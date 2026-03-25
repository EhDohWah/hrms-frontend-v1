<template>
  <div class="page-container">
    <div class="profile-layout">
      <!-- Profile Sidebar -->
      <div class="profile-sidebar">
        <a-card class="profile-card">
          <div class="profile-avatar-area">
            <div class="avatar-wrapper">
              <a-avatar
                :size="80"
                :src="profilePictureUrl"
                :style="!profilePictureUrl ? { backgroundColor: 'var(--color-primary)', fontSize: '28px', fontWeight: 700 } : {}"
              >
                {{ !profilePictureUrl ? userInitials : '' }}
              </a-avatar>
              <label class="avatar-upload" title="Upload photo">
                <CameraOutlined />
                <input type="file" accept="image/*" @change="handleProfileUpload" hidden />
              </label>
            </div>
          </div>

          <h3 class="profile-name">{{ authStore.userName }}</h3>
          <p class="profile-email">{{ authStore.userEmail }}</p>

          <div class="profile-roles">
            <a-tag v-for="role in authStore.userRoles" :key="role" color="default">
              {{ role }}
            </a-tag>
          </div>

          <!-- Account timestamps -->
          <div v-if="authStore.user" class="profile-timestamps">
            <div v-if="authStore.user.last_login_at" class="timestamp-item">
              <span class="meta-label">Last Login</span>
              <span class="meta-value">{{ formatDate(authStore.user.last_login_at) }}</span>
            </div>
            <div v-if="authStore.user.created_at" class="timestamp-item">
              <span class="meta-label">Created</span>
              <span class="meta-value">{{ formatDate(authStore.user.created_at) }}</span>
            </div>
          </div>
        </a-card>
      </div>

      <!-- Main content -->
      <div class="profile-main">
        <!-- Edit Profile -->
        <a-card title="Profile Information" class="settings-card">
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :xs="24" :sm="12">
                <a-form-item label="Display Name">
                  <a-input
                    v-model:value="profileForm.name"
                    placeholder="Your display name"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12">
                <a-form-item label="Email Address">
                  <a-input
                    v-model:value="profileForm.email"
                    placeholder="Your email address"
                    type="email"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-button
              type="primary"
              :loading="profileSaving"
              :disabled="!isProfileDirty"
              @click="handleProfileSave"
            >
              Save Changes
            </a-button>
          </a-form>
        </a-card>

        <!-- Change Password -->
        <a-card title="Change Password" class="settings-card">
          <a-form layout="vertical" @finish="handlePasswordChange" :model="passwordForm">
            <a-row :gutter="16">
              <a-col :xs="24" :sm="8">
                <a-form-item label="Current Password" name="current_password">
                  <a-input-password v-model:value="passwordForm.current_password" placeholder="Current password" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-form-item label="New Password" name="new_password">
                  <a-input-password v-model:value="passwordForm.new_password" placeholder="New password" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-form-item label="Confirm New Password" name="confirm_password">
                  <a-input-password v-model:value="passwordForm.confirm_password" placeholder="Confirm new password" />
                </a-form-item>
              </a-col>
            </a-row>
            <p class="password-hint">Must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&).</p>
            <a-button type="primary" html-type="submit" :loading="passwordLoading">
              Update Password
            </a-button>
          </a-form>
        </a-card>

        <!-- Permissions Overview -->
        <a-card class="settings-card permissions-card">
          <template #title>
            <div class="permissions-title-row">
              <span>My Permissions</span>
              <div v-if="permissionSummary.total" class="permissions-summary">
                <span class="summary-chip">{{ permissionSummary.total }} modules</span>
                <span v-if="permissionSummary.fullAccess" class="summary-chip summary-chip--full">{{ permissionSummary.fullAccess }} full access</span>
              </div>
            </div>
          </template>

          <div v-if="Object.keys(groupedPermissions).length">
            <!-- Desktop: grouped table -->
            <div class="permissions-table-wrap hidden-mobile">
              <table class="permissions-table">
                <thead>
                  <tr>
                    <th class="col-module">Module</th>
                    <th class="col-perm">Read</th>
                    <th class="col-perm">Create</th>
                    <th class="col-perm">Update</th>
                    <th class="col-perm">Delete</th>
                  </tr>
                </thead>
                <tbody v-for="(perms, category) in groupedPermissions" :key="category">
                  <tr class="category-row">
                    <td colspan="5">{{ category }}</td>
                  </tr>
                  <tr v-for="perm in perms" :key="perm.key" class="perm-row">
                    <td class="col-module">{{ perm.display_name || perm.key }}</td>
                    <td class="col-perm">
                      <CheckCircleFilled v-if="perm.read" class="perm-icon perm-icon--granted" />
                      <CloseCircleFilled v-else class="perm-icon perm-icon--denied" />
                    </td>
                    <td class="col-perm">
                      <CheckCircleFilled v-if="perm.create" class="perm-icon perm-icon--granted" />
                      <CloseCircleFilled v-else class="perm-icon perm-icon--denied" />
                    </td>
                    <td class="col-perm">
                      <CheckCircleFilled v-if="perm.update" class="perm-icon perm-icon--granted" />
                      <CloseCircleFilled v-else class="perm-icon perm-icon--denied" />
                    </td>
                    <td class="col-perm">
                      <CheckCircleFilled v-if="perm.delete" class="perm-icon perm-icon--granted" />
                      <CloseCircleFilled v-else class="perm-icon perm-icon--denied" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile: card layout -->
            <div class="permissions-mobile visible-mobile">
              <template v-for="(perms, category) in groupedPermissions" :key="category">
                <div class="mobile-category-label">{{ category }}</div>
                <div
                  v-for="perm in perms"
                  :key="perm.key"
                  class="mobile-perm-card"
                >
                  <div class="mobile-perm-name">{{ perm.display_name || perm.key }}</div>
                  <div class="mobile-perm-badges">
                    <span :class="['mobile-badge', perm.read ? 'mobile-badge--on' : 'mobile-badge--off']">R</span>
                    <span :class="['mobile-badge', perm.create ? 'mobile-badge--on' : 'mobile-badge--off']">C</span>
                    <span :class="['mobile-badge', perm.update ? 'mobile-badge--on' : 'mobile-badge--off']">U</span>
                    <span :class="['mobile-badge', perm.delete ? 'mobile-badge--on' : 'mobile-badge--off']">D</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <a-empty v-else description="No permissions assigned" />
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { CameraOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api'
import { formatDate } from '@/utils/formatters'

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'
const appStore = useAppStore()
const authStore = useAuthStore()

// ---- Profile form ----
const profileForm = reactive({
  name: authStore.userName || '',
  email: authStore.userEmail || '',
})
const profileSaving = ref(false)

// Keep form in sync when auth store loads/updates user data
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    profileForm.name = newUser.name || ''
    profileForm.email = newUser.email || ''
  }
}, { immediate: true })

const isProfileDirty = computed(() => {
  return profileForm.name !== (authStore.userName || '')
    || profileForm.email !== (authStore.userEmail || '')
})

// ---- Password form ----
const passwordForm = reactive({ current_password: '', new_password: '', confirm_password: '' })
const passwordLoading = ref(false)

// ---- Computed ----
const userInitials = computed(() => {
  const name = authStore.userName || ''
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
})

const profilePictureUrl = computed(() => {
  const pic = authStore.userAvatar
  if (!pic) return null
  if (pic.startsWith('http')) return pic
  return `${PUBLIC_URL}/storage/${pic}`
})

// ---- Permissions grouped by category ----
const groupedPermissions = computed(() => {
  const groups = {}
  for (const [key, perm] of Object.entries(authStore.permissions)) {
    const category = perm.category || 'Other'
    if (!groups[category]) groups[category] = []
    groups[category].push({ key, ...perm })
  }
  return groups
})

const permissionSummary = computed(() => {
  const allPerms = Object.values(groupedPermissions.value).flat()
  return {
    total: allPerms.length,
    fullAccess: allPerms.filter(p => p.read && p.create && p.update && p.delete).length,
  }
})

// ---- Profile save ----
async function handleProfileSave() {
  if (!profileForm.name?.trim()) {
    message.warning('Display name is required')
    return
  }

  profileSaving.value = true
  try {
    const promises = []
    const updates = {}

    // Update name if changed
    if (profileForm.name !== authStore.userName) {
      promises.push(userApi.updateUsername({ name: profileForm.name }))
      updates.name = profileForm.name
    }

    // Update email if changed
    if (profileForm.email !== authStore.userEmail) {
      if (!profileForm.email?.trim()) {
        message.warning('Email is required')
        profileSaving.value = false
        return
      }
      promises.push(userApi.updateEmail({ email: profileForm.email }))
      updates.email = profileForm.email
    }

    if (promises.length > 0) {
      await Promise.all(promises)
      // Update local auth store state
      authStore.updateUserFromEvent(updates)
      authStore.broadcastProfileUpdate(updates)
      message.success('Profile updated successfully')
    }
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to update profile')
    }
  } finally {
    profileSaving.value = false
  }
}

// ---- Password change ----
async function handlePasswordChange() {
  if (!passwordForm.current_password || !passwordForm.new_password) {
    message.warning('Please fill in all password fields')
    return
  }
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    message.error('New passwords do not match')
    return
  }
  passwordLoading.value = true
  try {
    await userApi.updatePassword(passwordForm)
    message.success('Password updated successfully')
    Object.assign(passwordForm, { current_password: '', new_password: '', confirm_password: '' })
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to update password')
    }
  } finally {
    passwordLoading.value = false
  }
}

// ---- Profile picture upload ----
async function handleProfileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('Please select an image file')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    message.warning('Image must be under 2MB')
    return
  }

  const formData = new FormData()
  formData.append('profile_picture', file)
  try {
    const { data } = await userApi.updateProfilePicture(formData)
    const updates = {
      profile_picture: data.data?.profile_picture || data.profile_picture,
    }
    authStore.updateUserFromEvent(updates)
    authStore.broadcastProfileUpdate(updates)
    message.success('Profile picture updated')
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to upload picture')
  }
  event.target.value = ''
}

onMounted(() => appStore.setPageMeta('My Profile'))
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}
@media (min-width: 768px) {
  .profile-layout {
    grid-template-columns: 280px 1fr;
  }
}

/* Sidebar */
.profile-card {
  text-align: center;
}

.profile-avatar-area {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  padding-top: 8px;
}

.avatar-wrapper {
  position: relative;
}

.avatar-upload {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 26px;
  height: 26px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}
.avatar-upload:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}
.profile-email {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 12px;
}
.profile-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.profile-timestamps {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}
.timestamp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.meta-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

/* Main content */
.settings-card {
  margin-bottom: 16px;
}

/* Permissions card */
.permissions-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.permissions-summary {
  display: flex;
  gap: 6px;
}
.summary-chip {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
.summary-chip--full {
  background: var(--color-success-bg);
  color: var(--color-success);
}

/* Desktop table */
.permissions-table-wrap {
  overflow-x: auto;
}
.permissions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.permissions-table thead th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
}
.permissions-table .col-module {
  text-align: left;
  padding: 8px 12px;
}
.permissions-table .col-perm {
  text-align: center;
  width: 80px;
  padding: 8px 12px;
}
.category-row td {
  padding: 10px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-primary);
  background: var(--color-bg-subtle);
  border-top: 1px solid var(--color-border-light);
}
.perm-row td {
  border-bottom: 1px solid var(--color-border-light);
}
.perm-row:hover {
  background: var(--color-bg-hover);
}
.perm-icon {
  font-size: 15px;
}
.perm-icon--granted {
  color: var(--color-success);
}
.perm-icon--denied {
  color: var(--color-border);
}

/* Mobile card layout */
.mobile-category-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-primary);
  padding: 12px 0 6px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 8px;
}
.mobile-category-label:first-child {
  padding-top: 0;
}
.mobile-perm-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.mobile-perm-card:last-child {
  border-bottom: none;
}
.mobile-perm-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
.mobile-perm-badges {
  display: flex;
  gap: 4px;
}
.mobile-badge {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}
.mobile-badge--on {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.mobile-badge--off {
  background: var(--color-bg-subtle);
  color: var(--color-border);
}

.password-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: -8px 0 12px;
}

</style>
