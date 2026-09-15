// File: src/main/java/com/edumanager/api/service/SubmissionService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.Assignment;
import com.edumanager.api.entity.Submission;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.AssignmentRepository;
import com.edumanager.api.repository.SubmissionRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SubmissionService {
    private final SubmissionRepository submissionRepo;
    private final AssignmentRepository assignmentRepo;
    private final UserRepository userRepo;

    // Học viên nộp bài
    public Submission submitAssignment(Long assignmentId, Long studentId, String submissionType, String textContent, String fileUrl, String fileName) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + assignmentId));
        User student = userRepo.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh có ID: " + studentId));

        Submission submission = submissionRepo.findByAssignmentIdAndStudentId(assignmentId, studentId)
            .orElse(Submission.builder().assignment(assignment).student(student).build());
        
        submission.setSubmissionType(submissionType);
        submission.setTextContent(textContent);
        submission.setFileUrl(fileUrl);
        submission.setFileName(fileName);
        submission.setSubmittedAt(java.time.LocalDateTime.now());
        return submissionRepo.save(submission);
    }

    // Giáo viên chấm điểm
    public Submission gradeSubmission(Long submissionId, String score, Map<String, Double> scores, String feedback) {
        Submission submission = submissionRepo.findById(submissionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp có ID: " + submissionId));
        
        submission.setScore(score);
        submission.setScores(scores);
        submission.setFeedback(feedback);
        submission.setGradedAt(java.time.LocalDateTime.now());
        return submissionRepo.save(submission);
    }

    public java.util.List<Submission> getSubmissionsByAssignment(Long assignmentId) {
        return submissionRepo.findByAssignmentId(assignmentId);
    }

    public java.util.List<Submission> getSubmissionsByStudent(Long studentId) {
        return submissionRepo.findByStudentId(studentId);
    }

    public java.util.Optional<Submission> getSubmission(Long assignmentId, Long studentId) {
        return submissionRepo.findByAssignmentIdAndStudentId(assignmentId, studentId);
    }
}