<template>
  <div class="login-page">
    <div class="forgot-container">
      <div class="forgot-card">
        <router-link :to="{ name: 'login' }" class="back-link">
          <ArrowLeftOutlined /> Back to sign in
        </router-link>

        <h2 class="forgot-title">Reset password</h2>
        <p class="forgot-desc">Enter your email address and we'll send you a link to reset your password.</p>

        <a-alert
          v-if="message"
          :message="message"
          :type="success ? 'success' : 'error'"
          show-icon
          style="margin-bottom: 20px"
        />

        <a-form layout="vertical" @finish="handleSubmit" v-if="!success">
          <a-form-item label="Email">
            <a-input
              v-model:value="email"
              size="large"
              placeholder="you@organization.org"
              :disabled="loading"
            >
              <template #prefix><MailOutlined class="input-icon" /></template>
            </a-input>
          </a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">
            Send reset link
          </a-button>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { authApi } from '@/api/authApi'
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons-vue'

const email = ref('')
const loading = ref(false)
const message = ref('')
const success = ref(false)

async function handleSubmit() {
  if (!email.value) { message.value = 'Please enter your email.'; return }
  loading.value = true
  message.value = ''
  try {
    await authApi.forgotPassword(email.value)
    success.value = true
    message.value = 'Password reset link has been sent to your email.'
  } catch (err) {
    message.value = err.response?.data?.message || 'Failed to send reset link.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.forgot-container {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}
.forgot-card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-lg);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}
.back-link:hover { color: var(--color-text); }
.forgot-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.forgot-desc {
  color: var(--color-text-secondary);
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.5;
}
.input-icon { color: var(--color-text-muted); }
</style>
