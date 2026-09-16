import axiosClient from './axiosClient';

export const materialApi = {
  getByClass: (classId) => axiosClient.get(`/classes/${classId}/materials`),
  create: (classId, data) => axiosClient.post(`/classes/${classId}/materials`, data),
  delete: (classId, materialId) => axiosClient.delete(`/classes/${classId}/materials/${materialId}`)
};
