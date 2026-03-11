<template>
  <div>
    <a-table
      v-if="employee.leave_balances?.length"
      :columns="leaveColumns"
      :data-source="employee.leave_balances"
      :row-key="(r) => r.id"
      :pagination="false"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          {{ record.leave_type?.name || record.leave_type_id }}
        </template>
        <template v-else-if="column.key === 'remaining'">
          <span :class="{ 'text-danger': record.remaining_days <= 0 }" class="font-semibold">
            {{ record.remaining_days }}
          </span>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="No leave balance records" />
  </div>
</template>

<script setup>
defineProps({
  employee: { type: Object, required: true },
})

const leaveColumns = [
  { title: 'Leave Type', key: 'type' },
  { title: 'Total Days', dataIndex: 'total_days', width: 100, align: 'center' },
  { title: 'Used', dataIndex: 'used_days', width: 100, align: 'center' },
  { title: 'Remaining', key: 'remaining', width: 100, align: 'center' },
]
</script>

<style scoped>
.text-danger { color: var(--color-danger); }
</style>
