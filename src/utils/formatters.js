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
