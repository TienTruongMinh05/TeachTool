// File: src/main/java/com/edumanager/api/entity/Assignment.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignments", indexes = {
    @Index(name = "idx_assignments_class_id", columnList = "class_id"),
    @Index(name = "idx_assignments_session_id", columnList = "session_id"),
    @Index(name = "idx_assignments_due_date", columnList = "dueDate"),
    @Index(name = "idx_assignments_publish_at", columnList = "scheduled_publish_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @ManyToOne(optional = true)
    @JoinColumn(name = "session_id")
    private Session session;

    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private LocalDateTime dueDate;

    // Ví dụ: "TEXT,DOCX,AUDIO,DIRECT_RECORD"
    private String allowedSubmissionTypes;

    private String attachmentFileName;
    private String attachmentFileUrl;

    @Column(columnDefinition = "TEXT")
    private String attachmentsJson;

    @Column(name = "scheduled_publish_at")
    private LocalDateTime scheduledPublishAt;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (allowedSubmissionTypes == null || allowedSubmissionTypes.trim().isEmpty()) {
            allowedSubmissionTypes = "TEXT,DOCX,AUDIO,DIRECT_RECORD";
        }
    }

    @Transient
    public boolean isPublished() {
        return scheduledPublishAt == null || !scheduledPublishAt.isAfter(LocalDateTime.now());
    }
}