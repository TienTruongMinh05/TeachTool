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
        return ClassResponseDTO.fromEntity(service.createClass(classRoom, callerId), callerId);
    }

    @GetMapping
    public List<ClassResponseDTO> getAllClasses(HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        if ("TEACHER".equalsIgnoreCase(callerRole) && callerId != null) {
            return service.getClassesByTeacher(callerId).stream()
                    .map(c -> ClassResponseDTO.fromEntity(c, callerId))
                    .toList();
        }
        return service.getAllClasses().stream()
                .map(c -> ClassResponseDTO.fromEntity(c, callerId))
                .toList();
    }

    @GetMapping("/{id}")
    public ClassResponseDTO getClassById(@PathVariable Long id, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return ClassResponseDTO.fromEntity(service.getClassById(id), callerId);
    }

    @PutMapping("/{id}")
    public ClassResponseDTO updateClass(@PathVariable Long id, @RequestBody ClassRoom classRoom, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return ClassResponseDTO.fromEntity(service.updateClass(id, classRoom, callerId), callerId);
    }

    @GetMapping("/{id}/teachers")
    public List<com.edumanager.api.dto.ClassTeacherDTO> getTeachersOfClass(
            @PathVariable Long id, 
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        return service.getTeachersOfClass(id, callerId);
    }

    @PostMapping("/{id}/teachers")
    public com.edumanager.api.dto.ClassTeacherDTO addCoTeacher(
            @PathVariable Long id, 
            @RequestBody java.util.Map<String, String> body, 
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String email = body != null ? body.get("email") : null;
        return service.addCoTeacherByEmail(id, email, callerId);
    }

    @DeleteMapping("/{id}/teachers/{teacherId}")
    public void removeTeacher(
            @PathVariable Long id, 
            @PathVariable Long teacherId, 
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.removeTeacher(id, teacherId, callerId);
    }

    @GetMapping("/timetable")
    public List<com.edumanager.api.dto.TimetableSessionDTO> getTimetable(
            @RequestParam(required = false) Long classId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        return service.getTimetable(classId, callerId, callerRole);
    }

    @DeleteMapping("/{id}")
    public void deleteClass(@PathVariable Long id, HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        service.deleteClass(id, callerId);
    }
}