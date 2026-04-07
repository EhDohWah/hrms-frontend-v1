import client from './axios'

export const lookupApi = {
  list: (params) => client.get('/lookups', { params }),
  lists: () => client.get('/lookups/lists'),
  byType: (type) => client.get(`/lookups/type/${type}`),
  types: () => client.get('/lookups/types'),
  show: (id) => client.get(`/lookups/${id}`),
  store: (payload) => client.post('/lookups', payload),
  update: (id, payload) => client.put(`/lookups/${id}`, payload),
  destroy: (id) => client.delete(`/lookups/${id}`),
}
