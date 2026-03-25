import { formatNumber } from '@/utils/formatters'

export const ACTION_COLOR_MAP = {
  created: 'green',
  updated: 'blue',
  deleted: 'red',
  transferred: 'orange',
  processed: 'purple',
  imported: 'cyan',
  probation_passed: 'green',
  probation_failed: 'red',
  resigned: 'orange',
  acknowledged: 'blue',
}

export const ACTION_LABEL_MAP = {
  created: 'created this',
  updated: 'updated this',
  deleted: 'deleted this',
  transferred: 'transferred this',
  processed: 'processed this',
  imported: 'imported this',
  probation_passed: 'marked probation as passed',
  probation_failed: 'marked probation as failed',
  resigned: 'submitted a resignation',
  acknowledged: 'acknowledged this',
}

export function formatFieldName(field) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  if (typeof val === 'number') return formatNumber(val)
  return String(val)
}
