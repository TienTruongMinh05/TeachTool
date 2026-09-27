package com.edumanager.api.dto;

import com.edumanager.api.entity.ClassAnnouncement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassAnnouncementDTO {
    private Long id;
    private Long classId;
    private String className;
    private Long authorId;
    private String authorName;
    private String title;
    private String content;
    private Boolean isPinned;
    private String attachmentsJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClassAnnouncementDTO fromEntity(ClassAnnouncement entity) {
        if (entity == null) return null;
        return ClassAnnouncementDTO.builder()
                .id(entity.getId())
                .classId(entity.getClassRoom() != null ? entity.getClassRoom().getId() : null)
                .className(entity.getClassRoom() != null ? entity.getClassRoom().getName() : null)
                .authorId(entity.getAuthor() != null ? entity.getAuthor().getId() : null)
                .authorName(entity.getAuthor() != null ? entity.getAuthor().getFullName() : null)
                .title(entity.getTitle())
                .content(entity.getContent())
                .isPinned(entity.getIsPinned())
                .attachmentsJson(entity.getAttachmentsJson())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
