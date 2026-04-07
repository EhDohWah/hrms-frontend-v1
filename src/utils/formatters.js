import dayjs from 'dayjs'

export function formatDate(date, format = 'DD MMM YYYY') {
  if (!date) return '—'
  return dayjs(date).format(format)
}

export function formatDateTime(date) {
  if (!date) return '—'
  return dayjs(date).format('DD MMM YYYY HH:mm')
}

export function formatCurrency(amount, currency = 'THB') {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '—'
  return new Intl.NumberFormat('en-US').format(num)
}

const GENDER_LABELS = { M: 'Male', F: 'Female' }

export function genderLabel(val) {
  if (!val) return '—'
  return GENDER_LABELS[val] || val
}

export function calcAge(dob) {
  if (!dob) return '—'
  return dayjs().diff(dayjs(dob), 'year')
}

export function formatThaiYear(date) {
  if (!date) return '—'
  const d = dayjs(date)
  if (!d.isValid()) return '—'
  return d.year() + 543
}

export function fmtFte(val) {
  if (val == null) return '—'
  return `${(Number(val) * 100).toFixed(0)}%`
}

export function timeAgo(dt) {
  if (!dt) return ''
  const d = dayjs(dt)
  const diffMin = dayjs().diff(d, 'minute')
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = dayjs().diff(d, 'hour')
  if (diffH < 24) return `${diffH}h ago`
  return d.format('DD MMM, HH:mm')
}
