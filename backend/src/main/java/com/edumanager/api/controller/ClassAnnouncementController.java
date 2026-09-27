package com.edumanager.api.controller;

import com.edumanager.api.dto.ClassAnnouncementDTO;
import com.edumanager.api.entity.ClassAnnouncement;
import com.edumanager.api.service.ClassAnnouncementService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ClassAnnouncementController {

    private final ClassAnnouncementService announcementService;

    @GetMapping("/api/classes/{classId}/announcements")
    public List<ClassAnnouncementDTO> getAnnouncements(
            @PathVariable Long classId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        return announcementService.getAnnouncements(classId, callerId, callerRole).stream()
                .map(ClassAnnouncementDTO::fromEntity)
                .toList();
    }

    @PostMapping("/api/classes/{classId}/announcements")
    public ClassAnnouncementDTO createAnnouncement(
            @PathVariable Long classId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        Boolean isPinned = body.get("isPinned") != null ? (Boolean) body.get("isPinned") : false;
        String attachmentsJson = (String) body.get("attachmentsJson");

        ClassAnnouncement saved = announcementService.createAnnouncement(classId, title, content, isPinned, attachmentsJson, callerId);
        return ClassAnnouncementDTO.fromEntity(saved);
    }

    @PutMapping("/api/announcements/{id}")
    public ClassAnnouncementDTO updateAnnouncement(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String attachmentsJson = (String) body.get("attachmentsJson");

        ClassAnnouncement updated = announcementService.updateAnnouncement(id, title, content, attachmentsJson, callerId);
        return ClassAnnouncementDTO.fromEntity(updated);
    }

    @PatchMapping("/api/announcements/{id}/pin")
    public ClassAnnouncementDTO togglePin(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return ClassAnnouncementDTO.fromEntity(announcementService.togglePin(id, callerId));
    }

    @DeleteMapping("/api/announcements/{id}")
    public ResponseEntity<Void> deleteAnnouncement(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        announcementService.deleteAnnouncement(id, callerId);
        return ResponseEntity.noContent().build();
    }
}
