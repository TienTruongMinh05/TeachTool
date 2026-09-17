import axiosClient from './axiosClient';

export const studentPortalApi = {
  getSchedule: (studentId) => axiosClient.get(`/students/${studentId}/schedule`),
  joinClass: (classCode, studentId) => axiosClient.post('/classes/join', { classCode, studentId }),
  getClasses: (studentId) => axiosClient.get(`/classes/student/${studentId}`),
  reportAbsence: (studentId, sessionId, reason) => axiosClient.post(`/students/${studentId}/report-absence/${sessionId}`, { reason }),
  cancelAbsence: (studentId, sessionId) => axiosClient.post(`/students/${studentId}/cancel-absence/${sessionId}`)
};
