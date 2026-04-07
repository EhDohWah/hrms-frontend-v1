/**
 * Stat card icon color presets.
 * Used by dashboard quick stats and admin summary cards.
 * Each preset provides a light background and a matching icon color.
 */
export const STAT_COLORS = {
  blue:    { bg: '#eff6ff', color: '#2563eb' },
  amber:   { bg: '#fef3c7', color: '#d97706' },
  pink:    { bg: '#fce7f3', color: '#db2777' },
  green:   { bg: '#f0fdf4', color: '#16a34a' },
  red:     { bg: '#fee2e2', color: '#dc2626' },
  purple:  { bg: '#faf5ff', color: '#7c3aed' },
  teal:    { bg: '#f0fdfa', color: '#0d9488' },
}

/**
 * Error/log severity level → Ant Design tag color.
 */
export function levelColor(level) {
  if (level === 'critical' || level === 'emergency') return 'red'
  if (level === 'error') return 'orange'
  if (level === 'warning') return 'gold'
  return 'default'
}
