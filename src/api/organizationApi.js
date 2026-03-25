import client from './axios'

export const siteApi = {
  list: (params, config) => client.get('/sites', { params, ...config }),
  show: (id) => client.get(`/sites/${id}`),
  store: (payload) => client.post('/sites', payload),
  update: (id, payload) => client.put(`/sites/${id}`, payload),
  destroy: (id) => client.delete(`/sites/${id}`),
  destroyBatch: (ids) => client.delete('/sites/batch', { data: { ids } }),
  options: () => client.get('/sites/options'),
}

export const departmentApi = {
  list: (params, config) => client.get('/departments', { params, ...config }),
  show: (id) => client.get(`/departments/${id}`),
  store: (payload) => client.post('/departments', payload),
  update: (id, payload) => client.put(`/departments/${id}`, payload),
  destroy: (id) => client.delete(`/departments/${id}`),
  destroyBatch: (ids) => client.delete('/departments/batch', { data: { ids } }),
  options: () => client.get('/departments/options'),
  positions: (id) => client.get(`/departments/${id}/positions`),
  managers: (id) => client.get(`/departments/${id}/managers`),
}

export const positionApi = {
  list: (params, config) => client.get('/positions', { params, ...config }),
  show: (id) => client.get(`/positions/${id}`),
  store: (payload) => client.post('/positions', payload),
  update: (id, payload) => client.put(`/positions/${id}`, payload),
  destroy: (id) => client.delete(`/positions/${id}`),
  destroyBatch: (ids) => client.delete('/positions/batch', { data: { ids } }),
  options: () => client.get('/positions/options'),
  directReports: (id) => client.get(`/positions/${id}/direct-reports`),
}

export const sectionDepartmentApi = {
  list: (params, config) => client.get('/section-departments', { params, ...config }),
  show: (id) => client.get(`/section-departments/${id}`),
  store: (payload) => client.post('/section-departments', payload),
  update: (id, payload) => client.put(`/section-departments/${id}`, payload),
  destroy: (id) => client.delete(`/section-departments/${id}`),
  options: (params) => client.get('/section-departments/options', { params }),
  byDepartment: (departmentId) => client.get(`/section-departments/by-department/${departmentId}`),
}
