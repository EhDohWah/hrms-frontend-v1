<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-inner">

        <!-- LEFT: dark branding pane -->
        <aside class="branding-pane">
          <div class="system-block">
            <h1 class="system-abbr">HRMS</h1>
            <p class="system-name">Human Resource Management System</p>
            <p class="system-tagline">
              Manage your workforce efficiently across both organizations from a single platform.
            </p>
          </div>

          <!-- logo strip anchored to bottom -->
          <div class="logo-strip">
            <div class="logo-strip-row">
              <div class="org-slot">
                <div class="org-slot-img">
                  <img :src="bhfLogo" alt="BHF" />
                </div>
                <div class="org-slot-text">
                  <span class="org-slot-abbr">{{ ORGANIZATIONS.BHF.code }}</span>
                  <span class="org-slot-full">{{ ORGANIZATIONS.BHF.fullName }}</span>
                </div>
              </div>

              <div class="org-divider"></div>

              <div class="org-slot">
                <div class="org-slot-img">
                  <img :src="smruLogo" alt="SMRU" />
                </div>
                <div class="org-slot-text">
                  <span class="org-slot-abbr">{{ ORGANIZATIONS.SMRU.code }}</span>
                  <span class="org-slot-full">{{ ORGANIZATIONS.SMRU.fullName }}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- RIGHT: form pane -->
        <main class="form-pane">
          <div class="form-inner">
            <div class="login-header">
              <span class="login-eyebrow">Welcome back</span>
              <h2 class="login-title">Sign in</h2>
              <p class="login-subtitle">Enter your credentials to access the system</p>
            </div>

            <a-alert
              v-if="sessionExpired"
              type="info"
              show-icon
              closable
              @close="dismissSessionExpired"
              style="margin-bottom: 20px"
            >
              <template #message>Session Expired</template>
              <template #description>
                Your session has expired. Please sign in again to continue.
              </template>
            </a-alert>

            <a-alert
              v-if="sessionConflict"
              type="warning"
              show-icon
              closable
              @close="sessionConflict = false"
              style="margin-bottom: 20px"
            >
              <template #message>Account Active on Another Device</template>
              <template #description>{{ sessionConflictMessage }}</template>
            </a-alert>

            <a-alert
              v-if="errorMessage"
              :message="errorMessage"
              type="error"
              show-icon
              closable
              @close="errorMessage = ''"
              style="margin-bottom: 20px"
            />

            <a-form :model="form" layout="vertical" @finish="handleLogin">
              <a-form-item label="Email" name="email" :rules="[{ required: true, type: 'email', message: 'Please enter a valid email' }]">
                <a-input
                  v-model:value="form.email"
                  size="large"
                  placeholder="you@organization.org"
                  :disabled="loading"
                >
                  <template #prefix><MailOutlined class="input-icon" /></template>
                </a-input>
              </a-form-item>

              <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Please enter your password' }]">
                <a-input-password
                  v-model:value="form.password"
                  size="large"
                  placeholder="Enter your password"
                  :disabled="loading"
                >
                  <template #prefix><LockOutlined class="input-icon" /></template>
                </a-input-password>
              </a-form-item>

              <div class="form-actions">
                <router-link :to="{ name: 'forgot-password' }" class="forgot-link">
                  Forgot password?
                </router-link>
              </div>

              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="loading"
                class="login-btn"
              >
                Sign in
                <template #icon>
                  <ArrowRightOutlined class="btn-arrow" />
                </template>
              </a-button>
            </a-form>
          </div>
        </main>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MailOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'
import { ORGANIZATIONS } from '@/constants/organizations'

import bhfLogo from '@/assets/img/bhf-logo.png'
import smruLogo from '@/assets/img/smru-logo.jfif'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')
const sessionConflict = ref(false)
const sessionConflictMessage = ref('')
const sessionExpired = computed(() => route.query.reason === 'session-expired')

function dismissSessionExpired() {
  const { reason: _removed, ...rest } = route.query
  router.replace({ name: 'login', query: rest })
}

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  sessionConflict.value = false
  try {
    await authStore.login(form.email, form.password)
    const redirect = route.query.redirect
    const safeRedirect = (
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//')
    ) ? redirect : '/'
    router.push(safeRedirect)
  } catch (err) {
    const status = err.response?.status
    const data = err.response?.data

    if (status === 409 && data?.error_type === 'SESSION_CONFLICT') {
      sessionConflict.value = true
      sessionConflictMessage.value = data.message
    } else if (!err.response) {
      errorMessage.value = 'Unable to connect to the server. Please check your connection and try again.'
    } else {
      errorMessage.value = data?.message || 'The username or password you entered is incorrect.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--color-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* ── Outer card ── */
.login-card {
  width: 100%;
  max-width: 940px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.11), 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e4e6e9;
}

.login-inner {
  display: flex;
  flex-direction: column;
}
@media (min-width: 720px) {
  .login-inner {
    flex-direction: row;
    min-height: min(520px, 80vh);
  }
}

/* ══ Left: dark branding pane ══ */
.branding-pane {
  width: 100%;
  flex-shrink: 0;
  background: var(--color-primary);
  display: flex;
  flex-direction: column;
  padding: 32px 28px 0;
  position: relative;
  overflow: hidden;
}
@media (min-width: 720px) {
  .branding-pane {
    width: 460px;
    padding: 44px 44px 0;
  }
}

/* subtle dot-grid texture */
.branding-pane::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

/* HRMS block */
.system-block {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.system-abbr {
  font-size: 52px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.05em;
  line-height: 1;
  margin: 0;
  width: 4ch;
  overflow: hidden;
  white-space: nowrap;
  border-right: 3px solid rgba(255, 255, 255, 0.7);
}

@media (prefers-reduced-motion: no-preference) {
  .system-abbr {
    animation: typing 5s steps(4) infinite, blink 0.6s step-end infinite;
  }
}

@keyframes typing {
  0%, 5% { width: 0; }
  20%, 65% { width: 4ch; }
  80%, 100% { width: 0; }
}

@keyframes blink {
  50% { border-color: transparent; }
}
.system-name {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}
@media (min-width: 720px) {
  .system-name {
    white-space: nowrap;
  }
}
.system-tagline {
  margin-top: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  max-width: 300px;
}

/* ── Logo strip — anchored to bottom ── */
.logo-strip {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding: 24px 0 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
@media (min-width: 720px) {
  .logo-strip {
    padding: 28px 0 32px;
  }
}
.logo-strip-row {
  display: flex;
  align-items: center;
}

/* each org slot */
.org-slot {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 4px;
}
.org-slot-img {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}
.org-slot-img img {
  width: 52px;
  height: 52px;
  object-fit: contain;
}
.org-slot-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.org-slot-abbr {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.02em;
}
.org-slot-full {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
  max-width: 160px;
}

/* vertical divider between the two orgs */
.org-divider {
  width: 1px;
  height: 52px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 16px;
  flex-shrink: 0;
}

/* ══ Right: form pane ══ */
.form-pane {
  flex: 1;
  min-width: 0;
  background: var(--color-bg-surface);
  display: flex;
  flex-direction: column;
}

.form-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 36px 28px 28px;
}
@media (min-width: 720px) {
  .form-inner {
    padding: 48px 44px 36px;
  }
}

/* Header */
.login-header {
  margin-bottom: 30px;
}
.login-eyebrow {
  display: block;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 7px;
}
.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.03em;
  line-height: 1;
  margin: 0 0 7px;
}
.login-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.input-icon {
  color: var(--color-text-muted);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
  margin-bottom: 18px;
}
.forgot-link {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.forgot-link:hover {
  color: var(--color-primary);
}

.login-btn {
  height: 46px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  margin-top: 6px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.login-btn .btn-arrow {
  opacity: 0.5;
  transition: transform 0.15s, opacity 0.15s;
}
.login-btn:hover .btn-arrow {
  transform: translateX(3px);
  opacity: 1;
}

</style>
