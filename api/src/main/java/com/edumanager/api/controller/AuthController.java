package com.edumanager.api.controller;

import com.edumanager.api.dto.*;
import com.edumanager.api.entity.User;
import com.edumanager.api.service.AuthService;
import com.edumanager.api.service.UserService;
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

    @Data
    public static class GoogleLoginRequest {
        private String idToken;
        private String email;
        private String fullName;
        private String avatarUrl;
    }

    @Data
    public static class RoleSelectionRequest {
        private Long userId;
        private String role; // TEACHER or STUDENT
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
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
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
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
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            AuthResponseDTO response = authService.loginWithGoogle(
                    request.getIdToken(),
                    request.getEmail(),
                    request.getFullName(),
                    request.getAvatarUrl()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi đăng nhập Google: " + e.getMessage()));
        }
    }

    @PostMapping("/select-role")
    public ResponseEntity<?> selectRole(@RequestBody RoleSelectionRequest request) {
        try {
            AuthResponseDTO response = authService.selectRole(request.getUserId(), request.getRole());
            return ResponseEntity.ok(response);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi thiết lập vai trò: " + e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body) {
        try {
            Object userIdObj = body.get("userId");
            if (userIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Thiếu thông tin người dùng"));
            }
            Long userId = Long.parseLong(userIdObj.toString());
            String oldPassword = (String) body.get("oldPassword");
            String newPassword = (String) body.get("newPassword");

            authService.changePassword(userId, oldPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi đổi mật khẩu: " + e.getMessage()));
        }
    }

    @GetMapping("/me/{userId}")
    public ResponseEntity<UserResponseDTO> getCurrentUser(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(user));
    }

    @DeleteMapping("/account/{userId}")
    public ResponseEntity<?> deleteAccount(@PathVariable Long userId) {
        authService.deleteAccount(userId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa tài khoản thành công."));
    }
}
