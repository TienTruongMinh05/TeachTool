package com.edumanager.api.dto;

import java.time.LocalDateTime;

public record TimetableSessionDTO(
    Long sessionId,
    Long classId,
    String className,
    String classCode,
    String topic,
    LocalDateTime startTime,
    LocalDateTime endTime,
    Integer durationMinutes,
    String contentSummary,
    Integer studentCount
) {
}
