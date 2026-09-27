// File: src/main/java/com/edumanager/api/service/EnrollmentService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Enrollment;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.EnrollmentRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EnrollmentService {
    private final EnrollmentRepository enrollmentRepo;
    private final UserRepository userRepo;
    private final ClassRoomRepository classRepo;

    public Enrollment enrollStudent(Long classId, Long studentId) {
        ClassRoom classRoom = classRepo.findById(classId).orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));
        User student = userRepo.findById(studentId).orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh"));

        return enrollmentRepo.findByClassRoomIdAndStudentId(classId, studentId)
                .orElseGet(() -> enrollmentRepo.save(Enrollment.builder()
                        .classRoom(classRoom)
                        .student(student)
                        .build()));
    }

    public Enrollment enrollStudentByCode(String classCode, Long studentId) {
        if (classCode == null || classCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã lớp không được để trống");
        }
        String cleanCode = classCode.trim().toUpperCase();
        ClassRoom classRoom = classRepo.findByClassCode(cleanCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có mã: " + cleanCode));
        
        return enrollStudent(classRoom.getId(), studentId);
    }

    public List<ClassRoom> getClassesByStudent(Long studentId) {
        List<Enrollment> enrollments = enrollmentRepo.findByStudentId(studentId);
        return enrollments.stream().map(Enrollment::getClassRoom).toList();
    }

    public List<Enrollment> getStudentsByClass(Long classId) {
        return enrollmentRepo.findByClassRoomId(classId);
    }

    @Transactional
    public void removeStudentFromClass(Long classId, Long studentId) {
        enrollmentRepo.deleteByClassRoomIdAndStudentId(classId, studentId);
    }

    public List<com.edumanager.api.dto.AllStudentDTO> getAllStudentsWithClasses() {
        List<Enrollment> allEnrollments = enrollmentRepo.findAll();
        java.util.Map<Long, User> studentMap = new java.util.LinkedHashMap<>();
        java.util.Map<Long, List<ClassRoom>> classesMap = new java.util.LinkedHashMap<>();

        for (Enrollment e : allEnrollments) {
            User s = e.getStudent();
            ClassRoom c = e.getClassRoom();
            if (s != null) {
                studentMap.putIfAbsent(s.getId(), s);
                classesMap.computeIfAbsent(s.getId(), k -> new java.util.ArrayList<>());
                if (c != null && !classesMap.get(s.getId()).contains(c)) {
                    classesMap.get(s.getId()).add(c);
                }
            }
        }

        List<User> allUsers = userRepo.findAll();
        for (User u : allUsers) {
            if ("STUDENT".equalsIgnoreCase(u.getRole())) {
                studentMap.putIfAbsent(u.getId(), u);
                classesMap.putIfAbsent(u.getId(), new java.util.ArrayList<>());
            }
        }

        List<com.edumanager.api.dto.AllStudentDTO> result = new java.util.ArrayList<>();
        for (java.util.Map.Entry<Long, User> entry : studentMap.entrySet()) {
            User u = entry.getValue();
            List<ClassRoom> clsList = classesMap.getOrDefault(entry.getKey(), java.util.Collections.emptyList());
            List<com.edumanager.api.dto.ClassSummaryDTO> classDTOs = clsList.stream()
                    .map(c -> new com.edumanager.api.dto.ClassSummaryDTO(c.getId(), c.getName(), c.getClassCode()))
                    .toList();
            result.add(new com.edumanager.api.dto.AllStudentDTO(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    classDTOs
            ));
        }

        // Sắp xếp theo tên học sinh
        result.sort((a, b) -> {
            String nameA = a.studentName() != null ? a.studentName() : "";
            String nameB = b.studentName() != null ? b.studentName() : "";
            return nameA.compareToIgnoreCase(nameB);
        });

        return result;
    }
}