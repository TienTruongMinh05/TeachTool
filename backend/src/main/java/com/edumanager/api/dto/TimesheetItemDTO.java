package com.edumanager.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetItemDTO {
    private Integer no;
    private Long sessionId;
    private Long classId;
    private String className;
    private String time;
    private Double duration;
    private String content;
    private String note;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
