# 🏛️ Gói Thực Thể Cơ Sở Dữ Liệu (Package: `com.edumanager.api.entity`)

Thư mục này chứa các thực thể JPA (Java Persistence API), đại diện cho các bảng dữ liệu trong cơ sở dữ liệu PostgreSQL. Các lớp đều được đánh chỉ mục `@Index` tối ưu hóa hiệu năng truy vấn.

---

## 📂 Danh sách các thực thể & Bảng tương ứng

| Thực thể JPA | Bảng CSDL | Mô tả & Quan hệ dữ liệu |
| :--- | :--- | :--- |
| `User.java` | `users` | Tài khoản người dùng (Email, Họ tên, Vai trò `TEACHER`/`STUDENT`, Mật khẩu băm PBKDF2). |
| `ClassRoom.java` | `classes` | Lớp học (Tên lớp, Mã lớp ngẫu nhiên 6 ký tự `classCode`, Thời hạn bắt đầu/kết thúc, `teacher_id` chủ nhiệm). |
| `ClassTeacher.java` | `class_teachers` | Bảng phân quyền đồng giảng dạy: Gán giáo viên (`PRIMARY` hoặc `CO_TEACHER`) vào từng lớp. |
| `Enrollment.java` | `enrollments` | Bảng ghi danh: Mối quan hệ N-N giữa học sinh và lớp học. |
| `Session.java` | `sessions` | Buổi học của lớp (Chủ đề, Thời gian bắt đầu, Thời gian kết thúc, Thời lượng). |
| `TeachingPlan.java` | `teaching_plans` | Kế hoạch giảng dạy/Giáo án của từng buổi học. |
| `TeachingPlanSection.java` | `teaching_plan_sections` | Từng học phần trong giáo án (Warm-up, Presentation, Practice, Production), tài liệu phát tay, trang sách giáo khoa. |
| `ActivityTemplate.java` | `activity_templates` | Mẫu hoạt động sư phạm TESOL & IELTS tương tác, hỗ trợ cờ bảo vệ hệ thống `is_system_default`. |
| `ClassMaterial.java` | `class_materials` | Tài liệu học tập và sách giáo khoa PDF số hóa của lớp. |
| `Assignment.java` | `assignments` | Bài tập do giáo viên giao, hỗ trợ hẹn giờ phát hành (`scheduledPublishAt`, chỉ mục `idx_assignments_publish_at`), danh sách tệp đính kèm (`attachmentsJson`) tối đa 5 file và hạn nộp. |
| `Submission.java` | `submissions` | Bài làm do học sinh nộp (văn bản, tệp đính kèm, tệp ghi âm, ảnh), điểm số và nhận xét của giáo viên. |
| `Attendance.java` | `attendances` | Dữ liệu điểm danh (`PRESENT`, `ABSENT`, `LATE`) theo buổi học của từng học sinh. |
| `StoredFile.java` | `stored_files` | Metadata của tệp tin đã tải lên hệ thống (Tên lưu trữ UUID, tên gốc, loại MIME, kích thước). |
| `StoredFileChunk.java` | `stored_file_chunks` | Lưu trữ dữ liệu nhị phân của tệp tin được phân thành các khối 1MB trên PostgreSQL. |
