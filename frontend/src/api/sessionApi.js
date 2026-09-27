// File: src/api/sessionApi.js
import axiosClient from './axiosClient';

export const sessionApi = {
    getByClass: (classId) => axiosClient.get(`/classes/${classId}/sessions`),
    getById: (classId, sessionId) => axiosClient.get(`/classes/${classId}/sessions/${sessionId}`),
    create: (classIdOrData, data) => {
        if (typeof classIdOrData === 'object' && classIdOrData !== null) {
            const { classId, ...payload } = classIdOrData;
            return axiosClient.post(`/classes/${classId}/sessions`, payload);
        }
        return axiosClient.post(`/classes/${classIdOrData}/sessions`, data);
    },
    update: (classId, sessionId, data) => axiosClient.put(`/classes/${classId}/sessions/${sessionId}`, data),
    updateAnnouncement: (classId, sessionId, announcement) => {
        if (classId) {
            return axiosClient.patch(`/classes/${classId}/sessions/${sessionId}/announcement`, { announcement });
        }
        return axiosClient.patch(`/sessions/${sessionId}/announcement`, { announcement });
    },
    delete: (classId, sessionId) => axiosClient.delete(`/classes/${classId}/sessions/${sessionId}`),
};
