// ClassResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.ClassRoom;
import java.time.LocalDate;

public record ClassResponseDTO(Long id, String name, String classCode, LocalDate startDate, LocalDate endDate) {
    public static ClassResponseDTO fromEntity(ClassRoom c) {
        return new ClassResponseDTO(c.getId(), c.getName(), c.getClassCode(), c.getStartDate(), c.getEndDate());
    }
}