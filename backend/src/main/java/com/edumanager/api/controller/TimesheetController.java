package com.edumanager.api.controller;

import com.edumanager.api.dto.TimesheetPreviewDTO;
import com.edumanager.api.service.TimesheetService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/timesheet")
@RequiredArgsConstructor
@Slf4j
public class TimesheetController {

    private final TimesheetService timesheetService;

    @GetMapping("/preview")
    public ResponseEntity<?> getTimesheetPreview(
            @RequestParam(required = false, defaultValue = "#{T(java.time.LocalDateTime).now().getMonthValue()}") Integer month,
            @RequestParam(required = false, defaultValue = "#{T(java.time.LocalDateTime).now().getYear()}") Integer year,
            @RequestParam(required = false) Long classId,
            HttpServletRequest request) {

        Long callerId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("userRole");

        if ("STUDENT".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chức năng chấm công chỉ dành riêng cho Giáo viên."));
        }

        TimesheetPreviewDTO preview = timesheetService.getPreview(month, year, classId, callerId);
        return ResponseEntity.ok(preview);
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportTimesheetExcel(
            @RequestParam(required = false, defaultValue = "#{T(java.time.LocalDateTime).now().getMonthValue()}") Integer month,
            @RequestParam(required = false, defaultValue = "#{T(java.time.LocalDateTime).now().getYear()}") Integer year,
            @RequestParam(required = false) Long classId,
            HttpServletRequest request) {

        Long callerId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("userRole");

        if ("STUDENT".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chức năng xuất chấm công chỉ dành riêng cho Giáo viên."));
        }

        try {
            byte[] excelBytes = timesheetService.generateTimesheetExcel(month, year, classId, callerId);

            String filename = (classId != null)
                    ? String.format("Cham_Cong_Lop_%d_Thang_%02d_%d.xlsx", classId, month, year)
                    : String.format("Cham_Cong_Tat_Ca_Lop_Thang_%02d_%d.xlsx", month, year);

            String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        } catch (IOException e) {
            log.error("Lỗi khi xuất bảng chấm công Excel: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể tạo tệp Excel: " + e.getMessage()));
        }
    }
}
