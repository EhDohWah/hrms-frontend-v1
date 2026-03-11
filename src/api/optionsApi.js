import client from './axios'

export const optionsApi = {
  departments: () => client.get('/departments/options'),
  positions: () => client.get('/positions/options'),
  sites: () => client.get('/sites/options'),
  sectionDepartments: (params) => client.get('/section-departments/options', { params }),
}
