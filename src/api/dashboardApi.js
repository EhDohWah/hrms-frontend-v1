import client from './axios'

export const dashboardApi = {
  // Dashboard management
  quickStats: (config) => client.get('/dashboard/quick-stats', config),
  myWidgets: (config) => client.get('/dashboard/my-widgets', config),
  availableWidgets: (config) => client.get('/dashboard/available-widgets', config),
  updateWidgets: (payload) => client.put('/dashboard/my-widgets', payload),
  addWidget: (payload) => client.post('/dashboard/widgets/add', payload),
  removeWidget: (widgetId) => client.delete(`/dashboard/widgets/${widgetId}`),
  reorderWidgets: (payload) => client.post('/dashboard/widgets/reorder', payload),
  toggleCollapse: (widgetId) => client.post(`/dashboard/widgets/${widgetId}/toggle-collapse`),
  toggleVisibility: (widgetId) => client.post(`/dashboard/widgets/${widgetId}/toggle-visibility`),
  resetDefaults: () => client.post('/dashboard/reset-defaults'),

  // Widget data endpoints
  employeeStats: (config) => client.get('/dashboard/data/employee-stats', config),
  recentHires: (config) => client.get('/dashboard/data/recent-hires', config),
  departmentOverview: (config) => client.get('/dashboard/data/department-overview', config),
  probationTracker: (config) => client.get('/dashboard/data/probation-tracker', config),
  leaveSummary: (config) => client.get('/dashboard/data/leave-summary', config),
  pendingLeaveRequests: (config) => client.get('/dashboard/data/pending-leave-requests', config),
  leaveCalendar: (params, config) => client.get('/dashboard/data/leave-calendar', { params, ...config }),
  payrollSummary: (config) => client.get('/dashboard/data/payroll-summary', config),
  upcomingPayroll: (config) => client.get('/dashboard/data/upcoming-payroll', config),
  todayAttendance: (config) => client.get('/dashboard/data/today-attendance', config),
  openPositions: (config) => client.get('/dashboard/data/open-positions', config),
  pendingInterviews: (config) => client.get('/dashboard/data/pending-interviews', config),
  trainingOverview: (config) => client.get('/dashboard/data/training-overview', config),
}
