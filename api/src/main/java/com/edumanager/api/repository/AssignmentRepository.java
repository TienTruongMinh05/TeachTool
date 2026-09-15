// File: src/main/java/com/edumanager/api/repository/AssignmentRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByClassRoomId(Long classId);
    List<Assignment> findBySessionId(Long sessionId);
    List<Assignment> findByClassRoomIdIn(List<Long> classIds);
}