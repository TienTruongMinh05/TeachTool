package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "class_teachers", uniqueConstraints = {
    @UniqueConstraint(name = "uk_class_teacher", columnNames = {"class_id", "teacher_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassTeacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "role_in_class", length = 30, nullable = false)
    private String roleInClass; // "PRIMARY" hoặc "CO_TEACHER"

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;
}
