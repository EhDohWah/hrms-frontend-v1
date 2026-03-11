import client from './axios'

export const employmentApi = {
  list: (params) => client.get('/employments', { params }),
  show: (id) => client.get(`/employments/${id}`),
  store: (payload) => client.post('/employments', payload),
  update: (id, payload) => client.put(`/employments/${id}`, payload),
  destroy: (id) => client.delete(`/employments/${id}`),
  searchByStaffId: (staffId, params) => client.get(`/employments/search/staff-id/${staffId}`, { params }),
  completeProbation: (id) => client.post(`/employments/${id}/complete-probation`),
  probationStatus: (id, payload) => client.post(`/employments/${id}/probation-status`, payload),
  probationHistory: (id) => client.get(`/employments/${id}/probation-history`),
}
