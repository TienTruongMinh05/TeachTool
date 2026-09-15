// File: src/main/java/com/edumanager/api/controller/AssignmentController.java
package com.edumanager.api.controller;

import com.edumanager.api.dto.AssignmentResponseDTO;
import com.edumanager.api.entity.Assignment;
import com.edumanager.api.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class AssignmentController {
    private final AssignmentService service;

    @PostMapping("/api/classes/{classId}/assignments")
    public AssignmentResponseDTO createAssignment(
            @PathVariable Long classId,
            @RequestParam(required = false) Long sessionId,
            @RequestBody Assignment assignment) {
        return AssignmentResponseDTO.fromEntity(service.createAssignment(classId, sessionId, assignment));
    }

    @GetMapping("/api/classes/{classId}/assignments")
    public List<AssignmentResponseDTO> getAssignments(@PathVariable Long classId) {
        return service.getAssignmentsByClass(classId).stream()
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/api/sessions/{sessionId}/assignments")
    public List<AssignmentResponseDTO> getAssignmentsBySession(@PathVariable Long sessionId) {
        return service.getAssignmentsBySession(sessionId).stream()
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }

    @PutMapping("/api/assignments/{id}")
    public AssignmentResponseDTO updateAssignment(@PathVariable Long id, @RequestBody Assignment assignment) {
        return AssignmentResponseDTO.fromEntity(service.updateAssignment(id, assignment));
    }

    @DeleteMapping("/api/assignments/{id}")
    public void deleteAssignment(@PathVariable Long id) {
        service.deleteAssignment(id);
    }

    @GetMapping("/api/students/{studentId}/assignments")
    public List<AssignmentResponseDTO> getAssignmentsForStudent(@PathVariable Long studentId) {
        return service.getAssignmentsForStudent(studentId).stream()
                .map(AssignmentResponseDTO::fromEntity)
                .toList();
    }
}