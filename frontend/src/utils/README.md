# 🛠️ Thư Mục Tiện Ích Trợ Năng (Directory: `src/utils`)

Thư mục này chứa các module xử lý kỹ thuật cấp thấp (Low-Level Utilities), bao gồm tối ưu hóa nén âm thanh, bộ nhớ đệm CacheStorage, ghép nối Web Audio API và an toàn dữ liệu.

---

## 📂 Danh sách các tệp & Mục đích sử dụng

| Tệp Tiện ích | Công nghệ & Nghiệp vụ xử lý |
| :--- | :--- |
| `audioOptimizer.js` | **Bộ tối ưu hóa âm thanh giọng nói**: Cung cấp cấu hình micro Mono lọc ồn 24kHz (`getOptimizedAudioConstraints`), tự động chọn định dạng Opus/WebM tối ưu (`getOptimalAudioMimeType`) và khởi tạo MediaRecorder nén giọng nói **32 kbps**, giảm **75-80% dung lượng** tệp ghi âm. |
| `bookCacheService.js` | **Bộ nhớ đệm sách số (CacheStorage)**: Đệm các tệp PDF sách giáo khoa dung lượng lớn trực tiếp vào CacheStorage của trình duyệt. Lần truy cập tiếp theo mở sách tức thì **0ms** không qua mạng. Hỗ trợ hiển thị thanh % tiến độ tải và xóa/làm mới đệm. |
| `audioSplicer.js` | **Bộ ghép nối âm thanh Web Audio API**: Tự động kết hợp file âm thanh bài nói của học sinh với các đoạn nhận xét bằng giọng nói của giáo viên tại các mốc thời gian timestamp thành 1 file âm thanh WAV/MP3 hoàn chỉnh liền mạch. |
| `security.js` | **Bảo vệ an toàn dữ liệu**: Hàm lọc và làm sạch văn bản (Sanitize input), ngăn chặn nguy cơ tấn công Cross-Site Scripting (XSS) trên giao diện. |
