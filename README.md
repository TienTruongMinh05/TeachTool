# 🎓 TeachTool - Nền Tảng Quản Lý Lớp Học & Kế Hoạch Giảng Dạy Tiếng Anh

[![Production Status](https://img.shields.io/badge/Production-Live-success?style=for-the-badge&logo=vercel)](https://teachtool-app.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%203%20%7C%20Java%2021-brightgreen?style=for-the-badge&logo=springboot)](https://teachtool-api.onrender.com)
[![Database](https://img.shields.io/badge/Database-Neon%20Serverless%20PostgreSQL%2018-blue?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react)](https://teachtool-app.vercel.app)
[![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-red?style=for-the-badge&logo=securityscorecard)](https://github.com/TienTruongMinh05/TeachTool)

**TeachTool** là giải pháp phần mềm toàn diện được thiết kế chuyên biệt cho Giáo viên và Học sinh trong môi trường giảng dạy tiếng Anh (đặc biệt tối ưu hóa cho phương pháp sư phạm **TESOL**, IELTS và giao tiếp thực hành). Hệ thống hỗ trợ lập kế hoạch bài giảng theo từng khung thời gian, quản lý bài tập đa phương tiện (ghi âm, nộp file), thời khóa biểu trực quan và quy trình điểm danh/báo vắng tự động.

---

## 🌐 Địa Chỉ Truy Cập Trực Tuyến (Production Live)

| Thành phần | Nền tảng Cloud | Địa chỉ chính thức |
| :--- | :--- | :--- |
| **Giao Diện Ứng Dụng (Web App)** | **Vercel CDN** | 🔗 [https://teachtool-app.vercel.app](https://teachtool-app.vercel.app) |
| **Tên Miền Dự Phòng 1** | **Vercel CDN** | 🔗 [https://teachtool-vn.vercel.app](https://teachtool-vn.vercel.app) |
| **Tên Miền Dự Phòng 2** | **Vercel CDN** | 🔗 [https://teachtool-edu.vercel.app](https://teachtool-edu.vercel.app) |
| **Hệ Thống API (Backend)** | **Render Cloud** | 🔗 [https://teachtool-api.onrender.com/api](https://teachtool-api.onrender.com/api) |
| **Cơ Sở Dữ Liệu (PostgreSQL)** | **Neon Tech** | 🔗 `ap-southeast-1.aws.neon.tech` (Singapore) |

---

## ✨ Tính Năng Nổi Bật

### 👩‍🏫 Phân Hệ Dành Cho Giáo Viên (Teacher Portal)
* **Quản lý Lớp học Độc lập:** Tạo lớp học với mã tham gia tự động 6 ký tự (`SecureRandom`). Mỗi giáo viên có không gian quản lý lớp học độc lập, an toàn.
* **Thời Khóa Biểu Tương Tác:** Lịch học trực quan dạng lưới từ Thứ 2 đến Chủ nhật, khung giờ từ 7h00 sáng đến 22h00 tối, hiển thị trực quan sĩ số và nội dung bài học.
* **Tích Hợp Kế Hoạch Giảng Dạy (Lesson Plans):** Tạo và sửa kế hoạch giảng dạy trực tiếp trong từng buổi học. Hỗ trợ chia mục bài giảng (Warm-up, Presentation, Practice, Production), đính kèm tài liệu phát tay (`.docx`, `.pdf`) và ghi chú chuẩn bị cho học sinh.
* **Thư Viện 28 Hoạt Động TESOL Mẫu:** Tích hợp sẵn 28 hoạt động dạy học tương tác (Hot Seat, Running Dictation, Information Gap, Role-Play, Jeopardy...), có thể sao chép nhanh vào giáo án chỉ bằng 1 cú click.
* **Quản Lý Bài Tập & Chấm Điểm:** Giao bài tập kèm file đề bài, giới hạn thời hạn nộp bài (`dueDate`), cho phép học sinh nộp bằng văn bản hoặc ghi âm giọng nói trực tiếp. Chấm điểm kèm nhận xét chi tiết cho từng học sinh.
* **Điểm Danh Tự Động:** Điểm danh theo buổi học, tự động đồng bộ lý do khi học sinh báo vắng trước giờ học.

### 👨‍🎓 Phân Hệ Dành Cho Học Sinh (Student Portal)
* **Tham Gia Lớp Bằng Mã:** Học sinh chỉ cần nhập mã lớp do giáo viên cung cấp để tự động vào lớp.
* **Thời Khóa Biểu Cá Nhân:** Xem lịch học hàng tuần, thông tin sách cần mang, tài liệu cần chuẩn bị trước buổi học.
* **Nộp Bài Tập Trực Tuyến & Ghi Âm Giọng Nói:** Tích hợp bộ ghi âm audio trực tiếp trên trình duyệt hoặc tải lên file bài làm (`.mp3`, `.wav`, `.docx`, `.pdf`).
* **Quy Trình Báo Vắng Thông Minh:** Cho phép học sinh báo vắng trước giờ học tối thiểu 2 tiếng theo chuẩn múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), kèm nhập lý do vắng. Khi học sinh xác nhận, hệ thống tự động cập nhật trạng thái vắng sang danh sách điểm danh của giáo viên.

---

## 🔒 Kiến Trúc Bảo Mật & Cybersecurity (Đã Được Kiểm Thử Chuyên Sâu)

Hệ thống được thiết kế và kiểm thử toàn diện theo các tiêu chuẩn bảo mật khắt khe của **OWASP Top 10**:

1. **Kiểm Soát Truy Cập Chặt Chẽ (Default-Deny RBAC):** `AuthInterceptor` chặn tất cả các endpoint private theo nguyên tắc mặc định từ chối. Học sinh bị chặn `403 Forbidden` tuyệt đối khi cố tình truy cập vào các tài nguyên của giáo viên hoặc xem giáo án nội bộ.
2. **Chống Tấn Công Phân Quyền Ngang (IDOR / BOLA Prevention):**
   - Lớp học được gắn định danh `teacher_id`. Giáo viên chỉ được xem, sửa hoặc xóa các lớp do chính mình tạo.
   - Học sinh chỉ được phép xem thời khóa biểu, nộp bài và báo vắng cho chính tài khoản của mình (xác thực `userId` từ JWT).
3. **Mã Hóa Mật Khẩu Đạt Chuẩn Mật Mã Học:** Sử dụng thuật toán **PBKDF2WithHmacSHA256** với **65,536 vòng lặp** và Salt ngẫu nhiên 16 bytes. Chống hoàn toàn các cuộc tấn công Rainbow Table.
4. **Xác Thực Google SSO An Toàn Tuyệt Đối:** Sử dụng Google Identity Services (GIS) kết hợp xác thực chữ ký số trực tiếp qua `GoogleTokenVerifier` (TokenInfo API). Loại bỏ triệt để việc bypass xác thực bằng email thô.
5. **Bộ Giới Hạn Tần Suất (Sliding-Window Rate Limiter):** Tích hợp bộ đếm tần suất in-memory theo từng IP (`RateLimiterService`), giới hạn tối đa 10 lượt thử đăng nhập/phút. Ngăn chặn 100% nguy cơ tấn công dò quét mật khẩu (Brute-Force) và cạn kiệt CPU (DoS).
6. **Bảo Vệ Tải File & Chống Stored XSS:**
   - Danh sách trắng (Whitelist) nghiêm ngặt chỉ cho phép tài liệu học tập (`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.txt`), âm thanh ghi âm (`.mp3`, `.wav`, `.m4a`, `.webm`) và hình ảnh. Cấm hoàn toàn các file thực thi và web script (`.html`, `.svg`, `.js`, `.exe`).
   - Tên file được băm ngẫu nhiên bằng UUID và kiểm tra chống Path Traversal (`targetLocation.startsWith(uploadDir)`).
   - Header tải file ép buộc `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` và `Content-Security-Policy: default-src 'none'`.
7. **Cấu Hình CORS Nghiêm Ngặt:** Chỉ chấp nhận request từ các domain chính thức của TeachTool, ngăn chặn tấn công Cross-Origin lừa đảo.
8. **An Toàn Dữ Liệu & Che Giấu Lỗi Kỹ Thuật:** `GlobalExceptionHandler` che giấu toàn bộ cấu trúc cơ sở dữ liệu và stack trace hệ thống khi có lỗi không mong muốn.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Backend
* **Ngôn ngữ:** Java 21 LTS
* **Framework:** Spring Boot 3.x (Spring Web MVC, Spring Data JPA, Spring Validation)
* **Cơ sở dữ liệu:** PostgreSQL 18.6 (Hỗ trợ Connection Pooling & SSL Mode Required)
* **Bảo mật:** JJWT (JSON Web Token), PBKDF2 Password Hasher, Spring Interceptor RBAC
* **Đóng gói:** Docker Multi-stage Container (`eclipse-temurin:21-jre-alpine`)

### Frontend
* **Thư viện:** React 19, React Router DOM v7
* **Build Tool:** Vite 8
* **Styling:** Tailwind CSS v4
* **HTTP Client:** Axios (cấu hình Request Interceptor tự động gắn Bearer Token và Response Interceptor xử lý phiên 401)
* **Tích hợp:** Google Identity Services (GIS) OAuth 2.0 Client SDK

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Setup)

### Yêu cầu tiên quyết
* **Java:** JDK 21 trở lên
* **Node.js:** v18 trở lên (khuyên dùng Node.js 20+)
* **PostgreSQL:** Port 5432 (Database name: `edu_manager`)

### 1. Khởi động nhanh (Dành cho máy Windows đã tích hợp sẵn công cụ)
Trong thư mục dự án trên máy tính, bạn chỉ cần nhấp đúp chuột vào:
* `Chay_He_Thong.bat`: Khởi động cả PostgreSQL, Backend Spring Boot và Frontend Vite chỉ trong 1 thao tác.
* `Dung_He_Thong.bat`: Tắt toàn bộ hệ thống an toàn.

### 2. Khởi động thủ công qua dòng lệnh

#### Khởi động Backend (Spring Boot):
```bash
cd api
# Thiết lập biến môi trường kết nối database (nếu khác mặc định)
./mvnw clean spring-boot:run
```
*Backend sẽ lắng nghe tại cổng `http://localhost:8081`.*

#### Khởi động Frontend (React / Vite):
```bash
cd edu-frontend
npm install
npm run dev
```
*Frontend sẽ chạy tại `http://localhost:5173`.*

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
TEACHTOOL/
├── api/                                # Backend Spring Boot
│   ├── src/main/java/com/edumanager/api/
│   │   ├── config/                     # Cấu hình CORS & WebMvc
│   │   ├── controller/                 # REST API Controllers (Auth, Classes, Plans, Sessions...)
│   │   ├── dto/                        # Data Transfer Objects
│   │   ├── entity/                     # JPA Entities (ClassRoom, User, Session, Assignment...)
│   │   ├── exception/                  # Global Exception Handler
│   │   ├── repository/                 # Spring Data JPA Repositories
│   │   ├── security/                   # AuthInterceptor, JwtService, PasswordHasher, RateLimiter...
│   │   └── service/                    # Business Logic Layer
│   ├── src/main/resources/
│   │   └── application.yaml            # Cấu hình Datasource, JPA, JWT, Multipart
│   └── Dockerfile                      # Multi-stage Dockerfile cho Cloud Deploy
├── edu-frontend/                       # Frontend React / Vite
│   ├── src/
│   │   ├── api/                        # Axios API Clients (authApi, classApi, sessionApi...)
│   │   ├── Components/                 # Reusable UI Components (TimetableGrid, ActivityLibrary...)
│   │   ├── context/                    # AuthContext quản lý trạng thái đăng nhập
│   │   └── pages/                      # Pages (Login, ClassList, ClassDashboard, StudentPortal)
│   ├── vercel.json                     # Cấu hình SPA Routing cho Vercel
│   └── vite.config.js                  # Cấu hình Vite
├── render.yaml                         # Blueprint triển khai Render Web Service
├── .gitignore                          # Cấu hình bảo mật mã nguồn (loại trừ secrets & db)
└── README.md                           # Tài liệu tổng quan hệ thống
```

---

## 📄 Bản Quyền & Tác Giả

Dự án được xây dựng và duy trì bởi **TienTruongMinh05**.  
Mọi thắc mắc hoặc yêu cầu đóng góp tính năng, vui lòng mở Issue hoặc Pull Request trên [GitHub Repository](https://github.com/TienTruongMinh05/TeachTool).
