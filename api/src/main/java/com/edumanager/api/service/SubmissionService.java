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
    private final com.edumanager.api.repository.EnrollmentRepository enrollmentRepo;
    private final ClassRoomService classRoomService;
    private final com.edumanager.api.repository.StoredFileRepository storedFileRepository;

    // Học viên nộp bài
    public Submission submitAssignment(Long assignmentId, Long studentId, String submissionType, String textContent, String fileUrl, String fileName) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + assignmentId));
        User student = userRepo.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh có ID: " + studentId));

        // Kiểm tra học sinh có ghi danh vào lớp của bài tập không
        if (assignment.getClassRoom() != null && !enrollmentRepo.existsByClassRoomIdAndStudentId(assignment.getClassRoom().getId(), studentId)) {
            throw new SecurityException("Bạn chưa ghi danh vào lớp học của bài tập này nên không thể nộp bài.");
        }

        if (submissionType == null || submissionType.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn hình thức nộp bài.");
        }
        String cleanType = submissionType.trim().toUpperCase();

        // 1. Kiểm tra hình thức nộp bài có được giáo viên cho phép không
        String allowed = assignment.getAllowedSubmissionTypes();
        if (allowed != null && !allowed.trim().isEmpty()) {
            java.util.List<String> allowedList = java.util.Arrays.stream(allowed.split(","))
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .toList();
            if (!allowedList.isEmpty() && !allowedList.contains(cleanType)) {
                throw new IllegalArgumentException("Hình thức nộp bài '" + cleanType + "' không được phép. Giáo viên chỉ cho phép: " + allowed);
            }
        }

        // 2. Kiểm tra tính hợp lệ của dữ liệu / tệp đính kèm theo từng loại
        if ("TEXT".equals(cleanType)) {
            if (textContent == null || textContent.trim().isEmpty()) {
                throw new IllegalArgumentException("Nội dung bài làm văn bản không được để trống.");
            }
        } else {
            if (fileUrl == null || fileUrl.trim().isEmpty()) {
                throw new IllegalArgumentException("Vui lòng đính kèm tệp bài làm hoặc bản ghi âm.");
            }
            String lowerFileName = (fileName != null ? fileName : fileUrl).toLowerCase();
            if ("DOCX".equals(cleanType)) {
                if (!lowerFileName.endsWith(".docx") && !lowerFileName.endsWith(".doc") && !lowerFileName.endsWith(".pdf")) {
                    throw new IllegalArgumentException("Tệp nộp bài không hợp lệ. Giáo viên chỉ chấp nhận tài liệu (.docx, .doc, .pdf).");
                }
            } else if ("AUDIO".equals(cleanType) || "DIRECT_RECORD".equals(cleanType)) {
                if (!lowerFileName.endsWith(".mp3") && !lowerFileName.endsWith(".wav") && !lowerFileName.endsWith(".m4a") && !lowerFileName.endsWith(".webm") && !lowerFileName.endsWith(".ogg")) {
                    throw new IllegalArgumentException("Tệp nộp bài không hợp lệ. Giáo viên chỉ chấp nhận tệp âm thanh ghi âm (.mp3, .wav, .m4a, .webm).");
                }
            } else if ("IMAGE".equals(cleanType)) {
                if (!lowerFileName.endsWith(".jpg") && !lowerFileName.endsWith(".jpeg") && !lowerFileName.endsWith(".png") && !lowerFileName.endsWith(".webp") && !lowerFileName.endsWith(".gif") && !lowerFileName.endsWith(".heic")) {
                    throw new IllegalArgumentException("Tệp ảnh không hợp lệ. Chỉ chấp nhận định dạng ảnh (.jpg, .jpeg, .png, .webp, .gif).");
                }
            }
        }

        Submission submission = submissionRepo.findByAssignmentIdAndStudentId(assignmentId, studentId)
            .orElse(Submission.builder().assignment(assignment).student(student).build());
        
        submission.setSubmissionType(cleanType);
        submission.setTextContent("TEXT".equals(cleanType) ? textContent.trim() : null);
        submission.setFileUrl(!"TEXT".equals(cleanType) ? fileUrl : null);
        submission.setFileName(!"TEXT".equals(cleanType) ? fileName : null);
        submission.setSubmittedAt(java.time.LocalDateTime.now());
        return submissionRepo.save(submission);
    }

    // Giáo viên chấm điểm
    public Submission gradeSubmission(Long submissionId, String score, Map<String, Double> scores, String feedback, Long teacherId) {
        Submission submission = submissionRepo.findById(submissionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp có ID: " + submissionId));
        
        if (teacherId != null && submission.getAssignment() != null && submission.getAssignment().getClassRoom() != null) {
            if (!classRoomService.isTeacherOfClass(submission.getAssignment().getClassRoom(), teacherId)) {
                throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của bài tập này.");
            }
        }

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

    @org.springframework.transaction.annotation.Transactional
    public void deleteSubmission(Long submissionId, Long callerId, String callerRole) {
        Submission submission = submissionRepo.findById(submissionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp có ID: " + submissionId));

        if ("STUDENT".equalsIgnoreCase(callerRole)) {
            if (callerId == null || !callerId.equals(submission.getStudent().getId())) {
                throw new SecurityException("Bạn chỉ có quyền xóa bài nộp của chính mình.");
            }
            if (submission.getScore() != null && !submission.getScore().trim().isEmpty()) {
                throw new IllegalStateException("Bài làm đã được giáo viên chấm điểm, không thể xóa.");
            }
        } else if ("TEACHER".equalsIgnoreCase(callerRole)) {
            if (callerId != null && submission.getAssignment() != null && submission.getAssignment().getClassRoom() != null) {
                if (!classRoomService.isTeacherOfClass(submission.getAssignment().getClassRoom(), callerId)) {
                    throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của bài tập này.");
                }
            }
        }

        // Dọn dẹp tệp đính kèm trên đĩa và DB nếu có
        String fileUrl = submission.getFileUrl();
        if (fileUrl != null && !fileUrl.trim().isEmpty()) {
            try {
                String storedName = fileUrl.contains("/") ? fileUrl.substring(fileUrl.lastIndexOf("/") + 1) : fileUrl;
                if (storedName.contains("?")) {
                    storedName = storedName.substring(0, storedName.indexOf("?"));
                }
                storedFileRepository.findByStoredName(storedName).ifPresent(storedFileRepository::delete);
                java.nio.file.Path localPath = java.nio.file.Paths.get("uploads", storedName);
                java.nio.file.Files.deleteIfExists(localPath);
            } catch (Exception ignored) {}
        }

        submissionRepo.delete(submission);
    }
}