package com.edumanager.api.controller;

import com.edumanager.api.dto.TeachingPlanResponseDTO;
import com.edumanager.api.entity.TeachingPlan;
import com.edumanager.api.service.TeachingPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TeachingPlanController {

    private final TeachingPlanService service;

    @GetMapping("/api/classes/{classId}/plans")
    public List<TeachingPlanResponseDTO> getPlansByClass(@PathVariable Long classId) {
        return service.getPlansByClass(classId).stream()
                .map(TeachingPlanResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/api/plans/{id}")
    public TeachingPlanResponseDTO getPlanById(@PathVariable Long id) {
        return TeachingPlanResponseDTO.fromEntity(service.getPlanById(id));
    }

    @PostMapping("/api/classes/{classId}/plans")
    public TeachingPlanResponseDTO createPlan(
            @PathVariable Long classId,
            @RequestParam Long sessionId,
            @RequestBody TeachingPlan plan) {
        return TeachingPlanResponseDTO.fromEntity(service.createPlan(classId, sessionId, plan));
    }

    @PutMapping("/api/plans/{id}")
    public TeachingPlanResponseDTO updatePlan(@PathVariable Long id, @RequestBody TeachingPlan plan) {
        return TeachingPlanResponseDTO.fromEntity(service.updatePlan(id, plan));
    }

    @DeleteMapping("/api/plans/{id}")
    public void deletePlan(@PathVariable Long id) {
        service.deletePlan(id);
    }

    @PostMapping("/api/plans/{id}/copy")
    public TeachingPlanResponseDTO copyPlan(
            @PathVariable Long id,
            @RequestParam Long targetSessionId) {
        return TeachingPlanResponseDTO.fromEntity(service.copyPlan(id, targetSessionId));
    }
}
