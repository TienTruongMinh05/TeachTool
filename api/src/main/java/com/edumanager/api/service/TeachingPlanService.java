package com.edumanager.api.service;

import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.Session;
import com.edumanager.api.entity.TeachingPlan;
import com.edumanager.api.entity.TeachingPlanSection;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.SessionRepository;
import com.edumanager.api.repository.TeachingPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TeachingPlanService {
    private final TeachingPlanRepository planRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SessionRepository sessionRepository;

    public List<TeachingPlan> getPlansByClass(Long classId) {
        return planRepository.findByClassRoomId(classId);
    }

    public TeachingPlan getPlanById(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kế hoạch giảng dạy có ID: " + id));
    }

    @Transactional
    public TeachingPlan createPlan(Long classId, Long sessionId, TeachingPlan plan) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học có ID: " + classId));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học có ID: " + sessionId));

        Optional<TeachingPlan> existingPlanOpt = planRepository.findBySessionId(sessionId);
        TeachingPlan targetPlan;
        if (existingPlanOpt.isPresent()) {
            targetPlan = existingPlanOpt.get();
            if (plan.getTitle() != null && !plan.getTitle().isBlank()) {
                targetPlan.setTitle(plan.getTitle());
            }
        } else {
            targetPlan = plan;
            targetPlan.setClassRoom(classRoom);
            targetPlan.setSession(session);
            if (targetPlan.getTitle() == null || targetPlan.getTitle().isBlank()) {
                targetPlan.setTitle("Kế hoạch: " + (session.getTopic() != null ? session.getTopic() : "Buổi học " + session.getId()));
            }
            if (targetPlan.getSections() == null) {
                targetPlan.setSections(new ArrayList<>());
            }
        }

        if (plan.getSections() != null) {
            targetPlan.getSections().clear();
            for (TeachingPlanSection section : plan.getSections()) {
                section.setId(null);
                section.setTeachingPlan(targetPlan);
                targetPlan.getSections().add(section);
            }
        }

        return planRepository.save(targetPlan);
    }

    @Transactional
    public TeachingPlan updatePlan(Long planId, TeachingPlan updated) {
        TeachingPlan existing = getPlanById(planId);

        if (updated.getTitle() != null && !updated.getTitle().isBlank()) {
            existing.setTitle(updated.getTitle());
        }

        if (updated.getSession() != null && updated.getSession().getId() != null) {
            Session session = sessionRepository.findById(updated.getSession().getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học"));
            existing.setSession(session);
        }

        // Cập nhật danh sách học phần
        existing.getSections().clear();
        if (updated.getSections() != null) {
            for (TeachingPlanSection s : updated.getSections()) {
                s.setId(null); // Tạo mới bản ghi section trong plan
                s.setTeachingPlan(existing);
                existing.getSections().add(s);
            }
        }

        return planRepository.save(existing);
    }

    @Transactional
    public void deletePlan(Long planId) {
        if (!planRepository.existsById(planId)) {
            throw new RuntimeException("Không tìm thấy kế hoạch giảng dạy có ID: " + planId);
        }
        planRepository.deleteById(planId);
    }

    @Transactional
    public TeachingPlan copyPlan(Long planId, Long targetSessionId) {
        TeachingPlan source = getPlanById(planId);
        Session targetSession = sessionRepository.findById(targetSessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi học đích có ID: " + targetSessionId));

        TeachingPlan copy = TeachingPlan.builder()
                .classRoom(source.getClassRoom())
                .session(targetSession)
                .title(source.getTitle() + " (Bản sao)")
                .sections(new ArrayList<>())
                .build();

        if (source.getSections() != null) {
            for (TeachingPlanSection srcSection : source.getSections()) {
                TeachingPlanSection sectionCopy = TeachingPlanSection.builder()
                        .teachingPlan(copy)
                        .timeAllocation(srcSection.getTimeAllocation())
                        .content(srcSection.getContent())
                        .activity(srcSection.getActivity())
                        .handoutType(srcSection.getHandoutType())
                        .handoutText(srcSection.getHandoutText())
                        .handoutFileName(srcSection.getHandoutFileName())
                        .handoutFilePath(srcSection.getHandoutFilePath())
                        .studentPreparation(srcSection.getStudentPreparation())
                        .orderIndex(srcSection.getOrderIndex())
                        .build();
                copy.getSections().add(sectionCopy);
            }
        }

        return planRepository.save(copy);
    }
}
