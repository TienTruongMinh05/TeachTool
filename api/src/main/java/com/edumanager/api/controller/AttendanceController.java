// File: src/main/java/com/edumanager/api/controller/AttendanceController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.AttendanceResponseDTO;
import com.edumanager.api.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sessions/{sessionId}/attendance")
@RequiredArgsConstructor
public class AttendanceController {
    private final AttendanceService service;
    private final com.edumanager.api.repository.SessionRepository sessionRepo;
    private final com.edumanager.api.service.ClassRoomService classRoomService;

    @PostMapping("/{studentId}")
    public AttendanceResponseDTO markAttendance(
            @PathVariable Long sessionId,
            @PathVariable Long studentId,
            @RequestParam String status,
            @RequestParam(required = false) String note,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return AttendanceResponseDTO.fromEntity(service.markAttendance(sessionId, studentId, status, note, callerId));
    }

    @PostMapping("/batch")
    public List<AttendanceResponseDTO> batchMarkAttendance(
            @PathVariable Long sessionId,
            @RequestBody List<com.edumanager.api.dto.AttendanceItemDTO> items,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return service.batchMarkAttendance(sessionId, items, callerId).stream()
                .map(AttendanceResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping
    public List<AttendanceResponseDTO> getSessionAttendance(
            @PathVariable Long sessionId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập thông tin điểm danh của cả buổi học. Thao tác chỉ dành cho Giáo viên.");
        }

        com.edumanager.api.entity.Session session = sessionRepo.findById(sessionId).orElse(null);
        if (session != null && session.getClassRoom() != null && callerId != null) {
            if (!classRoomService.canAccessClass(session.getClassRoom().getId(), callerId, callerRole)) {
                throw new SecurityException("Bạn không có quyền truy cập thông tin điểm danh của buổi học này.");
            }
        }

        return service.getAttendanceBySession(sessionId).stream()
                .map(AttendanceResponseDTO::fromEntity)
                .toList();
    }
}