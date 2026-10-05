// File: src/api/timesheetApi.js
import axiosClient from './axiosClient';

export const timesheetApi = {
  getPreview: (month, year, classId = null) => {
    let url = `/timesheet/preview?month=${month}&year=${year}`;
    if (classId) {
      url += `&classId=${classId}`;
    }
    return axiosClient.get(url);
  },

  exportExcel: (month, year, classId = null) => {
    let url = `/timesheet/export?month=${month}&year=${year}`;
    if (classId) {
      url += `&classId=${classId}`;
    }
    return axiosClient.get(url, {
      responseType: 'blob'
    });
  }
};
