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
    private final com.edumanager.api.service.InquiryService inquiryService;

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

                // Tìm bài tập gắn với buổi học này (chỉ lấy bài đã đến thời gian phát hành)
                List<Assignment> rawSessionAssignments = assignments.stream()
                        .filter(a -> a.getSession() != null && a.getSession().getId().equals(session.getId()))
                        .filter(Assignment::isPublished)
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
                        homeworkScore,
                        session.getAnnouncement(),
                        session.getAnnouncementUpdatedAt()
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
            @RequestBody(required = false) Map<String, Object> body,
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

        // Kiểm tra học sinh có thực sự thuộc lớp học của buổi này không
        if (session.getClassRoom() != null && !enrollmentRepository.existsByClassRoomIdAndStudentId(session.getClassRoom().getId(), studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn chưa ghi danh vào lớp học của buổi học này nên không thể báo vắng."));
        }

        if (session.getStartTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Buổi học chưa có thời gian bắt đầu!"));
        }

        // Chuẩn hóa múi giờ Việt Nam (UTC+7) trên máy chủ Cloud
        java.time.LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
        long minutesUntilStart = java.time.Duration.between(now, session.getStartTime()).toMinutes();

        // 1. Tăng thời hạn báo trước lên ít nhất 4 tiếng (240 phút)
        if (minutesUntilStart < 240) {
            long hoursLeft = Math.max(0, minutesUntilStart / 60);
            long minsLeft = Math.max(0, minutesUntilStart % 60);
            return ResponseEntity.badRequest().body(
                Map.of("message", "Chỉ được phép báo vắng hoặc xin học online trước giờ học ít nhất 4 tiếng! (Còn " + hoursLeft + " giờ " + minsLeft + " phút nữa là vào học)")
            );
        }

        boolean isOnline = body != null && (
            Boolean.TRUE.equals(body.get("isOnline")) ||
            "true".equalsIgnoreCase(String.valueOf(body.get("isOnline")))
        );

        boolean commitmentsConfirmed = body != null && (
            Boolean.TRUE.equals(body.get("commitmentsConfirmed")) ||
            "true".equalsIgnoreCase(String.valueOf(body.get("commitmentsConfirmed")))
        );

        String rawReason = (body != null && body.containsKey("reason") && body.get("reason") != null)
                ? String.valueOf(body.get("reason")).trim()
                : "";

        String finalStatus;
        String finalNote;

        if (isOnline) {
            finalStatus = "ONLINE";
            finalNote = rawReason.isEmpty() ? "[Xin học Online]" : "[Xin học Online] " + rawReason;

            // Tự động gửi tin nhắn thông báo vào kênh Thắc mắc tới Giáo viên
            try {
                if (session.getClassRoom() != null) {
                    InquiryThread thread = inquiryService.getOrCreateStudentThread(session.getClassRoom().getId(), studentId);
                    String msgContent = "[Xin học Online] Em xin phép tham gia học online buổi \"" 
                            + (session.getTopic() != null ? session.getTopic() : "Buổi học") 
                            + "\" (" + session.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")) + ")"
                            + (rawReason.isEmpty() ? "." : " do: " + rawReason + ".")
                            + " Nhờ Thầy/Cô gửi link phòng học qua thông báo buổi học giúp em với ạ!";
                    inquiryService.sendMessage(thread.getId(), studentId, "STUDENT", new com.edumanager.api.dto.SendInquiryMessageRequest(msgContent, null));
                }
            } catch (Exception ignored) {
                // Tiếp tục xử lý nếu chat gặp sự cố
            }
        } else {
            // Kiểm tra 3 cam kết bù bài bắt buộc
            if (!commitmentsConfirmed) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Vui lòng tick xác nhận đầy đủ 3 cam kết bù bài trước khi gửi báo vắng!")
                );
            }

            // Kiểm tra hạn mức nghỉ phép 2 buổi / tháng
            java.time.LocalDateTime startOfMonth = session.getStartTime().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            java.time.LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);
            long absentCountThisMonth = attendanceRepository.countAbsencesInMonth(studentId, sessionId, startOfMonth, startOfNextMonth);

            if (absentCountThisMonth >= 2) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Bạn đã sử dụng hết hạn mức 2 buổi nghỉ có phép trong tháng " + session.getStartTime().getMonthValue() + "/" + session.getStartTime().getYear() + "! Vui lòng liên hệ trực tiếp với Thầy/Cô để xin phép.")
                );
            }

            finalStatus = "ABSENT";
            finalNote = rawReason.isEmpty() ? "Học sinh xin phép vắng" : rawReason;
        }

        Attendance attendance = attendanceService.markAttendance(sessionId, studentId, finalStatus, finalNote);

        return ResponseEntity.ok(Map.of(
                "message", isOnline ? "Đã gửi yêu cầu xin học Online thành công! Thầy/Cô sẽ gửi link phòng học qua thông báo buổi học." : "Báo vắng thành công!",
                "status", attendance.getStatus(),
                "note", attendance.getNote() != null ? attendance.getNote() : ""
        ));
    }

    @PostMapping("/{studentId}/cancel-absence/{sessionId}")
    public ResponseEntity<?> cancelAbsence(
            @PathVariable Long studentId,
            @PathVariable Long sessionId,
            HttpServletRequest servletRequest) {

        // Chống IDOR: Học sinh chỉ được hủy báo vắng cho chính mình
        Long callerId = (Long) servletRequest.getAttribute("userId");
        String callerRole = (String) servletRequest.getAttribute("userRole");
        if ("STUDENT".equalsIgnoreCase(callerRole) && callerId != null && !callerId.equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền hủy báo vắng thay cho tài khoản học sinh khác."));
        }

        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy buổi học!"));
        }

        if (session.getStartTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Buổi học chưa có thời gian bắt đầu!"));
        }

        java.time.LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
        java.time.LocalDateTime sessionEndTime = session.getEndTime() != null
                ? session.getEndTime()
                : session.getStartTime().plusMinutes(session.getDurationMinutes() != null ? session.getDurationMinutes() : 90);

        if (now.isAfter(sessionEndTime)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Buổi học này đã kết thúc, không thể hủy báo vắng!"));
        }

        // Xóa trạng thái điểm danh báo vắng để học sinh trở về trạng thái bình thường
        attendanceRepository.findBySessionIdAndStudentId(sessionId, studentId)
                .ifPresent(attendanceRepository::delete);

        return ResponseEntity.ok(Map.of(
                "message", "Đã hủy báo vắng thành công! Bạn có thể tham gia buổi học bình thường."
        ));
    }
}
