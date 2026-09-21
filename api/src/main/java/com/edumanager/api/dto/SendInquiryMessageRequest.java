// File: src/main/java/com/edumanager/api/dto/SendInquiryMessageRequest.java
package com.edumanager.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendInquiryMessageRequest {
    private String content;
    /**
     * Danh sách tệp đính kèm: [{"fileName": "...", "fileUrl": "...", "fileSize": 1024}]
     * Tối đa 3 tệp / 1 tin nhắn
     */
    private List<Map<String, Object>> attachments;
}
