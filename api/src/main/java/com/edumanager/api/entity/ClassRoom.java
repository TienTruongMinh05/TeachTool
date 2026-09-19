package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "classes", indexes = {
    @Index(name = "idx_classes_teacher_id", columnList = "teacher_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassRoom {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;

    @Column(unique = true, length = 20)
    private String classCode;
    
    private LocalDate startDate;
    private LocalDate endDate;

    @Column(name = "teacher_id")
    private Long teacherId;
}