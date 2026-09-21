# 💻 TeachTool Frontend (Web Application)

Thư mục này chứa toàn bộ mã nguồn giao diện người dùng (Frontend Web Application) của hệ thống **TeachTool**, được xây dựng trên **React 19**, **Vite 8** và **Tailwind CSS v4**.

---

## 📂 Mục đích & Kiến trúc của Phân hệ

Giao diện TeachTool được chia làm 2 phân hệ độc lập:
1. **Teacher Portal (Cổng Giáo viên)**: Môi trường quản lý toàn diện lớp học, soạn giáo án TESOL, chọn trang sách PDF trực quan, chấm bài âm thanh chuyên sâu, xem ma trận điểm số bài tập và phân tích Heatmap cảnh báo sớm học sinh sa sút.
2. **Student Portal (Cổng Học sinh)**: Giao diện học viên thân thiện xem thời khóa biểu, dặn dò chuẩn bị bài, tải tài liệu phát tay, nộp bài theo 5 hình thức (văn bản, file, ghi âm micro, chụp ảnh webcam) và quy trình báo vắng/hủy báo vắng tự động.

---

## ⚡ Các Kỹ Thuật Tối Ưu Hóa Nổi Bật

- **Code Splitting (Tách gói mã nguồn)**: Áp dụng `React.lazy` và `Suspense` kết hợp cấu hình `manualChunks` trong `vite.config.js`. File bundle chính giảm **98.8%** (chỉ còn **12.28 kB**), tốc độ tải trang ban đầu đạt chuẩn tức thì.
- **Opus Audio Compression (Nén giọng nói)**: Thu âm mono 24kHz nén 32kbps bằng module `audioOptimizer.js`, giảm **75-80% dung lượng** file ghi âm.
- **Digital Book Caching**: Đệm sách giáo khoa PDF dung lượng lớn bằng **CacheStorage API** trong `bookCacheService.js`, mở sách các lần sau với độ trễ **0ms**.
- **100% In-App Dialogs**: Không dùng popup thô của trình duyệt (`alert`, `confirm`), toàn bộ thông báo hiển thị qua `ToastContext`.

---

## 🗂️ Cấu trúc thư mục con trong `src/`

| Thư mục | Mô tả & Mục đích |
| :--- | :--- |
| [`Components/`](src/Components/README.md) | Chứa các linh kiện UI tái sử dụng: AssignmentManager, AudioGradingWorkbench, PdfCanvasViewer, Heatmap, Matrix... |
| [`pages/`](src/pages/README.md) | Chứa các trang giao diện chính: Login, ClassDashboard, StudentPortal, ClassList. |
| [`context/`](src/context/README.md) | Quản lý trạng thái toàn cục ứng dụng: AuthContext (phiên đăng nhập), ToastContext (thông báo in-app). |
| [`utils/`](src/utils/README.md) | Thư viện tiện ích: Nén âm thanh (audioOptimizer), Đệm sách số (bookCacheService), Ghép âm thanh (audioSplicer). |
| [`api/`](src/api/README.md) | Các module gọi API qua Axios Client tương ứng với từng dịch vụ backend. |

---

## 🛠️ Lệnh Thực Thi Thường Dùng

```bash
# Cài đặt dependencies
npm install

# Khởi chạy môi trường phát triển (Dev server)
npm run dev

# Đóng gói sản phẩm (Production Build)
npm run build

# Xem trước bản đóng gói
npm run preview
```
