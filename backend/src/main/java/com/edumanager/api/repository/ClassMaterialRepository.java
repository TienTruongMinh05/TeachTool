package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassMaterialRepository extends JpaRepository<ClassMaterial, Long> {
    List<ClassMaterial> findByClassRoomIdOrderByCreatedAtDesc(Long classRoomId);
    void deleteByClassRoomId(Long classRoomId);
}
