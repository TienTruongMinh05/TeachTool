// File: src/main/java/com/edumanager/api/repository/AssignmentRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    @Query("SELECT a FROM Assignment a WHERE a.classRoom.id = :classId ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findByClassRoomId(@Param("classId") Long classId);

    @Query("SELECT a FROM Assignment a WHERE a.classRoom.id = :classId ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findByClassRoomIdOrderByDueDateAsc(@Param("classId") Long classId);

    @Query("SELECT a FROM Assignment a WHERE a.session.id = :sessionId ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT a FROM Assignment a WHERE a.session.id = :sessionId ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findBySessionIdOrderByDueDateAsc(@Param("sessionId") Long sessionId);

    @Query("SELECT a FROM Assignment a WHERE a.classRoom.id IN :classIds ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findByClassRoomIdIn(@Param("classIds") List<Long> classIds);

    @Query("SELECT a FROM Assignment a WHERE a.classRoom.id IN :classIds ORDER BY a.dueDate ASC NULLS LAST, a.createdAt ASC")
    List<Assignment> findByClassRoomIdInOrderByDueDateAsc(@Param("classIds") List<Long> classIds);
}