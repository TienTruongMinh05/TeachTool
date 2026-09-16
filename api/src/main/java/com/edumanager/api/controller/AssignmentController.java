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
        return service.getAssignmentsByClass(classId).stream()
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/api/sessions/{sessionId}/assignments")
    public List<AssignmentResponseDTO> getAssignmentsBySession(@PathVariable Long sessionId) {
        return service.getAssignmentsBySession(sessionId).stream()
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
}