import client from './axios'

export const employeeTrainingApi = {
  list: (params, config) => client.get('/employee-trainings', { params, ...config }),
  show: (id) => client.get(`/employee-trainings/${id}`),
  store: (payload) => client.post('/employee-trainings', payload),
  update: (id, payload) => client.put(`/employee-trainings/${id}`, payload),
  destroy: (id) => client.delete(`/employee-trainings/${id}`),
  employeeSummary: (employeeId, params) => client.get(`/employee-trainings/employee/${employeeId}/summary`, { params }),
  attendanceList: (trainingId, params) => client.get(`/employee-trainings/training/${trainingId}/attendance`, { params }),
}
