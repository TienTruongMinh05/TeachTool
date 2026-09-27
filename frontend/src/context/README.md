# 🌐 Thư Mục Quản Lý Trạng Thái Toàn Cục (Directory: `src/context`)

Thư mục này chứa các React Context Providers quản lý trạng thái chia sẻ trên toàn bộ cây thành phần của ứng dụng TeachTool.

---

## 📂 Danh sách các Context & Mục đích sử dụng

| Tên Context | Trách nhiệm & Dịch vụ cung cấp |
| :--- | :--- |
| `AuthContext.jsx` | Quản lý phiên làm việc của người dùng (`user`, `token`, `role`). Cung cấp các hàm `login`, `logout`, `updateUser` và lưu trữ token an toàn trong `localStorage`. Tự động khôi phục thông tin đăng nhập khi người dùng tải lại trang. |
| `ToastContext.jsx` | Hệ thống thông báo và hộp thoại xác nhận nội bộ (In-App Dialogs). Cung cấp `toast.success`, `toast.error`, `toast.warning`, `toast.info` và hàm `confirm(message, options)` hiển thị modal xác nhận mượt mà, tích hợp bộ 2D Line SVG icons monochrome (`CheckCircleIcon`, `XCircleIcon`, `AlertTriangleIcon`, `InfoIcon`, `TrashIcon`, `HelpCircleIcon`, `XIcon`), loại bỏ 100% việc dùng popup thô của trình duyệt (`window.alert`, `window.confirm`). |

