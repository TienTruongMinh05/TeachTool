// File: src/main/java/com/edumanager/api/entity/Enrollment.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "enrollments", indexes = {
    @Index(name = "idx_enrollments_class_id", columnList = "class_id"),
    @Index(name = "idx_enrollments_student_id", columnList = "student_id"),
    @Index(name = "idx_enrollments_class_student", columnList = "class_id, student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;
}