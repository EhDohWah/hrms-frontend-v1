import client from './axios'

export const resignationApi = {
  list: (params, config) => client.get('/resignations', { params, ...config }),
  show: (id) => client.get(`/resignations/${id}`),
  store: (payload) => client.post('/resignations', payload),
  update: (id, payload) => client.put(`/resignations/${id}`, payload),
  destroy: (id) => client.delete(`/resignations/${id}`),
  destroyBatch: (ids) => client.delete('/resignations/batch', { data: { ids } }),
  acknowledge: (id, payload) => client.put(`/resignations/${id}/acknowledge`, payload),
  searchEmployees: (params) => client.get('/resignations/search-employees', { params }),
  recommendationLetter: (id) => client.get(`/resignations/${id}/recommendation-letter`, { responseType: 'blob' }),
}
