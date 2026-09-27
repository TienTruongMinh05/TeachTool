// AttendanceResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Attendance;

public record AttendanceResponseDTO(Long id, Long sessionId, Long studentId, String studentName, String status, String note) {
    public static AttendanceResponseDTO fromEntity(Attendance a) {
        return new AttendanceResponseDTO(
            a.getId(), 
            a.getSession().getId(), 
            a.getStudent().getId(), 
            a.getStudent().getFullName(), 
            a.getStatus(), 
            a.getNote()
        );
    }
}