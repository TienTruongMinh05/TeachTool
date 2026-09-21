// File: src/main/java/com/edumanager/api/service/InquiryService.java
package com.edumanager.api.service;

import com.edumanager.api.dto.InquiryMessageResponseDTO;
import com.edumanager.api.dto.InquiryThreadResponseDTO;
import com.edumanager.api.dto.SendInquiryMessageRequest;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.InquiryMessage;
import com.edumanager.api.entity.InquiryThread;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryThreadRepository threadRepo;
    private final InquiryMessageRepository messageRepo;
    private final ClassRoomRepository classRepo;
    private final UserRepository userRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final ClassRoomService classRoomService;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MAX_FILES_PER_MESSAGE = 3;
    private static final int MAX_FILES_PER_THREAD = 15;
    public static final String AUTO_REPLY_TEXT = "Thời gian phản hồi thường là dưới 1h, nhưng có thể lâu hơn, các em vui lòng đợi.";

    /**
     * Lấy hoặc khởi tạo cuộc trò chuyện thắc mắc của học sinh trong một lớp học cụ thể
     */
    @Transactional
    public InquiryThread getOrCreateStudentThread(Long classId, Long studentId) {
        ClassRoom classRoom = classRepo.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học có ID: " + classId));
        User student = userRepo.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy học sinh có ID: " + studentId));

        if (!enrollmentRepo.existsByClassRoomIdAndStudentId(classId, studentId)) {
            throw new SecurityException("Bạn chưa ghi danh vào lớp học này nên không thể gửi thắc mắc.");
        }

        return threadRepo.findByClassRoomIdAndStudentId(classId, studentId)
                .orElseGet(() -> threadRepo.save(InquiryThread.builder()
                        .classRoom(classRoom)
                        .student(student)
                        .status("ANSWERED") // Ban đầu chưa có tin nhắn nào của HS -> hiển thị trạng thái bình thường
                        .lastMessagePreview("Chưa có tin nhắn nào")
                        .lastMessageAt(LocalDateTime.now())
                        .totalFilesCount(0)
                        .build()));
    }

    /**
     * Lấy danh sách thắc mắc cho học sinh
     */
    public List<InquiryThreadResponseDTO> getStudentThreads(Long studentId) {
        return threadRepo.findByStudentIdOrderByLastMessageAtDesc(studentId).stream()
                .map(InquiryThreadResponseDTO::fromEntity)
                .toList();
    }

    /**
     * Lấy danh sách thắc mắc gửi đến giáo viên (có thể lọc theo lớp)
     */
    public List<InquiryThreadResponseDTO> getTeacherThreads(Long teacherId, Long classIdFilter) {
        if (classIdFilter != null) {
            if (!classRoomService.canAccessClass(classIdFilter, teacherId, "TEACHER")) {
                throw new SecurityException("Bạn không phải giáo viên phụ trách lớp học này.");
            }
            return threadRepo.findByClassRoomIdOrderByLastMessageAtDesc(classIdFilter).stream()
                    .map(InquiryThreadResponseDTO::fromEntity)
                    .toList();
        }

        // Lấy tất cả lớp học mà giáo viên phụ trách (chủ nhiệm hoặc đồng phụ trách)
        List<ClassRoom> teacherClasses = classRoomService.getClassesByTeacher(teacherId);
        if (teacherClasses.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> classIds = teacherClasses.stream().map(ClassRoom::getId).toList();

        return threadRepo.findByClassRoomIdInOrderByLastMessageAtDesc(classIds).stream()
                .map(InquiryThreadResponseDTO::fromEntity)
                .toList();
    }

    /**
     * Lấy lịch sử tin nhắn của một cuộc trò chuyện và giải mã nội dung tin nhắn AES-256
     */
    public List<InquiryMessageResponseDTO> getThreadMessages(Long threadId, Long callerId, String callerRole) {
        InquiryThread thread = threadRepo.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại ID: " + threadId));

        validateThreadAccess(thread, callerId, callerRole);

        List<InquiryMessage> messages = messageRepo.findByThreadIdOrderByCreatedAtAsc(threadId);
        return messages.stream()
                .map(m -> {
                    String decrypted = encryptionService.decrypt(m.getEncryptedContent());
                    return InquiryMessageResponseDTO.fromEntity(m, decrypted);
                })
                .toList();
    }

    /**
     * Gửi tin nhắn mới vào cuộc hội thoại
     */
    @Transactional
    public InquiryMessageResponseDTO sendMessage(
            Long threadId,
            Long senderId,
            String senderRole,
            SendInquiryMessageRequest request) {

        String rawContent = request.getContent() != null ? request.getContent().trim() : "";
        List<Map<String, Object>> attachments = request.getAttachments() != null ? request.getAttachments() : Collections.emptyList();

        if (rawContent.isEmpty() && attachments.isEmpty()) {
            throw new IllegalArgumentException("Nội dung tin nhắn hoặc tệp đính kèm không được để trống.");
        }

        InquiryThread thread = threadRepo.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại ID: " + threadId));

        validateThreadAccess(thread, senderId, senderRole);

        // 1. Kiểm tra hạn mức tệp đính kèm
        int newFilesCount = attachments.size();
        if (newFilesCount > MAX_FILES_PER_MESSAGE) {
            throw new IllegalArgumentException("Mỗi tin nhắn chỉ được phép đính kèm tối đa " + MAX_FILES_PER_MESSAGE + " tệp.");
        }
        if (thread.getTotalFilesCount() + newFilesCount > MAX_FILES_PER_THREAD) {
            int remaining = Math.max(0, MAX_FILES_PER_THREAD - thread.getTotalFilesCount());
            throw new IllegalArgumentException("Cuộc hội thoại đã đạt giới hạn tối đa " + MAX_FILES_PER_THREAD +
                    " tệp đính kèm. Bạn chỉ có thể đính kèm thêm " + remaining + " tệp.");
        }

        // 2. Chuyển attachments thành chuỗi JSON
        String attachmentsJson = null;
        if (!attachments.isEmpty()) {
            try {
                attachmentsJson = objectMapper.writeValueAsString(attachments);
            } catch (JsonProcessingException e) {
                log.error("Lỗi parse attachments JSON: {}", e.getMessage());
            }
        }

        // 3. Mã hóa nội dung tin nhắn AES-256
        String encryptedContent = encryptionService.encrypt(rawContent.isEmpty() ? "[Tệp đính kèm]" : rawContent);

        User sender = senderId != null ? userRepo.findById(senderId).orElse(null) : null;
        String senderName = sender != null ? sender.getFullName() : ("STUDENT".equalsIgnoreCase(senderRole) ? "Học sinh" : "Giáo viên");

        // 4. Kiểm tra xem có phải tin nhắn đầu tiên của học sinh trong thread không để kích hoạt Auto-Reply
        boolean isStudentFirstMessage = false;
        if ("STUDENT".equalsIgnoreCase(senderRole)) {
            long studentMsgCount = messageRepo.countByThreadIdAndSenderRole(threadId, "STUDENT");
            if (studentMsgCount == 0) {
                isStudentFirstMessage = true;
            }
        }

        // 5. Lưu tin nhắn của người gửi
        InquiryMessage userMessage = messageRepo.save(InquiryMessage.builder()
                .thread(thread)
                .sender(sender)
                .senderRole(senderRole.toUpperCase())
                .senderName(senderName)
                .encryptedContent(encryptedContent)
                .attachmentsJson(attachmentsJson)
                .isAutoReply(false)
                .build());

        // 6. Tự động sinh tin nhắn phản hồi hệ thống nếu là tin đầu tiên của học sinh
        if (isStudentFirstMessage) {
            String encryptedAutoReply = encryptionService.encrypt(AUTO_REPLY_TEXT);
            messageRepo.save(InquiryMessage.builder()
                    .thread(thread)
                    .sender(null)
                    .senderRole("SYSTEM")
                    .senderName("Hệ thống TeachTool")
                    .encryptedContent(encryptedAutoReply)
                    .attachmentsJson(null)
                    .isAutoReply(true)
                    .build());
        }

        // 7. Cập nhật trạng thái và trích đoạn của Thread:
        // - Học sinh gửi -> UNANSWERED (Viền đỏ)
        // - Giáo viên gửi -> ANSWERED (Viền xanh lá)
        if ("STUDENT".equalsIgnoreCase(senderRole)) {
            thread.setStatus("UNANSWERED");
        } else if ("TEACHER".equalsIgnoreCase(senderRole)) {
            thread.setStatus("ANSWERED");
        }

        String preview = !rawContent.isEmpty()
                ? (rawContent.length() > 80 ? rawContent.substring(0, 80) + "..." : rawContent)
                : (attachments.size() == 1 ? "📎 Đã gửi 1 tệp đính kèm" : "📎 Đã gửi " + attachments.size() + " tệp đính kèm");

        thread.setLastMessagePreview(preview);
        thread.setLastMessageAt(LocalDateTime.now());
        thread.setTotalFilesCount(thread.getTotalFilesCount() + newFilesCount);
        threadRepo.save(thread);

        return InquiryMessageResponseDTO.fromEntity(userMessage, rawContent);
    }

    /**
     * Giáo viên: Xóa cuộc trò chuyện và toàn bộ tin nhắn để giải phóng hệ thống
     */
    @Transactional
    public void deleteThread(Long threadId, Long teacherId, String callerRole) {
        if (!"TEACHER".equalsIgnoreCase(callerRole)) {
            throw new SecurityException("Chỉ giáo viên mới có quyền xóa cuộc trò chuyện.");
        }

        InquiryThread thread = threadRepo.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại ID: " + threadId));

        validateThreadAccess(thread, teacherId, callerRole);

        // 1. Xóa toàn bộ tin nhắn thuộc thread
        messageRepo.deleteByThreadId(threadId);

        // 2. Xóa thread
        threadRepo.delete(thread);
        log.info("Giáo viên ID {} đã xóa cuộc trò chuyện ID {}", teacherId, threadId);
    }

    /**
     * Xác thực phân quyền truy cập thread chống IDOR / BOLA
     */
    private void validateThreadAccess(InquiryThread thread, Long callerId, String callerRole) {
        if (callerId == null || callerRole == null) {
            throw new SecurityException("Yêu cầu xác thực đăng nhập.");
        }

        if ("STUDENT".equalsIgnoreCase(callerRole)) {
            if (!thread.getStudent().getId().equals(callerId)) {
                throw new SecurityException("Bạn không có quyền truy cập cuộc hội thoại của học sinh khác.");
            }
        } else if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if (!classRoomService.canAccessClass(thread.getClassRoom().getId(), callerId, callerRole)) {
                throw new SecurityException("Bạn không phải giáo viên phụ trách lớp học của cuộc hội thoại này.");
            }
        } else {
            throw new SecurityException("Vai trò không hợp lệ.");
        }
    }
}
