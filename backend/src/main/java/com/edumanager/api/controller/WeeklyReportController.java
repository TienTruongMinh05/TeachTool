package com.edumanager.api.controller;

import com.edumanager.api.dto.WeeklyReportPreviewDTO;
import com.edumanager.api.dto.WeeklyReportRequestDTO;
import com.edumanager.api.service.WeeklyReportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;

    @GetMapping("/api/classes/{classId}/weekly-report-preview")
    public WeeklyReportPreviewDTO getWeeklyReportPreview(
            @PathVariable Long classId,
            @RequestParam(required = false, defaultValue = "1") Integer week,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return weeklyReportService.getPreview(classId, week, callerId);
    }

    @PostMapping("/api/classes/{classId}/weekly-report")
    public ResponseEntity<byte[]> downloadWeeklyReportPost(
            @PathVariable Long classId,
            @RequestBody(required = false) WeeklyReportRequestDTO requestDTO,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        if (requestDTO == null) {
            requestDTO = new WeeklyReportRequestDTO();
        }
        byte[] docxBytes = weeklyReportService.generateWeeklyReportDocx(classId, requestDTO, callerId);

        int week = (requestDTO.getWeek() != null && requestDTO.getWeek() > 0) ? requestDTO.getWeek() : 1;
        String filename = String.format("Bao_Cao_Tuan_Lop_%d_Tuan_%d.docx", classId, week);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(docxBytes);
    }

    @GetMapping("/api/classes/{classId}/weekly-report")
    public ResponseEntity<byte[]> downloadWeeklyReportGet(
            @PathVariable Long classId,
            @RequestParam(required = false, defaultValue = "1") Integer week,
            HttpServletRequest request) {
        WeeklyReportRequestDTO dto = new WeeklyReportRequestDTO();
        dto.setWeek(week);
        return downloadWeeklyReportPost(classId, dto, request);
    }
}
