import client from './axios'

export const employeeApi = {
  list: (params, config) => client.get('/employees', { params, ...config }),
  show: (id) => client.get(`/employees/${id}`),
  store: (payload) => client.post('/employees', payload),
  update: (id, payload) => client.put(`/employees/${id}`, payload),
  destroy: (id) => client.delete(`/employees/${id}`),
  destroyBatch: (ids) => client.delete(`/employees/batch/${ids.join(',')}`, { data: { ids } }),
  filter: (params) => client.get('/employees/filter', { params }),
  export: (params) => client.get('/employees/export', { params, responseType: 'blob' }),
  uploadProfilePicture: (id, formData) => client.post(`/employees/${id}/profile-picture`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
