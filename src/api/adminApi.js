import client from './axios'

export const adminApi = {
  // User CRUD
  list: (params, config) => client.get('/admin/users', { params, ...config }),
  show: (id) => client.get(`/admin/users/${id}`),
  store: (payload) => client.post('/admin/users', payload),
  update: (id, payload) => client.put(`/admin/users/${id}`, payload),
  destroy: (id) => client.delete(`/admin/users/${id}`),

  // Role CRUD
  listRoles: (params, config) => client.get('/admin/roles', { params, ...config }),
  showRole: (id) => client.get(`/admin/roles/${id}`),
  storeRole: (payload) => client.post('/admin/roles', payload),
  updateRole: (id, payload) => client.put(`/admin/roles/${id}`, payload),
  destroyRole: (id) => client.delete(`/admin/roles/${id}`),
  roleOptions: () => client.get('/admin/roles/options'),

  // User Permissions
  getUserPermissions: (userId) => client.get(`/admin/user-permissions/${userId}`),
  updateUserPermissions: (userId, payload) => client.put(`/admin/user-permissions/${userId}`, payload),
  getUserPermissionSummary: (userId) => client.get(`/admin/user-permissions/${userId}/summary`),

  // Modules
  getModulesByCategory: () => client.get('/admin/modules/by-category'),
}
