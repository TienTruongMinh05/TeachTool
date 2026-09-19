// File: src/main/java/com/edumanager/api/controller/SubmissionController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.SubmissionResponseDTO;
import com.edumanager.api.service.SubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    private final SubmissionService service;
    private final com.edumanager.api.repository.AssignmentRepository assignmentRepo;
    private final com.edumanager.api.service.ClassRoomService classRoomService;

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
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền chấm điểm. Thao tác chỉ dành cho Giáo viên."));
        }

        return ResponseEntity.ok(SubmissionResponseDTO.fromEntity(
                service.gradeSubmission(submissionId, request.getScore(), request.getScores(), request.getFeedback(), callerId)
        ));
    }

    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<?> getSubmissionsByAssignment(
            @PathVariable Long assignmentId,
            HttpServletRequest servletRequest) {
        
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");

        // Chống BOLA/IDOR: Chỉ giáo viên phụ trách lớp của bài tập mới được xem toàn bộ bài nộp
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền truy cập danh sách bài nộp của lớp học này."));
        }

        com.edumanager.api.entity.Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy bài tập!"));
        }

        if (callerId != null && assignment.getClassRoom() != null && !classRoomService.isTeacherOfClass(assignment.getClassRoom(), callerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không phải giáo viên phụ trách lớp học của bài tập này."));
        }

        List<SubmissionResponseDTO> result = service.getSubmissionsByAssignment(assignmentId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getSubmissionsByClass(
            @PathVariable Long classId,
            HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");

        // Chống BOLA/IDOR và rò rỉ dữ liệu (Data Leak): Chỉ giáo viên phụ trách lớp mới được xem danh sách bài nộp của toàn bộ lớp
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền truy cập dữ liệu toàn bộ bài nộp của lớp học này."));
        }

        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không phải giáo viên phụ trách lớp học này."));
        }

        List<SubmissionResponseDTO> result = service.getSubmissionsByClass(classId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(result);
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

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubmission(@PathVariable Long id, HttpServletRequest servletRequest) {
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        service.deleteSubmission(id, callerId, callerRole);
        return ResponseEntity.ok(Map.of("message", "Đã xóa bài nộp thành công."));
    }
}