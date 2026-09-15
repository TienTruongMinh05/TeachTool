package com.edumanager.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String role; // "TEACHER" or "STUDENT"
    private String avatarUrl;
}
