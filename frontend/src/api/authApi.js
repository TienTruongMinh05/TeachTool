import axiosClient from './axiosClient';

export const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  googleLogin: (data) => axiosClient.post('/auth/google-login', data),
  selectRole: (data) => axiosClient.post('/auth/select-role', data),
  changePassword: (arg1, arg2, arg3) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      return axiosClient.post('/auth/change-password', arg1);
    }
    const oldPassword = arg3 ? arg2 : arg1;
    const newPassword = arg3 ? arg3 : arg2;
    return axiosClient.post('/auth/change-password', { oldPassword, newPassword });
  },
  getMe: (userId) => axiosClient.get(`/auth/me/${userId}`),
  deleteAccount: (userId) => axiosClient.delete(`/auth/account/${userId}`)
};
