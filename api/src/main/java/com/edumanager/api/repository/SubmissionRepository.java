package com.edumanager.api.repository;

import com.edumanager.api.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByAssignmentId(Long assignmentId);
    Optional<Submission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    
    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId")
    List<Submission> findByStudentId(@Param("studentId") Long studentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Submission s WHERE s.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT s FROM Submission s WHERE s.assignment.classRoom.id = :classId")
    List<Submission> findByClassRoomId(@Param("classId") Long classId);

    List<Submission> findBySubmittedAtBefore(java.time.LocalDateTime cutoff);
}