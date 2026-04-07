export const EMPLOYEE_STATUSES = [
  { value: 'Expats (Oxford)', color: 'blue' },
  { value: 'Expats (Local)', color: 'purple' },
  { value: 'Local ID Staff', color: 'green' },
  { value: 'Local non ID Staff', color: 'green' },
]

export const STATUS_COLOR_MAP = Object.fromEntries(
  EMPLOYEE_STATUSES.map(s => [s.value, s.color])
)
