package com.edumanager.api.controller;

import com.edumanager.api.dto.ClassResponseDTO;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.service.ClassRoomService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class ClassRoomController {

    private final ClassRoomService service;

    @PostMapping
    public ClassResponseDTO createClass(@RequestBody ClassRoom classRoom, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return ClassResponseDTO.fromEntity(service.createClass(classRoom, callerId));
    }

    @GetMapping
    public List<ClassResponseDTO> getAllClasses(HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if ("TEACHER".equalsIgnoreCase(callerRole) && callerId != null) {
            return service.getClassesByTeacher(callerId).stream()
                    .map(ClassResponseDTO::fromEntity)
                    .toList();
        }
        return service.getAllClasses().stream()
                .map(ClassResponseDTO::fromEntity)
                .toList();
    }

    @GetMapping("/{id}")
    public ClassResponseDTO getClassById(@PathVariable Long id) {
        return ClassResponseDTO.fromEntity(service.getClassById(id));
    }

    @PutMapping("/{id}")
    public ClassResponseDTO updateClass(@PathVariable Long id, @RequestBody ClassRoom classRoom, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return ClassResponseDTO.fromEntity(service.updateClass(id, classRoom, callerId));
    }

    @GetMapping("/timetable")
    public List<com.edumanager.api.dto.TimetableSessionDTO> getTimetable(
            @RequestParam(required = false) Long classId) {
        return service.getTimetable(classId);
    }

    @DeleteMapping("/{id}")
    public void deleteClass(@PathVariable Long id, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.deleteClass(id, callerId);
    }
}