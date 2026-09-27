package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassAnnouncementRepository extends JpaRepository<ClassAnnouncement, Long> {
    
    @Query("SELECT a FROM ClassAnnouncement a WHERE a.classRoom.id = :classId ORDER BY a.isPinned DESC, a.createdAt DESC")
    List<ClassAnnouncement> findByClassRoomIdOrderByPinnedAndCreatedAt(@Param("classId") Long classId);
    
    List<ClassAnnouncement> findByClassRoomId(Long classId);
}
