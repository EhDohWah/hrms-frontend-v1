import client from './axios'

export const attendanceApi = {
  list: (params, config) => client.get('/attendances', { params, ...config }),
  show: (id) => client.get(`/attendances/${id}`),
  store: (payload) => client.post('/attendances', payload),
  update: (id, payload) => client.put(`/attendances/${id}`, payload),
  destroy: (id) => client.delete(`/attendances/${id}`),
  destroyBatch: (ids) => client.delete('/attendances/batch', { data: { ids } }),
  options: () => client.get('/attendances/options'),
}
