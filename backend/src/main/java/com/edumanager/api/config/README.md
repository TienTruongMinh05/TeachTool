# ⚙️ Gói Cấu Hình Hệ Thống (Package: `com.edumanager.api.config`)

Thư mục này chứa các lớp cấu hình (Configuration) và các tác vụ khởi chạy tự động của phân hệ Backend Spring Boot.

---

## 📂 Danh sách các tệp & Mục đích sử dụng

| Tệp tin | Trách nhiệm & Mục đích chính |
| :--- | :--- |
| `CorsConfig.java` | Cấu hình chính sách chia sẻ tài nguyên nguồn gốc chéo (CORS). Thiết lập các domain được phép truy cập (`localhost:5173`, `teachtool-app.vercel.app`), các phương thức HTTP (GET, POST, PUT, DELETE, OPTIONS) và header ủy quyền `Authorization`. |
| `DatabaseIndexOptimizer.java` | Component tự động chạy lúc ứng dụng khởi động (`@PostConstruct`). Thực thi các câu lệnh `CREATE INDEX IF NOT EXISTS` trên PostgreSQL cho các bảng trọng yếu (Assignments, Submissions, Attendances, Enrollments, Sessions), đảm bảo tốc độ truy vấn $O(\log N)$. |
| `LegacyDataMigrationRunner.java` | Tác vụ chạy một lần (CommandLineRunner) giúp di chuyển và chuẩn hóa dữ liệu cũ của các phiên bản trước sang cấu trúc phân mảnh mới mà không gây mất mát dữ liệu. |
| `SwaggerConfig.java` | Cấu hình tài liệu hóa giao diện lập trình OpenAPI / Swagger UI phục vụ việc tra cứu và kiểm thử các endpoint API. |
