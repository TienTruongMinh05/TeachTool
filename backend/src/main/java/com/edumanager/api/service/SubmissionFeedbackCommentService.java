package com.edumanager.api.service;

import com.edumanager.api.entity.Submission;
import com.edumanager.api.entity.SubmissionFeedbackComment;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.SubmissionFeedbackCommentRepository;
import com.edumanager.api.repository.SubmissionRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionFeedbackCommentService {

    private final SubmissionFeedbackCommentRepository commentRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final ClassRoomService classRoomService;

    private void validateAccess(Submission submission, Long callerId, String callerRole) {
        if ("STUDENT".equalsIgnoreCase(callerRole)) {
            if (!submission.getStudent().getId().equals(callerId)) {
                throw new SecurityException("Học sinh chỉ được xem và phản hồi bài nộp của chính mình.");
            }
        } else if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if (!classRoomService.isTeacherOfClass(submission.getAssignment().getClassRoom(), callerId)) {
                throw new SecurityException("Chỉ giáo viên phụ trách lớp mới có quyền truy cập bài nộp này.");
            }
        } else {
            throw new SecurityException("Vai trò không hợp lệ.");
        }
    }

    public List<SubmissionFeedbackComment> getComments(Long submissionId, Long callerId, String callerRole) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài nộp"));
        validateAccess(submission, callerId, callerRole);
        return commentRepository.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
    }

    @Transactional
    public SubmissionFeedbackComment addComment(Long submissionId, String content, String audioUrl, Long callerId, String callerRole) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài nộp"));
        validateAccess(submission, callerId, callerRole);

        User sender = userRepository.findById(callerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người gửi"));

        SubmissionFeedbackComment comment = SubmissionFeedbackComment.builder()
                .submission(submission)
                .sender(sender)
                .senderRole(callerRole.toUpperCase())
                .content(content != null ? content.trim() : "")
                .audioUrl(audioUrl)
                .createdAt(LocalDateTime.now())
                .build();

        return commentRepository.save(comment);
    }
}
