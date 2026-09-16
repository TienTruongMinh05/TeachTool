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

    @Transactional
    public void deleteUserSafely(Long targetUserId, Long callerId, String callerRole) {
        User targetUser = repository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng có ID: " + targetUserId));

        // Trường hợp 1: Người dùng tự xóa tài khoản của chính mình
        if (callerId != null && callerId.equals(targetUserId)) {
            jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", targetUserId);
            jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", targetUserId);
            return;
        }

        // Trường hợp 2: Giáo viên xóa tài khoản học sinh (chỉ khi học sinh không ở trong lớp nào cả)
        if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if ("TEACHER".equalsIgnoreCase(targetUser.getRole())) {
                throw new SecurityException("Giáo viên không được phép xóa tài khoản của giáo viên khác.");
            }

            // Kiểm tra xem học sinh có đang tham gia lớp học nào không
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM enrollments WHERE student_id = ?", 
                Integer.class, 
                targetUserId
            );
            if (count != null && count > 0) {
                throw new IllegalStateException("Không thể xóa học sinh này vì đang tham gia " + count + " lớp học. Vui lòng xóa học sinh ra khỏi tất cả các lớp trước khi xóa tài khoản.");
            }

            // Dọn dẹp dữ liệu liên quan và xóa tài khoản
            jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", targetUserId);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", targetUserId);
            return;
        }

        // Các trường hợp khác: Không có quyền
        throw new SecurityException("Bạn không có quyền xóa tài khoản này.");
    }

    @Transactional
    public void deleteUser(Long id) {
        jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", id);
        jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", id);
        jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", id);
        jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", id);
        jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", id);
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
    }
}