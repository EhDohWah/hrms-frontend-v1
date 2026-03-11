import client from './axios'

export const employeeEducationApi = {
  list: (params) => client.get('/employee-education', { params }),
  show: (id) => client.get(`/employee-education/${id}`),
  store: (payload) => client.post('/employee-education', payload),
  update: (id, payload) => client.put(`/employee-education/${id}`, payload),
  destroy: (id) => client.delete(`/employee-education/${id}`),
}

export const employeeChildApi = {
  list: (params) => client.get('/employee-children', { params }),
  show: (id) => client.get(`/employee-children/${id}`),
  store: (payload) => client.post('/employee-children', payload),
  update: (id, payload) => client.put(`/employee-children/${id}`, payload),
  destroy: (id) => client.delete(`/employee-children/${id}`),
}

export const employeeLanguageApi = {
  list: (params) => client.get('/employee-language', { params }),
  show: (id) => client.get(`/employee-language/${id}`),
  store: (payload) => client.post('/employee-language', payload),
  update: (id, payload) => client.put(`/employee-language/${id}`, payload),
  destroy: (id) => client.delete(`/employee-language/${id}`),
}

export const employeeBeneficiaryApi = {
  list: (params) => client.get('/employee-beneficiaries', { params }),
  show: (id) => client.get(`/employee-beneficiaries/${id}`),
  store: (payload) => client.post('/employee-beneficiaries', payload),
  update: (id, payload) => client.put(`/employee-beneficiaries/${id}`, payload),
  destroy: (id) => client.delete(`/employee-beneficiaries/${id}`),
}
