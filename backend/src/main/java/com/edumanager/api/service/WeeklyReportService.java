package com.edumanager.api.service;

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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
    private final ClassRoomService classRoomService;

    public byte[] generateWeeklyReportDocx(Long classId, Integer weekNumber, Long teacherId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học"));

        if (!classRoomService.isTeacherOfClass(classRoom, teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền xuất báo cáo tuần.");
        }

        User teacher = userRepository.findById(teacherId).orElse(null);
        String teacherName = teacher != null ? teacher.getFullName() : (classRoom.getTeacherId() != null ? "Giáo viên phụ trách" : "");
        String className = classRoom.getName() != null ? classRoom.getName() : "Lớp học";
        int week = (weekNumber != null && weekNumber > 0) ? weekNumber : 1;

        // Lấy danh sách học sinh
        List<Enrollment> enrollments = enrollmentRepository.findByClassRoomId(classId);
        int totalStudents = enrollments != null ? enrollments.size() : 0;

        // Lấy danh sách buổi học
        List<Session> allSessions = new ArrayList<>(sessionRepository.findByClassRoomId(classId));
        allSessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : java.time.LocalDateTime.MIN));
        
        // Buổi học tương ứng của tuần này (giả định 2-3 buổi/tuần)
        int sessionsPerWeek = 3;
        int startIndex = Math.max(0, (week - 1) * sessionsPerWeek);
        int endIndex = Math.min(allSessions.size(), startIndex + sessionsPerWeek);
        List<Session> weekSessions = (startIndex < allSessions.size()) ? allSessions.subList(startIndex, endIndex) : Collections.emptyList();

        // Buổi học kế tiếp của tuần tới
        int nextStartIndex = endIndex;
        int nextEndIndex = Math.min(allSessions.size(), nextStartIndex + sessionsPerWeek);
        List<Session> nextWeekSessions = (nextStartIndex < allSessions.size()) ? allSessions.subList(nextStartIndex, nextEndIndex) : Collections.emptyList();

        // Đọc file mẫu .docx
        InputStream templateStream = null;
        try {
            Path localTemplate = Paths.get("Weekly Report Pre-IELTS.docx");
            if (Files.exists(localTemplate)) {
                templateStream = Files.newInputStream(localTemplate);
            } else {
                ClassPathResource resource = new ClassPathResource("templates/weekly_report_template.docx");
                templateStream = resource.getInputStream();
            }

            try (XWPFDocument document = new XWPFDocument(templateStream);
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {

                // 1. Cập nhật các đoạn văn bản (Paragraphs)
                for (XWPFParagraph paragraph : document.getParagraphs()) {
                    String text = paragraph.getText();
                    if (text == null) continue;

                    // Thông tin chung: Giáo viên, Tuần, Lớp
                    if (text.contains("Giáo viên:") && text.contains("Lớp:")) {
                        setParagraphText(paragraph, String.format("Giáo viên: %s    Tuần: %d    Lớp: %s", teacherName, week, className));
                    }
                    // Ngày nộp & chữ ký
                    else if (text.contains("Ngày nộp:")) {
                        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd / MM / yyyy"));
                        setParagraphText(paragraph, String.format("Ngày nộp: %s", todayStr));
                    } else if (text.contains("Giáo viên ký tên")) {
                        setParagraphText(paragraph, String.format("Giáo viên: %s", teacherName));
                    }
                    // Tình hình học sinh từng buổi
                    else if (text.startsWith("Buổi 1:") && weekSessions.size() >= 1) {
                        Session s1 = weekSessions.get(0);
                        AttendanceStats stats = getAttendanceStats(s1.getId(), totalStudents);
                        String t1 = s1.getTopic() != null ? s1.getTopic() : ("Buổi #" + (startIndex + 1));
                        setParagraphText(paragraph, String.format("Buổi 1 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d", 
                                t1, stats.total, stats.present, stats.absent));
                    } else if (text.startsWith("Buổi 2:") && weekSessions.size() >= 2) {
                        Session s2 = weekSessions.get(1);
                        AttendanceStats stats = getAttendanceStats(s2.getId(), totalStudents);
                        String t2 = s2.getTopic() != null ? s2.getTopic() : ("Buổi #" + (startIndex + 2));
                        setParagraphText(paragraph, String.format("Buổi 2 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d", 
                                t2, stats.total, stats.present, stats.absent));
                    } else if (text.startsWith("Buổi 3:") && weekSessions.size() >= 3) {
                        Session s3 = weekSessions.get(2);
                        AttendanceStats stats = getAttendanceStats(s3.getId(), totalStudents);
                        String t3 = s3.getTopic() != null ? s3.getTopic() : ("Buổi #" + (startIndex + 3));
                        setParagraphText(paragraph, String.format("Buổi 3 (%s): Tổng số HS: %d | Có mặt: %d | Vắng: %d", 
                                t3, stats.total, stats.present, stats.absent));
                    }
                }

                // 2. Cập nhật Bảng Học sinh cần theo dõi (Table 1)
                if (!document.getTables().isEmpty()) {
                    XWPFTable table = document.getTables().get(0);
                    // Giữ lại hàng tiêu đề (index 0), xóa các hàng mẫu cũ
                    while (table.getRows().size() > 1) {
                        table.removeRow(1);
                    }

                    // Tìm học sinh cần theo dõi (vắng buổi hoặc nợ bài tập)
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

        for (Enrollment e : enrollments) {
            User student = e.getStudent();
            if (student == null) continue;

            long absentCount = absentCounts.getOrDefault(student.getId(), 0L);
            if (absentCount >= 2) {
                result.add(new AtRiskStudentInfo(student.getFullName(), 
                        "Vắng " + absentCount + " buổi học, cần bổ túc bài", 
                        "Gửi bài giảng và dặn dò kèm cặp"));
            }
        }
        return result;
    }

    private record AttendanceStats(int total, int present, int absent) {}
    private record AtRiskStudentInfo(String name, String issue, String recommendation) {}
}
