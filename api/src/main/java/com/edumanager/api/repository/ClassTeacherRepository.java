package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ClassTeacherRepository extends JpaRepository<ClassTeacher, Long> {
    List<ClassTeacher> findByClassRoomId(Long classId);
    List<ClassTeacher> findByTeacherId(Long teacherId);
    boolean existsByClassRoomIdAndTeacherId(Long classId, Long teacherId);
    Optional<ClassTeacher> findByClassRoomIdAndTeacherId(Long classId, Long teacherId);
    void deleteByClassRoomId(Long classId);
    void deleteByClassRoomIdAndTeacherId(Long classId, Long teacherId);
}
