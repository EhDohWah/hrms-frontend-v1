import client from './axios'

export const systemApi = {
  // System Health
  health: (config) => client.get('/admin/system-health', config),

  // Failed Jobs
  failedJobs: (params, config) => client.get('/admin/failed-jobs', { params, ...config }),
  failedJob: (id) => client.get(`/admin/failed-jobs/${id}`),
  retryJob: (id) => client.post(`/admin/failed-jobs/${id}/retry`),
  deleteJob: (id) => client.delete(`/admin/failed-jobs/${id}`),
  retryAllJobs: () => client.post('/admin/failed-jobs/retry-all'),
  flushJobs: () => client.post('/admin/failed-jobs/flush'),

  // Error Logs (server)
  errorLogs: (params, config) => client.get('/admin/error-logs', { params, ...config }),
  errorLog: (id) => client.get(`/admin/error-logs/${id}`),
  dismissError: (id) => client.post(`/admin/error-logs/${id}/dismiss`),
  cleanupErrors: (days) => client.post('/admin/error-logs/cleanup', { days }),

  // Client Error Logs
  clientErrors: (params, config) => client.get('/admin/client-errors', { params, ...config }),
  reportClientError: (payload) => client.post('/client-errors', payload),

  // Performance
  performanceSummary: (config) => client.get('/admin/performance/summary', config),
  performanceEndpoints: (params, config) => client.get('/admin/performance/endpoints', { params, ...config }),
}
