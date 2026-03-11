import client from './axios'

export const holidayApi = {
  list: (params, config) => client.get('/holidays', { params, ...config }),
  show: (id) => client.get(`/holidays/${id}`),
  store: (payload) => client.post('/holidays', payload),
  update: (id, payload) => client.put(`/holidays/${id}`, payload),
  destroy: (id) => client.delete(`/holidays/${id}`),
  destroyBatch: (ids) => client.delete('/holidays/batch', { data: { ids } }),
  bulk: (payload) => client.post('/holidays/bulk', payload),
  inRange: (params) => client.get('/holidays/in-range', { params }),
  options: () => client.get('/holidays/options'),
}
