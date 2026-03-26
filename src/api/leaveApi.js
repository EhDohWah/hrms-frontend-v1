import client from './axios'

export const leaveApi = {
  types: (params, config) => client.get('/leave-types', { params, ...config }),
  typeOptions: () => client.get('/leave-types/options'),
  typeStore: (payload) => client.post('/leave-types', payload),
  typeUpdate: (id, payload) => client.put(`/leave-types/${id}`, payload),
  typeDestroy: (id) => client.delete(`/leave-types/${id}`),
  typeDestroyBatch: (ids) => client.delete('/leave-types/batch', { data: { ids } }),
  requests: (params, config) => client.get('/leave-requests', { params, ...config }),
  requestShow: (id) => client.get(`/leave-requests/${id}`),
  requestStore: (payload) => client.post('/leave-requests', payload),
  requestUpdate: (id, payload) => client.put(`/leave-requests/${id}`, payload),
  requestDestroy: (id) => client.delete(`/leave-requests/${id}`),
  requestDestroyBatch: (ids) => client.delete('/leave-requests/batch', { data: { ids } }),
  calculateDays: (payload) => client.post('/leave-requests/calculate-days', payload),
  checkOverlap: (payload) => client.post('/leave-requests/check-overlap', payload),
  balances: (params, config) => client.get('/leave-balances', { params, ...config }),
  balanceShow: (employeeId, leaveTypeId) => client.get(`/leave-balances/${employeeId}/${leaveTypeId}`),
}
