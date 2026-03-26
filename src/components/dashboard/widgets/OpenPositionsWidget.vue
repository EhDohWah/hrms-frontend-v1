<template>
  <div class="open-positions-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="positions.length">
      <div class="position-list widget-scroll">
        <router-link
          v-for="p in positions"
          :key="p.id"
          to="/grant-positions"
          class="position-item"
        >
          <div class="position-icon">
            <SolutionOutlined />
          </div>
          <div class="position-info">
            <span class="position-title">{{ p.position }}</span>
            <span class="position-dept">{{ p.grant_code }} &middot; {{ p.budgetline_code || '—' }}</span>
          </div>
          <div class="vacancy-counts">
            <a-tag color="orange" size="small">{{ p.vacancies }} open</a-tag>
            <span class="counts-detail">{{ p.recruited }}/{{ p.manpower }}</span>
          </div>
        </router-link>
      </div>
      <router-link to="/grant-positions" class="widget-view-all">View all grant positions &rarr;</router-link>
    </template>
    <a-empty v-else description="All grant positions are filled" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { SolutionOutlined } from '@ant-design/icons-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const positions = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await dashboardApi.openPositions()
    positions.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.position-list { display: flex; flex-direction: column; }
.position-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  text-decoration: none;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}
.position-item:last-child { border-bottom: none; }
.position-item:hover { background: var(--color-bg-hover); }
.position-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: #fef3c7;
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.position-info { flex: 1; min-width: 0; }
.position-title { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.position-dept { font-size: 11px; color: var(--color-text-secondary); }
.vacancy-counts { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.counts-detail { font-size: 11px; color: var(--color-text-secondary); font-family: 'SF Mono', 'Consolas', monospace; }
</style>
