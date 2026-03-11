import client from './axios'

export const lookupApi = {
  list: () => client.get('/lookups'),
  lists: () => client.get('/lookups/lists'),
  byType: (type) => client.get(`/lookups/type/${type}`),
  types: () => client.get('/lookups/types'),
}
