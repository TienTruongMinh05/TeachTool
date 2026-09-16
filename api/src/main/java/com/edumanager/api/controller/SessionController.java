// File: src/main/java/com/edumanager/api/controller/SessionController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.SessionResponseDTO;
import com.edumanager.api.entity.Session;
import com.edumanager.api.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/classes/{classId}/sessions")
@RequiredArgsConstructor
public class SessionController {
    private final SessionService service;
    private final com.edumanager.api.service.ClassRoomService classRoomService;

    @PostMapping
    public SessionResponseDTO createSession(
            @PathVariable Long classId, 
            @RequestBody Session session,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return SessionResponseDTO.fromEntity(service.createSession(classId, session, callerId));
    }

    @GetMapping
    public List<SessionResponseDTO> getSessions(
            @PathVariable Long classId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập danh sách buổi học của lớp này.");
        }
        return service.getSessionsByClass(classId).stream()
                .map(SessionResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/{sessionId}")
    public SessionResponseDTO getSessionById(
            @PathVariable Long classId,
            @PathVariable Long sessionId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập thông tin buổi học này.");
        }
        return SessionResponseDTO.fromEntity(service.getSessionById(sessionId));
    }

    @PutMapping("/{sessionId}")
    public SessionResponseDTO updateSession(
            @PathVariable Long classId,
            @PathVariable Long sessionId, 
            @RequestBody Session session,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return SessionResponseDTO.fromEntity(service.updateSession(sessionId, session, callerId));
    }

    @DeleteMapping("/{sessionId}")
    public void deleteSession(
            @PathVariable Long classId,
            @PathVariable Long sessionId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.deleteSession(sessionId, callerId);
    }
}