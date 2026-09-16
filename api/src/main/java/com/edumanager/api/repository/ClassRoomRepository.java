package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long> {
    Optional<ClassRoom> findByClassCode(String classCode);
    boolean existsByClassCode(String classCode);
    List<ClassRoom> findByTeacherId(Long teacherId);
    List<ClassRoom> findByTeacherIdOrTeacherIdIsNull(Long teacherId);

    @Query("SELECT DISTINCT c FROM ClassRoom c LEFT JOIN ClassTeacher ct ON ct.classRoom.id = c.id WHERE c.teacherId = :teacherId OR ct.teacher.id = :teacherId")
    List<ClassRoom> findAllForTeacher(@Param("teacherId") Long teacherId);

    List<ClassRoom> findByEndDateBefore(java.time.LocalDate cutoff);
}