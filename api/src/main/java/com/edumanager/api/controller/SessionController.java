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

// Sửa đổi kiểu trả về trong SessionController.java
@PostMapping
public SessionResponseDTO createSession(@PathVariable Long classId, @RequestBody Session session) {
    return SessionResponseDTO.fromEntity(service.createSession(classId, session));
}

    @GetMapping
    public List<SessionResponseDTO> getSessions(@PathVariable Long classId) {
        return service.getSessionsByClass(classId).stream()
                .map(SessionResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/{sessionId}")
    public SessionResponseDTO getSessionById(@PathVariable Long sessionId) {
        return SessionResponseDTO.fromEntity(service.getSessionById(sessionId));
    }

    @PutMapping("/{sessionId}")
    public SessionResponseDTO updateSession(@PathVariable Long sessionId, @RequestBody Session session) {
        return SessionResponseDTO.fromEntity(service.updateSession(sessionId, session));
    }

    @DeleteMapping("/{sessionId}")
    public void deleteSession(@PathVariable Long sessionId) {
        service.deleteSession(sessionId);
    }
}