package com.edumanager.api.repository;

import com.edumanager.api.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    Optional<StoredFile> findByStoredName(String storedName);
    boolean existsByStoredName(String storedName);
    java.util.List<StoredFile> findByCreatedAtBefore(java.time.LocalDateTime cutoff);

    @org.springframework.data.jpa.repository.Query("SELECT s.storedName FROM StoredFile s WHERE s.createdAt < :cutoff")
    java.util.List<String> findStoredNamesByCreatedAtBefore(@org.springframework.data.repository.query.Param("cutoff") java.time.LocalDateTime cutoff);
}
