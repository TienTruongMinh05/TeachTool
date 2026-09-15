// File: src/main/java/com/edumanager/api/dto/UserResponseDTO.java
package com.edumanager.api.dto;

import com.edumanager.api.entity.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponseDTO {
    private Long id;
    private String fullName;
    private String email;
    private String role;
    private String avatarUrl;

    // Hàm tiện ích để chuyển đổi từ Entity sang DTO
    public static UserResponseDTO fromEntity(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}