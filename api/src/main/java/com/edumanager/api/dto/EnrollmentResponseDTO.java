// EnrollmentResponseDTO.java
package com.edumanager.api.dto;
import com.edumanager.api.entity.Enrollment;

public record EnrollmentResponseDTO(
    Long id, 
    Long classId, 
    Long studentId, 
    String studentName, 
    String studentEmail,
    String fullName,
    String email
) {
    public static EnrollmentResponseDTO fromEntity(Enrollment e) {
        String name = e.getStudent() != null ? e.getStudent().getFullName() : null;
        String mail = e.getStudent() != null ? e.getStudent().getEmail() : null;
        Long sId = e.getStudent() != null ? e.getStudent().getId() : null;
        return new EnrollmentResponseDTO(
            e.getId(), 
            e.getClassRoom() != null ? e.getClassRoom().getId() : null, 
            sId, 
            name, 
            mail,
            name,
            mail
        );
    }
}