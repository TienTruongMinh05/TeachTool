import axiosClient from './axiosClient';

export const submissionApi = {
  submit: (assignmentId, studentId, data) => 
    axiosClient.post(`/submissions/assignment/${assignmentId}/student/${studentId}`, data),
  grade: (submissionId, data) => 
    axiosClient.put(`/submissions/${submissionId}/grade`, data),
  getByAssignment: (assignmentId) => 
    axiosClient.get(`/submissions/assignment/${assignmentId}`),
  getByClass: (classId) => 
    axiosClient.get(`/submissions/class/${classId}`),
  getByStudent: (studentId) => 
    axiosClient.get(`/submissions/student/${studentId}`),
  getSubmission: (assignmentId, studentId) => 
    axiosClient.get(`/submissions/assignment/${assignmentId}/student/${studentId}`),
  delete: (submissionId) => 
    axiosClient.delete(`/submissions/${submissionId}`)
};

