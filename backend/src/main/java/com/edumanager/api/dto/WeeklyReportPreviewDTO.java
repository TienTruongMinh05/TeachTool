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
    private int totalStudents;
    private int atRiskCount;
}
