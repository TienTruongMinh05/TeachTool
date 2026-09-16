package com.edumanager.api.controller;

import com.edumanager.api.dto.*;
import com.edumanager.api.entity.User;
import com.edumanager.api.security.RateLimiterService;
import com.edumanager.api.service.AuthService;
import com.edumanager.api.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final RateLimiterService rateLimiterService;

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
        String callerRole = (String) servletRequest.getAttribute("userRole");

        try {
            userService.deleteUserSafely(userId, callerId, callerRole);
            return ResponseEntity.ok(Map.of("message", "Đã xóa tài khoản thành công."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Lỗi khi xóa tài khoản: " + e.getMessage()));
        }
    }
}
