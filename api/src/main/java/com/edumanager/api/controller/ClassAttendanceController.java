package com.edumanager.api.controller;

import com.edumanager.api.dto.AttendanceResponseDTO;
import com.edumanager.api.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes/{classId}/attendance")
@RequiredArgsConstructor
public class ClassAttendanceController {

    private final AttendanceService service;
    private final com.edumanager.api.service.ClassRoomService classRoomService;

    @GetMapping
    public List<AttendanceResponseDTO> getClassAttendance(
            @PathVariable Long classId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập bảng điểm danh của lớp này.");
        }
        return service.getAttendanceByClass(classId).stream()
                .map(AttendanceResponseDTO::fromEntity)
                .toList();
    }
}
