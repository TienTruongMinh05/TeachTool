package com.edumanager.api.repository;

import com.edumanager.api.entity.TeachingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeachingPlanRepository extends JpaRepository<TeachingPlan, Long> {

    @Query("SELECT tp FROM TeachingPlan tp WHERE tp.classRoom.id = :classId ORDER BY tp.session.startTime ASC NULLS LAST")
    List<TeachingPlan> findByClassRoomId(@Param("classId") Long classId);

    Optional<TeachingPlan> findBySessionId(Long sessionId);
    void deleteByClassRoomId(Long classId);
    void deleteBySessionId(Long sessionId);
}
