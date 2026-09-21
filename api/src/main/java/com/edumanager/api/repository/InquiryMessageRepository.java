// File: src/main/java/com/edumanager/api/repository/InquiryMessageRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.InquiryMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface InquiryMessageRepository extends JpaRepository<InquiryMessage, Long> {

    List<InquiryMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    long countByThreadIdAndSenderRole(Long threadId, String senderRole);

    @Modifying
    @Transactional
    @Query("DELETE FROM InquiryMessage m WHERE m.thread.id = :threadId")
    void deleteByThreadId(@Param("threadId") Long threadId);
}
