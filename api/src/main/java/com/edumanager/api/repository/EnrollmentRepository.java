// File: src/main/java/com/edumanager/api/repository/EnrollmentRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    @Query("SELECT e FROM Enrollment e WHERE e.classRoom.id = :classId")
    List<Enrollment> findByClassRoomId(@Param("classId") Long classId);

    @Query("SELECT e FROM Enrollment e WHERE e.student.id = :studentId")
    List<Enrollment> findByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT e FROM Enrollment e WHERE e.classRoom.id = :classId AND e.student.id = :studentId")
    Optional<Enrollment> findByClassRoomIdAndStudentId(@Param("classId") Long classId, @Param("studentId") Long studentId);

    @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.classRoom.id = :classId AND e.student.id = :studentId")
    boolean existsByClassRoomIdAndStudentId(@Param("classId") Long classId, @Param("studentId") Long studentId);

    @Modifying
    @Query("DELETE FROM Enrollment e WHERE e.classRoom.id = :classId AND e.student.id = :studentId")
    void deleteByClassRoomIdAndStudentId(@Param("classId") Long classId, @Param("studentId") Long studentId);

    @Modifying
    @Query("DELETE FROM Enrollment e WHERE e.classRoom.id = :classId")
    void deleteByClassRoomId(@Param("classId") Long classId);
}