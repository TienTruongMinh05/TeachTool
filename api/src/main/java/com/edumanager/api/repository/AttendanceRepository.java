// File: src/main/java/com/edumanager/api/repository/AttendanceRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findBySessionId(Long sessionId);
    Optional<Attendance> findBySessionIdAndStudentId(Long sessionId, Long studentId);
    List<Attendance> findBySessionClassRoomId(Long classId);
    List<Attendance> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
    void deleteBySessionId(Long sessionId);
    void deleteBySessionClassRoomId(Long classId);
}