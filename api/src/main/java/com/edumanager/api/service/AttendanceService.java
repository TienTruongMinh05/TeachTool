// File: src/main/java/com/edumanager/api/service/AttendanceService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.Attendance;
import com.edumanager.api.entity.Session;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.AttendanceRepository;
import com.edumanager.api.repository.SessionRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

import com.edumanager.api.dto.AttendanceItemDTO;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AttendanceService {
    private final AttendanceRepository attendanceRepo;
    private final SessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final ClassRoomService classRoomService;

    public Attendance markAttendance(Long sessionId, Long studentId, String status, String note) {
        return markAttendance(sessionId, studentId, status, note, null);
    }

    public Attendance markAttendance(Long sessionId, Long studentId, String status, String note, Long callerId) {
        Session session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));
        User student = userRepo.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh có ID: " + studentId));

        if (callerId != null && session.getClassRoom() != null && !classRoomService.isTeacherOfClass(session.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của buổi học này.");
        }

        Attendance attendance = attendanceRepo.findBySessionIdAndStudentId(sessionId, studentId)
                .orElse(Attendance.builder()
                        .session(session)
                        .student(student)
                        .build());
        attendance.setStatus(status);
        attendance.setNote(note);
        return attendanceRepo.save(attendance);
    }

    @Transactional
    public List<Attendance> batchMarkAttendance(Long sessionId, List<AttendanceItemDTO> items, Long callerId) {
        Session session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));

        if (callerId != null && session.getClassRoom() != null && !classRoomService.isTeacherOfClass(session.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của buổi học này.");
        }

        return items.stream().map(item -> {
            User student = userRepo.findById(item.studentId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh có ID: " + item.studentId()));
            Attendance attendance = attendanceRepo.findBySessionIdAndStudentId(sessionId, item.studentId())
                    .orElse(Attendance.builder()
                            .session(session)
                            .student(student)
                            .build());
            attendance.setStatus(item.status());
            attendance.setNote(item.note());
            return attendanceRepo.save(attendance);
        }).toList();
    }

    public List<Attendance> getAttendanceBySession(Long sessionId) {
        return attendanceRepo.findBySessionId(sessionId);
    }

    public List<Attendance> getAttendanceByClass(Long classId) {
        return attendanceRepo.findBySessionClassRoomId(classId);
    }
}