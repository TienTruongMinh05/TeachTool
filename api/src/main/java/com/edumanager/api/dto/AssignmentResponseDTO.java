// AssignmentResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Assignment;
import java.time.LocalDateTime;

public record AssignmentResponseDTO(
    Long id,
    Long classId,
    Long sessionId,
    String sessionTopic,
    String title,
    String description,
    LocalDateTime dueDate,
    String allowedSubmissionTypes,
    String attachmentFileName,
    String attachmentFileUrl,
    String attachmentsJson,
    LocalDateTime createdAt
) {
    public static AssignmentResponseDTO fromEntity(Assignment a) {
        return new AssignmentResponseDTO(
            a.getId(),
            a.getClassRoom() != null ? a.getClassRoom().getId() : null,
            a.getSession() != null ? a.getSession().getId() : null,
            a.getSession() != null ? a.getSession().getTopic() : null,
            a.getTitle(),
            a.getDescription(),
            a.getDueDate(),
            a.getAllowedSubmissionTypes(),
            a.getAttachmentFileName(),
            a.getAttachmentFileUrl(),
            a.getAttachmentsJson(),
            a.getCreatedAt()
        );
    }
}