import axiosClient from './axiosClient';

export const reportApi = {
  getPreview: (classId, week = 1) => {
    return axiosClient.get(`/classes/${classId}/weekly-report-preview?week=${week}`);
  },
  downloadWeeklyReport: (classId, data = {}) => {
    return axiosClient.post(`/classes/${classId}/weekly-report`, data, {
      responseType: 'blob'
    });
  }
};
