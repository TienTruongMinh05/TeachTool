// File: src/main/java/com/edumanager/api/repository/SessionRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByClassRoomId(Long classId);
    void deleteByClassRoomId(Long classId);
    List<Session> findByStartTimeBefore(java.time.LocalDateTime cutoff);
}