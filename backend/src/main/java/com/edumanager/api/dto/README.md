# 📨 Gói Đối Tượng Truyền Tải Dữ Liệu (Package: `com.edumanager.api.dto`)

Thư mục này chứa các lớp DTO (Data Transfer Objects), làm nhiệm vụ chuẩn hóa dữ liệu đầu vào (Request Payloads) và định dạng dữ liệu đầu ra (Response Data) gửi về cho Frontend, che giấu các trường nhạy cảm như mật khẩu hay cấu trúc nội bộ của Entity.

---

## 📂 Danh sách các DTO tiêu biểu

| Tệp DTO | Mục đích truyền tải dữ liệu |
| :--- | :--- |
| `LoginRequest.java` / `RegisterRequest.java` | Dữ liệu gửi lên khi đăng nhập hoặc đăng ký tài khoản mới. |
| `AuthResponseDTO.java` | Phản hồi thông tin đăng nhập thành công kèm chuỗi token JWT. |
| `UserResponseDTO.java` | Trả về thông tin người dùng an toàn (đã loại bỏ trường password). |
| `ClassResponseDTO.java` / `ClassSummaryDTO.java` | Trả về thông tin lớp học, mã lớp, vai trò giáo viên phụ trách. |
| `SessionResponseDTO.java` / `TimetableSessionDTO.java` | Dữ liệu buổi học định dạng cho thời khóa biểu và danh sách học phần. |
| `AssignmentResponseDTO.java` | Dữ liệu bài tập, trạng thái hẹn giờ phát hành (`scheduledPublishAt`, `isPublished`), danh sách file đính kèm (`attachmentsJson`) và hạn nộp. |
| `SubmissionResponseDTO.java` | Dữ liệu bài làm của học sinh, liên kết file/audio, điểm số và nhận xét. |
| `AttendanceResponseDTO.java` / `AttendanceItemDTO.java` | Kết quả điểm danh buổi học và ma trận chuyên cần. |
| `TeachingPlanResponseDTO.java` / `TeachingPlanSectionDTO.java` | Cấu trúc giáo án chi tiết từng mục và tài liệu phát tay. |
| `ClassMaterialDTO.java` | Thông tin tài liệu sách giáo khoa PDF và số trang đã nhận diện. |
| `EnrollmentResponseDTO.java` | Danh sách học sinh ghi danh trong lớp: ID ghi danh, ID học sinh (`studentId`), Họ và tên (`studentName`/`fullName`) và Email (`studentEmail`/`email`). |

