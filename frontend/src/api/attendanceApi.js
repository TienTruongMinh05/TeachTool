// File: src/api/attendanceApi.js
import axiosClient from './axiosClient';

export const attendanceApi = {
    getBySession: (sessionId) => axiosClient.get(`/sessions/${sessionId}/attendance`),
    mark: (sessionId, studentId, status, note = '') => {
        const params = new URLSearchParams({ status });
        if (note) params.append('note', note);
        return axiosClient.post(`/sessions/${sessionId}/attendance/${studentId}?${params.toString()}`);
    },
    batchMark: (sessionId, items) => axiosClient.post(`/sessions/${sessionId}/attendance/batch`, items),
    getByClass: (classId) => axiosClient.get(`/classes/${classId}/attendance`),
};
