package com.edumanager.api.controller;

import com.edumanager.api.dto.ClassMaterialDTO;
import com.edumanager.api.service.ClassMaterialService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes/{classId}/materials")
@RequiredArgsConstructor
public class ClassMaterialController {

    private final ClassMaterialService materialService;

    // Lấy danh sách sách / tài liệu của lớp
    @GetMapping
    public ResponseEntity<List<ClassMaterialDTO>> getMaterials(
            @PathVariable Long classId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        String callerRole = (String) request.getAttribute("userRole");
        List<ClassMaterialDTO> list = materialService.getMaterialsByClass(classId, callerId, callerRole);
        return ResponseEntity.ok(list);
    }

    // Thêm sách / tài liệu mới vào lớp
    @PostMapping
    public ResponseEntity<ClassMaterialDTO> createMaterial(
            @PathVariable Long classId,
            @RequestBody ClassMaterialDTO dto,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        ClassMaterialDTO created = materialService.createMaterial(classId, dto, callerId);
        return ResponseEntity.ok(created);
    }

    // Xóa sách / tài liệu khỏi lớp
    @DeleteMapping("/{materialId}")
    public ResponseEntity<Void> deleteMaterial(
            @PathVariable Long classId,
            @PathVariable Long materialId,
            HttpServletRequest request) {
        Long callerId = (Long) request.getAttribute("userId");
        materialService.deleteMaterial(classId, materialId, callerId);
        return ResponseEntity.noContent().build();
    }
}
