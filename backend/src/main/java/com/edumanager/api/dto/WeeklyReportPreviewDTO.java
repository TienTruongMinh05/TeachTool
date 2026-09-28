package com.edumanager.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyReportPreviewDTO {
    private Integer week;
    private Integer totalWeeks;
    private Integer currentWeek;
    private String dateRange;
    private String teacherName;
    private String className;
    private boolean attendanceDone;
    private boolean announcementsDone;
    private boolean homeworkAssigned;
    private boolean homeworkGraded;
    private List<String> pastSessions;
    private List<String> nextSessions;
    private List<SessionDetailDTO> sessionDetails;
    private List<AtRiskStudentDetailDTO> atRiskStudents;
    private int totalStudents;
    private int atRiskCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionDetailDTO {
        private int sessionIndex;
        private String topic;
        private String formattedText;
        private int totalStudents;
        private int presentCount;
        private int absentCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AtRiskStudentDetailDTO {
        private String name;
        private String issue;
        private String recommendation;
    }
}
