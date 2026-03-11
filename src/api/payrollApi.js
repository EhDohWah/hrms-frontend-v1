import client from './axios'

export const payrollApi = {
  list: (params, config) => client.get('/payrolls', { params, ...config }),
  show: (id) => client.get(`/payrolls/${id}`),
  update: (id, payload) => client.put(`/payrolls/${id}`, payload),
  destroy: (id) => client.delete(`/payrolls/${id}`),
  destroyBatch: (ids) => client.delete('/payrolls/batch', { data: { ids } }),
  payslip: (id) => client.get(`/payrolls/${id}/payslip`, { responseType: 'blob' }),
  search: (params) => client.get('/payrolls/search', { params }),
  budgetHistory: (params) => client.get('/payrolls/budget-history', { params }),
  bulkPreview: (payload) => client.post('/payrolls/bulk/preview', payload),
  bulkCreate: (payload) => client.post('/payrolls/bulk/create', payload),
  bulkStatus: (batchId) => client.get(`/payrolls/bulk/status/${batchId}`),
  bulkErrors: (batchId) => client.get(`/payrolls/bulk/errors/${batchId}`, { responseType: 'blob' }),
  bulkPayslips: (payload) => client.post('/payrolls/bulk-payslips', payload, { responseType: 'blob' }),
}
