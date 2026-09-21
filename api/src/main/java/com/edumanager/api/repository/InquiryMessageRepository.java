// File: src/main/java/com/edumanager/api/repository/InquiryMessageRepository.java
package com.edumanager.api.repository;

import com.edumanager.api.entity.InquiryMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InquiryMessageRepository extends JpaRepository<InquiryMessage, Long> {

    List<InquiryMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    long countByThreadIdAndSenderRole(Long threadId, String senderRole);
}
