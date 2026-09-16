package com.edumanager.api.controller;

import com.edumanager.api.entity.User;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AdminMaintenanceController {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    private static final String ADMIN_SECRET = "teachtool_admin_secret_2026";

    private boolean isAuthorized(String adminKey) {
        return ADMIN_SECRET.equals(adminKey);
    }

    @GetMapping("/admin-list-users")
    public ResponseEntity<?> listAllUsers(@RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
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
        } catch (Exception e) {
            log.error("Lỗi khi lấy danh sách user: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi: " + e.getMessage()));
        }
    }

    @Transactional
    @PostMapping("/admin-cleanup-users")
    public ResponseEntity<?> cleanupUsers(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(value = "pattern", required = false) String pattern) {
        
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            List<User> allUsers = userRepository.findAll();
            List<Map<String, Object>> deleted = new ArrayList<>();
            List<Map<String, Object>> kept = new ArrayList<>();

            for (User user : allUsers) {
                String name = (user.getFullName() != null ? user.getFullName() : "").toLowerCase().trim();
                String email = (user.getEmail() != null ? user.getEmail() : "").toLowerCase().trim();

                // 0. BẢO VỆ TUYỆT ĐỐI 2 TÀI KHOẢN CHÍNH: email chứa 'awn', 'awm', hoặc 'tien' / 'tiến' / 'tien.truong'
                boolean isProtectedUser = email.contains("awn") || email.contains("awm") || 
                                          email.contains("tien.truong") || email.contains("tientruong") ||
                                          name.contains("tiến") || name.contains("tien");

                if (isProtectedUser) {
                    Map<String, Object> keepInfo = new LinkedHashMap<>();
                    keepInfo.put("id", user.getId());
                    keepInfo.put("fullName", user.getFullName());
                    keepInfo.put("email", user.getEmail());
                    keepInfo.put("role", user.getRole());
                    kept.add(keepInfo);
                    continue;
                }

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

                    // Xóa triệt để bằng JDBC
                    jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", userId);
                    jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", userId);
                    jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", userId);
                    jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", userId);
                    jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", userId);
                    jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);

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
                    "deletedUsers", deleted,
                    "keptUsers", kept
            ));
        } catch (Exception e) {
            log.error("Lỗi khi dọn dẹp tài khoản: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi dọn dẹp: " + e.getMessage()));
        }
    }

    @Transactional
    @DeleteMapping("/admin-delete-user/{id}")
    public ResponseEntity<?> deleteSpecificUser(
            @PathVariable Long id,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        
        if (!isAuthorized(adminKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy user id=" + id));
            }

            User user = userOpt.get();
            jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", id);
            jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", id);
            jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", id);
            jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", id);
            jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", id);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);

            return ResponseEntity.ok(Map.of(
                    "message", "Đã xóa tài khoản ID=" + id + " (" + user.getFullName() + " - " + user.getEmail() + ")",
                    "user", user
            ));
        } catch (Exception e) {
            log.error("Lỗi xóa user " + id + ": ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi xóa user: " + e.getMessage()));
        }
    }
}
