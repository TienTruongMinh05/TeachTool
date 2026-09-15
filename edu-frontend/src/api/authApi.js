import axiosClient from './axiosClient';

export const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  googleLogin: (data) => axiosClient.post('/auth/google-login', data),
  selectRole: (data) => axiosClient.post('/auth/select-role', data),
  changePassword: (data) => axiosClient.post('/auth/change-password', data),
  getMe: (userId) => axiosClient.get(`/auth/me/${userId}`),
  deleteAccount: (userId) => axiosClient.delete(`/auth/account/${userId}`)
};
