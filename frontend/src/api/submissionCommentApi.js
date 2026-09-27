import axiosClient from './axiosClient';

export const submissionCommentApi = {
  getBySubmission: (submissionId) => axiosClient.get(`/submissions/${submissionId}/comments`),
  addComment: (submissionId, data) => axiosClient.post(`/submissions/${submissionId}/comments`, data)
};
