package com.edumanager.api.service;

import com.edumanager.api.entity.Enrollment;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.AttendanceRepository;
import com.edumanager.api.repository.EnrollmentRepository;
import com.edumanager.api.repository.SubmissionRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AttendanceRepository attendanceRepository;

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
            enrollmentRepository.findByStudentId(targetUserId).forEach(enrollmentRepository::delete);
            submissionRepository.findByStudentId(targetUserId).forEach(submissionRepository::delete);
            attendanceRepository.findByStudentId(targetUserId).forEach(attendanceRepository::delete);
            repository.delete(targetUser);
            return;
        }

        // Trường hợp 2: Giáo viên xóa tài khoản học sinh (chỉ khi học sinh không ở trong lớp nào cả)
        if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if ("TEACHER".equalsIgnoreCase(targetUser.getRole())) {
                throw new SecurityException("Giáo viên không được phép xóa tài khoản của giáo viên khác.");
            }

            // Kiểm tra xem học sinh có đang tham gia lớp học nào không
            List<Enrollment> enrollments = enrollmentRepository.findByStudentId(targetUserId);
            if (!enrollments.isEmpty()) {
                throw new IllegalStateException("Không thể xóa học sinh này vì đang tham gia " + enrollments.size() + " lớp học. Vui lòng xóa học sinh ra khỏi tất cả các lớp trước khi xóa tài khoản.");
            }

            // Dọn dẹp dữ liệu và xóa tài khoản
            submissionRepository.findByStudentId(targetUserId).forEach(submissionRepository::delete);
            attendanceRepository.findByStudentId(targetUserId).forEach(attendanceRepository::delete);
            repository.delete(targetUser);
            return;
        }

        // Các trường hợp khác: Không có quyền
        throw new SecurityException("Bạn không có quyền xóa tài khoản này.");
    }

    public void deleteUser(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy người dùng có ID: " + id);
        }
        repository.deleteById(id);
    }
}