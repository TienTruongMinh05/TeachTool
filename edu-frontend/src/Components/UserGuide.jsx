import { useState } from 'react';

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '1. Tổng quan & Khởi đầu nhanh' },
    { id: 'classes', title: '2. Quản lý Lớp học & Mã vào lớp' },
    { id: 'timetable', title: '3. Thời khóa biểu & Báo vắng' },
    { id: 'sessions', title: '4. Buổi học & Kế hoạch giảng dạy' },
    { id: 'assignments', title: '5. Giao bài tập & Chấm bài (Audio/Word)' },
    { id: 'students', title: '6. Cổng Học Sinh (Nộp bài & Thu âm)' },
    { id: 'attendance', title: '7. Điểm danh & Bảng chuyên cần' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-bold text-gray-800">Cẩm Nang Hướng Dẫn Sử Dụng TeachTool</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tài liệu hướng dẫn chi tiết quy trình quản lý lớp học, thời khóa biểu, kế hoạch giảng dạy, giao bài tập, chấm điểm và báo vắng cho học sinh
        </p>
      </div>

      {/* Tabs điều hướng các phần hướng dẫn */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSection === sec.id
                ? 'bg-white text-blue-700 shadow-xs border border-gray-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}>
            <span>{sec.title}</span>
          </button>
        ))}
      </div>

      {/* NỘI DUNG TỪNG PHẦN HƯỚNG DẪN */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 sm:p-7 space-y-6 text-sm text-gray-700 leading-relaxed">
        {/* PHẦN 1: TỔNG QUAN & KHỞI ĐẦU NHANH */}
        {activeSection === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              1. Quy Trình Vận Hành Nhanh (Quickstart)
            </h4>
            <p className="text-xs text-gray-600">
              Hệ thống TeachTool được thiết kế nhằm tinh gọn tối đa các thao tác giữa Giáo viên và Học sinh qua 4 bước cơ bản:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Bước 1: Giáo viên tạo lớp</span>
                <h5 className="font-bold text-gray-800 text-sm">Tạo lớp & Nhận Mã Lớp (Class Code)</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tại màn hình <b>"Danh sách lớp học"</b>, bấm <b>"+ Thêm Lớp Mới"</b>. Hệ thống tự động sinh 1 mã lớp gồm 6 ký tự (ví dụ: <code className="bg-slate-100 text-blue-600 px-1 py-0.5 rounded font-mono font-bold">DJ4FHF</code>). Thầy/cô chỉ cần bấm nút <b>Copy</b> và gửi mã này cho học sinh qua Zalo/Facebook/Email.
                </p>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Bước 2: Học sinh nhập mã vào lớp</span>
                <h5 className="font-bold text-gray-800 text-sm">Học sinh tự ghi danh</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Học sinh đăng nhập bằng Gmail, chọn vai trò <b>Học sinh</b>, sau đó bấm <b>"+ Vào Lớp Bằng Mã"</b> và nhập mã 6 ký tự. Học sinh sẽ ngay lập tức được kết nối vào lớp mà không cần giáo viên phải thêm từng em thủ công!
                </p>
              </div>

              <div className="p-4 bg-white border border-purple-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Bước 3: Lên lịch & Kế hoạch</span>
                <h5 className="font-bold text-gray-800 text-sm">Tạo buổi học & Lập kế hoạch tích hợp</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Giáo viên bấm <b>"+ Thêm Buổi Học Mới"</b>. Khung nhập Kế hoạch hiển thị ngay để giáo viên ghi rõ: sách nào, trang nào, hoạt động gì, và <b>học sinh cần chuẩn bị gì trước khi tới lớp</b>.
                </p>
              </div>

              <div className="p-4 bg-white border border-amber-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Bước 4: Giao bài & Chấm bài</span>
                <h5 className="font-bold text-gray-800 text-sm">Nộp bài đa phương thức & Chấm điểm</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Giáo viên giao bài tập gắn với buổi học. Học sinh có thể nộp bằng văn bản, tệp Docx, hoặc <b>thu âm trực tiếp bằng micro</b>. Giáo viên bấm nghe bài thu âm của học sinh trực tiếp trên web và nhập điểm/lời nhận xét.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 2: QUẢN LÝ LỚP HỌC */}
        {activeSection === 'classes' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              2. Quản Lý Lớp Học & Mã Lớp Tự Động
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Cơ chế Mã lớp (Class Code)</h5>
                <p>
                  Mỗi lớp học khi được tạo (dù trùng tên nhau hay khác tên) đều được cấp một mã lớp duy nhất (6 ký tự viết hoa & số). Mã lớp này là định danh bảo mật giúp học sinh tìm chính xác lớp của thầy/cô.
                </p>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                  <b>Mẹo nhanh:</b> Nút <b>Copy</b> mã lớp luôn có sẵn ngay cạnh mã lớp ở danh sách lớp và đầu thanh sidebar.
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Nhân bản (Copy) Lớp học</h5>
                <p>
                  Khi bắt đầu một khóa mới với chương trình tương tự, thầy/cô bấm nút <b>Copy</b> trên lớp cũ. Lớp mới sẽ được tạo ngay mà không phải cấu hình lại từ đầu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 3: THỜI KHÓA BIỂU & BÁO VẮNG */}
        {activeSection === 'timetable' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              3. Thời Khóa Biểu Tuần & Quy Trình Báo Vắng
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Giao diện Thời khóa biểu ma trận (7:00 - 22:00)</h5>
                <p>
                  Thời khóa biểu hiển thị dạng lưới các ngày trong tuần từ <b>Thứ 2 đến Chủ nhật</b>. Trục thời gian trải dài từ <b>7h sáng đến 10h tối</b> (cách đều 30 phút mỗi ô).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Mỗi lớp học được tự động gán một màu sắc nhận diện riêng biệt.</li>
                  <li>Mỗi ô buổi học hiển thị: Tên lớp, giờ học, nội dung bài dạy (chủ đề/sách học) và sĩ số học sinh.</li>
                  <li>Bấm vào bất kỳ buổi học nào trên bảng để mở hộp thoại thông tin chi tiết.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tính năng Báo vắng dành cho Học sinh</h5>
                <p>
                  Khi học sinh xem thời khóa biểu và bấm vào buổi học:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li><b>Làm bài tập:</b> Nhảy trực tiếp sang bài tập của buổi học đó để làm và nộp bài.</li>
                  <li><b>Báo vắng:</b> Bắt buộc phải thực hiện <b>trước giờ học ít nhất 2 tiếng</b>. Nếu quá hạn 2 tiếng, hệ thống sẽ tự động khóa nút báo vắng.</li>
                  <li>Khi học sinh nhập lý do và bấm xác nhận, hệ thống tự động cập nhật trạng thái của học sinh thành <b>Vắng mặt (ABSENT)</b> trên bảng điểm danh của giáo viên, kèm lời giải thích mà học sinh đã gửi.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 4: BUỔI HỌC & KẾ HOẠCH GIẢNG DẠY */}
        {activeSection === 'sessions' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              4. Buổi Học & Kế Hoạch Giảng Dạy Tích Hợp
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tạo buổi học là có ngay khung nhập kế hoạch</h5>
                <p>
                  Khi bấm <b>"+ Thêm Buổi Học Mới"</b>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Nhập chủ đề bài học, thời gian bắt đầu, thời lượng (bấm nhanh nút 45p, 60p, 90p, 120p).</li>
                  <li>Khung <b>"Nhập kế hoạch giảng dạy"</b> tự động mở sẵn: nhập thời gian từng phần, tên sách, chương bài.</li>
                  <li>Chọn <b>Hoạt động trên lớp</b> từ Thư viện hoạt động (Mini game, vòng xoay, thảo luận...).</li>
                  <li>Nhập mục <b>"Học sinh cần chuẩn bị gì"</b>: Đây là dặn dò cực kỳ quan trọng, học sinh sẽ nhìn thấy nổi bật trên thời khóa biểu để đọc bài hoặc chuẩn bị dụng cụ học tập trước giờ lên lớp.</li>
                  <li>Có thể đính kèm tài liệu phát tay (Handout: tải tệp .docx/.pdf hoặc dán trực tiếp văn bản).</li>
                  <li>Bấm <b>"+ Thêm học phần tiếp theo"</b> để nhập nhiều phần liên tiếp trong một buổi.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Xem và sửa kế hoạch trực tiếp trên từng buổi</h5>
                <p>
                  Mỗi buổi học có nút <b>"Xem kế hoạch ▼"</b>. Bấm vào là toàn bộ các học phần mở ra ngay bên dưới buổi học đó. Thầy/cô có thể sửa, xóa, nhân bản từng học phần hoặc bấm <b>"+ Thêm học phần"</b> bất cứ khi nào.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 5: GIAO BÀI TẬP & CHẤM ĐIỂM */}
        {activeSection === 'assignments' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              5. Giao Bài Tập & Chấm Điểm Bài Nộp Đa Phương Thức
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tạo bài tập linh hoạt</h5>
                <p>
                  Giáo viên có thể liên kết bài tập với buổi học cụ thể, đặt hạn nộp (Deadline), đính kèm tệp đề bài hoặc audio mẫu, và lựa chọn các hình thức nộp cho phép:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">1. Văn bản tự luận</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">2. Tệp Word (.docx)</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">3. Tệp Audio (.mp3, .wav)</span>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded font-semibold border border-purple-200">4. Thu âm trực tiếp bằng micro</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Trình chấm bài & Nghe trực tiếp Audio</h5>
                <p>
                  Khi bấm <b>"Xem bài nộp"</b> ở bài tập, giáo viên theo dõi được tỷ lệ học sinh đã nộp vs chưa nộp.
                  Với bài nộp dạng ghi âm/audio, web tích hợp sẵn trình phát <code className="bg-slate-100 text-blue-600 px-1 py-0.5 rounded font-mono font-bold">&lt;audio controls&gt;</code> để giáo viên bấm nghe ngay trên trang mà không cần tải file về máy.
                  Giáo viên nhập số điểm và lời nhận xét góp ý $\rightarrow$ Học sinh sẽ thấy ngay lập tức.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 6: DÀNH CHO HỌC SINH */}
        {activeSection === 'students' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              6. Hướng Dẫn Dành Cho Phía Học Sinh
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Thời khóa biểu & Chuẩn bị bài</h5>
                <p>
                  Học sinh vào tab <b>"Thời Khóa Biểu & Kế Hoạch Học"</b> để xem ngày giờ học, tên sách, phần dặn dò <b>"Học sinh cần chuẩn bị"</b> và tải các tài liệu giáo viên phát trước giờ học.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Cách thu âm nộp bài trực tiếp bằng micro</h5>
                <p>
                  Khi làm bài tập yêu cầu ghi âm phát âm / luyện nói:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                  <li>Học sinh bấm <b>"Làm & Nộp Bài"</b>.</li>
                  <li>Chọn mục <b>"Thu âm ngay"</b>. Trình duyệt sẽ yêu cầu quyền truy cập Micro $\rightarrow$ bấm <i>"Cho phép (Allow)"</i>.</li>
                  <li>Bấm <b>"Bắt đầu ghi âm"</b> và đọc bài làm. Bấm <b>"Dừng ghi âm"</b> khi đọc xong.</li>
                  <li>Có thể bấm nghe lại bản thu của mình. Nếu ưng ý, bấm <b>"Xác nhận nộp file ghi âm này"</b> $\rightarrow$ <b>"Xác Nhận Nộp Bài"</b>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 7: ĐIỂM DANH & CHUYÊN CẦN */}
        {activeSection === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              7. Điểm Danh & Bảng Ma Trận Chuyên Cần
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">2 chế độ theo dõi chuyên cần</h5>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Điểm danh theo buổi</b>: Chọn buổi học, đánh dấu từng học sinh (Có mặt, Đi muộn, Vắng mặt) kèm ghi chú lý do, có nút bấm nhanh <i>"Tất cả có mặt"</i>.
                  </li>
                  <li>
                    <b>Ma trận chuyên cần</b>: Bảng tổng hợp tất cả các buổi học của toàn bộ học sinh trong lớp, thống kê số buổi có mặt và tỷ lệ chuyên cần (%) để giáo viên đánh giá cuối kỳ.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
