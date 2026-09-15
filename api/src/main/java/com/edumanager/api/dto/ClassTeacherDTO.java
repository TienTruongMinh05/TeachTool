package com.edumanager.api.dto;

import java.time.LocalDateTime;

public record ClassTeacherDTO(
    Long id,
    Long teacherId,
    String fullName,
    String email,
    String avatarUrl,
    String roleInClass, // "PRIMARY" hoặc "CO_TEACHER"
    LocalDateTime joinedAt
) {}
