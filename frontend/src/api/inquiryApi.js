// File: src/api/inquiryApi.js
import axiosClient from './axiosClient';

export const inquiryApi = {
  // 1. Học sinh: Lấy hoặc tạo thread thắc mắc cho 1 lớp
  getStudentThread: (classId) =>
    axiosClient.get('/inquiries/student/thread', { params: { classId } }),

  // 2. Học sinh: Lấy danh sách tất cả các thread thắc mắc của mình
  getStudentThreads: () =>
    axiosClient.get('/inquiries/student/threads'),

  // 3. Giáo viên: Lấy danh sách các câu hỏi từ học viên (hỗ trợ lọc theo classId)
  getTeacherThreads: (classId) =>
    axiosClient.get('/inquiries/teacher/threads', { params: classId ? { classId } : {} }),

  // 4. Lấy lịch sử tin nhắn của một thread
  getThreadMessages: (threadId) =>
    axiosClient.get(`/inquiries/threads/${threadId}/messages`),

  // 5. Gửi tin nhắn mới (văn bản + tệp đính kèm)
  sendMessage: (threadId, data) =>
    axiosClient.post(`/inquiries/threads/${threadId}/messages`, data),

  // 6. Giáo viên: Xóa cuộc trò chuyện để giải phóng hệ thống
  deleteThread: (threadId) =>
    axiosClient.delete(`/inquiries/threads/${threadId}`),
};
