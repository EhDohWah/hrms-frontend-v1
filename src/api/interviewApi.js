import client from './axios'

export const interviewApi = {
  list: (params, config) => client.get('/interviews', { params, ...config }),
  show: (id) => client.get(`/interviews/${id}`),
  store: (payload) => client.post('/interviews', payload),
  update: (id, payload) => client.put(`/interviews/${id}`, payload),
  destroy: (id) => client.delete(`/interviews/${id}`),
  destroyBatch: (ids) => client.delete('/interviews/batch', { data: { ids } }),
  byCandidate: (name) => client.get(`/interviews/by-candidate/${name}`),
}
