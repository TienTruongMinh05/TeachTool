// File: src/main/java/com/edumanager/api/entity/Assignment.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
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
}