import axiosClient from './axiosClient';

export const assignmentApi = {
  getByClass: (classId) => axiosClient.get(`/classes/${classId}/assignments`),
  getBySession: (sessionId) => axiosClient.get(`/sessions/${sessionId}/assignments`),
  create: (classId, sessionId, data) => {
    const url = sessionId 
      ? `/classes/${classId}/assignments?sessionId=${sessionId}` 
      : `/classes/${classId}/assignments`;
    return axiosClient.post(url, data);
  },
  update: (id, data) => axiosClient.put(`/assignments/${id}`, data),
  delete: (id) => axiosClient.delete(`/assignments/${id}`),
  getForStudent: (studentId) => axiosClient.get(`/students/${studentId}/assignments`)
};
