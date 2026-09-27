package com.edumanager.api.dto;

import lombok.Data;

@Data
public class WeeklyReportRequestDTO {
    private Integer week = 1;
    private String progressStatus = "ON_TIME"; // ON_TIME, FASTER, SLOWER
    private String delayReason;
    private String challenges;
    private Integer selfRating = 5; // 1 to 5
    private Boolean attendanceDone;
    private Boolean announcementsDone;
    private Boolean homeworkAssigned;
    private Boolean homeworkGraded;
}
