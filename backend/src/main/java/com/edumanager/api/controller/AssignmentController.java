// File: src/main/java/com/edumanager/api/controller/AssignmentController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.AssignmentResponseDTO;
import com.edumanager.api.entity.Assignment;
import com.edumanager.api.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class AssignmentController {
    private final AssignmentService service;
    private final com.edumanager.api.service.ClassRoomService classRoomService;
    private final com.edumanager.api.repository.SessionRepository sessionRepo;

    @PostMapping("/api/classes/{classId}/assignments")
    public AssignmentResponseDTO createAssignment(
            @PathVariable Long classId,
            @RequestParam(required = false) Long sessionId,
            @RequestBody Assignment assignment,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return AssignmentResponseDTO.fromEntity(service.createAssignment(classId, sessionId, assignment, callerId));
    }

    @GetMapping("/api/classes/{classId}/assignments")
    public List<AssignmentResponseDTO> getAssignments(
            @PathVariable Long classId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập danh sách bài tập của lớp này.");
        }
        boolean isStudent = "STUDENT".equalsIgnoreCase(callerRole);
        return service.getAssignmentsByClass(classId).stream()
                .filter(a -> !isStudent || a.isPublished())
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/api/sessions/{sessionId}/assignments")
    public List<AssignmentResponseDTO> getAssignmentsBySession(
            @PathVariable Long sessionId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        com.edumanager.api.entity.Session session = sessionRepo.findById(sessionId).orElse(null);
        if (session != null && session.getClassRoom() != null && callerId != null) {
            if (!classRoomService.canAccessClass(session.getClassRoom().getId(), callerId, callerRole)) {
                throw new SecurityException("Bạn không có quyền truy cập bài tập của buổi học này.");
            }
        }
        boolean isStudent = "STUDENT".equalsIgnoreCase(callerRole);
        return service.getAssignmentsBySession(sessionId).stream()
                .filter(a -> !isStudent || a.isPublished())
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @PutMapping("/api/assignments/{id}")
    public AssignmentResponseDTO updateAssignment(
            @PathVariable Long id, 
            @RequestBody Assignment assignment,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return AssignmentResponseDTO.fromEntity(service.updateAssignment(id, assignment, callerId));
    }

    @PostMapping("/api/assignments/{id}/publish-now")
    public AssignmentResponseDTO publishNow(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return AssignmentResponseDTO.fromEntity(service.publishNow(id, callerId));
    }

    @DeleteMapping("/api/assignments/{id}")
    public void deleteAssignment(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.deleteAssignment(id, callerId);
    }

    @GetMapping("/api/students/{studentId}/assignments")
    public List<AssignmentResponseDTO> getAssignmentsForStudent(
            @PathVariable Long studentId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        // Chống IDOR: Học sinh chỉ được xem bài tập của chính mình
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            throw new SecurityException("Bạn không có quyền xem danh sách bài tập của học sinh khác.");
        }

        return service.getAssignmentsForStudent(studentId).stream()
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @PostMapping("/api/assignments/{id}/remind")
    public java.util.Map<String, Object> remindUnsubmittedStudents(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        int count = service.remindUnsubmittedStudents(id, callerId);
        return java.util.Map.of("success", true, "remindedCount", count, "message", "Đã gửi nhắc nhở thành công cho " + count + " học sinh.");
    }

    @PatchMapping("/api/assignments/{id}/toggle-reminder")
    public AssignmentResponseDTO toggleSkipReminder(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return AssignmentResponseDTO.fromEntity(service.toggleSkipReminder(id, callerId));
    }

    @GetMapping("/api/assignments/{id}/export-zip")
    public org.springframework.http.ResponseEntity<byte[]> exportSubmissionsZip(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) throws java.io.IOException {
        Long callerId = (Long) request.getAttribute("userId");
        byte[] zipBytes = service.exportSubmissionsZip(id, callerId);
        String filename = String.format("Bai_Nop_Assignment_%d.zip", id);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/zip"))
                .body(zipBytes);
    }
}