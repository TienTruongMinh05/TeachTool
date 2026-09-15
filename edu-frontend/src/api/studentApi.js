// File: src/api/studentApi.js
import axiosClient from './axiosClient';

export const studentApi = {
    // 1. Tạo user mới (học sinh)
    create: (data) => axiosClient.post('/users', { ...data, role: 'student' }),
    
    // 2. Gán học sinh vào lớp
    enroll: (classId, studentId) => axiosClient.post(`/classes/${classId}/enroll/${studentId}`),
    
    // 3. Lấy danh sách học sinh của một lớp
    getByClass: (classId) => axiosClient.get(`/classes/${classId}/students`),
    
    // 4. Cập nhật thông tin học sinh
    update: (id, data) => axiosClient.put(`/users/${id}`, data),

    // 5. Xóa học sinh khỏi lớp (hủy ghi danh)
    removeFromClass: (classId, studentId) => axiosClient.delete(`/classes/${classId}/students/${studentId}`),

    // 6. Xóa tài khoản học sinh
    delete: (id) => axiosClient.delete(`/users/${id}`),

    // 7. Lấy danh sách toàn bộ học sinh (của tất cả các lớp)
    getAll: () => axiosClient.get('/classes/all-students'),
};