package com.edumanager.api.service;

import com.edumanager.api.entity.Assignment;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Enrollment;
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
    private final ClassTeacherRepository classTeacherRepository;
    private final UserRepository userRepository;
    private final ClassMaterialRepository classMaterialRepository;

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

    // Kiểm tra xem người dùng có quyền truy cập lớp học không (GV phụ trách hoặc học sinh đã ghi danh)
    public boolean canAccessClass(Long classId, Long userId, String userRole) {
        if (classId == null || userId == null) return false;
        ClassRoom classRoom = repository.findById(classId).orElse(null);
        if (classRoom == null) return false;

        if ("TEACHER".equalsIgnoreCase(userRole)) {
            return isTeacherOfClass(classRoom, userId);
        } else if ("STUDENT".equalsIgnoreCase(userRole)) {
            return enrollmentRepository.existsByClassRoomIdAndStudentId(classId, userId);
        }
        return false;
    }

    // Kiểm tra xem giáo viên có phụ trách lớp học không (Chủ nhiệm hoặc Đồng phụ trách)
    public boolean isTeacherOfClass(ClassRoom classRoom, Long teacherId) {
        if (teacherId == null || classRoom == null) return false;
        if (classRoom.getTeacherId() == null) {
            return true; // Cho phép truy cập lớp legacy chưa gán chủ nhiệm
        }
        if (classRoom.getTeacherId().equals(teacherId)) {
            return true;
        }
        return classTeacherRepository.existsByClassRoomIdAndTeacherId(classRoom.getId(), teacherId);
    }

    // Lưu lớp học mới vào DB
    @Transactional
    public ClassRoom createClass(ClassRoom classRoom, Long teacherId) {
        if (classRoom.getClassCode() == null || classRoom.getClassCode().trim().isEmpty()) {
            classRoom.setClassCode(generateUniqueClassCode());
        }
        if (teacherId != null) {
            classRoom.setTeacherId(teacherId);
        }
        ClassRoom saved = repository.save(classRoom);

        if (teacherId != null) {
            userRepository.findById(teacherId).ifPresent(user -> {
                if (!classTeacherRepository.existsByClassRoomIdAndTeacherId(saved.getId(), teacherId)) {
                    classTeacherRepository.save(com.edumanager.api.entity.ClassTeacher.builder()
                            .classRoom(saved)
                            .teacher(user)
                            .roleInClass("PRIMARY")
                            .joinedAt(java.time.LocalDateTime.now())
                            .build());
                }
            });
        }
        return saved;
    }

    // Lấy danh sách toàn bộ lớp học (hoặc lớp của giáo viên phụ trách)
    public List<ClassRoom> getAllClasses() {
        return getClassesByTeacher(null);
    }

    @Transactional
    public List<ClassRoom> getClassesByTeacher(Long teacherId) {
        List<ClassRoom> list = (teacherId != null)
                ? repository.findAllForTeacher(teacherId)
                : repository.findAll();
        for (ClassRoom c : list) {
            boolean modified = false;
            if (c.getClassCode() == null || c.getClassCode().trim().isEmpty()) {
                c.setClassCode(generateUniqueClassCode());
                modified = true;
            }
            if (c.getTeacherId() == null && teacherId != null) {
                c.setTeacherId(teacherId);
                modified = true;
                if (!classTeacherRepository.existsByClassRoomIdAndTeacherId(c.getId(), teacherId)) {
                    userRepository.findById(teacherId).ifPresent(user -> {
                        classTeacherRepository.save(com.edumanager.api.entity.ClassTeacher.builder()
                                .classRoom(c)
                                .teacher(user)
                                .roleInClass("PRIMARY")
                                .joinedAt(java.time.LocalDateTime.now())
                                .build());
                    });
                }
            }
            if (modified) {
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
        if (teacherId != null && !isTeacherOfClass(classRoom, teacherId)) {
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

    // Xóa lớp học và toàn bộ dữ liệu phụ thuộc (Chỉ giáo viên chủ nhiệm mới có quyền)
    @Transactional
    public void deleteClass(Long id, Long teacherId) {
        ClassRoom classRoom = getClassById(id);
        if (classRoom.getTeacherId() != null && teacherId != null && !classRoom.getTeacherId().equals(teacherId)) {
            throw new SecurityException("Chỉ giáo viên chủ nhiệm / người tạo lớp mới có quyền xóa lớp học này.");
        }
        
        // 0. Xóa danh sách giáo viên phụ trách
        classTeacherRepository.deleteByClassRoomId(id);

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

        // 3.5. Xóa danh sách sách / tài liệu lớp học
        classMaterialRepository.deleteByClassRoomId(id);

        // 4. Xóa danh sách học sinh ghi danh
        enrollmentRepository.deleteByClassRoomId(id);

        // 5. Xóa lớp học
        repository.deleteById(id);
    }

    // Lấy danh sách giáo viên phụ trách lớp học
    public List<com.edumanager.api.dto.ClassTeacherDTO> getTeachersOfClass(Long classId, Long callerId) {
        ClassRoom classRoom = getClassById(classId);
        List<com.edumanager.api.entity.ClassTeacher> list = classTeacherRepository.findByClassRoomId(classId);
        
        List<com.edumanager.api.dto.ClassTeacherDTO> result = new java.util.ArrayList<>();
        boolean primaryFound = false;

        for (com.edumanager.api.entity.ClassTeacher ct : list) {
            if ("PRIMARY".equalsIgnoreCase(ct.getRoleInClass())) {
                primaryFound = true;
            }
            result.add(new com.edumanager.api.dto.ClassTeacherDTO(
                    ct.getId(),
                    ct.getTeacher().getId(),
                    ct.getTeacher().getFullName(),
                    ct.getTeacher().getEmail(),
                    ct.getTeacher().getAvatarUrl(),
                    ct.getRoleInClass(),
                    ct.getJoinedAt()
            ));
        }

        // Tự động bổ sung primary teacher nếu lớp cũ chưa có trong class_teachers
        if (!primaryFound && classRoom.getTeacherId() != null) {
            userRepository.findById(classRoom.getTeacherId()).ifPresent(u -> {
                result.add(0, new com.edumanager.api.dto.ClassTeacherDTO(
                        null,
                        u.getId(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getAvatarUrl(),
                        "PRIMARY",
                        null
                ));
            });
        }

        return result;
    }

    // Mời giáo viên đồng phụ trách bằng Email
    @Transactional
    public com.edumanager.api.dto.ClassTeacherDTO addCoTeacherByEmail(Long classId, String email, Long callerId) {
        ClassRoom classRoom = getClassById(classId);
        if (callerId != null && !isTeacherOfClass(classRoom, callerId)) {
            throw new SecurityException("Bạn không có quyền mời giáo viên vào lớp học này.");
        }

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email giáo viên không được để trống.");
        }

        String cleanEmail = email.trim().toLowerCase();
        com.edumanager.api.entity.User teacher = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản người dùng với email: " + cleanEmail));

        if (!"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new IllegalArgumentException("Tài khoản '" + cleanEmail + "' không có vai trò Giáo viên (TEACHER).");
        }

        // Kiểm tra xem đã là chủ nhiệm chưa
        if (classRoom.getTeacherId() != null && classRoom.getTeacherId().equals(teacher.getId())) {
            throw new IllegalArgumentException("Giáo viên này đã là giáo viên chủ nhiệm của lớp.");
        }

        // Kiểm tra xem đã là đồng phụ trách chưa
        if (classTeacherRepository.existsByClassRoomIdAndTeacherId(classId, teacher.getId())) {
            throw new IllegalArgumentException("Giáo viên này đã đồng phụ trách lớp học rồi.");
        }

        com.edumanager.api.entity.ClassTeacher classTeacher = com.edumanager.api.entity.ClassTeacher.builder()
                .classRoom(classRoom)
                .teacher(teacher)
                .roleInClass("CO_TEACHER")
                .joinedAt(java.time.LocalDateTime.now())
                .build();

        com.edumanager.api.entity.ClassTeacher saved = classTeacherRepository.save(classTeacher);

        return new com.edumanager.api.dto.ClassTeacherDTO(
                saved.getId(),
                teacher.getId(),
                teacher.getFullName(),
                teacher.getEmail(),
                teacher.getAvatarUrl(),
                saved.getRoleInClass(),
                saved.getJoinedAt()
        );
    }

    // Xóa giáo viên đồng phụ trách hoặc GV tự rời lớp
    @Transactional
    public void removeTeacher(Long classId, Long targetTeacherId, Long callerId) {
        ClassRoom classRoom = getClassById(classId);
        if (targetTeacherId == null || callerId == null) {
            throw new IllegalArgumentException("Dữ liệu không hợp lệ.");
        }

        // Không thể xóa chủ nhiệm lớp
        if (classRoom.getTeacherId() != null && classRoom.getTeacherId().equals(targetTeacherId)) {
            throw new SecurityException("Không thể xóa giáo viên chủ nhiệm khỏi lớp học.");
        }

        boolean isCallerPrimary = classRoom.getTeacherId() != null && classRoom.getTeacherId().equals(callerId);
        boolean isCallerTarget = callerId.equals(targetTeacherId);

        // Chỉ giáo viên chủ nhiệm được xóa GV khác, hoặc chính GV đó tự rời lớp
        if (!isCallerPrimary && !isCallerTarget) {
            throw new SecurityException("Bạn không có quyền xóa giáo viên này khỏi lớp học.");
        }

        classTeacherRepository.deleteByClassRoomIdAndTeacherId(classId, targetTeacherId);
    }

    public List<com.edumanager.api.dto.TimetableSessionDTO> getTimetable(Long classId, Long callerId, String callerRole) {
        List<ClassRoom> classes;
        if (classId != null) {
            ClassRoom targetClass = repository.findById(classId).orElse(null);
            if (targetClass == null) {
                return java.util.Collections.emptyList();
            }
            if ("TEACHER".equalsIgnoreCase(callerRole)) {
                if (callerId != null && !isTeacherOfClass(targetClass, callerId)) {
                    return java.util.Collections.emptyList();
                }
            } else if ("STUDENT".equalsIgnoreCase(callerRole)) {
                if (callerId != null && !enrollmentRepository.existsByClassRoomIdAndStudentId(classId, callerId)) {
                    return java.util.Collections.emptyList();
                }
            }
            classes = List.of(targetClass);
        } else if ("TEACHER".equalsIgnoreCase(callerRole) && callerId != null) {
            classes = getClassesByTeacher(callerId);
        } else if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null) {
            classes = enrollmentRepository.findByStudentId(callerId).stream()
                    .map(Enrollment::getClassRoom)
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .toList();
        } else {
            classes = java.util.Collections.emptyList();
        }

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