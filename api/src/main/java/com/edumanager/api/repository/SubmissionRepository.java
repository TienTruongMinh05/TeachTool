// File: src/main/java/com/edumanager/api/repository/SubmissionRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByAssignmentId(Long assignmentId);
    Optional<Submission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    List<Submission> findByStudentId(Long studentId);
}