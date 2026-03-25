export const RESIGNATION_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'acknowledged', label: 'Acknowledged', color: 'blue' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
]

export function getResignationStatusColor(status) {
  const found = RESIGNATION_STATUSES.find((s) => s.value === status?.toLowerCase())
  return found?.color || 'default'
}
