# 🌐 Gói Bộ Điều Khiển API (Package: `com.edumanager.api.controller`)

Thư mục này chứa toàn bộ các lớp REST API Controller, tiếp nhận các yêu cầu HTTP từ Frontend, xử lý ủy quyền theo vai trò (Role-Based Access Control) và trả về dữ liệu chuẩn JSON.

---

## 📂 Danh sách các tệp & Mục đích sử dụng

| Tệp Controller | Chức năng & Các nghiệp vụ chính |
| :--- | :--- |
| `AuthController.java` | Tiếp nhận đăng nhập bằng Email/Mật khẩu và xác thực Google SSO Token (GIS). Cấp phát JWT token cho phiên làm việc. |
| `ClassRoomController.java` | Quản lý vòng đời lớp học: Tạo lớp mới, cập nhật tên/thời hạn, xóa lớp (chỉ dành cho giáo viên chủ nhiệm), xem thời khóa biểu tuần của lớp. |
| `ClassAttendanceController.java` | Cung cấp dữ liệu điểm danh tổng hợp của toàn bộ lớp học (`GET /api/classes/{classId}/attendance`). |
| `AttendanceController.java` | Điểm danh theo buổi học: Đánh dấu có mặt/vắng/trễ từng học sinh, điểm danh hàng loạt (`batchMark`). Endpoint `GET /api/sessions/{sessionId}/attendance` được bảo vệ theo chuẩn OWASP A01: Chỉ cho phép Giáo viên xem thông tin điểm danh và lý do vắng cá nhân của học sinh trong buổi học. |
| `AssignmentController.java` | Quản lý bài tập của giáo viên: Tạo bài tập đính kèm đa tệp (tối đa 5 file), hẹn giờ phát hành (`publishAt`), mở bài tức thì (`publish-now`), tự động lọc bài đã mở cho học sinh, sửa, xóa và truy vấn bài tập. |
| `SubmissionController.java` | Quản lý bài nộp học sinh: Học sinh nộp bài (5 hình thức), xóa bài nộp chưa chấm, giáo viên chấm điểm và lấy bài nộp theo lớp (`/class/{classId}`). |
| `SessionController.java` | Quản lý buổi học: Thêm buổi học mới, sửa thời gian, xóa buổi học, gắn tài liệu vào buổi học, và cập nhật/xóa thông báo đột xuất (`PATCH /{sessionId}/announcement`). |
| `TeachingPlanController.java` | Soạn thảo giáo án và kế hoạch giảng dạy buổi học: Chia mục (Warm-up, Presentation, Practice, Production), chọn trang sách giáo khoa. |
| `ActivityTemplateController.java` | Cung cấp danh mục các hoạt động dạy học TESOL & IELTS mẫu. Kiểm tra quyền `TEACHER` đối với các thao tác thêm, sửa, xóa; bảo vệ nghiêm ngặt các hoạt động mẫu mặc định của hệ thống (`is_system_default`), ngăn chặn người dùng xóa/sửa trái phép. |
| `ClassMaterialController.java` | Quản lý thư viện tài liệu và sách giáo khoa số của lớp (`ClassMaterial`), lưu trữ đường dẫn tệp PDF. |
| `EnrollmentController.java` | Quản lý danh sách học sinh tham gia lớp: Ghi danh bằng mã lớp 6 ký tự, gỡ học sinh khỏi lớp, mời giáo viên đồng phụ trách (Co-Teacher). Endpoint `GET /api/classes/{classId}/students` được bảo vệ quyền `TEACHER` chống thu thập dữ liệu cá nhân (PII leak). |
| `StudentPortalController.java` | Cổng chuyên biệt cho học sinh: Xem lịch học cá nhân, chi tiết buổi học, thông báo đột xuất, làm bài tập, báo vắng trước 4 tiếng (kiểm soát hạn mức 2 buổi/tháng, 3 cam kết bù bài bắt buộc) và tùy chọn Xin học Online (tự động thông báo giáo viên qua kênh chat). |
| `FileUploadController.java` | Quản lý upload và download tệp tin: Kiểm tra Whitelist định dạng an toàn, lưu trữ phân mảnh 1MB chunks vào PostgreSQL, đệm HTTP Cache-Control 7 ngày và ETag. Endpoint `/system-diag` được bảo vệ bằng quyền TEACHER và ẩn thông tin môi trường nhạy cảm. |
| `UserController.java` | Quản lý tài khoản: Cập nhật họ tên, mật khẩu, ảnh đại diện, xóa tài khoản cá nhân hoặc xóa tài khoản học sinh. |
| `TimesheetController.java` | Xuất bảng chấm công giảng dạy hàng tháng định dạng Excel (`.xlsx`) theo chuẩn văn phòng kế toán: Xem trước số liệu (`/api/timesheet/preview`) và tải file Excel (`/api/timesheet/export`) chứa danh sách buổi dạy, thời lượng và công thức tính tổng số giờ công tự động `=SUM(...)`. |
| `HealthController.java` | Endpoint kiểm tra tình trạng sống của dịch vụ (`/api/health`), phục vụ các công cụ giám sát Uptime của Render. |
