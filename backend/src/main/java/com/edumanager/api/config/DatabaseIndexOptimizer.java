package com.edumanager.api.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tối ưu hóa cơ sở dữ liệu: Tự động khởi tạo các chỉ mục (Indexes)
 * nhằm tăng tốc tối đa các truy vấn tìm kiếm lớp học, bài nộp, điểm danh và tệp tin.
 * Chạy an toàn với mệnh đề "IF NOT EXISTS", không làm gián đoạn hệ thống.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseIndexOptimizer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void optimizeDatabaseIndexes() {
        List<String> indexStatements = List.of(
            // 1. Chỉ mục bài tập (Assignments)
            "CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id)",
            "CREATE INDEX IF NOT EXISTS idx_assignments_session_id ON assignments(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date)",
            "CREATE INDEX IF NOT EXISTS idx_assignments_publish_at ON assignments(scheduled_publish_at)",

            // 2. Chỉ mục bài nộp của học sinh (Submissions)
            "CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id)",
            "CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id)",
            "CREATE INDEX IF NOT EXISTS idx_submissions_asgn_student ON submissions(assignment_id, student_id)",
            "CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at)",

            // 3. Chỉ mục điểm danh (Attendances)
            "CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON attendances(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id)",
            "CREATE INDEX IF NOT EXISTS idx_attendances_session_student ON attendances(session_id, student_id)",

            // 4. Chỉ mục học sinh trong lớp (Enrollments)
            "CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id)",
            "CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id)",
            "CREATE INDEX IF NOT EXISTS idx_enrollments_class_student ON enrollments(class_id, student_id)",

            // 5. Chỉ mục các buổi học (Sessions)
            "CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)",

            // 6. Chỉ mục lớp học & Giáo viên chủ nhiệm
            "CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id)",

            // 7. Chỉ mục giáo án (Teaching Plans & Sections)
            "CREATE INDEX IF NOT EXISTS idx_teaching_plans_class_id ON teaching_plans(class_id)",
            "CREATE INDEX IF NOT EXISTS idx_teaching_plans_session_id ON teaching_plans(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_tplan_sections_plan_id ON teaching_plan_sections(teaching_plan_id)",

            // 8. Chỉ mục tài liệu và sách số
            "CREATE INDEX IF NOT EXISTS idx_class_materials_class_id ON class_materials(class_id)"
        );

        log.info("[DB Index Optimizer] Bắt đầu rà soát và tạo các chỉ mục cơ sở dữ liệu...");
        int createdOrVerified = 0;

        for (String sql : indexStatements) {
            try {
                jdbcTemplate.execute(sql);
                createdOrVerified++;
            } catch (Exception e) {
                log.debug("[DB Index Optimizer] Bỏ qua chỉ mục ({}) do bảng chưa tồn tại hoặc lỗi cú pháp: {}", sql, e.getMessage());
            }
        }

        log.info("[DB Index Optimizer] Hoàn tất tối ưu hóa chỉ mục cơ sở dữ liệu: {} chỉ mục sẵn sàng.", createdOrVerified);
    }
}
