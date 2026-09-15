import axiosClient from './axiosClient';

export const enrollmentApi = {
    enroll: (classId, studentId) => axiosClient.post(`/classes/${classId}/enroll/${studentId}`),
    removeStudent: (classId, studentId) => axiosClient.delete(`/classes/${classId}/students/${studentId}`),
};
