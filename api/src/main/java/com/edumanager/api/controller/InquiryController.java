// File: src/main/java/com/edumanager/api/controller/InquiryController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.InquiryMessageResponseDTO;
import com.edumanager.api.dto.InquiryThreadResponseDTO;
import com.edumanager.api.dto.SendInquiryMessageRequest;
import com.edumanager.api.entity.InquiryThread;
import com.edumanager.api.service.InquiryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    /**
     * Học sinh: Lấy hoặc tạo cuộc trò chuyện thắc mắc cho lớp học
     */
    @GetMapping("/student/thread")
    public ResponseEntity<?> getStudentThread(
            @RequestParam Long classId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        if (!"STUDENT".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ học sinh mới có thể tạo cuộc trò chuyện thắc mắc."));
        }

        InquiryThread thread = inquiryService.getOrCreateStudentThread(classId, callerId);
        return ResponseEntity.ok(InquiryThreadResponseDTO.fromEntity(thread));
    }

    /**
     * Học sinh: Lấy danh sách tất cả các cuộc trò chuyện thắc mắc của mình
     */
    @GetMapping("/student/threads")
    public ResponseEntity<?> getAllStudentThreads(HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        if (!"STUDENT".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ học sinh mới có quyền truy cập danh sách này."));
        }

        List<InquiryThreadResponseDTO> list = inquiryService.getStudentThreads(callerId);
        return ResponseEntity.ok(list);
    }

    /**
     * Giáo viên: Lấy danh sách câu hỏi thắc mắc từ học viên (hỗ trợ lọc theo classId)
     */
    @GetMapping("/teacher/threads")
    public ResponseEntity<?> getTeacherThreads(
            @RequestParam(required = false) Long classId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chức năng chỉ dành cho Giáo viên."));
        }

        List<InquiryThreadResponseDTO> list = inquiryService.getTeacherThreads(callerId, classId);
        return ResponseEntity.ok(list);
    }

    /**
     * Lấy toàn bộ tin nhắn trong một cuộc hội thoại (đã giải mã AES-256)
     */
    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<?> getThreadMessages(
            @PathVariable Long threadId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        List<InquiryMessageResponseDTO> messages = inquiryService.getThreadMessages(threadId, callerId, callerRole);
        return ResponseEntity.ok(messages);
    }

    /**
     * Gửi tin nhắn mới vào cuộc hội thoại
     */
    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long threadId,
            @RequestBody SendInquiryMessageRequest body,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        InquiryMessageResponseDTO response = inquiryService.sendMessage(threadId, callerId, callerRole, body);
        return ResponseEntity.ok(response);
    }

    /**
     * Giáo viên: Xóa cuộc trò chuyện để giải phóng hệ thống
     */
    @DeleteMapping("/threads/{threadId}")
    public ResponseEntity<?> deleteThread(
            @PathVariable Long threadId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");

        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chức năng chỉ dành cho Giáo viên."));
        }

        inquiryService.deleteThread(threadId, callerId, callerRole);
        return ResponseEntity.ok(Map.of("message", "Đã xóa cuộc trò chuyện thành công."));
    }
}
