package com.edumanager.api.repository;

import com.edumanager.api.entity.ClassTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassTeacherRepository extends JpaRepository<ClassTeacher, Long> {
    @Query("SELECT ct FROM ClassTeacher ct WHERE ct.classRoom.id = :classId")
    List<ClassTeacher> findByClassRoomId(@Param("classId") Long classId);

    @Query("SELECT ct FROM ClassTeacher ct WHERE ct.teacher.id = :teacherId")
    List<ClassTeacher> findByTeacherId(@Param("teacherId") Long teacherId);

    @Query("SELECT COUNT(ct) > 0 FROM ClassTeacher ct WHERE ct.classRoom.id = :classId AND ct.teacher.id = :teacherId")
    boolean existsByClassRoomIdAndTeacherId(@Param("classId") Long classId, @Param("teacherId") Long teacherId);

    @Query("SELECT ct FROM ClassTeacher ct WHERE ct.classRoom.id = :classId AND ct.teacher.id = :teacherId")
    Optional<ClassTeacher> findByClassRoomIdAndTeacherId(@Param("classId") Long classId, @Param("teacherId") Long teacherId);

    @Modifying
    @Query("DELETE FROM ClassTeacher ct WHERE ct.classRoom.id = :classId")
    void deleteByClassRoomId(@Param("classId") Long classId);

    @Modifying
    @Query("DELETE FROM ClassTeacher ct WHERE ct.classRoom.id = :classId AND ct.teacher.id = :teacherId")
    void deleteByClassRoomIdAndTeacherId(@Param("classId") Long classId, @Param("teacherId") Long teacherId);
}
