// File: src/main/java/com/edumanager/api/repository/InquiryThreadRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.InquiryThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InquiryThreadRepository extends JpaRepository<InquiryThread, Long> {

    Optional<InquiryThread> findByClassRoomIdAndStudentId(Long classId, Long studentId);

    List<InquiryThread> findByStudentIdOrderByLastMessageAtDesc(Long studentId);

    List<InquiryThread> findByClassRoomIdOrderByLastMessageAtDesc(Long classId);

    List<InquiryThread> findByClassRoomIdInOrderByLastMessageAtDesc(List<Long> classIds);

    @Query("SELECT COUNT(t) FROM InquiryThread t WHERE t.classRoom.id IN :classIds AND t.status = 'UNANSWERED'")
    long countUnansweredByClassRoomIds(@Param("classIds") List<Long> classIds);
}
