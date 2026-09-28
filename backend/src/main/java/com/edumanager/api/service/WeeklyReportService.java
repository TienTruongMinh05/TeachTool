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
        Set<Long> currentStudentIds = (enrollments != null) ? enrollments.stream()
                .map(e -> e.getStudent() != null ? e.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()) : Collections.emptySet();
        int totalStudents = currentStudentIds.size();

        List<Session> allSessions = new ArrayList<>(sessionRepository.findByClassRoomId(classId));
        allSessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalDateTime.MIN));

        WeekWindow window = calculateWeekWindow(classRoom, allSessions, week);

        Set<Long> weekSessionIds = window.weekSessions().stream()
                .map(Session::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        boolean attDone = calculateAttendanceDone(window.weekSessions(), currentStudentIds);
        boolean annDone = calculateAnnouncementsDone(classId, window.startDateTime(), window.endDateTime());
        boolean hwAssigned = calculateHomeworkAssigned(classId, weekSessionIds, window.startDateTime(), window.endDateTime());
        boolean hwGraded = calculateHomeworkGraded(classId, weekSessionIds, currentStudentIds, window.startDateTime(), window.endDateTime());

        List<String> pastSessions = window.weekSessions().stream().map(this::formatSession).toList();
        List<String> nextSessions = window.nextWeekSessions().stream().map(this::formatSession).toList();
        List<AtRiskStudentInfo> atRisk = findAtRiskStudents(classId, enrollments, window.weekSessions(), window.startDateTime(), window.endDateTime());

        List<WeeklyReportPreviewDTO.SessionDetailDTO> sessionDetails = new ArrayList<>();
        for (int i = 0; i < window.weekSessions().size(); i++) {
            Session s = window.weekSessions().get(i);
            AttendanceStats stats = getAttendanceStats(s.getId(), currentStudentIds);
            sessionDetails.add(WeeklyReportPreviewDTO.SessionDetailDTO.builder()
                    .sessionIndex(i + 1)
                    .topic(s.getTopic() != null ? s.getTopic() : ("Buổi " + (i + 1)))
                    .formattedText(formatSession(s))
                    .totalStudents(stats.total())
                    .presentCount(stats.present())
                    .absentCount(stats.absent())
                    .build());
        }

        List<WeeklyReportPreviewDTO.AtRiskStudentDetailDTO> atRiskStudentDTOs = atRisk.stream()
                .map(ar -> WeeklyReportPreviewDTO.AtRiskStudentDetailDTO.builder()
                        .name(ar.name())
                        .issue(ar.issue())
                        .recommendation(ar.recommendation())
                        .build())
                .toList();

        return WeeklyReportPreviewDTO.builder()
                .week(week)
                .totalWeeks(window.totalWeeks())
                .currentWeek(window.currentWeek())
                .dateRange(window.dateRange())
                .teacherName(teacherName)
                .className(className)
                .attendanceDone(attDone)
                .announcementsDone(annDone)
                .homeworkAssigned(hwAssigned)
                .homeworkGraded(hwGraded)
                .pastSessions(pastSessions)
                .nextSessions(nextSessions)
                .sessionDetails(sessionDetails)
                .atRiskStudents(atRiskStudentDTOs)
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
        Set<Long> currentStudentIds = (enrollments != null) ? enrollments.stream()
                .map(e -> e.getStudent() != null ? e.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()) : Collections.emptySet();
        int totalStudents = currentStudentIds.size();

        List<Session> allSessions = new ArrayList<>(sessionRepository.findByClassRoomId(classId));
        allSessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalDateTime.MIN));

        WeekWindow window = calculateWeekWindow(classRoom, allSessions, week);

        Set<Long> weekSessionIds = window.weekSessions().stream()
                .map(Session::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Máy tự động tính hoặc dùng giá trị ghi đè từ form giáo viên
        boolean attDone = requestDTO.getAttendanceDone() != null ? requestDTO.getAttendanceDone() : calculateAttendanceDone(window.weekSessions(), currentStudentIds);
        boolean annDone = requestDTO.getAnnouncementsDone() != null ? requestDTO.getAnnouncementsDone() : calculateAnnouncementsDone(classId, window.startDateTime(), window.endDateTime());
        boolean hwAssigned = requestDTO.getHomeworkAssigned() != null ? requestDTO.getHomeworkAssigned() : calculateHomeworkAssigned(classId, weekSessionIds, window.startDateTime(), window.endDateTime());
        boolean hwGraded = requestDTO.getHomeworkGraded() != null ? requestDTO.getHomeworkGraded() : calculateHomeworkGraded(classId, weekSessionIds, currentStudentIds, window.startDateTime(), window.endDateTime());

        InputStream templateStream = null;
        try {
            ClassPathResource resource = new ClassPathResource("templates/weekly_report_template.docx");
            templateStream = resource.getInputStream();

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
                        setParagraphText(paragraph, String.format("Giáo viên: %s    Tuần: %s    Lớp: %s", teacherName, window.dateRange(), className));
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
                    // Bài đã dạy (Buổi 1, Buổi 2...)
                    else if ("PAST_SESSIONS".equals(currentSection) && text.startsWith("Buổi 1:")) {
                        String s1 = !window.weekSessions().isEmpty() ? formatSession(window.weekSessions().get(0)) : "Chưa có buổi học nào trong tuần";
                        setParagraphText(paragraph, "Buổi 1: " + s1);
                    }
                    else if ("PAST_SESSIONS".equals(currentSection) && text.startsWith("Buổi 2:")) {
                        if (window.weekSessions().size() > 1) {
                            StringBuilder sb = new StringBuilder();
                            for (int i = 1; i < window.weekSessions().size(); i++) {
                                if (i > 1) sb.append("\n");
                                sb.append("Buổi ").append(i + 1).append(": ").append(formatSession(window.weekSessions().get(i)));
                            }
                            setParagraphText(paragraph, sb.toString());
                        } else {
                            setParagraphText(paragraph, "Buổi 2: -");
                        }
                    }
                    // Kế hoạch tuần tới (Buổi 1, Buổi 2...)
                    else if ("NEXT_SESSIONS".equals(currentSection) && text.startsWith("Buổi 1:")) {
                        String s1 = !window.nextWeekSessions().isEmpty() ? formatSession(window.nextWeekSessions().get(0)) : "Theo tiến độ phân phối chương trình";
                        setParagraphText(paragraph, "Buổi 1: " + s1);
                    }
                    else if ("NEXT_SESSIONS".equals(currentSection) && text.startsWith("Buổi 2:")) {
                        if (window.nextWeekSessions().size() > 1) {
                            StringBuilder sb = new StringBuilder();
                            for (int i = 1; i < window.nextWeekSessions().size(); i++) {
                                if (i > 1) sb.append("\n");
                                sb.append("Buổi ").append(i + 1).append(": ").append(formatSession(window.nextWeekSessions().get(i)));
                            }
                            setParagraphText(paragraph, sb.toString());
                        } else {
                            setParagraphText(paragraph, "Buổi 2: Theo tiến độ phân phối chương trình");
                        }
                    }
                    // III. Tình hình học sinh (Buổi 1, Buổi 2, Buổi 3...) - Dựa strictly trên học sinh hiện tại của lớp
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 1")) {
                        if (!window.weekSessions().isEmpty()) {
                            Session s = window.weekSessions().get(0);
                            AttendanceStats stats = getAttendanceStats(s.getId(), currentStudentIds);
                            setParagraphText(paragraph, String.format("Buổi 1 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                    s.getTopic() != null ? s.getTopic() : "Buổi 1", stats.total(), stats.present(), stats.absent()));
                        } else {
                            setParagraphText(paragraph, String.format("Buổi 1: Tổng số HS: %d | Có mặt: %d | Vắng: 0", totalStudents, totalStudents));
                        }
                    }
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 2")) {
                        if (window.weekSessions().size() > 1) {
                            Session s = window.weekSessions().get(1);
                            AttendanceStats stats = getAttendanceStats(s.getId(), currentStudentIds);
                            setParagraphText(paragraph, String.format("Buổi 2 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                    s.getTopic() != null ? s.getTopic() : "Buổi 2", stats.total(), stats.present(), stats.absent()));
                        } else {
                            setParagraphText(paragraph, "Buổi 2: -");
                        }
                    }
                    else if ("STUDENTS".equals(currentSection) && text.startsWith("Buổi 3")) {
                        if (window.weekSessions().size() > 2) {
                            StringBuilder sb = new StringBuilder();
                            for (int i = 2; i < window.weekSessions().size(); i++) {
                                if (i > 2) sb.append("\n");
                                Session s = window.weekSessions().get(i);
                                AttendanceStats stats = getAttendanceStats(s.getId(), currentStudentIds);
                                sb.append(String.format("Buổi %d (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d",
                                        i + 1, s.getTopic() != null ? s.getTopic() : ("Buổi " + (i + 1)), stats.total(), stats.present(), stats.absent()));
                            }
                            setParagraphText(paragraph, sb.toString());
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

                // Table 1: Học sinh cần theo dõi (chỉ tính trong tuần đang báo cáo và cho học sinh hiện tại)
                if (!document.getTables().isEmpty()) {
                    XWPFTable table = document.getTables().get(0);
                    while (table.getRows().size() > 1) {
                        table.removeRow(1);
                    }

                    List<AtRiskStudentInfo> atRiskStudents = findAtRiskStudents(classId, enrollments, window.weekSessions(), window.startDateTime(), window.endDateTime());
                    if (atRiskStudents.isEmpty()) {
                        XWPFTableRow row = table.createRow();
                        row.getCell(0).setText("Cả lớp");
                        row.getCell(1).setText("Đi học và hoàn thành bài đầy đủ trong tuần, không có vấn đề phát sinh.");
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

    private WeekWindow calculateWeekWindow(ClassRoom classRoom, List<Session> allSessions, int week) {
        LocalDate baseStartDate = classRoom.getStartDate();
        if (baseStartDate == null && !allSessions.isEmpty() && allSessions.get(0).getStartTime() != null) {
            baseStartDate = allSessions.get(0).getStartTime().toLocalDate();
        }
        if (baseStartDate == null) {
            baseStartDate = LocalDate.now();
        }

        LocalDate week1Monday = baseStartDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        LocalDate baseEndDate = classRoom.getEndDate();
        if (baseEndDate == null && !allSessions.isEmpty()) {
            Session lastSession = allSessions.get(allSessions.size() - 1);
            if (lastSession.getStartTime() != null) {
                baseEndDate = lastSession.getStartTime().toLocalDate();
            }
        }
        if (baseEndDate == null) {
            baseEndDate = baseStartDate.plusWeeks(12).minusDays(1);
        }

        LocalDate lastWeekSunday = baseEndDate.isBefore(week1Monday)
                ? week1Monday.plusDays(6)
                : baseEndDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long diffDays = java.time.temporal.ChronoUnit.DAYS.between(week1Monday, lastWeekSunday) + 1;
        int totalWeeks = (int) Math.max(1, (diffDays + 6) / 7);

        // Tính tuần hiện tại theo ngày hôm nay
        LocalDate today = LocalDate.now();
        int currentWeek;
        if (today.isBefore(week1Monday)) {
            currentWeek = 1;
        } else if (today.isAfter(lastWeekSunday)) {
            currentWeek = totalWeeks;
        } else {
            long daysFromStart = java.time.temporal.ChronoUnit.DAYS.between(week1Monday, today);
            currentWeek = (int) Math.max(1, Math.min(totalWeeks, (daysFromStart / 7) + 1));
        }

        LocalDate weekStart = week1Monday.plusWeeks(week - 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        LocalDateTime startDateTime = weekStart.atStartOfDay();
        LocalDateTime endDateTime = weekEnd.atTime(23, 59, 59, 999999999);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String dateRange = weekStart.format(fmt) + " – " + weekEnd.format(fmt);

        List<Session> weekSessions = allSessions.stream()
                .filter(s -> s.getStartTime() != null && !s.getStartTime().isBefore(startDateTime) && !s.getStartTime().isAfter(endDateTime))
                .toList();

        LocalDate nextWeekStart = weekStart.plusWeeks(1);
        LocalDate nextWeekEnd = nextWeekStart.plusDays(6);
        LocalDateTime nextStartDateTime = nextWeekStart.atStartOfDay();
        LocalDateTime nextEndDateTime = nextWeekEnd.atTime(23, 59, 59, 999999999);

        List<Session> nextWeekSessions = allSessions.stream()
                .filter(s -> s.getStartTime() != null && !s.getStartTime().isBefore(nextStartDateTime) && !s.getStartTime().isAfter(nextEndDateTime))
                .toList();

        return new WeekWindow(weekStart, weekEnd, startDateTime, endDateTime, dateRange, weekSessions, nextWeekSessions, totalWeeks, currentWeek);
    }

    private void setParagraphText(XWPFParagraph p, String newText) {
        int runCount = p.getRuns().size();
        for (int i = runCount - 1; i > 0; i--) {
            p.removeRun(i);
        }
        XWPFRun run = !p.getRuns().isEmpty() ? p.getRuns().get(0) : p.createRun();
        if (newText == null) {
            run.setText("", 0);
            return;
        }
        String[] lines = newText.split("\n");
        run.setText(lines[0], 0);
        for (int i = 1; i < lines.length; i++) {
            run.addBreak();
            run.setText(lines[i]);
        }
    }

    private String formatSession(Session s) {
        if (s == null) return "Chưa có lịch";
        String dateStr = s.getStartTime() != null ? s.getStartTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "";
        String topic = s.getTopic() != null ? s.getTopic() : "Buổi học";
        return dateStr + " - " + topic;
    }

    private boolean calculateAttendanceDone(List<Session> weekSessions, Set<Long> currentStudentIds) {
        if (weekSessions == null || weekSessions.isEmpty()) return true;
        LocalDateTime now = LocalDateTime.now();
        for (Session s : weekSessions) {
            if (s.getStartTime() != null && s.getStartTime().isBefore(now)) {
                List<Attendance> atts = attendanceRepository.findBySessionId(s.getId());
                if (atts == null || atts.isEmpty()) {
                    return false;
                }
                if (currentStudentIds != null && !currentStudentIds.isEmpty()) {
                    boolean hasCurrentAtt = atts.stream().anyMatch(a -> a.getStudent() != null && currentStudentIds.contains(a.getStudent().getId()));
                    if (!hasCurrentAtt) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private boolean calculateAnnouncementsDone(Long classId, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<ClassAnnouncement> list = classAnnouncementRepository.findByClassRoomId(classId);
        if (list == null || list.isEmpty()) return false;
        boolean hasThisWeek = list.stream().anyMatch(a -> a.getCreatedAt() != null &&
                !a.getCreatedAt().isBefore(startDateTime) && !a.getCreatedAt().isAfter(endDateTime));
        return hasThisWeek || !list.isEmpty();
    }

    private boolean calculateHomeworkAssigned(Long classId, Set<Long> weekSessionIds, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<Assignment> list = assignmentRepository.findByClassRoomId(classId);
        if (list == null || list.isEmpty()) return false;
        boolean hasThisWeek = list.stream().anyMatch(a ->
                (a.getSession() != null && weekSessionIds.contains(a.getSession().getId())) ||
                (a.getCreatedAt() != null && !a.getCreatedAt().isBefore(startDateTime) && !a.getCreatedAt().isAfter(endDateTime)) ||
                (a.getDueDate() != null && !a.getDueDate().isBefore(startDateTime) && !a.getDueDate().isAfter(endDateTime)));
        return hasThisWeek || !list.isEmpty();
    }

    private boolean calculateHomeworkGraded(Long classId, Set<Long> weekSessionIds, Set<Long> currentStudentIds, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<Submission> submissions = submissionRepository.findByClassRoomId(classId);
        if (submissions == null || submissions.isEmpty()) return true;

        List<Submission> weekSubmissions = submissions.stream()
                .filter(s -> s.getStudent() != null && (currentStudentIds == null || currentStudentIds.isEmpty() || currentStudentIds.contains(s.getStudent().getId())))
                .filter(s -> {
                    if (s.getAssignment() != null && s.getAssignment().getSession() != null && weekSessionIds.contains(s.getAssignment().getSession().getId())) {
                        return true;
                    }
                    if (s.getSubmittedAt() != null && !s.getSubmittedAt().isBefore(startDateTime) && !s.getSubmittedAt().isAfter(endDateTime)) {
                        return true;
                    }
                    return false;
                })
                .toList();

        if (weekSubmissions.isEmpty()) {
            return true;
        }

        long graded = weekSubmissions.stream()
                .filter(s -> s.getScore() != null || s.getGradedAt() != null || s.getFeedback() != null)
                .count();
        return ((double) graded / weekSubmissions.size()) >= 0.70;
    }

    private AttendanceStats getAttendanceStats(Long sessionId, Set<Long> currentStudentIds) {
        int total = currentStudentIds != null ? currentStudentIds.size() : 0;
        if (sessionId == null || total == 0) {
            return new AttendanceStats(total, total, 0);
        }
        List<Attendance> attendances = attendanceRepository.findBySessionId(sessionId);
        if (attendances == null || attendances.isEmpty()) {
            return new AttendanceStats(total, total, 0);
        }

        // Lọc strictly chỉ các học sinh hiện đang có trong lớp
        List<Attendance> currentAtts = attendances.stream()
                .filter(a -> a.getStudent() != null && currentStudentIds.contains(a.getStudent().getId()))
                .toList();

        int absentCount = (int) currentAtts.stream()
                .filter(a -> "ABSENT".equalsIgnoreCase(a.getStatus()))
                .count();

        int presentCount = Math.max(0, total - absentCount);
        return new AttendanceStats(total, presentCount, absentCount);
    }

    private List<AtRiskStudentInfo> findAtRiskStudents(Long classId, List<Enrollment> enrollments, List<Session> weekSessions, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<AtRiskStudentInfo> result = new ArrayList<>();
        if (enrollments == null || classId == null) return result;

        Set<Long> currentStudentIds = enrollments.stream()
                .map(e -> e.getStudent() != null ? e.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Set<Long> weekSessionIds = (weekSessions != null) ? weekSessions.stream()
                .map(Session::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()) : Collections.emptySet();

        Map<Long, Long> absentCounts = new HashMap<>();
        if (!weekSessionIds.isEmpty()) {
            List<Attendance> classAtts = attendanceRepository.findBySessionClassRoomId(classId);
            if (classAtts != null) {
                absentCounts = classAtts.stream()
                        .filter(a -> a.getStudent() != null && currentStudentIds.contains(a.getStudent().getId()) && a.getSession() != null && weekSessionIds.contains(a.getSession().getId()) && "ABSENT".equalsIgnoreCase(a.getStatus()))
                        .collect(Collectors.groupingBy(a -> a.getStudent().getId(), Collectors.counting()));
            }
        }

        List<Submission> submissions = submissionRepository.findByClassRoomId(classId);
        Map<Long, List<Submission>> studentSubmissions = (submissions != null ? submissions : Collections.<Submission>emptyList()).stream()
                .filter(s -> s.getStudent() != null && currentStudentIds.contains(s.getStudent().getId()) && (
                        (s.getAssignment() != null && s.getAssignment().getSession() != null && weekSessionIds.contains(s.getAssignment().getSession().getId())) ||
                        (s.getSubmittedAt() != null && !s.getSubmittedAt().isBefore(startDateTime) && !s.getSubmittedAt().isAfter(endDateTime))
                ))
                .collect(Collectors.groupingBy(s -> s.getStudent().getId()));

        for (Enrollment e : enrollments) {
            User student = e.getStudent();
            if (student == null || !currentStudentIds.contains(student.getId())) continue;

            String studentDisplayName = student.getFullName() != null && !student.getFullName().isBlank() 
                    ? student.getFullName() 
                    : (student.getEmail() != null ? student.getEmail() : "Học sinh");

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
                result.add(new AtRiskStudentInfo(studentDisplayName,
                        "Vắng " + absentCount + " buổi trong tuần, cần bổ túc bài",
                        "Gửi bài giảng và dặn dò kèm cặp"));
            } else if (absentCount == 1 && avgScore < 6.0) {
                result.add(new AtRiskStudentInfo(studentDisplayName,
                        "Vắng 1 buổi trong tuần, điểm TB thấp (" + String.format("%.1f", avgScore) + ")",
                        "Cần phụ đạo thêm kiến thức"));
            } else if (absentCount == 1) {
                result.add(new AtRiskStudentInfo(studentDisplayName,
                        "Vắng 1 buổi học trong tuần",
                        "Nhắc nhở học sinh xem lại bài giảng"));
            } else if (avgScore < 5.0 && !subs.isEmpty()) {
                result.add(new AtRiskStudentInfo(studentDisplayName,
                        "Điểm bài tập trong tuần thấp (" + String.format("%.1f", avgScore) + ")",
                        "Giao bài tập bổ trợ để củng cố"));
            }
        }
        return result;
    }

    private record WeekWindow(LocalDate weekStart, LocalDate weekEnd, LocalDateTime startDateTime, LocalDateTime endDateTime, String dateRange, List<Session> weekSessions, List<Session> nextWeekSessions, int totalWeeks, int currentWeek) {}
    private record AttendanceStats(int total, int present, int absent) {}
    private record AtRiskStudentInfo(String name, String issue, String recommendation) {}
}
