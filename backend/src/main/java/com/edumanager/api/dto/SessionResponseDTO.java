// SessionResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Session;
import java.time.LocalDateTime;

public record SessionResponseDTO(
    Long id, 
    Long classId, 
    String topic, 
    LocalDateTime startTime, 
    LocalDateTime endTime, 
    Integer durationMinutes,
    String announcement,
    LocalDateTime announcementUpdatedAt
) {
    public static SessionResponseDTO fromEntity(Session s) {
        return new SessionResponseDTO(
            s.getId(), 
            s.getClassRoom().getId(), 
            s.getTopic(), 
            s.getStartTime(), 
            s.getEndTime(), 
            s.getDurationMinutes(),
            s.getAnnouncement(),
            s.getAnnouncementUpdatedAt()
        );
    }
}