package com.edumanager.api.repository;

import com.edumanager.api.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findBySessionId(Long sessionId);
    Optional<Attendance> findBySessionIdAndStudentId(Long sessionId, Long studentId);
    
    @Query("SELECT a FROM Attendance a WHERE a.student.id = :studentId")
    List<Attendance> findByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId AND a.status = 'ABSENT' AND a.session.id != :excludeSessionId AND a.session.startTime >= :startOfMonth AND a.session.startTime < :startOfNextMonth")
    long countAbsencesInMonth(
        @Param("studentId") Long studentId,
        @Param("excludeSessionId") Long excludeSessionId,
        @Param("startOfMonth") java.time.LocalDateTime startOfMonth,
        @Param("startOfNextMonth") java.time.LocalDateTime startOfNextMonth
    );

    List<Attendance> findBySessionClassRoomId(Long classId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);

    void deleteBySessionId(Long sessionId);
    void deleteBySessionClassRoomId(Long classId);
}