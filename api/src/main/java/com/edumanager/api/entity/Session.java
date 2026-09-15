// File: src/main/java/com/edumanager/api/entity/Session.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    private String topic;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer durationMinutes;
}