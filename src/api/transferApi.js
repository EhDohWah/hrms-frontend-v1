import client from './axios'

export const transferApi = {
  list:    (params)  => client.get('/transfers', { params }),
  show:    (id)      => client.get(`/transfers/${id}`),
  store:   (payload) => client.post('/transfers', payload),
  destroy: (id)      => client.delete(`/transfers/${id}`),
}
