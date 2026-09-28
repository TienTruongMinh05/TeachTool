package com.edumanager.api.service;

import com.edumanager.api.dto.WeeklyReportPreviewDTO;
import com.edumanager.api.dto.WeeklyReportRequestDTO;
import com.edumanager.api.entity.*;
import com.edumanager.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyReportService {

    private final ClassRoomRepository classRoomRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRepository attendanceRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ClassAnnouncementRepository classAnnouncementRepository;
    private final ClassRoomService classRoomService;

    public WeeklyReportPreviewDTO getPreview(Long classId, Integer weekNumber, Long teacherId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học"));

        if (!classRoomService.isTeacherOfClass(classRoom, teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền xem thông tin báo cáo tuần.");
        }

        User teacher = userRepository.findById(teacherId).orElse(null);
        String teacherName = teacher != null ? teacher.getFullName() : (classRoom.getTeacherId() != null ? "Giáo viên phụ trách" : "");
        String className = classRoom.getName() != null ? classRoom.getName() : "Lớp học";
        int week = (weekNumber != null && weekNumber > 0) ? weekNumber : 1;

        List<Enrollment> enrollments = enrollmentRepository.findByClassRoomId(classId);
        int totalStudents = enrollments != null ? enrollments.size() : 0;

        List<Session> allSessions = new ArrayList<>(sessionRepository.findByClassRoomId(classId));
        allSessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalDateTime.MIN));

        int sessionsPerWeek = 2;
        int startIndex = Math.max(0, (week - 1) * sessionsPerWeek);
        int endIndex = Math.min(allSessions.size(), startIndex + sessionsPerWeek);
        List<Session> weekSessions = (startIndex < allSessions.size()) ? allSessions.subList(startIndex, endIndex) : Collections.emptyList();

        int nextStartIndex = endIndex;
        int nextEndIndex = Math.min(allSessions.size(), nextStartIndex + sessionsPerWeek);
        List<Session> nextWeekSessions = (nextStartIndex < allSessions.size()) ? allSessions.subList(nextStartIndex, nextEndIndex) : Collections.emptyList();

        String dateRange = calculateDateRange(weekSessions, week);

        boolean attDone = calculateAttendanceDone(weekSessions);
        boolean annDone = calculateAnnouncementsDone(classId);
        boolean hwAssigned = calculateHomeworkAssigned(classId);
        boolean hwGraded = calculateHomeworkGraded(classId);

        List<String> pastSessions = weekSessions.stream().map(this::formatSession).toList();
        List<String> nextSessions = nextWeekSessions.stream().map(this::formatSession).toList();
        List<AtRiskStudentInfo> atRisk = findAtRiskStudents(classId, enrollments);

        return WeeklyReportPreviewDTO.builder()
                .week(week)
                .dateRange(dateRange)
                .teacherName(teacherName)
                .className(className)
                .attendanceDone(attDone)
                .announcementsDone(annDone)
                .homeworkAssigned(hwAssigned)
                .homeworkGraded(hwGraded)
                .pastSessions(pastSessions)
                .nextSessions(nextSessions)
                .totalStudents(totalStudents)
                .atRiskCount(atRisk.size())
                .build();
    }

    public byte[] generateWeeklyReportDocx(Long classId, Integer weekNumber, Long teacherId) {
        WeeklyReportRequestDTO defaultDto = new WeeklyReportRequestDTO();
        defaultDto.setWeek(weekNumber);
        return generateWeeklyReportDocx(classId, defaultDto, teacherId);
    }

    public byte[] generateWeeklyReportDocx(Long classId, WeeklyReportRequestDTO requestDTO, Long teacherId) {
        if (requestDTO == null) {
            requestDTO = new WeeklyReportRequestDTO();
        }
        int week = (requestDTO.getWeek() != null && requestDTO.getWeek() > 0) ? requestDTO.getWeek() : 1;

        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học"));

        if (!classRoomService.isTeacherOfClass(classRoom, teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền xuất báo cáo tuần.");
        }

        User teacher = userRepository.findById(teacherId).orElse(null);
        String teacherName = teacher != null ? teacher.getFullName() : (classRoom.getTeacherId() != null ? "Giáo viên phụ trách" : "");
        String className = classRoom.getName() != null ? classRoom.getName() : "Lớp học";

        List<Enrollment> enrollments = enrollmentRepository.findByClassRoomId(classId);
        int totalStudents = enrollments != null ? enrollments.size() : 0;

        List<Session> allSessions = new ArrayList<>(sessionRepository.findByClassRoomId(classId));
        allSessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalDateTime.MIN));

        int sessionsPerWeek = 2;
        int startIndex = Math.max(0, (week - 1) * sessionsPerWeek);
        int endIndex = Math.min(allSessions.size(), startIndex + sessionsPerWeek);
        List<Session> weekSessions = (startIndex < allSessions.size()) ? allSessions.subList(startIndex, endIndex) : Collections.emptyList();

        int nextStartIndex = endIndex;
        int nextEndIndex = Math.min(allSessions.size(), nextStartIndex + sessionsPerWeek);
        List<Session> nextWeekSessions = (nextStartIndex < allSessions.size()) ? allSessions.subList(nextStartIndex, nextEndIndex) : Collections.emptyList();

        String dateRange = calculateDateRange(weekSessions, week);

        // Máy tự động tính hoặc dùng giá trị ghi đè từ form giáo viên
        boolean attDone = requestDTO.getAttendanceDone() != null ? requestDTO.getAttendanceDone() : calculateAttendanceDone(weekSessions);
        boolean annDone = requestDTO.getAnnouncementsDone() != null ? requestDTO.getAnnouncementsDone() : calculateAnnouncementsDone(classId);
        boolean hwAssigned = requestDTO.getHomeworkAssigned() != null ? requestDTO.getHomeworkAssigned() : calculateHomeworkAssigned(classId);
        boolean hwGraded = requestDTO.getHomeworkGraded() != null ? requestDTO.getHomeworkGraded() : calculateHomeworkGraded(classId);

        InputStream templateStream = null;
        try {
            Path localTemplate = Paths.get("Bao_Cao_Tuan_Foundation_1.docx");
            if (Files.exists(localTemplate)) {
                templateStream = Files.newInputStream(localTemplate);
            } else {
                ClassPathResource resource = new ClassPathResource("templates/weekly_report_template.docx");
                templateStream = resource.getInputStream();
            }

            try (XWPFDocument document = new XWPFDocument(templateStream);
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {

                String currentSection = "NONE";

                for (XWPFParagraph paragraph : document.getParagraphs()) {
                    String text = paragraph.getText();
                    if (text == null) continue;

                    // Nhận diện phân mục
                    if (text.contains("Bài đã dạy")) {
                        currentSection = "PAST_SESSIONS";
                        continue;
                    } else if (text.contains("Kế hoạch tuần tới")) {
                        currentSection = "NEXT_SESSIONS";
                        continue;
                    } else if (text.contains("III. TÌNH HÌNH HỌC SINH")) {
                        currentSection = "STUDENTS";
                        continue;
                    } else if (text.contains("IV. CÔNG TÁC GIẢNG DẠY")) {
                        currentSection = "TEACHING_TASKS";
                        continue;
                    } else if (text.contains("V. KHÓ KHĂN / HỖ TRỢ")) {
                        currentSection = "CHALLENGES";
                        continue;
                    } else if (text.contains("VI. TỰ ĐÁNH GIÁ")) {
                        currentSection = "SELF_EVAL";
                        continue;
                    }

                    // I. THÔNG TIN CHUNG
                    if (text.contains("Giáo viên:") && text.contains("Tuần:") && text.contains("Lớp:")) {
                        setParagraphText(paragraph, String.format("Giáo viên: %s    Tuần: %s    Lớp: %s", teacherName, dateRange, className));
                    }
                    // II. TIẾN ĐỘ GIẢNG DẠY - Checkbox Hoàn thành
                    else if (text.contains("Hoàn thành đúng tiến độ") && text.contains("Nhanh hơn kế hoạch")) {
                        boolean onTime = "ON_TIME".equalsIgnoreCase(requestDTO.getProgressStatus()) || requestDTO.getProgressStatus() == null;
                        boolean faster = "FASTER".equalsIgnoreCase(requestDTO.getProgressStatus());
                        boolean slower = "SLOWER".equalsIgnoreCase(requestDTO.getProgressStatus());
                        String checkOnTime = onTime ? "☑" : "☐";
                        String checkFaster = faster ? "☑" : "☐";
                        String checkSlower = slower ? "☑" : "☐";
                        setParagraphText(paragraph, String.format("%s Hoàn thành đúng tiến độ    %s Nhanh hơn kế hoạch    %s Chậm hơn kế hoạch",
                                checkOnTime, checkFaster, checkSlower));
                    }
                    // Nếu chậm, lý do
                    else if (text.startsWith("Nếu chậm, lý do:")) {
                        if ("SLOWER".equalsIgnoreCase(requestDTO.getProgressStatus()) && requestDTO.getDelayReason() != null && !requestDTO.getDelayReason().isBlank()) {
                            setParagraphText(paragraph, "Nếu chậm, lý do: " + requestDTO.getDelayReason().trim());
                        } else {
                            setParagraphText(paragraph, "Nếu chậm, lý do: Không có (Đảm bảo đúng tiến độ)");
                        }
                    }
                    // Bài đã dạy (Buổi 1, Buổi 2)
                    else if ("PAST_SESSIONS".equals(currentSection) && text.startsWith("Buổi 1:")) {
                        String s1 = !weekSessions.isEmpty() ? formatSession(weekSessions.get(0)) : "Chưa có buổi học nào trong tuần";
                        setParagraphText(paragraph, "Buổi 1: " + s1);
                    }
                    else if ("PAST_SESSIONS".equals(currentSection) && text.startsWith("Buổi 2:")) {
                        String s2 = weekSessions.size() > 1 ? formatSession(weekSessions.get(1)) : (weekSessions.size() > 2 ? formatSession(weekSessions.get(1)) + " | " + formatSession(weekSessions.get(2)) : "Không có");
                        setParagraphText(paragraph, "Buổi 2: " + s2);
                    }
                    // Kế hoạch tuần tới (Buổi 1, Buổi 2)
                    else if ("NEXT_SESSIONS".equals(currentSection) && text.startsWith("Buổi 1:")) {
                        String s1 = !nextWeekSessions.isEmpty() ? formatSession(nextWeekSessions.get(0)) : "Theo tiến độ phân phối chương trình";
                        setParagraphText(paragraph, "Buổi 1: " + s1);
                    }
                    else if ("NEXT_SESSIONS".equals(currentSection) && text.startsWith("Buổi 2:")) {
                        String s2 = nextWeekSessions.size() > 1 ? formatSession(nextWeekSessions.get(1)) : "Theo tiến độ phân phối chương trình";
                        setParagraphText(paragraph, "Buổi 2: " + s2);
                    }
                    // III. Tình hình học sinh (Buổi 1, Buổi 2, Buổi 3)
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 1")) {
                        if (!weekSessions.isEmpty()) {
                            Session s = weekSessions.get(0);
                            AttendanceStats stats = getAttendanceStats(s.getId(), totalStudents);
                            setParagraphText(paragraph, String.format("Buổi 1 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                    s.getTopic() != null ? s.getTopic() : "Buổi 1", stats.total(), stats.present(), stats.absent()));
                        } else {
                            setParagraphText(paragraph, String.format("Buổi 1: Tổng số HS: %d | Có mặt: %d | Vắng: 0", totalStudents, totalStudents));
                        }
                    }
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 2")) {
                        if (weekSessions.size() > 1) {
                            Session s = weekSessions.get(1);
                            AttendanceStats stats = getAttendanceStats(s.getId(), totalStudents);
                            setParagraphText(paragraph, String.format("Buổi 2 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                    s.getTopic() != null ? s.getTopic() : "Buổi 2", stats.total(), stats.present(), stats.absent()));
                        } else {
                            setParagraphText(paragraph, "Buổi 2: (Lớp học 1 buổi/tuần)");
                        }
                    }
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 3")) {
                        if (weekSessions.size() > 2) {
                            Session s = weekSessions.get(2);
                            AttendanceStats stats = getAttendanceStats(s.getId(), totalStudents);
                            setParagraphText(paragraph, String.format("Buổi 3 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                    s.getTopic() != null ? s.getTopic() : "Buổi 3", stats.total(), stats.present(), stats.absent()));
                        } else {
                            setParagraphText(paragraph, "Buổi 3: -");
                        }
                    }
                    // IV. CÔNG TÁC GIẢNG DẠY
                    else if (text.contains("Điểm danh đầy đủ") && text.contains("Gửi thông báo nhóm đầy đủ")) {
                        setParagraphText(paragraph, String.format("%s Điểm danh đầy đủ        %s Gửi thông báo nhóm đầy đủ",
                                attDone ? "☑" : "☐", annDone ? "☑" : "☐"));
                    }
                    else if (text.contains("Giao BTVN đầy đủ") && text.contains("Chữa BTVN")) {
                        setParagraphText(paragraph, String.format("%s Giao BTVN đầy đủ        %s Chữa BTVN",
                                hwAssigned ? "☑" : "☐", hwGraded ? "☑" : "☐"));
                    }
                    // V. KHÓ KHĂN / HỖ TRỢ CẦN THIẾT
                    else if (text.contains("Kèm theo đề xuất nếu có")) {
                        if (requestDTO.getChallenges() != null && !requestDTO.getChallenges().isBlank()) {
                            setParagraphText(paragraph, requestDTO.getChallenges().trim());
                        } else {
                            setParagraphText(paragraph, "Không có khó khăn hay đề xuất phát sinh trong tuần này.");
                        }
                    }
                    // VI. TỰ ĐÁNH GIÁ
                    else if (text.contains("Đánh giá tuần này:")) {
                        int rating = requestDTO.getSelfRating() != null ? requestDTO.getSelfRating() : 5;
                        String ratingLabel = switch (rating) {
                            case 1 -> "1 / 5 (Chưa tốt)";
                            case 2 -> "2 / 5 (Cần cố gắng)";
                            case 3 -> "3 / 5 (Đạt yêu cầu)";
                            case 4 -> "4 / 5 (Tốt)";
                            default -> "5 / 5 (Rất tốt)";
                        };
                        setParagraphText(paragraph, String.format("Đánh giá tuần này: ☑ %s", ratingLabel));
                    }
                    // Ngày nộp & Chữ ký
                    else if (text.contains("Ngày nộp:")) {
                        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd / MM / yyyy"));
                        setParagraphText(paragraph, "Ngày nộp: " + todayStr);
                    }
                    else if (text.startsWith("Giáo viên:") && !text.contains("Tuần:")) {
                        setParagraphText(paragraph, "Giáo viên: " + teacherName);
                    }
                }

                // Table 1: Học sinh cần theo dõi
                if (!document.getTables().isEmpty()) {
                    XWPFTable table = document.getTables().get(0);
                    while (table.getRows().size() > 1) {
                        table.removeRow(1);
                    }

                    List<AtRiskStudentInfo> atRiskStudents = findAtRiskStudents(classId, enrollments);
                    if (atRiskStudents.isEmpty()) {
                        XWPFTableRow row = table.createRow();
                        row.getCell(0).setText("Cả lớp");
                        row.getCell(1).setText("Đi học và hoàn thành bài đầy đủ, không có vấn đề phát sinh.");
                        row.getCell(2).setText("Tiếp tục phát huy");
                    } else {
                        for (AtRiskStudentInfo st : atRiskStudents) {
                            XWPFTableRow row = table.createRow();
                            row.getCell(0).setText(st.name != null ? st.name : "Học sinh");
                            row.getCell(1).setText(st.issue != null ? st.issue : "Cần theo dõi thêm");
                            row.getCell(2).setText(st.recommendation != null ? st.recommendation : "Giáo viên nhắc nhở và hỗ trợ");
                        }
                    }
                }

                document.write(out);
                return out.toByteArray();
            }
        } catch (Exception e) {
            log.error("Lỗi khi xuất báo cáo tuần Word (.docx): ", e);
            throw new RuntimeException("Không thể tạo báo cáo tuần: " + e.getMessage(), e);
        } finally {
            if (templateStream != null) {
                try { templateStream.close(); } catch (Exception ignored) {}
            }
        }
    }

    private void setParagraphText(XWPFParagraph p, String newText) {
        int runCount = p.getRuns().size();
        for (int i = runCount - 1; i > 0; i--) {
            p.removeRun(i);
        }
        if (!p.getRuns().isEmpty()) {
            p.getRuns().get(0).setText(newText, 0);
        } else {
            XWPFRun run = p.createRun();
            run.setText(newText);
        }
    }

    private String calculateDateRange(List<Session> weekSessions, int week) {
        if (weekSessions != null && !weekSessions.isEmpty()) {
            LocalDateTime start = weekSessions.get(0).getStartTime();
            LocalDateTime end = weekSessions.get(weekSessions.size() - 1).getStartTime();
            if (start != null && end != null) {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                return start.format(fmt) + " – " + end.format(fmt);
            }
        }
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = monday.plusDays(6);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return monday.format(fmt) + " – " + sunday.format(fmt);
    }

    private String formatSession(Session s) {
        if (s == null) return "Chưa có lịch";
        String dateStr = s.getStartTime() != null ? s.getStartTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "";
        String topic = s.getTopic() != null ? s.getTopic() : "Buổi học";
        return dateStr + " - " + topic;
    }

    private boolean calculateAttendanceDone(List<Session> weekSessions) {
        if (weekSessions == null || weekSessions.isEmpty()) return true;
        LocalDateTime now = LocalDateTime.now();
        for (Session s : weekSessions) {
            if (s.getStartTime() != null && s.getStartTime().isBefore(now)) {
                List<Attendance> atts = attendanceRepository.findBySessionId(s.getId());
                if (atts == null || atts.isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    private boolean calculateAnnouncementsDone(Long classId) {
        List<ClassAnnouncement> list = classAnnouncementRepository.findByClassRoomId(classId);
        return list != null && !list.isEmpty();
    }

    private boolean calculateHomeworkAssigned(Long classId) {
        List<Assignment> list = assignmentRepository.findByClassRoomId(classId);
        return list != null && !list.isEmpty();
    }

    private boolean calculateHomeworkGraded(Long classId) {
        List<Submission> submissions = submissionRepository.findByClassRoomId(classId);
        if (submissions == null || submissions.isEmpty()) return true;
        long graded = submissions.stream()
                .filter(s -> s.getScore() != null || s.getGradedAt() != null || s.getFeedback() != null)
                .count();
        return ((double) graded / submissions.size()) >= 0.70;
    }

    private AttendanceStats getAttendanceStats(Long sessionId, int totalStudents) {
        if (sessionId == null) return new AttendanceStats(totalStudents, totalStudents, 0);
        List<Attendance> attendances = attendanceRepository.findBySessionId(sessionId);
        if (attendances == null || attendances.isEmpty()) {
            return new AttendanceStats(totalStudents, totalStudents, 0);
        }
        int absentCount = 0;
        int presentCount = 0;
        for (Attendance a : attendances) {
            if ("ABSENT".equalsIgnoreCase(a.getStatus())) {
                absentCount++;
            } else {
                presentCount++;
            }
        }
        int total = Math.max(totalStudents, presentCount + absentCount);
        return new AttendanceStats(total, total - absentCount, absentCount);
    }

    private List<AtRiskStudentInfo> findAtRiskStudents(Long classId, List<Enrollment> enrollments) {
        List<AtRiskStudentInfo> result = new ArrayList<>();
        if (enrollments == null || classId == null) return result;

        List<Attendance> classAtts = attendanceRepository.findBySessionClassRoomId(classId);
        Map<Long, Long> absentCounts = (classAtts != null ? classAtts : Collections.<Attendance>emptyList()).stream()
                .filter(a -> a.getStudent() != null && "ABSENT".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.groupingBy(a -> a.getStudent().getId(), Collectors.counting()));

        List<Submission> submissions = submissionRepository.findByClassRoomId(classId);
        Map<Long, List<Submission>> studentSubmissions = submissions.stream()
                .filter(s -> s.getStudent() != null)
                .collect(Collectors.groupingBy(s -> s.getStudent().getId()));

        for (Enrollment e : enrollments) {
            User student = e.getStudent();
            if (student == null) continue;

            long absentCount = absentCounts.getOrDefault(student.getId(), 0L);
            List<Submission> subs = studentSubmissions.getOrDefault(student.getId(), Collections.emptyList());
            
            double avgScore = subs.stream()
                    .filter(s -> s.getScore() != null)
                    .mapToDouble(s -> {
                        try {
                            return Double.parseDouble(s.getScore());
                        } catch (Exception ex) {
                            return 10.0;
                        }
                    })
                    .average().orElse(10.0);

            if (absentCount >= 2) {
                result.add(new AtRiskStudentInfo(student.getFullName(), 
                        "Vắng " + absentCount + " buổi học, cần bổ túc bài", 
                        "Gửi bài giảng và dặn dò kèm cặp"));
            } else if (absentCount == 1 && avgScore < 6.0) {
                result.add(new AtRiskStudentInfo(student.getFullName(), 
                        "Vắng 1 buổi, điểm TB thấp (" + String.format("%.1f", avgScore) + ")", 
                        "Cần phụ đạo thêm kiến thức"));
            } else if (avgScore < 5.0 && !subs.isEmpty()) {
                result.add(new AtRiskStudentInfo(student.getFullName(), 
                        "Điểm bài tập thấp (" + String.format("%.1f", avgScore) + ")", 
                        "Giao bài tập bổ trợ để củng cố"));
            }
        }
        return result;
    }

    private record AttendanceStats(int total, int present, int absent) {}
    private record AtRiskStudentInfo(String name, String issue, String recommendation) {}
}
