// File: src/main/java/com/edumanager/api/entity/InquiryMessage.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inquiry_messages", indexes = {
    @Index(name = "idx_inquiry_messages_thread_id", columnList = "thread_id"),
    @Index(name = "idx_inquiry_messages_sender_id", columnList = "sender_id"),
    @Index(name = "idx_inquiry_messages_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquiryMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "thread_id")
    private InquiryThread thread;

    @ManyToOne(optional = true)
    @JoinColumn(name = "sender_id")
    private User sender;

    /**
     * STUDENT | TEACHER | SYSTEM
     */
    @Column(nullable = false, length = 30)
    private String senderRole;

    private String senderName;

    /**
     * Nội dung tin nhắn đã được mã hóa AES-256 trong CSDL
     */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String encryptedContent;

    /**
     * JSON lưu danh sách tệp đính kèm: [{"fileName": "...", "fileUrl": "...", "fileSize": 1234}]
     * Giới hạn tối đa 3 tệp / 1 tin nhắn
     */
    @Column(columnDefinition = "TEXT")
    private String attachmentsJson;

    @Builder.Default
    private boolean isAutoReply = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
