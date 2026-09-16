package com.edumanager.api.service;

import com.edumanager.api.entity.*;
import com.edumanager.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataRetentionService {

    private final SubmissionRepository submissionRepository;
    private final StoredFileRepository storedFileRepository;
    private final SessionRepository sessionRepository;
    private final AttendanceRepository attendanceRepository;
    private final TeachingPlanRepository teachingPlanRepository;
    private final AssignmentRepository assignmentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassMaterialRepository classMaterialRepository;
    private final UserRepository userRepository;
    private final ClassRoomService classRoomService;

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    /**
     * Tự động dọn dẹp hàng ngày lúc 03:00 sáng
     * Và chạy 1 lượt khi máy chủ khởi động thành công
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void scheduledCleanup() {
        log.info("[DataRetention] Starting scheduled data retention cleanup cycle...");
        runRetentionCleanup();
        log.info("[DataRetention] Scheduled data retention cleanup cycle completed.");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartupCleanup() {
        new Thread(() -> {
            try {
                // Đợi 15 giây sau khi ứng dụng khởi động hoàn toàn để tránh nghẽn I/O lúc boot
                Thread.sleep(15000);
                log.info("[DataRetention] Running startup data retention check...");
                runRetentionCleanup();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                log.error("[DataRetention] Error during startup cleanup: {}", e.getMessage(), e);
            }
        }, "data-retention-startup-worker").start();
    }

    public synchronized void runRetentionCleanup() {
        try {
            purgeExpiredStudentSubmissions();
            purgeExpiredTeacherData();
            purgeOrphanedStoredFiles();
        } catch (Exception e) {
            log.error("[DataRetention] Uncaught error during data retention cleanup: {}", e.getMessage(), e);
        }
    }

    /**
     * 1. HỌC SINH: Bài học sinh đã nộp chỉ lưu trữ trong 2 tuần (14 ngày).
     * Sau 14 ngày, bài nộp và tệp đính kèm nhị phân trong stored_files / uploads sẽ bị xóa để tiết kiệm không gian lưu trữ.
     */
    @Transactional
    public void purgeExpiredStudentSubmissions() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        List<Submission> expiredSubmissions = submissionRepository.findBySubmittedAtBefore(cutoff);
        if (expiredSubmissions.isEmpty()) {
            return;
        }

        log.info("[DataRetention] Found {} student submissions older than 14 days (cutoff: {}). Purging...", 
                expiredSubmissions.size(), cutoff);

        int fileCount = 0;
        for (Submission sub : expiredSubmissions) {
            String storedName = extractStoredName(sub.getFileUrl());
            if (storedName != null) {
                deleteStoredFile(storedName);
                fileCount++;
            }
        }

        submissionRepository.deleteAll(expiredSubmissions);
        log.info("[DataRetention] Purged {} student submissions and {} attached files.", 
                expiredSubmissions.size(), fileCount);
    }

    /**
     * 2. GIÁO VIÊN: Dữ liệu phía giáo viên (lớp học, lịch học, sách, buổi học, giáo án/học phần) lưu trong 6 tháng.
     * Dọn dẹp:
     * - Các lớp học đã kết thúc hơn 6 tháng (endDate < now - 6 months).
     * - Các buổi học cũ hơn 6 tháng (startTime < now - 6 months) cùng giáo án và điểm danh liên quan.
     */
    @Transactional
    public void purgeExpiredTeacherData() {
        LocalDate classCutoff = LocalDate.now().minusMonths(6);
        LocalDateTime sessionCutoff = LocalDateTime.now().minusMonths(6);

        // A. Dọn dẹp các lớp học đã kết thúc hơn 6 tháng
        List<ClassRoom> expiredClasses = classRoomRepository.findByEndDateBefore(classCutoff);
        if (!expiredClasses.isEmpty()) {
            log.info("[DataRetention] Found {} classes ended more than 6 months ago (cutoff: {}). Purging...", 
                    expiredClasses.size(), classCutoff);
            for (ClassRoom cls : expiredClasses) {
                try {
                    // Xóa file tài liệu/sách của lớp trong stored_files
                    List<ClassMaterial> materials = classMaterialRepository.findByClassRoomIdOrderByCreatedAtDesc(cls.getId());
                    for (ClassMaterial mat : materials) {
                        String storedName = extractStoredName(mat.getFileUrl());
                        if (storedName != null) {
                            deleteStoredFile(storedName);
                        }
                    }
                    classRoomService.deleteClass(cls.getId(), null);
                    log.info("[DataRetention] Successfully deleted expired class id={} name={}", cls.getId(), cls.getName());
                } catch (Exception ex) {
                    log.error("[DataRetention] Failed to delete expired class id={}: {}", cls.getId(), ex.getMessage());
                }
            }
        }

        // B. Dọn dẹp các buổi học cũ hơn 6 tháng (dành cho lớp đang mở nhưng buổi học đã quá 6 tháng)
        List<Session> expiredSessions = sessionRepository.findByStartTimeBefore(sessionCutoff);
        if (!expiredSessions.isEmpty()) {
            log.info("[DataRetention] Found {} sessions older than 6 months (cutoff: {}). Purging...", 
                    expiredSessions.size(), sessionCutoff);
            for (Session session : expiredSessions) {
                try {
                    // Xóa điểm danh của buổi
                    attendanceRepository.deleteBySessionId(session.getId());
                    // Xóa kế hoạch bài giảng của buổi
                    teachingPlanRepository.deleteBySessionId(session.getId());
                    // Xóa buổi học
                    sessionRepository.delete(session);
                } catch (Exception ex) {
                    log.error("[DataRetention] Failed to delete expired session id={}: {}", session.getId(), ex.getMessage());
                }
            }
            log.info("[DataRetention] Purged {} expired sessions older than 6 months.", expiredSessions.size());
        }
    }

    /**
     * 3. TỆP RÁC (ORPHANED FILES):
     * Dọn dẹp các tệp tải lên quá 14 ngày không còn được liên kết với bất kỳ Tài liệu lớp học, Bài tập, Bài nộp hay Avatar nào.
     */
    @Transactional
    public void purgeOrphanedStoredFiles() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        List<StoredFile> oldFiles = storedFileRepository.findByCreatedAtBefore(cutoff);
        if (oldFiles.isEmpty()) {
            return;
        }

        // Thu thập tất cả các storedName đang được sử dụng hợp lệ trong hệ thống
        Set<String> activeFileNames = classMaterialRepository.findAll().stream()
                .map(m -> extractStoredName(m.getFileUrl()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        activeFileNames.addAll(assignmentRepository.findAll().stream()
                .map(a -> extractStoredName(a.getAttachmentFileUrl()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet()));

        activeFileNames.addAll(submissionRepository.findAll().stream()
                .map(s -> extractStoredName(s.getFileUrl()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet()));

        activeFileNames.addAll(userRepository.findAll().stream()
                .map(u -> extractStoredName(u.getAvatarUrl()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet()));

        int purgedCount = 0;
        for (StoredFile sf : oldFiles) {
            if (!activeFileNames.contains(sf.getStoredName())) {
                deleteStoredFile(sf.getStoredName());
                purgedCount++;
            }
        }

        if (purgedCount > 0) {
            log.info("[DataRetention] Purged {} orphaned stored files older than 14 days.", purgedCount);
        }
    }

    private String extractStoredName(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return null;
        int lastSlash = fileUrl.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < fileUrl.length() - 1) {
            String candidate = fileUrl.substring(lastSlash + 1).trim();
            int questionMark = candidate.indexOf('?');
            if (questionMark >= 0) {
                candidate = candidate.substring(0, questionMark);
            }
            return candidate;
        }
        return null;
    }

    private void deleteStoredFile(String storedName) {
        if (storedName == null || storedName.isBlank()) return;
        try {
            storedFileRepository.findByStoredName(storedName).ifPresent(storedFileRepository::delete);
        } catch (Exception e) {
            log.warn("[DataRetention] Could not delete StoredFile entity for {}: {}", storedName, e.getMessage());
        }

        try {
            Path filePath = uploadDir.resolve(storedName).normalize();
            if (filePath.startsWith(uploadDir) && Files.exists(filePath)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            log.warn("[DataRetention] Could not delete disk file for {}: {}", storedName, e.getMessage());
        }
    }
}
