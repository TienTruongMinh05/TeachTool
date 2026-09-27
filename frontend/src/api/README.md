# 📡 Thư Mục Module Gọi API (Directory: `src/api`)

Thư mục này chứa toàn bộ các hàm gọi API giao tiếp với máy chủ Backend Spring Boot thông qua thư viện **Axios**.

---

## 📂 Danh sách các Client API & Endpoint phụ trách

| Tệp API Client | Endpoint máy chủ tương ứng & Chức năng |
| :--- | :--- |
| `axiosClient.js` | Cấu hình Axios Instance gốc: Thiết lập `baseURL`, Request Interceptor tự động đính kèm `Bearer Token` từ `localStorage`, và Response Interceptor xử lý lỗi tập trung. |
| `authApi.js` | `/api/auth/*`: Đăng nhập, đăng ký, xác thực Google SSO, lấy thông tin cá nhân hiện tại. |
| `classApi.js` | `/api/classes/*`: CRUD lớp học, lấy danh sách học sinh, lấy thời khóa biểu tuần, quản lý giáo viên đồng phụ trách. |
| `sessionApi.js` | `/api/sessions/*`: Thêm/sửa/xóa buổi học, lấy danh sách buổi học theo lớp và cập nhật thông báo đột xuất (`updateAnnouncement`). |
| `assignmentApi.js` | `/api/assignments/*`, `/api/classes/{id}/assignments`: Quản lý bài tập đa tệp, hẹn giờ phát hành và mở bài tức thì (`publishNow`). |
| `submissionApi.js` | `/api/submissions/*`: Nộp bài, chấm điểm, xóa bài nộp và lấy bài nộp theo bài tập hoặc theo lớp (`/class/{classId}`). |
| `attendanceApi.js` | `/api/sessions/{id}/attendance`, `/api/classes/{id}/attendance`: Điểm danh buổi học (P, O, L, A) và bảng ma trận chuyên cần. |
| `studentPortalApi.js` | `/api/student-portal/*`: Lấy lịch học, thông báo đột xuất buổi học, báo vắng trước 4 tiếng (hạn mức 2 buổi/tháng, 3 cam kết bù bài) và tùy chọn Xin học online. |
| `studentApi.js` | `/api/users/*`, `/api/classes/{id}/students`: Quản lý học sinh trong lớp và danh sách toàn bộ học sinh. |
| `teachingPlanApi.js` | `/api/teaching-plans/*`: Soạn thảo và lưu trữ giáo án học phần buổi học. |
| `activityApi.js` | `/api/activities/*`: Lấy danh mục 28 hoạt động dạy học TESOL mẫu. |
| `materialApi.js` | `/api/classes/{id}/materials`: Quản lý tài liệu và sách giáo khoa PDF của lớp. |
| `fileApi.js` | `/api/files/*`: Upload và download file lên máy chủ kèm xử lý tiến trình. |
| `enrollmentApi.js` | `/api/enrollments/*`: Ghi danh học sinh vào lớp học bằng mã lớp. |
| `userApi.js` | `/api/users/*`: Cập nhật thông tin cá nhân và tài khoản người dùng. |
