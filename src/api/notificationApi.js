import client from './axios'

export const notificationApi = {
  list: (params, config) => client.get('/notifications', { params, ...config }),
  unreadCount: () => client.get('/notifications/unread-count'),
  stats: () => client.get('/notifications/stats'),
  show: (id) => client.get(`/notifications/${id}`),
  markAsRead: (id) => client.post(`/notifications/${id}/mark-read`),
  markAllAsRead: () => client.post('/notifications/mark-all-read'),
  destroy: (id) => client.delete(`/notifications/${id}`),
  clearRead: () => client.post('/notifications/clear-read'),
  filterOptions: () => client.get('/notifications/filter-options'),
}
