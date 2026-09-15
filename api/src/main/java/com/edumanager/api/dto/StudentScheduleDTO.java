package com.edumanager.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public record StudentScheduleDTO(
    Long sessionId,
    Long classId,
    String className,
    String classCode,
    String topic,
    LocalDateTime startTime,
    LocalDateTime endTime,
    Integer durationMinutes,
    String teachingPlanTitle,
    List<TeachingPlanSectionDTO> sections,
    List<AssignmentResponseDTO> assignments,
    String attendanceStatus,
    String attendanceNote,
    String homeworkStatus,
    String homeworkScore
) {
}
