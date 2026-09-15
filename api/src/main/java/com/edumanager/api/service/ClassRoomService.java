package com.edumanager.api.service;

import com.edumanager.api.entity.Assignment;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Session;
import com.edumanager.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassRoomService {
    
    private final ClassRoomRepository repository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRepository attendanceRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final TeachingPlanRepository teachingPlanRepository;

    private String generateUniqueClassCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (repository.existsByClassCode(code));
        return code;
    }

    // Lưu lớp học mới vào DB
    public ClassRoom createClass(ClassRoom classRoom, Long teacherId) {
        if (classRoom.getClassCode() == null || classRoom.getClassCode().trim().isEmpty()) {
            classRoom.setClassCode(generateUniqueClassCode());
        }
        if (teacherId != null) {
            classRoom.setTeacherId(teacherId);
        }
        return repository.save(classRoom);
    }

    // Lấy danh sách toàn bộ lớp học (hoặc lớp của giáo viên phụ trách)
    public List<ClassRoom> getAllClasses() {
        return getClassesByTeacher(null);
    }

    public List<ClassRoom> getClassesByTeacher(Long teacherId) {
        List<ClassRoom> list = (teacherId != null)
                ? repository.findByTeacherIdOrTeacherIdIsNull(teacherId)
                : repository.findAll();
        for (ClassRoom c : list) {
            if (c.getClassCode() == null || c.getClassCode().trim().isEmpty()) {
                c.setClassCode(generateUniqueClassCode());
                repository.save(c);
            }
        }
        return list;
    }

    // Lấy chi tiết một lớp học theo ID
    public ClassRoom getClassById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có ID: " + id));
    }

    // Cập nhật thông tin lớp học
    public ClassRoom updateClass(Long id, ClassRoom updated, Long teacherId) {
        ClassRoom classRoom = getClassById(id);
        if (classRoom.getTeacherId() != null && teacherId != null && !classRoom.getTeacherId().equals(teacherId)) {
            throw new SecurityException("Bạn không phải giáo viên phụ trách lớp học này.");
        }
        if (classRoom.getTeacherId() == null && teacherId != null) {
            classRoom.setTeacherId(teacherId);
        }
        classRoom.setName(updated.getName());
        classRoom.setStartDate(updated.getStartDate());
        classRoom.setEndDate(updated.getEndDate());
        return repository.save(classRoom);
    }

    // Xóa lớp học và toàn bộ dữ liệu phụ thuộc
    @Transactional
    public void deleteClass(Long id, Long teacherId) {
        ClassRoom classRoom = getClassById(id);
        if (classRoom.getTeacherId() != null && teacherId != null && !classRoom.getTeacherId().equals(teacherId)) {
            throw new SecurityException("Bạn không có quyền xóa lớp học của giáo viên khác.");
        }
        
        // 1. Xóa bài nộp và bài tập liên quan
        List<Assignment> assignments = assignmentRepository.findByClassRoomId(id);
        for (Assignment assignment : assignments) {
            submissionRepository.deleteAll(submissionRepository.findByAssignmentId(assignment.getId()));
        }
        assignmentRepository.deleteAll(assignments);

        // 2. Xóa điểm danh và các buổi học
        List<Session> sessions = sessionRepository.findByClassRoomId(id);
        for (Session session : sessions) {
            attendanceRepository.deleteBySessionId(session.getId());
        }
        sessionRepository.deleteAll(sessions);

        // 3. Xóa kế hoạch giảng dạy
        teachingPlanRepository.deleteByClassRoomId(id);

        // 4. Xóa danh sách học sinh ghi danh
        enrollmentRepository.deleteByClassRoomId(id);

        // 5. Xóa lớp học
        repository.deleteById(id);
    }

    public List<com.edumanager.api.dto.TimetableSessionDTO> getTimetable(Long classId) {
        List<ClassRoom> classes = (classId != null)
                ? repository.findById(classId).map(List::of).orElse(java.util.Collections.emptyList())
                : repository.findAll();

        List<com.edumanager.api.dto.TimetableSessionDTO> result = new java.util.ArrayList<>();

        for (ClassRoom cls : classes) {
            List<Session> sessions = sessionRepository.findByClassRoomId(cls.getId());
            List<com.edumanager.api.entity.TeachingPlan> plans = teachingPlanRepository.findByClassRoomId(cls.getId());
            int studentCount = enrollmentRepository.findByClassRoomId(cls.getId()).size();

            for (Session session : sessions) {
                java.util.Optional<com.edumanager.api.entity.TeachingPlan> matchedPlan = plans.stream()
                        .filter(p -> p.getSession() != null && p.getSession().getId().equals(session.getId()))
                        .findFirst();

                String contentSummary = "";
                if (matchedPlan.isPresent() && matchedPlan.get().getSections() != null && !matchedPlan.get().getSections().isEmpty()) {
                    contentSummary = matchedPlan.get().getSections().stream()
                            .map(s -> s.getContent() != null ? s.getContent() : "")
                            .filter(txt -> !txt.isBlank())
                            .collect(java.util.stream.Collectors.joining(" | "));
                }
                if (contentSummary.isBlank()) {
                    contentSummary = session.getTopic() != null ? session.getTopic() : "Buổi học";
                }

                result.add(new com.edumanager.api.dto.TimetableSessionDTO(
                        session.getId(),
                        cls.getId(),
                        cls.getName(),
                        cls.getClassCode(),
                        session.getTopic(),
                        session.getStartTime(),
                        session.getEndTime(),
                        session.getDurationMinutes(),
                        contentSummary,
                        studentCount
                ));
            }
        }

        result.sort((a, b) -> {
            if (a.startTime() == null) return 1;
            if (b.startTime() == null) return -1;
            return a.startTime().compareTo(b.startTime());
        });

        return result;
    }
}