# 🔒 Gói Bảo Mật & Xác Thực (Package: `com.edumanager.api.security`)

Thư mục này chứa các thành phần bảo mật chuyên sâu của hệ thống, tuân thủ các chuẩn an toàn thông tin **OWASP Top 10**.

---

## 📂 Danh sách các tệp & Mục đích sử dụng

| Tệp Bảo Mật | Cơ chế & Mục đích chính |
| :--- | :--- |
| `AuthInterceptor.java` | Bộ chặn Spring HandlerInterceptor thực thi nguyên tắc **Default-Deny RBAC**: Chặn và kiểm tra token JWT trên mọi request private, giải mã định danh `userId` và vai trò `userRole` vào request attribute. Chặn học sinh truy cập trái phép tài nguyên giáo viên, khóa endpoint chẩn đoán hệ thống `/api/files/system-diag`. |
| `JwtService.java` | Tạo mới, ký số và kiểm tra tính hợp lệ của chuỗi JSON Web Token (HMAC-SHA256). Quản lý thời hạn sống của phiên đăng nhập và tự động cảnh báo khi hệ thống sử dụng secret mặc định chưa cấu hình biến môi trường. |
| `PasswordHasher.java` | Mã hóa mật khẩu đạt chuẩn mật mã học: Sử dụng thuật toán **PBKDF2WithHmacSHA256** với **65,536 vòng lặp** và Salt ngẫu nhiên 16 bytes. Chống hoàn toàn các đòn tấn công Rainbow Table. |
| `GoogleTokenVerifier.java` | Xác thực chữ ký số của Google OAuth 2.0 Credential (GIS) thông qua TokenInfo API của Google, bảo đảm an toàn khi đăng nhập 1-chạm. |
| `RateLimiterService.java` | Bộ giới hạn tần suất cửa sổ trượt (Sliding-Window Rate Limiter): Giới hạn tối đa 10 lượt thử đăng nhập/phút/IP và 50 lượt tải file/phút/IP để ngăn chặn Brute-Force và DoS. |
