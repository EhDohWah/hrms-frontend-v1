import client from './axios'

export const activityLogApi = {
  list:       (params)             => client.get('/activity-logs', { params }),
  recent:     (params)             => client.get('/activity-logs/recent', { params }),
  forSubject: (type, id, params)   => client.get(`/activity-logs/subject/${type}/${id}`, { params }),
  export:     (params)             => client.get('/activity-logs/export', { params, responseType: 'blob' }),
}
