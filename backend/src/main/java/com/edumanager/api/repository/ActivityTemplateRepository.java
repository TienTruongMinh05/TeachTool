package com.edumanager.api.repository;

import com.edumanager.api.entity.ActivityTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActivityTemplateRepository extends JpaRepository<ActivityTemplate, Long> {
    Optional<ActivityTemplate> findByName(String name);
    boolean existsByName(String name);
}
