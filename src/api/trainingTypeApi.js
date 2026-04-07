import client from './axios'

export const trainingTypeApi = {
  list: (params, config) => client.get('/training-types', { params, ...config }),
  show: (id) => client.get(`/training-types/${id}`),
  store: (payload) => client.post('/training-types', payload),
  update: (id, payload) => client.put(`/training-types/${id}`, payload),
  destroy: (id) => client.delete(`/training-types/${id}`),
}
