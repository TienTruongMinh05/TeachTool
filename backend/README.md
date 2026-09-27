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
# Di chuyển vào thư mục api
cd api

# Chạy kiểm thử biên dịch
./mvnw clean test-compile

# Khởi chạy ứng dụng Spring Boot trên cổng 8081
./mvnw spring-boot:run
```
Mặc định ứng dụng sẽ khởi chạy tại: `http://localhost:8081/api`
