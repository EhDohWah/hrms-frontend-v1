<template>
  <div class="interviews-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="interviews.length">
      <div class="interview-list widget-scroll">
        <div v-for="i in interviews" :key="i.id" class="interview-item">
          <div class="interview-date-badge">
            <span class="date-day">{{ formatDate(i.interview_date, 'DD') }}</span>
            <span class="date-month">{{ formatDate(i.interview_date, 'MMM') }}</span>
          </div>
          <div class="interview-info">
            <span class="interview-candidate">{{ i.candidate_name }}</span>
            <span class="interview-meta">
              {{ i.job_position }}
              <template v-if="i.start_time"> &middot; {{ i.start_time }}</template>
            </span>
            <span v-if="i.interviewer_name" class="interview-interviewer">
              Interviewer: {{ i.interviewer_name }}
            </span>
          </div>
        </div>
      </div>
      <router-link to="/interviews" class="widget-view-all">View all interviews &rarr;</router-link>
    </template>
    <a-empty v-else description="No upcoming interviews" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { formatDate } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const interviews = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await dashboardApi.pendingInterviews()
    interviews.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.interview-list { display: flex; flex-direction: column; }
.interview-item {
  display: flex;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.interview-item:last-child { border-bottom: none; }
.interview-date-badge {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: #eff6ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.date-day { font-size: 15px; font-weight: 700; color: #2563eb; line-height: 1; }
.date-month { font-size: 9px; font-weight: 600; color: #2563eb; text-transform: uppercase; }
.interview-info { min-width: 0; }
.interview-candidate { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.interview-meta { font-size: 11px; color: var(--color-text-secondary); }
.interview-interviewer { display: block; font-size: 11px; color: var(--color-text-muted); }
</style>
