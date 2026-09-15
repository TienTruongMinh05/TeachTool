// File: src/main/java/com/edumanager/api/entity/Attendance.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attendances")
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
    private String status; // 'PRESENT', 'ABSENT', 'LATE'
    
    private String note;
}