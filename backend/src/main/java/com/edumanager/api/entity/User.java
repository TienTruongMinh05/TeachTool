// File: src/main/java/com/edumanager/api/entity/User.java
package com.edumanager.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = true)
    private String role; // 'TEACHER' hoặc 'STUDENT'

    private String avatarUrl;
    
    @Column(nullable = true)
    private String password;
}