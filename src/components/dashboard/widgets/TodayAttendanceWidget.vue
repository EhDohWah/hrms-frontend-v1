<template>
  <div class="attendance-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="attendance-ring">
        <a-progress
          type="circle"
          :percent="attendancePercent"
          :size="100"
          :stroke-color="'#16a34a'"
          :format="() => `${data.total_recorded}/${data.total_expected}`"
        />
      </div>
      <div class="attendance-breakdown">
        <div class="att-stat">
          <span class="att-dot present" />
          <span class="att-label">Present</span>
          <span class="att-value">{{ data.present }}</span>
        </div>
        <div class="att-stat">
          <span class="att-dot late" />
          <span class="att-label">Late</span>
          <span class="att-value">{{ data.late }}</span>
        </div>
        <div class="att-stat">
          <span class="att-dot absent" />
          <span class="att-label">Absent</span>
          <span class="att-value">{{ data.absent }}</span>
        </div>
        <div class="att-stat">
          <span class="att-dot half-day" />
          <span class="att-label">Half Day</span>
          <span class="att-value">{{ data.half_day }}</span>
        </div>
        <div class="att-stat">
          <span class="att-dot on-leave" />
          <span class="att-label">On Leave</span>
          <span class="att-value">{{ data.on_leave }}</span>
        </div>
      </div>
    </template>
    <a-empty v-else description="No attendance data" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const data = ref(null)
const loading = ref(true)

const attendancePercent = computed(() => {
  if (!data.value?.total_expected) return 0
  return Math.round((data.value.total_recorded / data.value.total_expected) * 100)
})

onMounted(async () => {
  try {
    const res = await dashboardApi.todayAttendance()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.attendance-ring { display: flex; justify-content: center; margin-bottom: 16px; }
.attendance-breakdown { display: flex; flex-direction: column; gap: 6px; }
.att-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.att-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.att-dot.present { background: #16a34a; }
.att-dot.late { background: #d97706; }
.att-dot.absent { background: #dc2626; }
.att-dot.half-day { background: #7c3aed; }
.att-dot.on-leave { background: #2563eb; }
.att-label { flex: 1; color: var(--color-text-secondary); }
.att-value { font-weight: 600; }
</style>
