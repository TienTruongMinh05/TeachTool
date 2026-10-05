package com.edumanager.api.service;

import com.edumanager.api.dto.TimesheetItemDTO;
import com.edumanager.api.dto.TimesheetPreviewDTO;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Session;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.SessionRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimesheetService {

    private final SessionRepository sessionRepository;
    private final ClassRoomRepository classRoomRepository;
    private final UserRepository userRepository;
    private final ClassRoomService classRoomService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Lấy dữ liệu xem trước bảng chấm công tháng
     */
    public TimesheetPreviewDTO getPreview(int month, int year, Long classId, Long teacherId) {
        if (month < 1 || month > 12) {
            month = LocalDateTime.now().getMonthValue();
        }
        if (year < 2000 || year > 2100) {
            year = LocalDateTime.now().getYear();
        }

        User teacher = (teacherId != null) ? userRepository.findById(teacherId).orElse(null) : null;
        String teacherName = (teacher != null && teacher.getFullName() != null) ? teacher.getFullName() : "Giáo viên";

        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime monthStart = ym.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = ym.atEndOfMonth().atTime(23, 59, 59, 999999999);

        List<Session> sessions = new ArrayList<>();
        String className = "Tất cả các lớp";

        if (classId != null) {
            ClassRoom classRoom = classRoomRepository.findById(classId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học có ID: " + classId));
            if (teacherId != null && !classRoomService.isTeacherOfClass(classRoom, teacherId)) {
                throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học này.");
            }
            className = classRoom.getName() != null ? classRoom.getName() : ("Lớp " + classRoom.getClassCode());
            sessions = sessionRepository.findByClassRoomIdAndStartTimeBetweenOrderByStartTimeAsc(classId, monthStart, monthEnd);
        } else {
            // Lấy tất cả các lớp mà giáo viên này phụ trách
            List<ClassRoom> classes = (teacherId != null) ? classRoomService.getClassesByTeacher(teacherId) : classRoomRepository.findAll();
            if (classes != null && !classes.isEmpty()) {
                List<Long> classIds = classes.stream().map(ClassRoom::getId).toList();
                sessions = sessionRepository.findByClassRoomIdInAndStartTimeBetweenOrderByStartTimeAsc(classIds, monthStart, monthEnd);
            }
        }

        // Đảm bảo danh sách luôn được sắp xếp theo thời gian tăng dần
        sessions.sort(Comparator.comparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalDateTime.MIN));

        List<TimesheetItemDTO> items = new ArrayList<>();
        double totalHours = 0.0;
        int no = 1;

        for (Session s : sessions) {
            double durationHours = calculateDurationHours(s);
            totalHours += durationHours;

            String timeStr = formatSessionTime(s);
            String content = (s.getTopic() != null && !s.getTopic().isBlank()) ? s.getTopic().trim() : "Buổi học";
            String note = (s.getAnnouncement() != null && !s.getAnnouncement().isBlank()) ? s.getAnnouncement().trim() : "";
            String clsName = (s.getClassRoom() != null && s.getClassRoom().getName() != null)
                    ? s.getClassRoom().getName()
                    : (s.getClassRoom() != null ? s.getClassRoom().getClassCode() : "");

            items.add(TimesheetItemDTO.builder()
                    .no(no++)
                    .sessionId(s.getId())
                    .classId(s.getClassRoom() != null ? s.getClassRoom().getId() : null)
                    .className(clsName)
                    .time(timeStr)
                    .duration(Math.round(durationHours * 100.0) / 100.0)
                    .content(content)
                    .note(note)
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .build());
        }

        return TimesheetPreviewDTO.builder()
                .teacherName(teacherName)
                .month(month)
                .year(year)
                .classId(classId)
                .className(className)
                .totalSessions(items.size())
                .totalHours(Math.round(totalHours * 100.0) / 100.0)
                .items(items)
                .build();
    }

    /**
     * Xuất bảng chấm công định dạng file Excel (.xlsx) chuẩn
     */
    public byte[] generateTimesheetExcel(int month, int year, Long classId, Long teacherId) throws IOException {
        TimesheetPreviewDTO data = getPreview(month, year, classId, teacherId);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(String.format("Chấm Công T%02d-%d", data.getMonth(), data.getYear()));
            sheet.setDisplayGridlines(true);

            // 1. Khởi tạo Fonts
            XSSFFont titleFont = workbook.createFont();
            titleFont.setFontName("Calibri");
            titleFont.setFontHeightInPoints((short) 15);
            titleFont.setBold(true);
            titleFont.setColor(IndexedColors.DARK_BLUE.getIndex());

            XSSFFont subTitleFont = workbook.createFont();
            subTitleFont.setFontName("Calibri");
            subTitleFont.setFontHeightInPoints((short) 10);
            subTitleFont.setItalic(true);
            subTitleFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            XSSFFont headerFont = workbook.createFont();
            headerFont.setFontName("Calibri");
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont boldFont = workbook.createFont();
            boldFont.setFontName("Calibri");
            boldFont.setFontHeightInPoints((short) 11);
            boldFont.setBold(true);

            XSSFFont normalFont = workbook.createFont();
            normalFont.setFontName("Calibri");
            normalFont.setFontHeightInPoints((short) 10);

            // 2. Khởi tạo CellStyles
            // Style Tiêu đề chính
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Style Phụ đề
            XSSFCellStyle subTitleStyle = workbook.createCellStyle();
            subTitleStyle.setFont(subTitleFont);
            subTitleStyle.setAlignment(HorizontalAlignment.CENTER);
            subTitleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Style Header Table (Màu xanh đậm chuyên nghiệp #1E40AF)
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 30, (byte) 64, (byte) 175}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setThinBorders(headerStyle);

            // Style Data Rows
            XSSFCellStyle centerStyle = createBaseDataStyle(workbook, normalFont);
            centerStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle leftStyle = createBaseDataStyle(workbook, normalFont);
            leftStyle.setAlignment(HorizontalAlignment.LEFT);
            leftStyle.setWrapText(true);

            DataFormat dataFormat = workbook.createDataFormat();
            XSSFCellStyle numberStyle = createBaseDataStyle(workbook, normalFont);
            numberStyle.setAlignment(HorizontalAlignment.RIGHT);
            numberStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            // Style Total Row
            XSSFCellStyle totalLabelStyle = workbook.createCellStyle();
            totalLabelStyle.setFont(boldFont);
            totalLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalLabelStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setThinBorders(totalLabelStyle);

            XSSFCellStyle totalValueStyle = workbook.createCellStyle();
            totalValueStyle.setFont(boldFont);
            totalValueStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalValueStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalValueStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));
            totalValueStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 220, (byte) 252, (byte) 231}, null)); // Xanh lá nhạt #DCFCE7
            totalValueStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setThinBorders(totalValueStyle);

            XSSFCellStyle totalEmptyStyle = workbook.createCellStyle();
            totalEmptyStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalEmptyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setThinBorders(totalEmptyStyle);

            // 3. Render Header Document
            int rowIdx = 0;

            // Row 0: Tiêu đề lớn
            Row titleRow = sheet.createRow(rowIdx++);
            titleRow.setHeightInPoints(24);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(String.format("BẢNG CHẤM CÔNG GIẢNG DẠY - THÁNG %02d/%d", data.getMonth(), data.getYear()));
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 5));

            // Row 1: Thông tin giáo viên & phạm vi
            Row subTitleRow = sheet.createRow(rowIdx++);
            subTitleRow.setHeightInPoints(18);
            Cell subTitleCell = subTitleRow.createCell(0);
            subTitleCell.setCellValue(String.format("Giáo viên: %s  |  Phạm vi: %s  |  Ngày xuất: %s",
                    data.getTeacherName(),
                    data.getClassName(),
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))));
            subTitleCell.setCellStyle(subTitleStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 5));

            // Row 2: Dòng trống
            rowIdx++;

            // Row 3: Bảng Header theo đúng thứ tự cột người dùng yêu cầu:
            // "cột: no., class, time, duration, content, note"
            Row tableHeaderRow = sheet.createRow(rowIdx++);
            tableHeaderRow.setHeightInPoints(26);
            String[] headers = {"No.", "Class", "Time", "Duration (Hours)", "Content", "Note"};
            for (int col = 0; col < headers.length; col++) {
                Cell c = tableHeaderRow.createCell(col);
                c.setCellValue(headers[col]);
                c.setCellStyle(headerStyle);
            }

            int firstDataRowIndex = rowIdx; // 1-based index cho công thức Excel là rowIdx + 1

            // 4. Render Data Rows
            for (TimesheetItemDTO item : data.getItems()) {
                Row dataRow = sheet.createRow(rowIdx++);
                dataRow.setHeightInPoints(22);

                // Col 0: No.
                Cell c0 = dataRow.createCell(0);
                c0.setCellValue(item.getNo());
                c0.setCellStyle(centerStyle);

                // Col 1: Class
                Cell c1 = dataRow.createCell(1);
                c1.setCellValue(item.getClassName());
                c1.setCellStyle(centerStyle);

                // Col 2: Time
                Cell c2 = dataRow.createCell(2);
                c2.setCellValue(item.getTime());
                c2.setCellStyle(centerStyle);

                // Col 3: Duration (Numeric để tính công thức SUM)
                Cell c3 = dataRow.createCell(3);
                c3.setCellValue(item.getDuration() != null ? item.getDuration() : 0.0);
                c3.setCellStyle(numberStyle);

                // Col 4: Content
                Cell c4 = dataRow.createCell(4);
                c4.setCellValue(item.getContent() != null ? item.getContent() : "");
                c4.setCellStyle(leftStyle);

                // Col 5: Note
                Cell c5 = dataRow.createCell(5);
                c5.setCellValue(item.getNote() != null ? item.getNote() : "");
                c5.setCellStyle(leftStyle);
            }

            int lastDataRowIndex = rowIdx - 1;

            // 5. Render Hàng "Total Hours" dưới cùng
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(24);

            // Merge cột 0, 1, 2 cho nhãn "TOTAL HOURS"
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("TOTAL HOURS:");
            totalLabel.setCellStyle(totalLabelStyle);

            Cell dummy1 = totalRow.createCell(1);
            dummy1.setCellStyle(totalLabelStyle);
            Cell dummy2 = totalRow.createCell(2);
            dummy2.setCellStyle(totalLabelStyle);

            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 2));

            // Cột 3: Công thức SUM(D...:D...) hoặc giá trị tổng
            Cell totalValCell = totalRow.createCell(3);
            if (!data.getItems().isEmpty()) {
                // Formula Excel =SUM(D{first}:D{last})
                String formula = String.format("SUM(D%d:D%d)", firstDataRowIndex + 1, lastDataRowIndex + 1);
                totalValCell.setCellFormula(formula);
            } else {
                totalValCell.setCellValue(0.0);
            }
            totalValCell.setCellStyle(totalValueStyle);

            // Cột 4 & 5: Viền trống
            Cell c4Total = totalRow.createCell(4);
            c4Total.setCellStyle(totalEmptyStyle);
            Cell c5Total = totalRow.createCell(5);
            c5Total.setCellStyle(totalEmptyStyle);

            // 6. Căn chỉnh độ rộng cột tối ưu
            sheet.setColumnWidth(0, 8 * 256);   // No.
            sheet.setColumnWidth(1, 22 * 256);  // Class
            sheet.setColumnWidth(2, 28 * 256);  // Time
            sheet.setColumnWidth(3, 18 * 256);  // Duration
            sheet.setColumnWidth(4, 40 * 256);  // Content
            sheet.setColumnWidth(5, 30 * 256);  // Note

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    private double calculateDurationHours(Session s) {
        if (s.getDurationMinutes() != null && s.getDurationMinutes() > 0) {
            return s.getDurationMinutes() / 60.0;
        }
        if (s.getStartTime() != null && s.getEndTime() != null) {
            long minutes = Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
            if (minutes > 0) {
                return minutes / 60.0;
            }
        }
        return 1.5; // Mặc định 1.5 giờ (90 phút) cho buổi học tiêu chuẩn
    }

    private String formatSessionTime(Session s) {
        if (s.getStartTime() == null) return "Chưa xếp lịch";
        String startStr = s.getStartTime().format(TIME_FORMATTER);
        String endStr = (s.getEndTime() != null)
                ? s.getEndTime().format(TIME_FORMATTER)
                : (s.getDurationMinutes() != null ? s.getStartTime().plusMinutes(s.getDurationMinutes()).format(TIME_FORMATTER) : "");
        String dateStr = s.getStartTime().format(DATE_FORMATTER);

        if (!endStr.isBlank()) {
            return String.format("%s - %s, %s", startStr, endStr, dateStr);
        }
        return String.format("%s, %s", startStr, dateStr);
    }

    private XSSFCellStyle createBaseDataStyle(Workbook wb, Font font) {
        XSSFCellStyle style = (XSSFCellStyle) wb.createCellStyle();
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setThinBorders(style);
        return style;
    }

    private void setThinBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }
}
