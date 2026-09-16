package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "class_materials", indexes = {
    @Index(name = "idx_class_materials_class_id", columnList = "class_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @Column(nullable = false)
    private String title;

    private String category; // 'Sách giáo khoa' | 'Tài liệu bổ trợ' | 'Bài tập' | 'Khác'

    @Column(nullable = false)
    private String fileUrl;

    private String fileName;

    private Integer totalPages;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.totalPages == null || this.totalPages <= 0) {
            this.totalPages = 1;
        }
    }
}
