package com.edumanager.api.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "teaching_plan_sections", indexes = {
    @Index(name = "idx_tplan_sections_plan_id", columnList = "teaching_plan_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeachingPlanSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teaching_plan_id")
    @JsonBackReference
    private TeachingPlan teachingPlan;

    private String timeAllocation;
    
    @Column(nullable = false)
    private String content;
    
    private String activity;
    
    private String handoutType;
    
    @Column(columnDefinition = "TEXT")
    private String handoutText;
    
    private String handoutFileName;
    private String handoutFilePath;

    @Column(columnDefinition = "TEXT")
    private String studentPreparation; // Học sinh cần chuẩn bị gì
    
    private Integer orderIndex;
}
