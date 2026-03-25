<template>
  <div class="leave-calendar-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else>
      <div class="calendar-header">
        <a-button size="small" type="text" @click="changeMonth(-1)">
          <LeftOutlined />
        </a-button>
        <span class="month-label">{{ currentMonth.format('MMMM YYYY') }}</span>
        <a-button size="small" type="text" @click="changeMonth(1)">
          <RightOutlined />
        </a-button>
      </div>

      <div class="calendar-grid">
        <div v-for="day in ['Mo','Tu','We','Th','Fr','Sa','Su']" :key="day" class="cal-head">{{ day }}</div>
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="cal-cell"
          :class="{
            'other-month': !cell.currentMonth,
            'has-leave': cell.leaveCount > 0,
            'is-today': cell.isToday,
          }"
          :title="cell.leaveCount ? `${cell.leaveCount} on leave` : ''"
        >
          <span class="cal-day">{{ cell.day }}</span>
          <span v-if="cell.leaveCount" class="cal-dot" />
        </div>
      </div>

      <div v-if="events.length" class="leave-legend">
        <span class="legend-item">
          <span class="cal-dot inline" /> {{ events.length }} leave{{ events.length === 1 ? '' : 's' }} this month
        </span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { dashboardApi } from '@/api'

const dayjs = inject('$dayjs')
const loading = ref(true)
const events = ref([])
const currentMonth = ref(dayjs().startOf('month'))

const calendarCells = computed(() => {
  const start = currentMonth.value.startOf('month')
  const end = currentMonth.value.endOf('month')

  // Monday-based: dayjs().day() returns 0=Sun, 1=Mon ... 6=Sat
  // Convert to 0=Mon ... 6=Sun
  const startPad = (start.day() + 6) % 7
  const cells = []

  // Padding days from previous month
  for (let i = startPad - 1; i >= 0; i--) {
    const d = start.subtract(i + 1, 'day')
    cells.push({ day: d.date(), currentMonth: false, leaveCount: 0, isToday: false })
  }

  // Current month days
  for (let d = 1; d <= end.date(); d++) {
    const date = currentMonth.value.date(d)
    const dateStr = date.format('YYYY-MM-DD')
    const count = events.value.filter(e =>
      dateStr >= e.start_date && dateStr <= e.end_date
    ).length
    cells.push({
      day: d,
      currentMonth: true,
      leaveCount: count,
      isToday: date.isSame(dayjs(), 'day'),
    })
  }

  // Trailing days
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, currentMonth: false, leaveCount: 0, isToday: false })
    }
  }

  return cells
})

async function fetchEvents() {
  loading.value = true
  try {
    const start = currentMonth.value.startOf('month').format('YYYY-MM-DD')
    const end = currentMonth.value.endOf('month').format('YYYY-MM-DD')
    const res = await dashboardApi.leaveCalendar({ start_date: start, end_date: end })
    events.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
}

function changeMonth(delta) {
  currentMonth.value = currentMonth.value.add(delta, 'month')
}

watch(currentMonth, fetchEvents)
onMounted(fetchEvents)
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.month-label { font-size: 13px; font-weight: 600; }
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-head {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 4px 0;
}
.cal-cell {
  position: relative;
  text-align: center;
  padding: 6px 2px;
  border-radius: var(--radius-sm);
  cursor: default;
}
.cal-cell.other-month .cal-day { color: var(--color-text-muted); opacity: 0.4; }
.cal-cell.is-today {
  background: var(--color-primary, #002147);
}
.cal-cell.is-today .cal-day { color: #fff; font-weight: 600; }
.cal-cell.has-leave { background: #eff6ff; }
.cal-cell.is-today.has-leave { background: var(--color-primary, #002147); }
.cal-day { font-size: 12px; }
.cal-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #2563eb;
}
.cal-cell.is-today .cal-dot { background: #fff; }
.cal-dot.inline {
  position: static;
  display: inline-block;
  transform: none;
  margin-right: 4px;
  vertical-align: middle;
}
.leave-legend {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}
.legend-item { font-size: 11px; color: var(--color-text-muted); }
</style>
