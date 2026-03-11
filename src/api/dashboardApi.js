import client from './axios'

export const dashboardApi = {
  quickStats: (config) => client.get('/dashboard/quick-stats', config),
  myWidgets: (config) => client.get('/dashboard/my-widgets', config),
  availableWidgets: () => client.get('/dashboard/available-widgets'),
  updateWidgets: (payload) => client.put('/dashboard/my-widgets', payload),
  addWidget: (payload) => client.post('/dashboard/widgets/add', payload),
  removeWidget: (widgetId) => client.delete(`/dashboard/widgets/${widgetId}`),
  reorderWidgets: (payload) => client.post('/dashboard/widgets/reorder', payload),
  toggleCollapse: (widgetId) => client.post(`/dashboard/widgets/${widgetId}/toggle-collapse`),
  toggleVisibility: (widgetId) => client.post(`/dashboard/widgets/${widgetId}/toggle-visibility`),
  resetDefaults: () => client.post('/dashboard/reset-defaults'),
}
