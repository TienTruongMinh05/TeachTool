package com.edumanager.api.dto;

import com.edumanager.api.entity.SubmissionFeedbackComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionFeedbackCommentDTO {
    private Long id;
    private Long submissionId;
    private Long senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String audioUrl;
    private LocalDateTime createdAt;

    public static SubmissionFeedbackCommentDTO fromEntity(SubmissionFeedbackComment entity) {
        if (entity == null) return null;
        return SubmissionFeedbackCommentDTO.builder()
                .id(entity.getId())
                .submissionId(entity.getSubmission() != null ? entity.getSubmission().getId() : null)
                .senderId(entity.getSender() != null ? entity.getSender().getId() : null)
                .senderName(entity.getSender() != null ? entity.getSender().getFullName() : null)
                .senderRole(entity.getSenderRole())
                .content(entity.getContent())
                .audioUrl(entity.getAudioUrl())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
