package com.edumanager.api.repository;

import com.edumanager.api.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    Optional<StoredFile> findByStoredName(String storedName);
    boolean existsByStoredName(String storedName);
}
