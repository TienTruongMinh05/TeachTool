# 🧩 Thư Mục Linh Kiện Giao Diện (Directory: `src/Components`)

Thư mục này chứa toàn bộ các React UI Components tái sử dụng, đảm nhiệm các chức năng nghiệp vụ cụ thể cho cả hai phân hệ Giáo viên và Học sinh.

---

## 📂 Danh sách các Component & Chức năng

| Tên Component | Mục đích & Nghiệp vụ chi tiết |
| :--- | :--- |
| `AssignmentGradeMatrix.jsx` | **Ma trận theo dõi điểm số bài tập**: Bảng tổng hợp điểm số dạng Sheet/Excel theo phạm vi 2 tuần gần nhất (14 ngày) hoặc tất cả. Tích hợp cơ chế nạp dữ liệu tự phục hồi (tự động fallback sang gom bài nộp theo từng bài tập nếu endpoint lớp 404/rỗng), đối soát khóa kép O(1) (`studentId_assignmentId` & `email_assignmentId`). Hỗ trợ xem chi tiết bài làm, form chấm điểm / cập nhật điểm trực tiếp ngay tại ma trận kèm nút chuyển sang bàn chấm bài ghi âm, và xuất bảng điểm CSV/Excel chuẩn tiếng Việt (UTF-8 BOM). |
| `LearningAnalyticsHeatmap.jsx` | **Phân tích xu hướng học tập & Heatmap cảnh báo sớm**: Biểu đồ nhiệt theo phạm vi 2 tuần gần nhất (14 ngày) hoặc tất cả tuần, kết hợp chuyên cần (50%) và điểm bài tập (50%). Tích hợp cơ chế nạp dữ liệu fallback tự phục hồi, đối soát khóa kép học sinh, loại trừ buổi học chưa điểm danh và bài chưa mở để tránh cảnh báo sai. Tự động phát hiện học sinh sa sút (Cảnh báo Đỏ/Vàng) và cung cấp nút sao chép tin nhắn nhắc nhở Zalo với tên học sinh. |
| `AssignmentManager.jsx` | Quản lý bài tập phía giáo viên: Tạo/sửa bài tập đính kèm đa tệp (tối đa 5 file), tính năng hẹn giờ phát hành bài tập (`scheduledPublishAt`), mở bài tức thì (`Phát hành ngay`), bảng bài nộp in-line và chấm điểm. |
| `AudioGradingWorkbench.jsx` | Bàn chấm bài nói chuyên sâu: Nghe bài nói ở các tốc độ (0.8x - 1.5x), thu âm nhận xét nối mốc thời gian (timestamped feedback), ghép nối âm thanh liền mạch. |
| `AudioRecorder.jsx` | Bộ ghi âm Micro tích hợp: Áp dụng chuẩn nén Opus mono 32kbps lọc ồn, hiển thị kích thước tệp nén trực quan cho học sinh khi làm bài nói. |
| `PdfCanvasViewer.jsx` | Trình đọc sách giáo khoa PDF trực quan bằng HTML5 Canvas: Tích hợp bộ nhớ đệm CacheStorage (mở tức thì 0ms), thanh tiến trình tải và nút làm mới đệm. |
| `BookPagePickerModal.jsx` | Modal lật xem sách PDF và bấm chọn nhanh số trang cần dạy để gắn vào giáo án buổi học. |
| `ClassMaterialsManager.jsx` | Quản lý kho tài liệu và sách giáo khoa số của lớp, nhận diện tổng số trang PDF. |
| `SessionList.jsx` | Quản lý danh sách buổi học, giáo án, đính kèm sách, thông báo đột xuất cho buổi học, và quản lý học sinh xin học online với nút nhanh "Gửi link phòng học" (tự động điền link Meet/Zoom). Menu thao tác thông minh Smart Dropup chống tràn màn hình. |
| `AttendanceManager.jsx` | Quản lý điểm danh buổi học và ma trận chuyên cần toàn khóa của lớp với 4 trạng thái linh hoạt: Có mặt (P), Học Online (O - sky-600), Đi muộn (L), Vắng mặt (A). Tự động tính học online là có mặt đầy đủ. |
| `StudentList.jsx` / `AllStudentsList.jsx` | Danh sách học sinh trong 1 lớp học cụ thể hoặc danh sách toàn bộ học sinh trường học. |
| `TeacherManager.jsx` | Quản lý đội ngũ giảng dạy: Mời giáo viên đồng phụ trách (Co-Teacher) qua email và phân định quyền hạn. |
| `TeachingPlanManager.jsx` | Soạn thảo giáo án chi tiết theo từng học phần: Warm-up, Presentation, Practice, Production. |
| `ActivityLibraryModal.jsx` | Modal tra cứu kho 28 hoạt động dạy học TESOL mẫu và sao chép vào giáo án chỉ bằng 1 click. |
| `TimetableGrid.jsx` | Thời khóa biểu lưới tương tác từ Thứ 2 đến Chủ nhật (07:00 - 22:00) theo màu nhận diện lớp. Tích hợp modal Báo vắng & Xin học Online với hạn mức 2 buổi/tháng, 4 tiếng trước giờ học và 3 cam kết bù bài bắt buộc. |
| `StudentFeedbackAudioPlayer.jsx` | Trình phát nhận xét âm thanh cho học sinh: Bấm vào từng mốc thời gian để nghe thầy cô sửa phát âm. |
| `CollapsibleDescription.jsx` | Linh kiện thu gọn đề bài dài với nút "Xem thêm / Thu gọn" giúp giao diện luôn tinh gọn. |
| `AccountSettingsModal.jsx` | Modal cài đặt tài khoản toàn diện: Đổi họ tên, đổi mật khẩu, tích hợp nút Đăng xuất an toàn và Tự xóa tài khoản. |
| `ChangePasswordModal.jsx` | Modal đổi mật khẩu với quy tắc bảo mật mật khẩu mới. |
| `RoleSelectionModal.jsx` | Modal chọn vai trò (Giáo viên / Học sinh) xuất hiện một lần duy nhất khi người dùng đăng nhập lần đầu bằng Google. |
| `StudentInquiryWidget.jsx` | **Nút tròn & Hộp thoại Thắc mắc phía Học sinh**: Nút tròn nổi ở góc dưới bên phải màn hình có biểu tượng chat. Mở kênh chat độc lập dạng Messenger với giáo viên chủ nhiệm & phụ trách lớp. Tin nhắn trả lời tự động ngay lập tức sau tin đầu tiên ("Thời gian phản hồi thường là dưới 1h, nhưng có thể lâu hơn, các em vui lòng đợi."), hỗ trợ đổi lớp, đính kèm tệp (tối đa 3 tệp/lần, tối đa 15 tệp/hội thoại), thả emoji, tối ưu bàn phím ảo di động và tự động cuộn. |
| `StudentInquiriesManager.jsx` | **Trung tâm Quản lý Câu hỏi từ Học viên phía Giáo viên**: Mục "Câu hỏi từ học viên" trong Sidebar tích hợp huy hiệu đếm câu hỏi chưa trả lời. Hiển thị danh sách học sinh, Gmail, xem trước 1 dòng tin nhắn (giống Messenger). Cơ chế viền trực quan: Viền đỏ (chưa trả lời), Viền xanh lá (đã trả lời), tự động đảo lại Viền đỏ khi học sinh nhắn lại tin mới. Hỗ trợ trả lời kèm tệp, emoji, lọc theo lớp, lọc theo trạng thái và tìm kiếm nhanh. |
| `UserGuide.jsx` | Cẩm nang hướng dẫn sử dụng 11 chuyên đề tích hợp dành cho Giáo viên (bổ sung chuyên đề Kênh thắc mắc, quản lý học online & gửi link phòng học, hạn mức báo vắng 2 buổi/tháng). |
| `StudentGuide.jsx` | Cẩm nang hướng dẫn sử dụng 8 chuyên đề tích hợp dành cho Học sinh (bổ sung quy định báo vắng trước 4 tiếng, hạn mức 2 buổi/tháng, 3 cam kết bù bài, tùy chọn Xin học Online, thông tin Thông báo đột xuất & huy hiệu Tin tức nhấp nháy, chính sách lưu trữ toàn dữ liệu). |
| `Icons.jsx` | **Bộ 2D Line Icons monochrome chuẩn thương mại**: Cung cấp toàn bộ biểu tượng SVG đơn sắc, nét mảnh chuyên nghiệp (`MegaphoneIcon`, `PaperclipIcon`, `BookOpenIcon`, `InfoIcon`, `AlertTriangleIcon`, `TrashIcon`, `CheckCircleIcon`, `XCircleIcon`, `HelpCircleIcon`, `XIcon`, `PencilIcon`, `ClockIcon`, `CalendarIcon`, `StarIcon`, `CrownIcon`, `UsersIcon`, `BoltIcon`, `MenuIcon`, `GlobeIcon`), thay thế triệt để các emoji màu mè trên toàn hệ thống. |

