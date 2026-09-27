package com.edumanager.api.service;

import com.edumanager.api.dto.ClassMaterialDTO;
import com.edumanager.api.entity.ClassMaterial;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.repository.ClassMaterialRepository;
import com.edumanager.api.repository.ClassRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassMaterialService {

    private final ClassMaterialRepository materialRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassRoomService classRoomService;

    // Lấy danh sách sách / tài liệu của lớp (Dành cho cả Giáo viên và Học sinh trong lớp)
    public List<ClassMaterialDTO> getMaterialsByClass(Long classId, Long callerId, String callerRole) {
        if (callerId != null && !classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập danh sách tài liệu của lớp học này.");
        }
        return materialRepository.findByClassRoomIdOrderByCreatedAtDesc(classId)
                .stream()
                .map(ClassMaterialDTO::fromEntity)
                .toList();
    }

    // Thêm sách / tài liệu mới vào lớp (Chỉ giáo viên phụ trách)
    @Transactional
    public ClassMaterialDTO createMaterial(Long classId, ClassMaterialDTO dto, Long callerId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học với ID: " + classId));

        if (callerId != null && !classRoomService.isTeacherOfClass(classRoom, callerId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách lớp mới có quyền thêm sách / tài liệu.");
        }

        if (dto.title() == null || dto.title().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên sách / tài liệu không được để trống.");
        }
        if (dto.fileUrl() == null || dto.fileUrl().trim().isEmpty()) {
            throw new IllegalArgumentException("Đường dẫn tệp tài liệu (fileUrl) không được để trống.");
        }

        ClassMaterial material = ClassMaterial.builder()
                .classRoom(classRoom)
                .title(dto.title().trim())
                .category(dto.category() != null && !dto.category().isBlank() ? dto.category().trim() : "Sách giáo khoa")
                .fileUrl(dto.fileUrl().trim())
                .fileName(dto.fileName() != null ? dto.fileName().trim() : null)
                .totalPages(dto.totalPages() != null && dto.totalPages() > 0 ? dto.totalPages() : 1)
                .description(dto.description() != null ? dto.description().trim() : null)
                .build();

        ClassMaterial saved = materialRepository.save(material);
        return ClassMaterialDTO.fromEntity(saved);
    }

    // Xóa sách / tài liệu khỏi lớp (Chỉ giáo viên phụ trách)
    @Transactional
    public void deleteMaterial(Long classId, Long materialId, Long callerId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học với ID: " + classId));

        if (callerId != null && !classRoomService.isTeacherOfClass(classRoom, callerId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách lớp mới có quyền xóa sách / tài liệu.");
        }

        ClassMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sách / tài liệu với ID: " + materialId));

        if (!material.getClassRoom().getId().equals(classId)) {
            throw new IllegalArgumentException("Tài liệu này không thuộc về lớp học đã chỉ định.");
        }

        materialRepository.delete(material);
    }
}
