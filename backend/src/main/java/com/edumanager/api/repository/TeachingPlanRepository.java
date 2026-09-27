package com.edumanager.api.repository;

import com.edumanager.api.entity.TeachingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeachingPlanRepository extends JpaRepository<TeachingPlan, Long> {
    List<TeachingPlan> findByClassRoomId(Long classId);
    Optional<TeachingPlan> findBySessionId(Long sessionId);
    void deleteByClassRoomId(Long classId);
    void deleteBySessionId(Long sessionId);
}
