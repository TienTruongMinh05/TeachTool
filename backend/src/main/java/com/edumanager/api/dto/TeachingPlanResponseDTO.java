package com.edumanager.api.dto;

import com.edumanager.api.entity.TeachingPlan;
import java.util.List;

public record TeachingPlanResponseDTO(
    Long id,
    Long classId,
    Long sessionId,
    String sessionTopic,
    String title,
    List<TeachingPlanSectionDTO> sections
) {
    public static TeachingPlanResponseDTO fromEntity(TeachingPlan p) {
        return new TeachingPlanResponseDTO(
            p.getId(),
            p.getClassRoom().getId(),
            p.getSession() != null ? p.getSession().getId() : null,
            p.getSession() != null ? p.getSession().getTopic() : "",
            p.getTitle(),
            p.getSections() != null 
                ? p.getSections().stream().map(TeachingPlanSectionDTO::fromEntity).toList()
                : List.of()
        );
    }
}
