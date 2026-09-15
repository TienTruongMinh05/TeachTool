// EnrollmentResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Enrollment;

public record EnrollmentResponseDTO(Long id, Long classId, Long studentId, String studentName, String studentEmail) {
    public static EnrollmentResponseDTO fromEntity(Enrollment e) {
        return new EnrollmentResponseDTO(
            e.getId(), 
            e.getClassRoom().getId(), 
            e.getStudent().getId(), 
            e.getStudent().getFullName(), 
            e.getStudent().getEmail()
        );
    }
}