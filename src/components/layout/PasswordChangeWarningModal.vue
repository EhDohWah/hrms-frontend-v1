<template>
  <a-modal
    :open="authStore.needsPasswordChange && !showSuccess"
    :closable="false"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
    :width="480"
    centered
    class="password-warning-modal"
    :z-index="1100"
  >
    <div class="pw-header">
      <div class="pw-shield-icon">
        <LockOutlined />
      </div>
      <h2 class="pw-title">Default Password Detected</h2>
      <p class="pw-desc">
        Your <strong>{{ primaryRole }}</strong> account is still using the default password.
        All system administrators know this password — change it now to secure your account.
      </p>
    </div>

    <div class="pw-divider" />

    <a-form
      layout="vertical"
      :model="form"
      class="pw-form"
      @finish="handleSubmit"
    >
      <a-form-item
        label="Current Password"
        name="current_password"
        :rules="[{ required: true, message: 'Enter your current password' }]"
      >
        <a-input-password
          v-model:value="form.current_password"
          placeholder="Enter current (default) password"
        />
      </a-form-item>

      <a-form-item
        label="New Password"
        name="new_password"
        :rules="[{ required: true, message: 'Enter a new password' }, { validator: validatePassword }]"
      >
        <a-input-password
          v-model:value="form.new_password"
          placeholder="Choose a strong password"
        />
      </a-form-item>

      <PasswordRequirements :password="form.new_password" />

      <a-form-item
        label="Confirm New Password"
        name="confirm_password"
        :rules="[{ required: true, message: 'Confirm your new password' }, { validator: validateMatch }]"
      >
        <a-input-password
          v-model:value="form.confirm_password"
          placeholder="Re-enter new password"
        />
      </a-form-item>

      <a-button
        type="primary"
        html-type="submit"
        :loading="loading"
        :disabled="!allRequirementsMet || !form.confirm_password"
        block
        size="large"
        class="pw-submit-btn"
      >
        <LockOutlined />
        Secure My Account
      </a-button>
    </a-form>
  </a-modal>

  <!-- Success modal -->
  <a-modal
    :open="showSuccess"
    :closable="false"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
    :width="400"
    centered
    class="password-success-modal"
    :z-index="1100"
  >
    <div class="pw-success">
      <div class="pw-success-icon-wrap">
        <CheckCircleFilled class="pw-success-icon" />
      </div>
      <h2 class="pw-success-title">Account Secured</h2>
      <p class="pw-success-desc">
        Your password has been changed successfully. You can now continue working.
      </p>
      <div class="pw-success-progress">
        <div class="pw-success-progress-bar" />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { reactive, ref, computed, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { LockOutlined, CheckCircleFilled } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import PasswordRequirements from '@/components/common/PasswordRequirements.vue'

const authStore = useAuthStore()
const loading = ref(false)
const showSuccess = ref(false)
let successTimer = null

const form = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const { allMet: allRequirementsMet, validatePassword, validateMatch } = usePasswordStrength(
  () => form.new_password
)

const primaryRole = computed(() => {
  if (authStore.hasRole('admin')) return 'Administrator'
  if (authStore.hasRole('hr-manager')) return 'HR Manager'
  return 'User'
})

async function handleSubmit() {
  loading.value = true
  try {
    await userApi.updatePassword(form)

    showSuccess.value = true
    Object.assign(form, { current_password: '', new_password: '', confirm_password: '' })

    successTimer = setTimeout(() => {
      authStore.updateUserFromEvent({ password_changed_at: new Date().toISOString() })
      authStore.broadcastProfileUpdate({ password_changed_at: new Date().toISOString() })
      showSuccess.value = false
      message.success('Your account is now secure.')
      successTimer = null
    }, 2000)
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to change password')
    }
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (successTimer) clearTimeout(successTimer)
})
</script>

<style scoped>
.pw-header {
  text-align: center;
  margin-bottom: 16px;
}

.pw-shield-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-danger-bg);
  border: 2px solid var(--color-danger-bg);
  margin-bottom: 12px;
}

.pw-shield-icon :deep(.anticon) {
  font-size: 26px;
  color: var(--color-danger);
}

.pw-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px;
}

.pw-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 380px;
  margin-inline: auto;
}

.pw-divider {
  height: 1px;
  background: var(--color-border);
  margin: 16px -28px 20px;
}

.pw-form {
  margin: 0;
}

.pw-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.pw-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.pw-submit-btn {
  margin-top: 4px;
  font-weight: 600;
  height: 42px;
  border-radius: var(--radius-md);
}

.pw-success {
  text-align: center;
  padding: 16px 0 8px;
}

.pw-success-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-success-bg);
  margin-bottom: 16px;
}

.pw-success-icon {
  font-size: 36px;
  color: var(--color-success);
}

.pw-success-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px;
}

.pw-success-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 24px;
  line-height: 1.5;
}

.pw-success-progress {
  height: 3px;
  background: var(--color-bg-muted);
  border-radius: 2px;
  overflow: hidden;
}

.pw-success-progress-bar {
  height: 100%;
  background: var(--color-success);
  border-radius: 2px;
  width: 100%;
}

@media (prefers-reduced-motion: no-preference) {
  .pw-success-progress-bar {
    width: 0;
    animation: pw-progress 2s linear forwards;
  }
  @keyframes pw-progress {
    from { width: 0; }
    to { width: 100%; }
  }
}
</style>
