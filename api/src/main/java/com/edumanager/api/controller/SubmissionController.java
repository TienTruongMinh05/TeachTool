// File: src/main/java/com/edumanager/api/controller/SubmissionController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.SubmissionResponseDTO;
import com.edumanager.api.service.SubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    private final SubmissionService service;

    @lombok.Data
    public static class SubmitRequest {
        private String submissionType; // TEXT, DOCX, AUDIO, DIRECT_RECORD
        private String textContent;
        private String fileUrl;
        private String fileName;
    }

    @lombok.Data
    public static class GradeRequest {
        private String score;
        private Map<String, Double> scores;
        private String feedback;
    }

    @PostMapping("/assignment/{assignmentId}/student/{studentId}")
    public ResponseEntity<?> submit(
            @PathVariable Long assignmentId, 
            @PathVariable Long studentId, 
            @RequestBody(required = false) SubmitRequest request,
            @RequestParam(required = false) String fileUrl,
            HttpServletRequest servletRequest) {
        
        // Chống IDOR: Học sinh chỉ được nộp bài cho chính mình
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền nộp bài thay cho tài khoản học sinh khác."));
        }

        String sType = request != null && request.getSubmissionType() != null ? request.getSubmissionType() : "FILE";
        String tContent = request != null ? request.getTextContent() : null;
        String fUrl = request != null && request.getFileUrl() != null ? request.getFileUrl() : fileUrl;
        String fName = request != null ? request.getFileName() : null;

        return ResponseEntity.ok(SubmissionResponseDTO.fromEntity(
                service.submitAssignment(assignmentId, studentId, sType, tContent, fUrl, fName)
        ));
    }

    @PutMapping("/{submissionId}/grade")
    public ResponseEntity<?> grade(
            @PathVariable Long submissionId, 
            @RequestBody GradeRequest request,
            HttpServletRequest servletRequest) {
        
        // Chỉ giáo viên mới được chấm điểm
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền chấm điểm. Thao tác chỉ dành cho Giáo viên."));
        }

        return ResponseEntity.ok(SubmissionResponseDTO.fromEntity(
                service.gradeSubmission(submissionId, request.getScore(), request.getScores(), request.getFeedback())
        ));
    }

    @GetMapping("/assignment/{assignmentId}")
    public java.util.List<SubmissionResponseDTO> getSubmissionsByAssignment(@PathVariable Long assignmentId) {
        return service.getSubmissionsByAssignment(assignmentId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getSubmissionsByStudent(
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        // Chống IDOR: Học sinh không được xem danh sách bài nộp của học sinh khác
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xem bài nộp của học sinh khác."));
        }

        return ResponseEntity.ok(service.getSubmissionsByStudent(studentId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList());
    }

    @GetMapping("/assignment/{assignmentId}/student/{studentId}")
    public ResponseEntity<?> getSubmission(
            @PathVariable Long assignmentId, 
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        // Chống IDOR: Học sinh chỉ xem bài nộp của chính mình
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xem bài nộp của học sinh khác."));
        }

        return service.getSubmission(assignmentId, studentId)
                .map(s -> ResponseEntity.ok((Object) SubmissionResponseDTO.fromEntity(s)))
                .orElse(ResponseEntity.noContent().build());
    }
}