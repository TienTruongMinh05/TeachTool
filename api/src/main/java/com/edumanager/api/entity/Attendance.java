// File: src/main/java/com/edumanager/api/entity/Attendance.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attendances", indexes = {
    @Index(name = "idx_attendances_session_id", columnList = "session_id"),
    @Index(name = "idx_attendances_student_id", columnList = "student_id"),
    @Index(name = "idx_attendances_session_student", columnList = "session_id, student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private Session session;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    @Column(nullable = false)
    private String status; // 'PRESENT', 'ABSENT', 'LATE', 'ONLINE'
    
    private String note;
}