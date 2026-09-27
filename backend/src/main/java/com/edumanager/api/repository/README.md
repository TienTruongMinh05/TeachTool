# 🗄️ Gói Kho Dữ Liệu (Package: `com.edumanager.api.repository`)

Thư mục này chứa các Interface Spring Data JPA Repository, cung cấp các hàm thao tác CRUD (Create, Read, Update, Delete) và các câu truy vấn JPQL/Native SQL tối ưu cho PostgreSQL.

---

## 📂 Danh sách các Repository & Mục đích sử dụng

| Interface Repository | Thực thể quản lý | Các truy vấn tiêu biểu |
| :--- | :--- | :--- |
| `UserRepository.java` | `User` | Tìm người dùng theo email (`findByEmail`), kiểm tra email tồn tại. |
| `ClassRoomRepository.java` | `ClassRoom` | Tìm lớp theo giáo viên chủ nhiệm (`findByTeacherId`), tìm theo mã lớp (`findByClassCode`). |
| `ClassTeacherRepository.java` | `ClassTeacher` | Tìm danh sách giáo viên phụ trách lớp, tìm các lớp mà 1 giáo viên được phân công. |
| `EnrollmentRepository.java` | `Enrollment` | Lấy danh sách học sinh theo lớp, kiểm tra học sinh đã ghi danh vào lớp chưa. |
| `SessionRepository.java` | `Session` | Lấy các buổi học của lớp sắp xếp theo thời gian tăng dần (`findByClassRoomIdOrderByStartTimeAsc`). |
| `TeachingPlanRepository.java` | `TeachingPlan` | Tìm giáo án theo buổi học (`findBySessionId`). |
| `ActivityTemplateRepository.java` | `ActivityTemplate` | Lấy danh mục 28 hoạt động dạy học mẫu. |
| `ClassMaterialRepository.java` | `ClassMaterial` | Lấy danh sách tài liệu/sách PDF theo lớp (`findByClassRoomId`). |
| `AssignmentRepository.java` | `Assignment` | Lấy bài tập theo lớp hoặc buổi học, tìm bài tập đến hạn dọn dẹp. |
| `SubmissionRepository.java` | `Submission` | Lấy bài nộp theo bài tập, theo học sinh, theo lớp học (`findByClassRoomId`), tìm bài nộp trước thời hạn cutoff để xóa. |
| `AttendanceRepository.java` | `Attendance` | Lấy bản ghi điểm danh theo buổi học, theo học sinh, theo toàn bộ lớp học, và đếm số buổi vắng trong tháng (`countAbsencesInMonth`) để kiểm soát hạn mức 2 buổi/tháng. |
| `StoredFileRepository.java` | `StoredFile` | Tìm tệp tin theo tên lưu trữ UUID (`findByStoredName`), tìm tệp mồ côi (orphaned files). |
| `StoredFileChunkRepository.java` | `StoredFileChunk` | Đọc và ghi các khối nhị phân 1MB của tệp tin theo thứ tự `chunk_index`. |
