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
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AssignmentService {
    private final AssignmentRepository assignmentRepo;
    private final ClassRoomRepository classRepo;
    private final SessionRepository sessionRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final SubmissionRepository submissionRepo;

    public Assignment createAssignment(Long classId, Long sessionId, Assignment assignment) {
        ClassRoom classRoom = classRepo.findById(classId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có ID: " + classId));
        assignment.setClassRoom(classRoom);

        if (sessionId != null) {
            Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));
            assignment.setSession(session);
        }

        return assignmentRepo.save(assignment);
    }

    public Assignment updateAssignment(Long id, Assignment updated) {
        Assignment existing = assignmentRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập có ID: " + id));

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setDueDate(updated.getDueDate());
        existing.setAllowedSubmissionTypes(updated.getAllowedSubmissionTypes());
        existing.setAttachmentFileName(updated.getAttachmentFileName());
        existing.setAttachmentFileUrl(updated.getAttachmentFileUrl());

        if (updated.getSession() != null && updated.getSession().getId() != null) {
            Session session = sessionRepo.findById(updated.getSession().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học"));
            existing.setSession(session);
        }

        return assignmentRepo.save(existing);
    }

    @Transactional
    public void deleteAssignment(Long id) {
        if (!assignmentRepo.existsById(id)) {
            throw new RuntimeException("Không tìm thấy bài tập có ID: " + id);
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
        return assignmentRepo.findByClassRoomIdIn(classIds);
    }
}