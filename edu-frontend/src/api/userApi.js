import axiosClient from './axiosClient';

export const userApi = {
    getById: (id) => axiosClient.get(`/users/${id}`),
    update: (id, data) => axiosClient.put(`/users/${id}`, data),
};
