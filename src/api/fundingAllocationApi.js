import client from './axios'

export const fundingAllocationApi = {
  list: (params) => client.get('/employee-funding-allocations', { params }),
  show: (id) => client.get(`/employee-funding-allocations/${id}`),
  store: (payload) => client.post('/employee-funding-allocations', payload),
  update: (id, payload) => client.put(`/employee-funding-allocations/${id}`, payload),
  destroy: (id) => client.delete(`/employee-funding-allocations/${id}`),
  grantStructure: () => client.get('/employee-funding-allocations/grant-structure'),
  employeeAllocations: (employeeId) => client.get(`/employee-funding-allocations/employee/${employeeId}`),
  byGrantItem: (grantItemId) => client.get(`/employee-funding-allocations/by-grant-item/${grantItemId}`),
  calculatePreview: (payload) => client.post('/employee-funding-allocations/calculate-preview', payload),
  batchUpdate: (payload) => client.put('/employee-funding-allocations/batch', payload),
  updateEmployeeAllocations: (employeeId, payload) => client.put(`/employee-funding-allocations/employee/${employeeId}`, payload),
  bulkDeactivate: (payload) => client.post('/employee-funding-allocations/bulk-deactivate', payload),
}
