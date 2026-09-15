// File: src/main/java/com/edumanager/api/entity/Submission.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    private String submissionType; // TEXT, DOCX, AUDIO, DIRECT_RECORD

    @Column(columnDefinition = "TEXT")
    private String textContent;

    private String fileUrl;
    private String fileName;

    private String score; // Điểm số (ví dụ: "8.5", "Band 7.0", "A")

    // Lưu điểm dạng JSON nếu cần lưu nhiều tiêu chí
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Double> scores;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(updatable = false)
    private LocalDateTime submittedAt;

    private LocalDateTime gradedAt;

    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
}