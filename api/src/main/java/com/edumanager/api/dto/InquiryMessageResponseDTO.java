// File: src/main/java/com/edumanager/api/dto/InquiryMessageResponseDTO.java
package com.edumanager.api.dto;

import com.edumanager.api.entity.InquiryMessage;
import java.time.LocalDateTime;

public record InquiryMessageResponseDTO(
    Long id,
    Long threadId,
    Long senderId,
    String senderRole,
    String senderName,
    String content, // Nội dung đã được giải mã
    String attachmentsJson,
    boolean isAutoReply,
    LocalDateTime createdAt
) {
    public static InquiryMessageResponseDTO fromEntity(InquiryMessage m, String decryptedContent) {
        return new InquiryMessageResponseDTO(
            m.getId(),
            m.getThread() != null ? m.getThread().getId() : null,
            m.getSender() != null ? m.getSender().getId() : null,
            m.getSenderRole(),
            m.getSenderName(),
            decryptedContent,
            m.getAttachmentsJson(),
            m.isAutoReply(),
            m.getCreatedAt()
        );
    }
}
