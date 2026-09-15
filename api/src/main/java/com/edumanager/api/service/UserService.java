// File: src/main/java/com/edumanager/api/service/UserService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.User;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repository;

    public User createUser(User user) {
        return repository.findByEmail(user.getEmail())
                .orElseGet(() -> repository.save(user));
    }

    public User getUserById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng có ID: " + id));
    }

    public User updateUser(Long id, User updated) {
        User user = getUserById(id);
        if (updated.getFullName() != null) {
            user.setFullName(updated.getFullName());
        }
        if (updated.getEmail() != null) {
            user.setEmail(updated.getEmail());
        }
        return repository.save(user);
    }

    public void deleteUser(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy người dùng có ID: " + id);
        }
        repository.deleteById(id);
    }
}