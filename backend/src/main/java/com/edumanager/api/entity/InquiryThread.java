// File: src/main/java/com/edumanager/api/entity/InquiryThread.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inquiry_threads", indexes = {
    @Index(name = "idx_inquiry_threads_class_id", columnList = "class_id"),
    @Index(name = "idx_inquiry_threads_student_id", columnList = "student_id"),
    @Index(name = "idx_inquiry_threads_status", columnList = "status"),
    @Index(name = "idx_inquiry_threads_last_msg", columnList = "lastMessageAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquiryThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    /**
     * UNANSWERED (Chưa trả lời - Viền đỏ phía GV) | ANSWERED (Đã trả lời - Viền xanh lá)
     */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "UNANSWERED";

    @Column(columnDefinition = "TEXT")
    private String lastMessagePreview;

    private LocalDateTime lastMessageAt;

    /**
     * Tổng số tệp đã đính kèm trong thread này (giới hạn tối đa 15 tệp/chat)
     */
    @Builder.Default
    private int totalFilesCount = 0;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (lastMessageAt == null) {
            lastMessageAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "UNANSWERED";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
