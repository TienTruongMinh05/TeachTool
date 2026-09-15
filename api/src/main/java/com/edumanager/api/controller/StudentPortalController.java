package com.edumanager.api.controller;

import com.edumanager.api.dto.AssignmentResponseDTO;
import com.edumanager.api.dto.StudentScheduleDTO;
import com.edumanager.api.dto.TeachingPlanSectionDTO;
import com.edumanager.api.entity.*;
import com.edumanager.api.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentPortalController {

    private final EnrollmentRepository enrollmentRepository;
    private final SessionRepository sessionRepository;
    private final TeachingPlanRepository teachingPlanRepository;
    private final AssignmentRepository assignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final SubmissionRepository submissionRepository;
    private final com.edumanager.api.service.AttendanceService attendanceService;

    @GetMapping("/{studentId}/schedule")
    public ResponseEntity<?> getStudentSchedule(
            @PathVariable Long studentId,
            HttpServletRequest servletRequest) {
        
        // Chống IDOR: Học sinh chỉ xem được thời khóa biểu của chính mình
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền truy cập thời khóa biểu của tài khoản học sinh khác."));
        }

        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        if (enrollments.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Submission> allStudentSubmissions = submissionRepository.findByStudentId(studentId);
        List<StudentScheduleDTO> result = new ArrayList<>();

        for (Enrollment enrollment : enrollments) {
            ClassRoom classRoom = enrollment.getClassRoom();
            List<Session> sessions = sessionRepository.findByClassRoomId(classRoom.getId());
            List<TeachingPlan> plans = teachingPlanRepository.findByClassRoomId(classRoom.getId());
            List<Assignment> assignments = assignmentRepository.findByClassRoomId(classRoom.getId());

            for (Session session : sessions) {
                // Tìm kế hoạch giảng dạy gắn với buổi học này
                Optional<TeachingPlan> matchedPlan = plans.stream()
                        .filter(p -> (p.getSession() != null && p.getSession().getId().equals(session.getId())))
                        .findFirst();

                List<TeachingPlanSectionDTO> sections = matchedPlan
                        .map(p -> (p.getSections() != null)
                                ? p.getSections().stream().map(TeachingPlanSectionDTO::fromEntity).toList()
                                : Collections.<TeachingPlanSectionDTO>emptyList())
                        .orElse(Collections.emptyList());

                String planTitle = matchedPlan.map(TeachingPlan::getTitle).orElse(null);

                // Tìm bài tập gắn với buổi học này
                List<Assignment> rawSessionAssignments = assignments.stream()
                        .filter(a -> a.getSession() != null && a.getSession().getId().equals(session.getId()))
                        .toList();

                List<AssignmentResponseDTO> sessionAssignments = rawSessionAssignments.stream()
                        .map(AssignmentResponseDTO::fromEntity)
                        .toList();

                // Tính toán trạng thái bài tập của buổi học
                String homeworkStatus = "NONE";
                String homeworkScore = null;

                if (!rawSessionAssignments.isEmpty()) {
                    List<Submission> matchedSubmissions = allStudentSubmissions.stream()
                            .filter(sub -> rawSessionAssignments.stream().anyMatch(a -> a.getId().equals(sub.getAssignment().getId())))
                            .toList();

                    if (matchedSubmissions.isEmpty()) {
                        homeworkStatus = "NOT_SUBMITTED";
                    } else {
                        Optional<Submission> gradedSub = matchedSubmissions.stream()
                                .filter(s -> (s.getScore() != null && !s.getScore().trim().isEmpty())
                                          || (s.getFeedback() != null && !s.getFeedback().trim().isEmpty()))
                                .findFirst();
                        if (gradedSub.isPresent()) {
                            homeworkStatus = "GRADED";
                            homeworkScore = gradedSub.get().getScore();
                        } else {
                            homeworkStatus = "SUBMITTED";
                        }
                    }
                }

                // Lấy thông tin điểm danh của học sinh cho buổi học này
                Optional<Attendance> attendanceOpt = attendanceRepository.findBySessionIdAndStudentId(session.getId(), studentId);
                String attStatus = attendanceOpt.map(Attendance::getStatus).orElse(null);
                String attNote = attendanceOpt.map(Attendance::getNote).orElse(null);

                result.add(new StudentScheduleDTO(
                        session.getId(),
                        classRoom.getId(),
                        classRoom.getName(),
                        classRoom.getClassCode(),
                        session.getTopic(),
                        session.getStartTime(),
                        session.getEndTime(),
                        session.getDurationMinutes(),
                        planTitle,
                        sections,
                        sessionAssignments,
                        attStatus,
                        attNote,
                        homeworkStatus,
                        homeworkScore
                ));
            }
        }

        // Sắp xếp theo ngày giờ học
        result.sort((a, b) -> {
            if (a.startTime() == null) return 1;
            if (b.startTime() == null) return -1;
            return a.startTime().compareTo(b.startTime());
        });

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{studentId}/report-absence/{sessionId}")
    public ResponseEntity<?> reportAbsence(
            @PathVariable Long studentId,
            @PathVariable Long sessionId,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest servletRequest) {
        
        // Chống IDOR: Học sinh chỉ được báo vắng cho chính mình
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền báo vắng thay cho tài khoản học sinh khác."));
        }

        Session session = sessionRepository.findById(sessionId)
                .orElse(null);
        if (session == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy buổi học!"));
        }

        if (session.getStartTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Buổi học chưa có thời gian bắt đầu!"));
        }

        // Chuẩn hóa múi giờ Việt Nam (UTC+7) trên máy chủ Cloud
        java.time.LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
        long minutesUntilStart = java.time.Duration.between(now, session.getStartTime()).toMinutes();

        if (minutesUntilStart < 120) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Chỉ được phép báo vắng trước giờ học ít nhất 2 tiếng! (Còn " + Math.max(0, minutesUntilStart) + " phút nữa là vào học)")
            );
        }

        String reason = (body != null && body.containsKey("reason") && !body.get("reason").trim().isEmpty())
                ? body.get("reason").trim()
                : "Học sinh xin phép vắng";

        Attendance attendance = attendanceService.markAttendance(sessionId, studentId, "ABSENT", reason);

        return ResponseEntity.ok(Map.of(
                "message", "Báo vắng thành công!",
                "status", attendance.getStatus(),
                "note", attendance.getNote()
        ));
    }
}
