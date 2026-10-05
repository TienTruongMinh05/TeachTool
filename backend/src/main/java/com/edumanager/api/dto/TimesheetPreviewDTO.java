package com.edumanager.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetPreviewDTO {
    private String teacherName;
    private Integer month;
    private Integer year;
    private Long classId;
    private String className;
    private Integer totalSessions;
    private Double totalHours;
    @Builder.Default
    private List<TimesheetItemDTO> items = new ArrayList<>();
}
