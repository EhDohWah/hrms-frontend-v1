import client from './axios'

export const personnelActionApi = {
  list: (params, config) => client.get('/personnel-actions', { params, ...config }),
  show: (id) => client.get(`/personnel-actions/${id}`),
  store: (payload) => client.post('/personnel-actions', payload),
  update: (id, payload) => client.put(`/personnel-actions/${id}`, payload),
  destroy: (id) => client.delete(`/personnel-actions/${id}`),
  destroyBatch: (ids) => client.delete('/personnel-actions/batch', { data: { ids } }),
  approve: (id, payload) => client.patch(`/personnel-actions/${id}/approve`, payload),
  constants: () => client.get('/personnel-actions/constants'),
  exportPdf: (id) => client.get(`/personnel-actions/${id}/export-pdf`, { responseType: 'blob' }),
  amendmentLetter: (id) => client.get(`/personnel-actions/${id}/amendment-letter`, { responseType: 'blob' }),
}
