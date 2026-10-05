# 💼 Gói Dịch Vụ Nghiệp Vụ (Package: `com.edumanager.api.service`)

Thư mục này chứa tầng nghiệp vụ cốt lõi (Business Logic Layer) của hệ thống. Tầng Service đảm bảo tính toàn vẹn của dữ liệu thông qua các giao dịch `@Transactional`, áp dụng các quy tắc kiểm tra ràng buộc nghiệp vụ và bảo mật.

---

## 📂 Danh sách các tệp & Mục đích sử dụng

| Tệp Service | Trách nhiệm & Nghiệp vụ xử lý |
| :--- | :--- |
| `AuthService.java` | Xác thực người dùng, băm và đối soát mật khẩu PBKDF2, giải mã chữ ký Google GIS Token, sinh chuỗi JWT đăng nhập. |
| `ClassRoomService.java` | Nghiệp vụ lớp học: Khởi tạo mã lớp 6 ký tự không trùng lặp, kiểm tra quyền hạn giáo viên (chủ nhiệm vs đồng phụ trách), lấy thời khóa biểu tuần kết hợp. |
| `EnrollmentService.java` | Quản lý mối quan hệ học sinh - lớp học: Kiểm tra điều kiện ghi danh, xử lý gỡ học sinh khỏi lớp và phân quyền lớp. |
| `SessionService.java` | Quản lý các buổi học, tính toán khung thời gian bắt đầu/kết thúc, tích hợp trạng thái buổi học với thời khóa biểu. |
| `TeachingPlanService.java` | Xử lý kế hoạch giảng dạy buổi học, liên kết các học phần (TeachingPlanSection) và số trang tài liệu/sách giáo khoa. |
| `ActivityTemplateService.java` | Lưu trữ và cung cấp cấu trúc các hoạt động dạy học TESOL & IELTS chuẩn. Tự động bảo vệ các hoạt động hệ thống (`is_system_default`) chống chỉnh sửa hoặc xóa trái phép. |
| `AssignmentService.java` | Tạo, cập nhật và xóa bài tập; quản lý lịch hẹn giờ phát hành (`scheduledPublishAt`), mở bài tức thì (`publishNow`), lọc bài đã mở cho học sinh, lưu trữ đa tệp đính kèm (tối đa 5 file). |
| `SubmissionService.java` | Tiếp nhận bài nộp đa thức của học sinh, kiểm tra bài đã đến giờ mở nộp chưa, lưu trữ điểm số, nhận xét âm thanh ghép nối và xử lý xóa bài nộp an toàn. |
| `AttendanceService.java` | Ghi nhận và thống kê chuyên cần, đồng bộ tự động trạng thái khi học sinh báo vắng trước buổi học. |
| `ClassMaterialService.java` | Quản lý tài liệu sách giáo khoa, ghi nhận tổng số trang PDF phục vụ công cụ chọn trang học tập. |
| `TimesheetService.java` | Xử lý logic tổng hợp dữ liệu chấm công theo tháng của giáo viên: Lọc buổi dạy theo tháng/năm, tính thời lượng giờ dạy từng buổi và tạo file bảng tính Excel (`XSSFWorkbook`) chuẩn kế toán với các cột `No.`, `Class`, `Time`, `Duration`, `Content`, `Note` và công thức `=SUM(...)` tính `Total Hours`. |
| `UserService.java` | Cập nhật hồ sơ cá nhân, đổi mật khẩu và xử lý các ràng buộc khi xóa tài khoản người dùng. |
| `DataRetentionService.java` | Tác vụ định kỳ (Scheduled Task): Tự động dọn dẹp bài nộp học sinh sau 2 tuần và lớp học hết hạn sau 6 tháng để tối ưu dung lượng đám mây. |
