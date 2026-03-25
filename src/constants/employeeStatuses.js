export const EMPLOYEE_STATUSES = [
  { value: 'Local ID Staff', color: 'green' },
  { value: 'Local non ID Staff', color: 'green' },
  { value: 'Expats (Local)', color: 'purple' },
]

export const STATUS_COLOR_MAP = Object.fromEntries(
  EMPLOYEE_STATUSES.map(s => [s.value, s.color])
)
