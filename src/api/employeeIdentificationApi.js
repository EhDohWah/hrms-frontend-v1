import client from './axios'

export const employeeIdentificationApi = {
  list: (params) => client.get('/employee-identifications', { params }),
  show: (id) => client.get(`/employee-identifications/${id}`),
  store: (payload) => client.post('/employee-identifications', payload),
  update: (id, payload) => client.put(`/employee-identifications/${id}`, payload),
  destroy: (id) => client.delete(`/employee-identifications/${id}`),
  setPrimary: (id) => client.patch(`/employee-identifications/${id}/set-primary`),
}
