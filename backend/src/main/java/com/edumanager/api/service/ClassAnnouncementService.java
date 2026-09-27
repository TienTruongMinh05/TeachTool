package com.edumanager.api.service;

import com.edumanager.api.entity.ClassAnnouncement;
import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.ClassAnnouncementRepository;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassAnnouncementService {

    private final ClassAnnouncementRepository announcementRepository;
    private final ClassRoomRepository classRoomRepository;
    private final UserRepository userRepository;
    private final ClassRoomService classRoomService;

    public List<ClassAnnouncement> getAnnouncements(Long classId, Long callerId, String callerRole) {
        if (!classRoomService.canAccessClass(classId, callerId, callerRole)) {
            throw new SecurityException("Bạn không có quyền truy cập thông báo của lớp này.");
        }
        return announcementRepository.findByClassRoomIdOrderByPinnedAndCreatedAt(classId);
    }

    @Transactional
    public ClassAnnouncement createAnnouncement(Long classId, String title, String content, Boolean isPinned, String attachmentsJson, Long teacherId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học"));
        
        if (!classRoomService.isTeacherOfClass(classRoom, teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền tạo thông báo.");
        }

        User author = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giáo viên"));

        ClassAnnouncement announcement = ClassAnnouncement.builder()
                .classRoom(classRoom)
                .author(author)
                .title(title)
                .content(content)
                .isPinned(isPinned != null ? isPinned : false)
                .attachmentsJson(attachmentsJson)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return announcementRepository.save(announcement);
    }

    @Transactional
    public ClassAnnouncement updateAnnouncement(Long announcementId, String title, String content, String attachmentsJson, Long teacherId) {
        ClassAnnouncement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo"));

        if (!classRoomService.isTeacherOfClass(announcement.getClassRoom(), teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền chỉnh sửa thông báo.");
        }

        if (title != null && !title.trim().isEmpty()) {
            announcement.setTitle(title.trim());
        }
        if (content != null) {
            announcement.setContent(content.trim());
        }
        if (attachmentsJson != null) {
            announcement.setAttachmentsJson(attachmentsJson);
        }
        announcement.setUpdatedAt(LocalDateTime.now());

        return announcementRepository.save(announcement);
    }

    @Transactional
    public ClassAnnouncement togglePin(Long announcementId, Long teacherId) {
        ClassAnnouncement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo"));

        if (!classRoomService.isTeacherOfClass(announcement.getClassRoom(), teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền ghim thông báo.");
        }

        announcement.setIsPinned(!Boolean.TRUE.equals(announcement.getIsPinned()));
        announcement.setUpdatedAt(LocalDateTime.now());
        return announcementRepository.save(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Long announcementId, Long teacherId) {
        ClassAnnouncement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo"));

        if (!classRoomService.isTeacherOfClass(announcement.getClassRoom(), teacherId)) {
            throw new SecurityException("Chỉ giáo viên phụ trách mới có quyền xóa thông báo.");
        }

        announcementRepository.delete(announcement);
    }
}
