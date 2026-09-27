package com.edumanager.api.service;

import com.edumanager.api.entity.User;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repository;
    private final JdbcTemplate jdbcTemplate;

    public User createUser(User user) {
        return repository.findByEmail(user.getEmail())
                .orElseGet(() -> repository.save(user));
    }

    public User getUserById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng có ID: " + id));
    }

    public User updateUser(Long id, User updated) {
        User user = getUserById(id);
        if (updated.getFullName() != null) {
            user.setFullName(updated.getFullName());
        }
        if (updated.getEmail() != null) {
            user.setEmail(updated.getEmail());
        }
        return repository.save(user);
    }

    private void cleanupUserDataAndRemove(Long userId) {
        // 1. Xóa nhận xét bài tập liên quan đến học sinh (cả do học sinh gửi và nhận xét trên bài nộp của học sinh)
        jdbcTemplate.update(
            "DELETE FROM submission_feedback_comments WHERE sender_id = ? OR submission_id IN (SELECT id FROM submissions WHERE student_id = ?)", 
            userId, userId
        );

        // 2. Xóa tin nhắn và luồng thắc mắc liên quan
        jdbcTemplate.update(
            "DELETE FROM inquiry_messages WHERE sender_id = ? OR thread_id IN (SELECT id FROM inquiry_threads WHERE student_id = ?)", 
            userId, userId
        );
        jdbcTemplate.update("DELETE FROM inquiry_threads WHERE student_id = ?", userId);

        // 3. Xóa điểm danh
        jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", userId);

        // 4. Xóa bài nộp
        jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", userId);

        // 5. Xóa ghi danh vào các lớp học
        jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", userId);

        // 6. Xóa quyền giáo viên phụ trách (nếu tài khoản là giáo viên)
        jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", userId);
        jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", userId);

        // 7. Xóa thông báo đã đăng (nếu có)
        jdbcTemplate.update("DELETE FROM class_announcements WHERE author_id = ?", userId);

        // 8. Xóa vĩnh viễn tài khoản người dùng
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
    }

    @Transactional
    public void deleteUserSafely(Long targetUserId, Long callerId, String callerRole) {
        User targetUser = repository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng có ID: " + targetUserId));

        // Trường hợp 1: Người dùng tự xóa tài khoản của chính mình
        if (callerId != null && callerId.equals(targetUserId)) {
            cleanupUserDataAndRemove(targetUserId);
            return;
        }

        // Trường hợp 2: Giáo viên xóa tài khoản học sinh (tự động dọn dẹp sạch sẽ tất cả lớp và dữ liệu phụ thuộc)
        if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if ("TEACHER".equalsIgnoreCase(targetUser.getRole())) {
                throw new SecurityException("Giáo viên không được phép xóa tài khoản của giáo viên khác.");
            }

            cleanupUserDataAndRemove(targetUserId);
            return;
        }

        // Các trường hợp khác: Không có quyền
        throw new SecurityException("Bạn không có quyền xóa tài khoản này.");
    }

    @Transactional
    public void deleteUser(Long id) {
        cleanupUserDataAndRemove(id);
    }
}