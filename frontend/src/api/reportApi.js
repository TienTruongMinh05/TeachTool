import axiosClient from './axiosClient';

export const reportApi = {
  downloadWeeklyReport: (classId, week = 1) => {
    return axiosClient.get(`/classes/${classId}/weekly-report?week=${week}`, {
      responseType: 'blob'
    });
  }
};
