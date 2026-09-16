package com.edumanager.api.repository;

import com.edumanager.api.entity.StoredFileChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface StoredFileChunkRepository extends JpaRepository<StoredFileChunk, Long> {

    @Query("SELECT c.id FROM StoredFileChunk c WHERE c.storedName = :storedName ORDER BY c.chunkIndex ASC")
    List<Long> findChunkIdsByStoredName(@Param("storedName") String storedName);

    List<StoredFileChunk> findByStoredNameOrderByChunkIndexAsc(String storedName);

    boolean existsByStoredName(String storedName);

    @Modifying
    @Transactional
    @Query("DELETE FROM StoredFileChunk c WHERE c.storedName = :storedName")
    void deleteByStoredName(@Param("storedName") String storedName);
}
