# 📄 Thư Mục Các Trang Ứng Dụng (Directory: `src/pages`)

Thư mục này chứa các màn hình cấp cao (Top-Level Page Views) của ứng dụng TeachTool. Toàn bộ các trang này đều được tải lười (Lazy Loaded) thông qua `React.lazy` và `Suspense` trong `App.jsx` để tối ưu hóa thời gian tải ban đầu.

---

## 📂 Danh sách các trang & Vai trò

| Tên Trang | Đối tượng sử dụng | Mô tả & Chức năng chính |
| :--- | :--- | :--- |
| `Login.jsx` | Khách truy cập | Trang xác thực người dùng: Đăng nhập bằng Email & Mật khẩu, Đăng ký tài khoản mới, hoặc Đăng nhập 1-chạm qua Google OAuth SSO (GIS). |
| `ClassDashboard.jsx` | Giáo viên (Teacher) | Bàn làm việc trung tâm của Giáo viên: Bao gồm Sidebar điều hướng thống nhất, quản lý danh sách lớp học, chi tiết buổi học & kế hoạch giáo án (sắp xếp tăng dần theo thời gian), thời khóa biểu tuần, giao bài & chấm bài đa tệp, điểm danh, xuất báo cáo tuần (.docx), xuất bảng chấm công tháng (.xlsx), ma trận điểm số và phân tích Heatmap cảnh báo sớm. |
| `StudentPortal.jsx` | Học sinh (Student) | Cổng thông tin học tập của Học sinh: Xem thời khóa biểu cá nhân, phòng học, bài học cần chuẩn bị (sắp xếp tăng dần theo thời gian), làm riêng từng bài tập (5 hình thức nộp bài, sắp xếp theo hạn nộp tăng dần), xem nhận xét âm thanh timestamp, báo vắng trước giờ học và hủy báo vắng. |
| `ClassList.jsx` | Giáo viên (Teacher) | Màn hình danh sách lớp học: Hiển thị danh thiếp các lớp đang giảng dạy, tìm kiếm lớp, tạo lớp mới, sao chép mã lớp 6 ký tự, truy cập kho hoạt động mẫu và xuất Bảng Chấm Công Giảng Dạy Hàng Tháng (.xlsx). |
