// File: src/api/sessionApi.js
import axiosClient from './axiosClient';

export const sessionApi = {
    getByClass: (classId) => axiosClient.get(`/classes/${classId}/sessions`),
    getById: (classId, sessionId) => axiosClient.get(`/classes/${classId}/sessions/${sessionId}`),
    create: (classId, data) => axiosClient.post(`/classes/${classId}/sessions`, data),
    update: (classId, sessionId, data) => axiosClient.put(`/classes/${classId}/sessions/${sessionId}`, data),
    delete: (classId, sessionId) => axiosClient.delete(`/classes/${classId}/sessions/${sessionId}`),
};
