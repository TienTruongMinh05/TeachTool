// File: src/api/teachingPlanApi.js
import axiosClient from './axiosClient';

export const teachingPlanApi = {
    getByClass: (classId) => axiosClient.get(`/classes/${classId}/plans`),
    getById: (id) => axiosClient.get(`/plans/${id}`),
    create: (classId, sessionId, data) => axiosClient.post(`/classes/${classId}/plans?sessionId=${sessionId}`, data),
    update: (id, data) => axiosClient.put(`/plans/${id}`, data),
    delete: (id) => axiosClient.delete(`/plans/${id}`),
    copy: (id, targetSessionId) => axiosClient.post(`/plans/${id}/copy?targetSessionId=${targetSessionId}`),
};
