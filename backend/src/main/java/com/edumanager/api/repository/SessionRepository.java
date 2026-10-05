// File: src/main/java/com/edumanager/api/repository/SessionRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {

    @Query("SELECT s FROM Session s WHERE s.classRoom.id = :classId ORDER BY s.startTime ASC NULLS LAST")
    List<Session> findByClassRoomId(@Param("classId") Long classId);

    @Query("SELECT s FROM Session s WHERE s.classRoom.id = :classId ORDER BY s.startTime ASC NULLS LAST")
    List<Session> findByClassRoomIdOrderByStartTimeAsc(@Param("classId") Long classId);

    @Query("SELECT s FROM Session s WHERE s.classRoom.id = :classId AND s.startTime >= :start AND s.startTime <= :end ORDER BY s.startTime ASC NULLS LAST")
    List<Session> findByClassRoomIdAndStartTimeBetweenOrderByStartTimeAsc(
            @Param("classId") Long classId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT s FROM Session s WHERE s.classRoom.id IN :classIds AND s.startTime >= :start AND s.startTime <= :end ORDER BY s.startTime ASC NULLS LAST")
    List<Session> findByClassRoomIdInAndStartTimeBetweenOrderByStartTimeAsc(
            @Param("classIds") List<Long> classIds,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    void deleteByClassRoomId(Long classId);

    List<Session> findByStartTimeBefore(LocalDateTime cutoff);
}