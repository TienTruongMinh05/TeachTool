// File: src/main/java/com/edumanager/api/repository/AttendanceRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    @Query("SELECT a FROM Attendance a WHERE a.session.id = :sessionId")
    List<Attendance> findBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT a FROM Attendance a WHERE a.session.id = :sessionId AND a.student.id = :studentId")
    Optional<Attendance> findBySessionIdAndStudentId(@Param("sessionId") Long sessionId, @Param("studentId") Long studentId);

    @Query("SELECT a FROM Attendance a WHERE a.session.classRoom.id = :classId")
    List<Attendance> findBySessionClassRoomId(@Param("classId") Long classId);

    @Query("SELECT a FROM Attendance a WHERE a.student.id = :studentId")
    List<Attendance> findByStudentId(@Param("studentId") Long studentId);

    @Modifying
    @Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);

    @Modifying
    @Query("DELETE FROM Attendance a WHERE a.session.id = :sessionId")
    void deleteBySessionId(@Param("sessionId") Long sessionId);

    @Modifying
    @Query("DELETE FROM Attendance a WHERE a.session.classRoom.id = :classId")
    void deleteBySessionClassRoomId(@Param("classId") Long classId);
}