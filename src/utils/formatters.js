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

/**
 * Calculate hours worked from two HH:mm time strings.
 * Returns { hours, minutes, isOvernight } or null if either input is missing.
 */
export function calcHoursWorked(clockIn, clockOut) {
  if (!clockIn || !clockOut) return null
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  let totalIn = inH * 60 + inM
  let totalOut = outH * 60 + outM
  const isOvernight = totalOut < totalIn
  if (isOvernight) totalOut += 24 * 60
  const diff = totalOut - totalIn
  return { hours: Math.floor(diff / 60), minutes: diff % 60, isOvernight }
}

/**
 * Format the "last working day" hint for resignation forms.
 * Combines notice period + days-until-last-working into a single display string.
 * Returns null if either date is missing.
 */
export function formatResignationHint(resignDate, lastWorkDate) {
  const notice = calcNoticePeriod(resignDate, lastWorkDate)
  if (!notice) return null
  if (notice.isInvalid) return { text: 'Last working date is before resignation date', level: 'danger' }
  const remaining = calcDaysFromToday(lastWorkDate)
  let suffix = ''
  if (remaining) {
    if (remaining.days === 0) suffix = ' — last working day is today'
    else if (remaining.days < 0) suffix = ` — ${Math.abs(remaining.days)} days overdue`
    else suffix = ` — ${remaining.days} days until last working day`
  }
  const level = remaining && remaining.days < 0 ? 'warning' : 'default'
  return { text: `${notice.days} calendar days notice${suffix}`, level }
}

/**
 * Calculate notice period between resignation date and last working date.
 * Returns { days, isInvalid } or null if either input is missing.
 */
export function calcNoticePeriod(resignDate, lastWorkDate) {
  if (!resignDate || !lastWorkDate) return null
  const days = dayjs(lastWorkDate).diff(dayjs(resignDate), 'day')
  return { days, isInvalid: days < 0 }
}

/**
 * Calculate days from today for a given date string.
 * Returns { days, label } or null if input is missing.
 * Positive days = future, negative = past.
 */
export function calcDaysFromToday(date) {
  if (!date) return null
  const target = dayjs(date).startOf('day')
  const today = dayjs().startOf('day')
  const days = target.diff(today, 'day')
  let label
  if (days === 0) label = 'Today'
  else if (days === 1) label = 'Tomorrow'
  else if (days === -1) label = 'Yesterday'
  else if (days > 0) label = `in ${days} days`
  else label = `${Math.abs(days)} days ago`
  return { days, label }
}

/**
 * Count weekdays (Mon–Fri) between two YYYY-MM-DD date strings, inclusive.
 * Does NOT account for public holidays — use as an estimate only.
 * Returns a number or null if either input is missing.
 */
export function calcWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return null
  let current = dayjs(startDate)
  const end = dayjs(endDate)
  if (end.isBefore(current)) return 0
  let count = 0
  while (current.isSame(end) || current.isBefore(end)) {
    const dow = current.day()
    if (dow !== 0 && dow !== 6) count++
    current = current.add(1, 'day')
  }
  return count
}
