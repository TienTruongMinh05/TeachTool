package com.edumanager.api.controller;

import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AdminMaintenanceController {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AttendanceRepository attendanceRepository;
    private final ClassTeacherRepository classTeacherRepository;
    private final ClassRoomRepository classRoomRepository;

    private static final String ADMIN_SECRET = "teachtool_admin_secret_2026";

    private boolean isAuthorized(String adminKey) {
        return ADMIN_SECRET.equals(adminKey);
    }

    @GetMapping("/admin-list-users")
    public ResponseEntity<?> listAllUsers(@RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : userRepository.findAll()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("fullName", u.getFullName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole());
            map.put("avatarUrl", u.getAvatarUrl());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @Transactional
    @PostMapping("/admin-cleanup-users")
    public ResponseEntity<?> cleanupUsers(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(value = "pattern", required = false) String pattern) {
        
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<User> allUsers = userRepository.findAll();
        List<Map<String, Object>> deleted = new ArrayList<>();

        for (User user : allUsers) {
            String name = (user.getFullName() != null ? user.getFullName() : "").toLowerCase();
            String email = (user.getEmail() != null ? user.getEmail() : "").toLowerCase();

            boolean shouldDelete = false;

            // 1. Cô Lan (hoặc tên/email chứa Lan)
            if (name.contains("lan") || email.contains("lan")) {
                shouldDelete = true;
            }

            // 2. Học sinh Nam (hoặc tên/email chứa Nam)
            if (name.contains("nam") || email.contains("nam")) {
                shouldDelete = true;
            }

            // 3. Các tài khoản thử nghiệm (test, testupload, admin@edu.vn, dummy)
            if (email.startsWith("test") || email.contains("testupload") || email.contains("dummy") || "admin@edu.vn".equals(email)) {
                shouldDelete = true;
            }

            // 4. Khớp theo pattern tùy chọn nếu được truyền vào
            if (pattern != null && !pattern.isBlank() && (name.contains(pattern.toLowerCase()) || email.contains(pattern.toLowerCase()))) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                Long userId = user.getId();
                log.info("Dọn dẹp tài khoản: ID={}, Name={}, Email={}, Role={}", userId, user.getFullName(), user.getEmail(), user.getRole());

                // Dọn dẹp quan hệ liên quan an toàn
                enrollmentRepository.findByStudentId(userId).forEach(enrollmentRepository::delete);
                attendanceRepository.findByStudentId(userId).forEach(attendanceRepository::delete);
                submissionRepository.findByStudentId(userId).forEach(submissionRepository::delete);
                classTeacherRepository.findByTeacherId(userId).forEach(classTeacherRepository::delete);

                // Nếu là giáo viên chủ nhiệm lớp, gỡ teacherId
                List<ClassRoom> ownedClasses = classRoomRepository.findByTeacherId(userId);
                for (ClassRoom cr : ownedClasses) {
                    cr.setTeacherId(null);
                    classRoomRepository.save(cr);
                }

                userRepository.delete(user);

                Map<String, Object> delInfo = new LinkedHashMap<>();
                delInfo.put("id", userId);
                delInfo.put("fullName", user.getFullName());
                delInfo.put("email", user.getEmail());
                delInfo.put("role", user.getRole());
                deleted.add(delInfo);
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Đã dọn dẹp thành công " + deleted.size() + " tài khoản thử nghiệm / Cô Lan / Học sinh Nam.",
                "deletedCount", deleted.size(),
                "deletedUsers", deleted
        ));
    }

    @Transactional
    @DeleteMapping("/admin-delete-user/{id}")
    public ResponseEntity<?> deleteSpecificUser(
            @PathVariable Long id,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy user id=" + id));
        }

        User user = userOpt.get();
        enrollmentRepository.findByStudentId(id).forEach(enrollmentRepository::delete);
        attendanceRepository.findByStudentId(id).forEach(attendanceRepository::delete);
        submissionRepository.findByStudentId(id).forEach(submissionRepository::delete);
        classTeacherRepository.findByTeacherId(id).forEach(classTeacherRepository::delete);

        List<ClassRoom> ownedClasses = classRoomRepository.findByTeacherId(id);
        for (ClassRoom cr : ownedClasses) {
            cr.setTeacherId(null);
            classRoomRepository.save(cr);
        }

        userRepository.delete(user);

        return ResponseEntity.ok(Map.of(
                "message", "Đã xóa tài khoản ID=" + id + " (" + user.getFullName() + " - " + user.getEmail() + ")",
                "user", user
        ));
    }
}
