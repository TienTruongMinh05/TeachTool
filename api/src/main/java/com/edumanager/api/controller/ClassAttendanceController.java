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

    @GetMapping
    public List<AttendanceResponseDTO> getClassAttendance(@PathVariable Long classId) {
        return service.getAttendanceByClass(classId).stream()
                .map(AttendanceResponseDTO::fromEntity)
                .toList();
    }
}
