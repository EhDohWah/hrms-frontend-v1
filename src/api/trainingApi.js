import client from './axios'

export const trainingApi = {
  list: (params, config) => client.get('/trainings', { params, ...config }),
  options: () => client.get('/trainings/options'),
  show: (id) => client.get(`/trainings/${id}`),
  store: (payload) => client.post('/trainings', payload),
  update: (id, payload) => client.put(`/trainings/${id}`, payload),
  destroy: (id) => client.delete(`/trainings/${id}`),
  destroyBatch: (ids) => client.delete('/trainings/batch', { data: { ids } }),
  typeOptions: () => client.get('/trainings/type-options'),
}
