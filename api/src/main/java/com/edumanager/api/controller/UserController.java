// File: src/main/java/com/edumanager/api/controller/UserController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.UserResponseDTO;
import com.edumanager.api.entity.User;
import com.edumanager.api.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService service;

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        // Chặn tạo tài khoản thô để đảm bảo mọi tài khoản đều được băm mật khẩu PBKDF2
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "message", "Không thể tạo tài khoản qua API này. Vui lòng đăng ký qua /api/auth/register."
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(
            @PathVariable Long id,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");

        // Chỉ cho phép người dùng xem thông tin của chính mình hoặc giáo viên xem thông tin học sinh
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Bạn không có quyền xem thông tin tài khoản của người khác."
            ));
        }

        return ResponseEntity.ok(UserResponseDTO.fromEntity(service.getUserById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id, 
            @RequestBody User user,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        // Người dùng chỉ được sửa thông tin của chính mình
        if (callerId != null && !callerId.equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Bạn không có quyền sửa thông tin tài khoản của người khác."
            ));
        }

        return ResponseEntity.ok(UserResponseDTO.fromEntity(service.updateUser(id, user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");

        try {
            service.deleteUserSafely(id, callerId, callerRole);
            return ResponseEntity.ok(Map.of("message", "Đã xóa tài khoản học sinh thành công."));
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