package com.edumanager.api.config;

import com.edumanager.api.entity.ClassRoom;
import com.edumanager.api.entity.ClassTeacher;
import com.edumanager.api.entity.User;
import com.edumanager.api.repository.ClassRoomRepository;
import com.edumanager.api.repository.ClassTeacherRepository;
import com.edumanager.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class LegacyDataMigrationRunner implements CommandLineRunner {

    private final ClassRoomRepository classRoomRepository;
    private final ClassTeacherRepository classTeacherRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            log.info("[DataMigration] Checking legacy classes without assigned teacher...");

            // 1. Tìm tài khoản giáo viên chủ nhiệm awn5024@gmail.com
            Optional<User> defaultTeacherOpt = userRepository.findByEmail("awn5024@gmail.com");
            if (defaultTeacherOpt.isEmpty()) {
                defaultTeacherOpt = userRepository.findAll().stream()
                        .filter(u -> "TEACHER".equalsIgnoreCase(u.getRole()))
                        .findFirst();
            }

            if (defaultTeacherOpt.isEmpty()) {
                log.warn("[DataMigration] No teacher account found in database. Skipping legacy class migration.");
                return;
            }

            User defaultTeacher = defaultTeacherOpt.get();

            // 2. Gán các lớp chưa có teacher_id cho giáo viên chính
            List<ClassRoom> allClasses = classRoomRepository.findAll();
            for (ClassRoom cls : allClasses) {
                boolean modified = false;
                if (cls.getTeacherId() == null) {
                    log.info("[DataMigration] Assigning legacy class '{}' (id={}) to teacher '{}' (id={})",
                            cls.getName(), cls.getId(), defaultTeacher.getEmail(), defaultTeacher.getId());
                    cls.setTeacherId(defaultTeacher.getId());
                    modified = true;
                }

                if (cls.getClassCode() == null || cls.getClassCode().trim().isEmpty()) {
                    cls.setClassCode(generateUniqueClassCode());
                    modified = true;
                }

                if (modified) {
                    classRoomRepository.save(cls);
                }

                // 3. Đảm bảo mọi lớp đều có bản ghi PRIMARY trong class_teachers
                Long ownerId = cls.getTeacherId() != null ? cls.getTeacherId() : defaultTeacher.getId();
                if (!classTeacherRepository.existsByClassRoomIdAndTeacherId(cls.getId(), ownerId)) {
                    userRepository.findById(ownerId).ifPresent(owner -> {
                        classTeacherRepository.save(ClassTeacher.builder()
                                .classRoom(cls)
                                .teacher(owner)
                                .roleInClass("PRIMARY")
                                .joinedAt(LocalDateTime.now())
                                .build());
                        log.info("[DataMigration] Created PRIMARY class_teachers record for class id={} and teacher id={}",
                                cls.getId(), owner.getId());
                    });
                }
            }

            log.info("[DataMigration] Legacy classes migration completed successfully.");
        } catch (Exception e) {
            log.error("[DataMigration] Error during legacy classes migration: {}", e.getMessage(), e);
        }
    }

    private String generateUniqueClassCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (classRoomRepository.existsByClassCode(code));
        return code;
    }
}
