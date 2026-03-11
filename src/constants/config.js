export const PAGINATION_DEFAULTS = {
  perPage: 20,
  pageSizeOptions: ['10', '20', '50', '100'],
}

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'HRMS',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  notificationPollInterval: 30000,
}
