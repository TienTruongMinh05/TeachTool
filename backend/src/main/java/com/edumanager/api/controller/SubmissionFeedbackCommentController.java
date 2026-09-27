package com.edumanager.api.controller;

import com.edumanager.api.dto.SubmissionFeedbackCommentDTO;
import com.edumanager.api.entity.SubmissionFeedbackComment;
import com.edumanager.api.service.SubmissionFeedbackCommentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SubmissionFeedbackCommentController {

    private final SubmissionFeedbackCommentService commentService;

    @GetMapping("/api/submissions/{submissionId}/comments")
    public List<SubmissionFeedbackCommentDTO> getComments(
            @PathVariable Long submissionId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        return commentService.getComments(submissionId, callerId, callerRole).stream()
                .map(SubmissionFeedbackCommentDTO::fromEntity)
                .toList();
    }

    @PostMapping("/api/submissions/{submissionId}/comments")
    public SubmissionFeedbackCommentDTO addComment(
            @PathVariable Long submissionId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        String content = body.get("content");
        String audioUrl = body.get("audioUrl");

        SubmissionFeedbackComment saved = commentService.addComment(submissionId, content, audioUrl, callerId, callerRole);
        return SubmissionFeedbackCommentDTO.fromEntity(saved);
    }
}
