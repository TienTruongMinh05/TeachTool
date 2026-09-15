package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long> {
    Optional<ClassRoom> findByClassCode(String classCode);
    boolean existsByClassCode(String classCode);
}