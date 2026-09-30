# 📦 TeachTool Backend (API Service)

Thư mục này chứa toàn bộ mã nguồn phía máy chủ (Backend Service) của hệ thống **TeachTool**, được xây dựng trên nền tảng **Java 21 LTS** và **Spring Boot 3.x**.

---

## 📂 Mục đích & Trách nhiệm của Thư mục

Phân hệ Backend chịu trách nhiệm:
1. **Cung cấp RESTful API**: Phục vụ các yêu cầu từ phía Frontend (Giáo viên và Học sinh).
2. **Xác thực & Phân quyền**: Đảm bảo an toàn thông tin với JWT, mã hóa PBKDF2 và Google OAuth SSO.
3. **Quản lý dữ liệu**: Tương tác với PostgreSQL (Neon Serverless) qua Spring Data JPA & Hibernate.
4. **Xử lý tệp tin & Đa phương tiện**: Quản lý tải lên, tải xuống, phân mảnh lưu trữ 1MB chunk trên DB và đệm tệp.
5. **Tự động hóa tác vụ**: Tự động dọn dẹp dữ liệu bài nộp sau 2 tuần và dữ liệu giáo viên sau 6 tháng (`DataRetentionService`).
6. **Bảo mật & Mã hóa tin nhắn (AES-256)**: Mã hóa đối xứng AES-256-CBC nội dung trao đổi hỏi đáp giữa học sinh và giáo viên (`EncryptionService`, `InquiryService`), phòng chống rò rỉ dữ liệu CSDL.

---

## 🗂️ Cấu trúc các Gói (Packages) trong `src/main/java/com/edumanager/api`

| Thư mục gói | Mục đích & Chức năng chính |
| :--- | :--- |
| [`config/`](src/main/java/com/edumanager/api/config/README.md) | Cấu hình Spring MVC, CORS, tối ưu hóa chỉ mục CSDL khi khởi động. |
| [`controller/`](src/main/java/com/edumanager/api/controller/README.md) | Các điểm cuối REST API nhận và phản hồi request HTTP. |
| [`service/`](src/main/java/com/edumanager/api/service/README.md) | Tầng nghiệp vụ (Business Logic), quản lý giao dịch (@Transactional). |
| [`repository/`](src/main/java/com/edumanager/api/repository/README.md) | Tầng truy cập dữ liệu Spring Data JPA và các câu truy vấn JPQL. |
| [`entity/`](src/main/java/com/edumanager/api/entity/README.md) | Các thực thể mô hình hóa bảng cơ sở dữ liệu PostgreSQL. |
| [`dto/`](src/main/java/com/edumanager/api/dto/README.md) | Đối tượng vận chuyển dữ liệu (Data Transfer Objects) giữa Client và Server. |
| [`security/`](src/main/java/com/edumanager/api/security/README.md) | Bộ chặn AuthInterceptor, tạo mã JWT, băm mật khẩu PBKDF2 và Rate Limiting. |
| `exception/` | Bắt lỗi tập trung toàn hệ thống (`GlobalExceptionHandler`). |

---

## 🚀 Hướng Dẫn Chạy Cục Bộ

```bash
# Di chuyển vào thư mục backend
cd backend

# Chạy kiểm thử biên dịch
./mvnw clean test-compile

# Khởi chạy ứng dụng Spring Boot trên cổng 10000 / 8081
./mvnw spring-boot:run
```
Mặc định ứng dụng sẽ khởi chạy tại: `http://localhost:10000/api`

---

## ⚡ Kiến Trúc Tối Ưu Hóa Tài Nguyên Neon PostgreSQL & Cloud-Native

Nhằm tối ưu hóa triệt để tài nguyên tính toán (Compute Units - CU), băng thông (Egress), dung lượng lưu trữ (Storage) và kéo dài thời gian ngủ đông (Auto-suspend) của Neon PostgreSQL Serverless, phân hệ Backend triển khai 4 trụ cột chiến lược sau:

### 1. Ứng dụng Bộ Nhớ Đệm In-Memory (Caffeine Spring Cache)
* **Vấn đề giải quyết**: Các thông tin ít thay đổi (danh sách lớp, tài liệu, thời khóa biểu, ngân hàng hoạt động) liên tục bị truy vấn vào Database mỗi khi người dùng chuyển trang hoặc làm mới ứng dụng.
* **Cấu hình (`CacheConfig.java`)**:
  - Engine: **Caffeine Cache** (hiệu năng cao, thread-safe, ghi nhận metrics).
  - TTL (Time-To-Live): **3 phút** (`expireAfterWrite`).
  - Dung lượng tối đa: **500 entries** / vùng cache.
* **Các vùng Cache áp dụng**:
  - `classes`: `ClassRoomService.getClassesByTeacher()`
  - `class_sessions`: `SessionService.getSessionsByClass()`
  - `class_materials`: `ClassMaterialService.getMaterialsByClass()`
  - `activity_templates`: `ActivityTemplateService.getAllActivities()`
* **Cơ chế vô hiệu hóa (@CacheEvict)**: Tự động dọn sạch cache tương ứng khi giáo viên thực hiện thao tác Thêm / Sửa / Xóa / Lưu trữ (Archive) để đảm bảo dữ liệu luôn nhất quán tức thì.

### 2. Nâng Cấp Kênh Chat & Hỏi Đáp Sang Server-Sent Events (SSE Real-Time)
* **Vấn đề giải quyết**: Cơ chế Polling định kỳ liên tục gửi HTTP Request làm Backend bận rộn và đánh thức kết nối Database Neon ngay cả khi không có tin nhắn mới.
* **Điểm cuối Streaming**:
  - `GET /api/inquiries/threads/{threadId}/stream` (Content-Type: `text/event-stream`).
  - Hỗ trợ xác thực linh hoạt qua Header `Authorization: Bearer <token>` hoặc Query Param `?token=<token>` (tương thích trực tiếp với chuẩn `EventSource` của trình duyệt).
* **Cơ chế hoạt động**:
  - Khi học sinh hoặc giáo viên kết nối, một luồng `SseEmitter` được duy trì trong bộ nhớ Backend.
  - Khi có tin nhắn mới hoặc tin nhắn phản hồi tự động hệ thống (Auto-Reply), Backend chủ động phát sự kiện (`NEW_MESSAGE`) tới đúng client đang kết nối.
  - Loại bỏ hoàn toàn 100% request polling rỗng, giúp máy chủ Neon duy trì trạng thái Auto-suspend khi không có hoạt động.

### 3. Tách Biệt Hoàn Toàn File Đa Phương Tiện Khỏi CSDL (Object Storage Isolation)
* **Nguyên tắc bất biến**: Tuyệt đối không lưu trữ dữ liệu nhị phân thô (Binary Blob) hoặc chuỗi Base64 dung lượng lớn trong CSDL PostgreSQL.
* **Cơ chế lưu trữ**:
  - CSDL chỉ lưu Metadata và URL trỏ tới Cloudflare R2 / Neon Object Storage / Cloudinary.
  - **Bài nộp học sinh**: Hỗ trợ đính kèm tối đa 10 ảnh/tệp nộp bài mà không làm phình dung lượng CSDL.
  - **Chữa bài giáo viên**: Lưu URL tệp ghi âm giọng nói (Audio Feedback).
  - **Hỏi đáp Q&A**: Lưu URL tệp đính kèm trong thread hỏi đáp.
* **Hiệu quả**: Dung lượng toàn bộ database duy trì ở mức siêu tinh gọn (< 50MB), tiết kiệm 100% chi phí IOPS và Data Egress.

### 4. Cơ Chế Đóng Gói Dữ Liệu Theo Học Kỳ (Semester Archiving & Data Retention)
* **Mục tiêu**: Giữ cho tập dữ liệu hoạt động thường nhật (Active Working Set) luôn nhỏ gọn và tăng tốc độ câu truy vấn.
* **Điểm cuối API Lưu trữ**:
  - `POST /api/classes/{id}/archive`: Chuyển trạng thái lớp sang `is_archived = true`.
  - `POST /api/classes/{id}/unarchive`: Mở lại lớp học lưu trữ.
* **Tự động hóa dọn dẹp (`DataRetentionService`)**:
  - Tự động dọn dẹp các tệp bài nộp cũ sau 2 tuần.
  - Hỗ trợ xuất báo cáo tổng kết và cô lập dữ liệu lớp học cũ, ngăn chặn tình trạng phình to dữ liệu theo năm tháng.
