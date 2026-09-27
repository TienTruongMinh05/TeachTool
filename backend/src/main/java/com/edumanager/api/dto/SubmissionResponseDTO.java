// SubmissionResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Submission;
import java.time.LocalDateTime;
import java.util.Map;

public record SubmissionResponseDTO(
    Long id,
    Long assignmentId,
    Long studentId,
    String studentName,
    String studentEmail,
    String submissionType,
    String textContent,
    String fileUrl,
    String fileName,
    String score,
    Map<String, Double> scores,
    String feedback,
    LocalDateTime submittedAt,
    LocalDateTime gradedAt
) {
    public static SubmissionResponseDTO fromEntity(Submission s) {
        return new SubmissionResponseDTO(
            s.getId(),
            s.getAssignment() != null ? s.getAssignment().getId() : null,
            s.getStudent() != null ? s.getStudent().getId() : null,
            s.getStudent() != null ? s.getStudent().getFullName() : null,
            s.getStudent() != null ? s.getStudent().getEmail() : null,
            s.getSubmissionType(),
            s.getTextContent(),
            s.getFileUrl(),
            s.getFileName(),
            s.getScore(),
            s.getScores(),
            s.getFeedback(),
            s.getSubmittedAt(),
            s.getGradedAt()
        );
    }
}