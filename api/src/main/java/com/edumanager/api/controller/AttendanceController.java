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

// Sửa đổi kiểu trả về trong AttendanceController.java
    @PostMapping("/{studentId}")
    public AttendanceResponseDTO markAttendance(
            @PathVariable Long sessionId,
            @PathVariable Long studentId,
            @RequestParam String status,
            @RequestParam(required = false) String note) {
        return AttendanceResponseDTO.fromEntity(service.markAttendance(sessionId, studentId, status, note));
    }

    @PostMapping("/batch")
    public List<AttendanceResponseDTO> batchMarkAttendance(
            @PathVariable Long sessionId,
            @RequestBody List<com.edumanager.api.dto.AttendanceItemDTO> items) {
        return service.batchMarkAttendance(sessionId, items).stream()
                .map(AttendanceResponseDTO::fromEntity)
                .toList();
    }

@GetMapping
public List<AttendanceResponseDTO> getSessionAttendance(@PathVariable Long sessionId) {
    return service.getAttendanceBySession(sessionId).stream()
            .map(AttendanceResponseDTO::fromEntity)
            .toList();
}
}