package com.edumanager.api.repository;

import com.edumanager.api.entity.SubmissionFeedbackComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionFeedbackCommentRepository extends JpaRepository<SubmissionFeedbackComment, Long> {
    List<SubmissionFeedbackComment> findBySubmissionIdOrderByCreatedAtAsc(Long submissionId);
    long countBySubmissionId(Long submissionId);
}
