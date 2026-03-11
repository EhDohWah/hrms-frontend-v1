import client from './axios'

export const userApi = {
  me: () => client.get('/user'),
  myPermissions: () => client.get('/me/permissions'),
  updatePassword: (payload) => client.post('/user/password', payload),
  updateEmail: (payload) => client.post('/user/email', payload),
  updateUsername: (payload) => client.post('/user/username', payload),
  updateProfilePicture: (formData) => client.post('/user/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
