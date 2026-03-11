import client from './axios'

export const jobOfferApi = {
  list: (params, config) => client.get('/job-offers', { params, ...config }),
  show: (id) => client.get(`/job-offers/${id}`),
  store: (payload) => client.post('/job-offers', payload),
  update: (id, payload) => client.put(`/job-offers/${id}`, payload),
  destroy: (id) => client.delete(`/job-offers/${id}`),
  destroyBatch: (ids) => client.delete('/job-offers/batch', { data: { ids } }),
  byCandidate: (name) => client.get(`/job-offers/by-candidate/${name}`),
  pdf: (id) => client.get(`/job-offers/${id}/pdf`, { responseType: 'blob' }),
}
