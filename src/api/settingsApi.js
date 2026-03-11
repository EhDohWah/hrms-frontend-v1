import client from './axios'

export const benefitSettingApi = {
  list: (params, config) => client.get('/benefit-settings', { params, ...config }),
  show: (id) => client.get(`/benefit-settings/${id}`),
  store: (payload) => client.post('/benefit-settings', payload),
  update: (id, payload) => client.put(`/benefit-settings/${id}`, payload),
  destroy: (id) => client.delete(`/benefit-settings/${id}`),
}

export const taxSettingApi = {
  list: (params, config) => client.get('/tax-settings', { params, ...config }),
  show: (id) => client.get(`/tax-settings/${id}`),
  store: (payload) => client.post('/tax-settings', payload),
  update: (id, payload) => client.put(`/tax-settings/${id}`, payload),
  destroy: (id) => client.delete(`/tax-settings/${id}`),
  byYear: (year) => client.get(`/tax-settings/by-year/${year}`),
  toggleSelection: (id) => client.patch(`/tax-settings/${id}/toggle`),
  bulkUpdate: (payload) => client.post('/tax-settings/bulk-update', payload),
}

export const taxBracketApi = {
  list: (params, config) => client.get('/tax-brackets', { params, ...config }),
  show: (id) => client.get(`/tax-brackets/${id}`),
  store: (payload) => client.post('/tax-brackets', payload),
  update: (id, payload) => client.put(`/tax-brackets/${id}`, payload),
  destroy: (id) => client.delete(`/tax-brackets/${id}`),
  calculateTax: (income, params) => client.get(`/tax-brackets/calculate/${income}`, { params }),
}

export const taxCalculationApi = {
  calculatePayroll: (payload) => client.post('/tax-calculations/payroll', payload),
  calculateIncomeTax: (payload) => client.post('/tax-calculations/income-tax', payload),
  calculateAnnualSummary: (payload) => client.post('/tax-calculations/annual-summary', payload),
}

export const payrollPolicyApi = {
  list: (params, config) => client.get('/payroll-policy-settings', { params, ...config }),
  show: (id) => client.get(`/payroll-policy-settings/${id}`),
  store: (payload) => client.post('/payroll-policy-settings', payload),
  update: (id, payload) => client.put(`/payroll-policy-settings/${id}`, payload),
  destroy: (id) => client.delete(`/payroll-policy-settings/${id}`),
}
