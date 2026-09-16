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
    private final com.edumanager.api.service.ClassRoomService classRoomService;

    @GetMapping("/api/classes/{classId}/plans")
    public List<TeachingPlanResponseDTO> getPlansByClass(
            @PathVariable Long classId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập kế hoạch giảng dạy của lớp này.");
        }
        return service.getPlansByClass(classId).stream()
                .map(TeachingPlanResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/api/plans/{id}")
    public TeachingPlanResponseDTO getPlanById(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        TeachingPlan plan = service.getPlanById(id);
        if (callerId != null && plan.getClassRoom() != null && !classRoomService.canAccessClass(plan.getClassRoom().getId(), callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền xem kế hoạch giảng dạy này.");
        }
        return TeachingPlanResponseDTO.fromEntity(plan);
    }

    @PostMapping("/api/classes/{classId}/plans")
    public TeachingPlanResponseDTO createPlan(
            @PathVariable Long classId,
            @RequestParam Long sessionId,
            @RequestBody TeachingPlan plan,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return TeachingPlanResponseDTO.fromEntity(service.createPlan(classId, sessionId, plan, callerId));
    }

    @PutMapping("/api/plans/{id}")
    public TeachingPlanResponseDTO updatePlan(
            @PathVariable Long id, 
            @RequestBody TeachingPlan plan,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return TeachingPlanResponseDTO.fromEntity(service.updatePlan(id, plan, callerId));
    }

    @DeleteMapping("/api/plans/{id}")
    public void deletePlan(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.deletePlan(id, callerId);
    }

    @PostMapping("/api/plans/{id}/copy")
    public TeachingPlanResponseDTO copyPlan(
            @PathVariable Long id,
            @RequestParam Long targetSessionId,
            jakarta.servlet.http.HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return TeachingPlanResponseDTO.fromEntity(service.copyPlan(id, targetSessionId, callerId));
    }
}
