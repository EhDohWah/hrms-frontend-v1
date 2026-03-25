<template>
  <div class="training-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="trainings.length">
      <div class="training-list">
        <div v-for="t in trainings" :key="t.id" class="training-item">
          <div class="training-header">
            <span class="training-title">{{ t.title }}</span>
            <span class="training-org">{{ t.organizer }}</span>
          </div>
          <div class="training-progress">
            <a-progress
              :percent="completionPercent(t)"
              :show-info="false"
              :stroke-color="'#16a34a'"
              size="small"
            />
            <div class="training-counts">
              <span>{{ t.completed }}/{{ t.total_participants }} completed</span>
              <span v-if="t.in_progress">{{ t.in_progress }} in progress</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <a-empty v-else description="No training programs" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const trainings = ref([])
const loading = ref(true)

function completionPercent(t) {
  if (!t.total_participants) return 0
  return Math.round((t.completed / t.total_participants) * 100)
}

onMounted(async () => {
  try {
    const res = await dashboardApi.trainingOverview()
    trainings.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.training-list { display: flex; flex-direction: column; }
.training-item {
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.training-item:last-child { border-bottom: none; }
.training-header { margin-bottom: 6px; }
.training-title { display: block; font-size: 13px; font-weight: 500; }
.training-org { font-size: 11px; color: var(--color-text-muted); }
.training-counts {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-secondary);
}
</style>
