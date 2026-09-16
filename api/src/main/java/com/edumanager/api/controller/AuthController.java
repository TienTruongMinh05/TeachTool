package com.edumanager.api.controller;

import com.edumanager.api.dto.*;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.UserRepository;
import com.edumanager.api.security.RateLimiterService;
import com.edumanager.api.service.AuthService;
import com.edumanager.api.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
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
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final RateLimiterService rateLimiterService;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    private static final String ADMIN_SECRET = "teachtool_admin_secret_2026";

    private boolean isAuthorized(String adminKey) {
        return ADMIN_SECRET.equals(adminKey);
    }

    @Data
    public static class GoogleLoginRequest {
        private String idToken;
    }

    @Data
    public static class RoleSelectionRequest {
        private String role; // TEACHER or STUDENT
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        String clientIp = RateLimiterService.getClientIp(servletRequest);
        // Chống Spam đăng ký: tối đa 5 lần / 1 phút / IP
        if (!rateLimiterService.tryAcquire("reg:" + clientIp, 5, 60_000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Bạn đã thực hiện quá nhiều thao tác đăng ký. Vui lòng thử lại sau 1 phút."));
        }

        try {
            AuthResponseDTO response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi trong quá trình đăng ký: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String clientIp = RateLimiterService.getClientIp(servletRequest);
        // Chống Brute-force mật khẩu & DoS CPU PBKDF2: tối đa 10 lần / 1 phút / IP
        if (!rateLimiterService.tryAcquire("login:" + clientIp, 10, 60_000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 1 phút để bảo vệ tài khoản."));
        }

        try {
            AuthResponseDTO response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi đăng nhập: " + e.getMessage()));
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request, HttpServletRequest servletRequest) {
        String clientIp = RateLimiterService.getClientIp(servletRequest);
        if (!rateLimiterService.tryAcquire("google:" + clientIp, 15, 60_000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Quá nhiều yêu cầu đăng nhập. Vui lòng chờ 1 phút."));
        }

        if (request == null || request.getIdToken() == null || request.getIdToken().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Google ID Token không được để trống."));
        }

        try {
            AuthResponseDTO response = authService.loginWithGoogle(request.getIdToken().trim());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi đăng nhập Google: " + e.getMessage()));
        }
    }

    @PostMapping("/select-role")
    public ResponseEntity<?> selectRole(@RequestBody RoleSelectionRequest request, HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        if (callerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập trước khi thiết lập vai trò."));
        }

        try {
            AuthResponseDTO response = authService.selectRole(callerId, request.getRole());
            return ResponseEntity.ok(response);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi thiết lập vai trò: " + e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body, HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        if (callerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            String oldPassword = (String) body.get("oldPassword");
            String newPassword = (String) body.get("newPassword");

            authService.changePassword(callerId, oldPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi đổi mật khẩu: " + e.getMessage()));
        }
    }

    @GetMapping("/me/{userId}")
    public ResponseEntity<?> getCurrentUser(@PathVariable Long userId, HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        if (callerId == null || !callerId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền truy cập thông tin tài khoản này."));
        }

        User user = userService.getUserById(userId);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(user));
    }

    @DeleteMapping("/account/{userId}")
    public ResponseEntity<?> deleteAccount(@PathVariable Long userId, HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        if (callerId == null || !callerId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn chỉ được phép xóa tài khoản của chính mình."));
        }

        authService.deleteAccount(userId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa tài khoản thành công."));
    }

    @GetMapping("/admin-list-users")
    public ResponseEntity<?> adminListUsers(@RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
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
    public ResponseEntity<?> adminCleanupUsers(
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

                // BẢO VỆ TUYỆT ĐỐI 2 TÀI KHOẢN CHÍNH
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

                // 3. Các tài khoản thử nghiệm
                if (email.startsWith("test") || email.contains("testupload") || email.contains("dummy") || "admin@edu.vn".equals(email) || email.startsWith("cleanup_bot_") || email.startsWith("temp_bot_") || email.startsWith("admin_test_")) {
                    shouldDelete = true;
                }

                // 4. Khớp theo pattern tùy chọn
                if (pattern != null && !pattern.isBlank() && (name.contains(pattern.toLowerCase()) || email.contains(pattern.toLowerCase()))) {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    Long userId = user.getId();
                    log.info("Dọn dẹp tài khoản: ID={}, Name={}, Email={}, Role={}", userId, user.getFullName(), user.getEmail(), user.getRole());

                    cascadeDeleteUser(userId);

                    Map<String, Object> delInfo = new LinkedHashMap<>();
                    delInfo.put("id", userId);
                    delInfo.put("fullName", user.getFullName());
                    delInfo.put("email", user.getEmail());
                    delInfo.put("role", user.getRole());
                    deleted.add(delInfo);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Đã dọn dẹp thành công " + deleted.size() + " tài khoản.",
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

    private void cascadeDeleteUser(Long userId) {
        try { jdbcTemplate.update("DELETE FROM attendances WHERE student_id = ?", userId); } catch (Exception ignored) {}
        try { jdbcTemplate.update("DELETE FROM enrollments WHERE student_id = ?", userId); } catch (Exception ignored) {}
        try { jdbcTemplate.update("DELETE FROM submissions WHERE student_id = ?", userId); } catch (Exception ignored) {}
        try { jdbcTemplate.update("DELETE FROM class_teachers WHERE teacher_id = ?", userId); } catch (Exception ignored) {}
        try { jdbcTemplate.update("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?", userId); } catch (Exception ignored) {}
        try { jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId); } catch (Exception ignored) {}
    }
}
