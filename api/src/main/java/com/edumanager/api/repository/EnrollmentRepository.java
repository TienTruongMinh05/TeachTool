// File: src/main/java/com/edumanager/api/repository/EnrollmentRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    // Tự động sinh SQL lấy danh sách theo ID lớp
    List<Enrollment> findByClassRoomId(Long classId);
    List<Enrollment> findByStudentId(Long studentId);
    Optional<Enrollment> findByClassRoomIdAndStudentId(Long classId, Long studentId);
    boolean existsByClassRoomIdAndStudentId(Long classId, Long studentId);
    void deleteByClassRoomIdAndStudentId(Long classId, Long studentId);
    void deleteByClassRoomId(Long classId);
}