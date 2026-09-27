// File: src/main/java/com/edumanager/api/dto/InquiryThreadResponseDTO.java
package com.edumanager.api.dto;

import com.edumanager.api.entity.InquiryThread;
import java.time.LocalDateTime;

public record InquiryThreadResponseDTO(
    Long id,
    Long classId,
    String className,
    String classCode,
    Long studentId,
    String studentName,
    String studentEmail,
    String studentAvatar,
    String status,
    String lastMessagePreview,
    LocalDateTime lastMessageAt,
    int totalFilesCount,
    LocalDateTime createdAt
) {
    public static InquiryThreadResponseDTO fromEntity(InquiryThread t) {
        return new InquiryThreadResponseDTO(
            t.getId(),
            t.getClassRoom() != null ? t.getClassRoom().getId() : null,
            t.getClassRoom() != null ? t.getClassRoom().getName() : null,
            t.getClassRoom() != null ? t.getClassRoom().getClassCode() : null,
            t.getStudent() != null ? t.getStudent().getId() : null,
            t.getStudent() != null ? t.getStudent().getFullName() : null,
            t.getStudent() != null ? t.getStudent().getEmail() : null,
            t.getStudent() != null ? t.getStudent().getAvatarUrl() : null,
            t.getStatus(),
            t.getLastMessagePreview(),
            t.getLastMessageAt(),
            t.getTotalFilesCount(),
            t.getCreatedAt()
        );
    }
}
