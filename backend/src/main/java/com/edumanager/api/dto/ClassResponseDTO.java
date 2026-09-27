// ClassResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.ClassRoom;
import java.time.LocalDate;

public record ClassResponseDTO(
    Long id, 
    String name, 
    String classCode, 
    LocalDate startDate, 
    LocalDate endDate, 
    Long teacherId,
    boolean isCoTeacher
) {
    public static ClassResponseDTO fromEntity(ClassRoom c) {
        return fromEntity(c, null);
    }

    public static ClassResponseDTO fromEntity(ClassRoom c, Long currentUserId) {
        boolean isCo = false;
        if (c.getTeacherId() != null && currentUserId != null && !c.getTeacherId().equals(currentUserId)) {
            isCo = true;
        }
        return new ClassResponseDTO(c.getId(), c.getName(), c.getClassCode(), c.getStartDate(), c.getEndDate(), c.getTeacherId(), isCo);
    }
}