import client from './axios'

export const grantApi = {
  list: (params, config) => client.get('/grants', { params, ...config }),
  show: (id) => client.get(`/grants/by-id/${id}`),
  showByCode: (code) => client.get(`/grants/by-code/${code}`),
  store: (payload) => client.post('/grants', payload),
  update: (id, payload) => client.put(`/grants/${id}`, payload),
  destroy: (id) => client.delete(`/grants/${id}`),
  destroyBatch: (ids) => client.delete('/grants/batch', { data: { ids } }),
  grantPositions: (params, config) => client.get('/grants/grant-positions', { params, ...config }),
}

export const grantItemApi = {
  list: (params, config) => client.get('/grant-items', { params, ...config }),
  show: (id) => client.get(`/grant-items/${id}`),
  store: (payload) => client.post('/grant-items', payload),
  update: (id, payload) => client.put(`/grant-items/${id}`, payload),
  destroy: (id) => client.delete(`/grant-items/${id}`),
}
