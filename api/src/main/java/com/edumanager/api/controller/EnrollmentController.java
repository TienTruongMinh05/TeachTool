// File: src/main/java/com/edumanager/api/controller/EnrollmentController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.EnrollmentResponseDTO;
import com.edumanager.api.service.EnrollmentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class EnrollmentController {
    private final EnrollmentService service;

    @PostMapping("/{classId}/enroll/{studentId}")
    public ResponseEntity<?> enrollStudent(
            @PathVariable Long classId, 
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ có Giáo viên mới được quyền thêm học sinh vào lớp thủ công."));
        }

        return ResponseEntity.ok(EnrollmentResponseDTO.fromEntity(service.enrollStudent(classId, studentId)));
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinByCode(
            @RequestBody java.util.Map<String, Object> body,
            HttpServletRequest servletRequest) {
        
        String classCode = (String) body.get("classCode");
        if (classCode == null || classCode.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập mã lớp học."));
        }

        Long callerId = (Long) servletRequest.getAttribute("userId");
        Long studentId;

        // Nếu người dùng đã đăng nhập với vai trò học sinh, tự động lấy ID của chính họ để đảm bảo an toàn
        if (callerId != null) {
            studentId = callerId;
        } else if (body.containsKey("studentId")) {
            studentId = Long.valueOf(body.get("studentId").toString());
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Không xác định được danh tính học sinh."));
        }

        return ResponseEntity.ok(EnrollmentResponseDTO.fromEntity(service.enrollStudentByCode(classCode, studentId)));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getClassesByStudent(
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xem danh sách lớp của học sinh khác."));
        }

        return ResponseEntity.ok(service.getClassesByStudent(studentId).stream()
                .map(com.edumanager.api.dto.ClassResponseDTO::fromEntity)
                .toList());
    }

    @GetMapping("/{classId}/students")
    public List<EnrollmentResponseDTO> getStudentsInClass(@PathVariable Long classId) {
        return service.getStudentsByClass(classId).stream()
                .map(EnrollmentResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/all-students")
    public List<com.edumanager.api.dto.AllStudentDTO> getAllStudents() {
        return service.getAllStudentsWithClasses();
    }

    @DeleteMapping("/{classId}/students/{studentId}")
    public ResponseEntity<?> removeStudentFromClass(
            @PathVariable Long classId, 
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");

        boolean isTeacher = "TEACHER".equalsIgnoreCase(callerRole);
        boolean isSelfLeave = "STUDENT".equalsIgnoreCase(callerRole) && callerId != null && callerId.equals(studentId);

        if (!isTeacher && !isSelfLeave) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xóa học sinh hoặc rời khỏi lớp học này."));
        }

        service.removeStudentFromClass(classId, studentId);
        return ResponseEntity.ok(Map.of("message", isSelfLeave ? "Bạn đã rời khỏi lớp học thành công." : "Đã xóa học sinh khỏi lớp học."));
    }
}