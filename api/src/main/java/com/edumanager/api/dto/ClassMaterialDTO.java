package com.edumanager.api.dto;

import com.edumanager.api.entity.ClassMaterial;
import java.time.LocalDateTime;

public record ClassMaterialDTO(
    Long id,
    Long classId,
    String title,
    String category,
    String fileUrl,
    String fileName,
    Integer totalPages,
    String description,
    LocalDateTime createdAt
) {
    public static ClassMaterialDTO fromEntity(ClassMaterial m) {
        return new ClassMaterialDTO(
            m.getId(),
            m.getClassRoom() != null ? m.getClassRoom().getId() : null,
            m.getTitle(),
            m.getCategory(),
            m.getFileUrl(),
            m.getFileName(),
            m.getTotalPages(),
            m.getDescription(),
            m.getCreatedAt()
        );
    }
}
