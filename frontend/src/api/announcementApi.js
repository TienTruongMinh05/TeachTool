import axiosClient from './axiosClient';

export const announcementApi = {
  getByClass: (classId) => axiosClient.get(`/classes/${classId}/announcements`),
  create: (classId, data) => axiosClient.post(`/classes/${classId}/announcements`, data),
  update: (id, data) => axiosClient.put(`/announcements/${id}`, data),
  togglePin: (id) => axiosClient.patch(`/announcements/${id}/pin`),
  delete: (id) => axiosClient.delete(`/announcements/${id}`)
};
