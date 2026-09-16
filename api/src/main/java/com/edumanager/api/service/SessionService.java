// File: src/main/java/com/edumanager/api/service/SessionService.java
package com.edumanager.api.service;

import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Session;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

import com.edumanager.api.repository.AttendanceRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionService {
    private final SessionRepository sessionRepo;
    private final ClassRoomRepository classRepo;
    private final AttendanceRepository attendanceRepo;
    private final com.edumanager.api.repository.TeachingPlanRepository teachingPlanRepo;
    private final ClassRoomService classRoomService;

    public Session createSession(Long classId, Session sessionInfo, Long callerId) {
        ClassRoom classRoom = classRepo.findById(classId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có ID: " + classId));
        
        if (callerId != null && !classRoomService.isTeacherOfClass(classRoom, callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học này.");
        }

        sessionInfo.setClassRoom(classRoom);

        if (sessionInfo.getDurationMinutes() != null && sessionInfo.getDurationMinutes() > 0 && sessionInfo.getStartTime() != null) {
            sessionInfo.setEndTime(sessionInfo.getStartTime().plusMinutes(sessionInfo.getDurationMinutes()));
        } else if (sessionInfo.getStartTime() != null && sessionInfo.getEndTime() != null) {
            long minutes = java.time.Duration.between(sessionInfo.getStartTime(), sessionInfo.getEndTime()).toMinutes();
            sessionInfo.setDurationMinutes((int) minutes);
        }

        return sessionRepo.save(sessionInfo);
    }

    public List<Session> getSessionsByClass(Long classId) {
        return sessionRepo.findByClassRoomId(classId);
    }

    public Session getSessionById(Long sessionId) {
        return sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));
    }

    public Session updateSession(Long sessionId, Session sessionInfo, Long callerId) {
        Session session = getSessionById(sessionId);
        if (callerId != null && session.getClassRoom() != null && !classRoomService.isTeacherOfClass(session.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của buổi học này.");
        }

        session.setTopic(sessionInfo.getTopic());
        session.setStartTime(sessionInfo.getStartTime());
        session.setDurationMinutes(sessionInfo.getDurationMinutes());

        if (sessionInfo.getDurationMinutes() != null && sessionInfo.getDurationMinutes() > 0 && sessionInfo.getStartTime() != null) {
            session.setEndTime(sessionInfo.getStartTime().plusMinutes(sessionInfo.getDurationMinutes()));
        } else if (sessionInfo.getEndTime() != null) {
            session.setEndTime(sessionInfo.getEndTime());
        }

        return sessionRepo.save(session);
    }

    @Transactional
    public void deleteSession(Long sessionId, Long callerId) {
        Session session = getSessionById(sessionId);
        if (callerId != null && session.getClassRoom() != null && !classRoomService.isTeacherOfClass(session.getClassRoom(), callerId)) {
            throw new SecurityException("Bạn không phải là giáo viên phụ trách lớp học của buổi học này.");
        }

        attendanceRepo.deleteBySessionId(sessionId);
        teachingPlanRepo.deleteBySessionId(sessionId);
        sessionRepo.deleteById(sessionId);
    }
}