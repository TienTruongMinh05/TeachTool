package com.edumanager.api.controller;

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

    @GetMapping("/api/classes/{classId}/weekly-report")
    public ResponseEntity<byte[]> downloadWeeklyReport(
            @PathVariable Long classId,
            @RequestParam(required = false, defaultValue = "1") Integer week,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        byte[] docxBytes = weeklyReportService.generateWeeklyReportDocx(classId, week, callerId);

        String filename = String.format("Bao_Cao_Tuan_Lop_%d_Tuan_%d.docx", classId, week);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(docxBytes);
    }
}
