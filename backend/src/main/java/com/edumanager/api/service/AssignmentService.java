// File: src/main/java/com/edumanager/api/service/AssignmentService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.Assignment;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.repository.AssignmentRepository;
import com.edumanager.api.repository.ClassRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

import com.edumanager.api.entity.Enrollment;
import com.edumanager.api.entity.Session;
import com.edumanager.api.repository.EnrollmentRepository;
import com.edumanager.api.repository.SessionRepository;
import com.edumanager.api.repository.SubmissionRepository;
import com.edumanager.api.entity.Submission;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class AssignmentService {
    private final AssignmentRepository assignmentRepo;
    private final ClassRoomRepository classRepo;
    private final SessionRepository sessionRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final SubmissionRepository submissionRepo;
    private final ClassRoomService classRoomService;
    private final InquiryService inquiryService;

    public Assignment createAssignment(Long classId, Long sessionId, Assignment assignment, Long callerId) {
        ClassRoom classRoom = classRepo.findById(classId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có ID: " + classId));
        
        if (callerId != null && !classRoomService.isTeacherOfClass(classRoom, callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học này.");
        }

        assignment.setClassRoom(classRoom);

        if (sessionId != null) {
            Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));
            assignment.setSession(session);
        }

        return assignmentRepo.save(assignment);
    }

    public Assignment updateAssignment(Long id, Assignment updated, Long callerId) {
        Assignment existing = assignmentRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + id));

        if (callerId != null && existing.getClassRoom() != null && !classRoomService.isTeacherOfClass(existing.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của bài tập này.");
        }

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setDueDate(updated.getDueDate());
        existing.setAllowedSubmissionTypes(updated.getAllowedSubmissionTypes());
        existing.setAttachmentFileName(updated.getAttachmentFileName());
        existing.setAttachmentFileUrl(updated.getAttachmentFileUrl());
        existing.setAttachmentsJson(updated.getAttachmentsJson());
        existing.setScheduledPublishAt(updated.getScheduledPublishAt());

        if (updated.getSession() != null && updated.getSession().getId() != null) {
            Session session = sessionRepo.findById(updated.getSession().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học"));
            existing.setSession(session);
        }

        return assignmentRepo.save(existing);
    }

    public Assignment publishNow(Long id, Long callerId) {
        Assignment existing = assignmentRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + id));

        if (callerId != null && existing.getClassRoom() != null && !classRoomService.isTeacherOfClass(existing.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của bài tập này.");
        }

        existing.setScheduledPublishAt(java.time.LocalDateTime.now());
        return assignmentRepo.save(existing);
    }

    @Transactional
    public void deleteAssignment(Long id, Long callerId) {
        Assignment existing = assignmentRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + id));

        if (callerId != null && existing.getClassRoom() != null && !classRoomService.isTeacherOfClass(existing.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của bài tập này.");
        }

        // Xóa các bài nộp của bài tập này trước
        submissionRepo.deleteAll(submissionRepo.findByAssignmentId(id));
        assignmentRepo.deleteById(id);
    }

    public List<Assignment> getAssignmentsByClass(Long classId) {
        return assignmentRepo.findByClassRoomId(classId);
    }

    public List<Assignment> getAssignmentsBySession(Long sessionId) {
        return assignmentRepo.findBySessionId(sessionId);
    }

    public List<Assignment> getAssignmentsForStudent(Long studentId) {
        List<Enrollment> enrollments = enrollmentRepo.findByStudentId(studentId);
        List<Long> classIds = enrollments.stream().map(e -> e.getClassRoom().getId()).toList();
        if (classIds.isEmpty()) return List.of();
        return assignmentRepo.findByClassRoomIdIn(classIds).stream()
                .filter(Assignment::isPublished)
                .toList();
    }

    @Transactional
    public int remindUnsubmittedStudents(Long assignmentId, Long callerId) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài tập"));

        if (callerId != null && !classRoomService.isTeacherOfClass(assignment.getClassRoom(), callerId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền gửi nhắc nhở.");
        }

        Long classId = assignment.getClassRoom().getId();
        List<Enrollment> enrollments = enrollmentRepo.findByClassRoomId(classId);
        List<Submission> submissions = submissionRepo.findByAssignmentId(assignmentId);

        Set<Long> submittedStudentIds = submissions.stream()
                .map(s -> s.getStudent().getId())
                .collect(Collectors.toSet());

        String dueStr = assignment.getDueDate() != null
                ? assignment.getDueDate().format(DateTimeFormatter.ofPattern("HH:mm ngày dd/MM/yyyy"))
                : "sớm nhất";

        String reminderText = String.format("[Nhắc nhở nộp bài] Bài tập '%s' của lớp %s sẽ hết hạn lúc %s. Em hãy hoàn thành và nộp bài đúng hạn nhé!",
                assignment.getTitle(), assignment.getClassRoom().getName(), dueStr);

        int count = 0;
        for (Enrollment e : enrollments) {
            Long studentId = e.getStudent().getId();
            if (!submittedStudentIds.contains(studentId)) {
                inquiryService.sendSystemReminderToStudent(classId, studentId, reminderText);
                count++;
            }
        }
        return count;
    }

    @Transactional
    public Assignment toggleSkipReminder(Long assignmentId, Long callerId) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài tập"));

        if (callerId != null && !classRoomService.isTeacherOfClass(assignment.getClassRoom(), callerId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền thay đổi cài đặt nhắc nhở.");
        }

        assignment.setSkipReminder(!Boolean.TRUE.equals(assignment.getSkipReminder()));
        return assignmentRepo.save(assignment);
    }

    public byte[] exportSubmissionsZip(Long assignmentId, Long callerId) throws IOException {
        Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài tập"));

        if (callerId != null && !classRoomService.isTeacherOfClass(assignment.getClassRoom(), callerId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền tải bài nộp.");
        }

        List<Submission> submissions = submissionRepo.findByAssignmentId(assignmentId);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Submission s : submissions) {
                String rawName = s.getStudent() != null ? s.getStudent().getFullName() : "HocSinh_" + s.getId();
                String studentName = rawName.replaceAll("[^a-zA-Z0-9\\p{L}_-]", "_");
                String entryNamePrefix = studentName + "/";

                // Bài nộp dạng TEXT
                if (s.getTextContent() != null && !s.getTextContent().trim().isEmpty()) {
                    ZipEntry textEntry = new ZipEntry(entryNamePrefix + "bai_lam.txt");
                    zos.putNextEntry(textEntry);
                    zos.write(s.getTextContent().getBytes(StandardCharsets.UTF_8));
                    zos.closeEntry();
                }

                // Nhận xét của giáo viên nếu có
                if (s.getFeedback() != null && !s.getFeedback().trim().isEmpty()) {
                    ZipEntry fbEntry = new ZipEntry(entryNamePrefix + "nhan_xet_gv.txt");
                    zos.putNextEntry(fbEntry);
                    zos.write(s.getFeedback().getBytes(StandardCharsets.UTF_8));
                    zos.closeEntry();
                }

                // Điểm số
                if (s.getScore() != null) {
                    ZipEntry scoreEntry = new ZipEntry(entryNamePrefix + "diem_so.txt");
                    zos.putNextEntry(scoreEntry);
                    zos.write(("Điểm: " + s.getScore()).getBytes(StandardCharsets.UTF_8));
                    zos.closeEntry();
                }
            }
        }
        return baos.toByteArray();
    }

    @Scheduled(cron = "0 0 * * * *") // Chạy định kỳ mỗi đầu giờ
    public void autoRemindUpcomingDeadlines() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twelveHoursLater = now.plusHours(12);

        List<Assignment> upcoming = assignmentRepo.findAll().stream()
                .filter(a -> a.getDueDate() != null 
                        && a.getDueDate().isAfter(now) 
                        && a.getDueDate().isBefore(twelveHoursLater)
                        && !Boolean.TRUE.equals(a.getSkipReminder())
                        && (a.getClassRoom() != null && !Boolean.FALSE.equals(a.getClassRoom().getAutoReminderEnabled())))
                .toList();

        for (Assignment asgn : upcoming) {
            try {
                remindUnsubmittedStudents(asgn.getId(), null);
            } catch (Exception ignored) {
            }
        }
    }
}