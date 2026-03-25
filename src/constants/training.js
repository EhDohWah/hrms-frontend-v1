export const ENROLLMENT_STATUSES = [
  { value: 'Pending', label: 'Pending', color: 'blue' },
  { value: 'In Progress', label: 'In Progress', color: 'orange' },
  { value: 'Completed', label: 'Completed', color: 'green' },
]

export function getEnrollmentStatusColor(status) {
  const found = ENROLLMENT_STATUSES.find((s) => s.value.toLowerCase() === status?.toLowerCase())
  return found?.color || 'default'
}
