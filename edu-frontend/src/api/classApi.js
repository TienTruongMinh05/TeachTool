// File: src/api/classApi.js
import axiosClient from './axiosClient';

export const classApi = {
    getAll: () => axiosClient.get('/classes'),
    getById: (id) => axiosClient.get(`/classes/${id}`),
    create: (data) => axiosClient.post('/classes', data),
    update: (id, data) => axiosClient.put(`/classes/${id}`, data),
    delete: (id) => axiosClient.delete(`/classes/${id}`),
    getStudents: (classId) => axiosClient.get(`/classes/${classId}/students`),
    getTimetable: (classId) => axiosClient.get('/classes/timetable', { params: { classId } }),
    getTeachers: (classId) => axiosClient.get(`/classes/${classId}/teachers`),
    addTeacher: (classId, email) => axiosClient.post(`/classes/${classId}/teachers`, { email }),
    removeTeacher: (classId, teacherId) => axiosClient.delete(`/classes/${classId}/teachers/${teacherId}`),
};