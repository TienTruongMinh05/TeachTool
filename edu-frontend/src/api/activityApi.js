// File: src/api/activityApi.js
import axiosClient from './axiosClient';

export const activityApi = {
    getAll: () => axiosClient.get('/activities'),
    create: (data) => axiosClient.post('/activities', data),
    update: (id, data) => axiosClient.put(`/activities/${id}`, data),
    delete: (id) => axiosClient.delete(`/activities/${id}`),
};
