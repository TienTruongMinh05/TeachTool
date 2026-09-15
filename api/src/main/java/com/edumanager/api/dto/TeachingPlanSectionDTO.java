package com.edumanager.api.dto;

import com.edumanager.api.entity.TeachingPlanSection;

public record TeachingPlanSectionDTO(
    Long id,
    String timeAllocation,
    String content,
    String activity,
    String handoutType,
    String handoutText,
    String handoutFileName,
    String handoutFilePath,
    String studentPreparation,
    Integer orderIndex
) {
    public static TeachingPlanSectionDTO fromEntity(TeachingPlanSection s) {
        return new TeachingPlanSectionDTO(
            s.getId(),
            s.getTimeAllocation(),
            s.getContent(),
            s.getActivity(),
            s.getHandoutType(),
            s.getHandoutText(),
            s.getHandoutFileName(),
            s.getHandoutFilePath(),
            s.getStudentPreparation(),
            s.getOrderIndex()
        );
    }
}
