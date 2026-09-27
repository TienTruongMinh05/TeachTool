package com.edumanager.api.dto;

import java.util.List;

public record AllStudentDTO(
    Long studentId,
    String studentName,
    String studentEmail,
    List<ClassSummaryDTO> enrolledClasses
) {
}
