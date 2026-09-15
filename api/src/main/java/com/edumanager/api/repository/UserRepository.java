// File: src/main/java/com/edumanager/api/repository/UserRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}