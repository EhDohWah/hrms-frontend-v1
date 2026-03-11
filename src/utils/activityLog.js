export const ACTION_COLOR_MAP = {
  created: 'green',
  updated: 'blue',
  deleted: 'red',
  transferred: 'orange',
  processed: 'purple',
  imported: 'cyan',
}

export const ACTION_LABEL_MAP = {
  created: 'created this',
  updated: 'updated this',
  deleted: 'deleted this',
  transferred: 'transferred this',
  processed: 'processed this',
  imported: 'imported this',
}

export function formatFieldName(field) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  if (typeof val === 'number') return val.toLocaleString()
  return String(val)
}
