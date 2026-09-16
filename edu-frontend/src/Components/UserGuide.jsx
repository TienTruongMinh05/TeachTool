import { useState } from 'react';

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '1. Tổng quan & Khởi đầu nhanh' },
    { id: 'classes', title: '2. Quản lý Lớp & Giáo viên đồng phụ trách' },
    { id: 'timetable', title: '3. Thời khóa biểu & Báo vắng' },
    { id: 'sessions', title: '4. Buổi học, Giáo án & Kho hoạt động' },
    { id: 'materials', title: '5. Sách giáo khoa & Thư viện số' },
    { id: 'assignments', title: '6. Giao bài & Chấm bài Audio nâng cao' },
    { id: 'students', title: '7. Cổng Học Sinh & Nộp bài' },
    { id: 'attendance', title: '8. Điểm danh & Bảng chuyên cần' },
    { id: 'account', title: '9. Tài khoản & Bảo mật phân quyền' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-bold text-gray-800">Cẩm Nang Hướng Dẫn Sử Dụng TeachTool</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tài liệu hướng dẫn chi tiết toàn bộ các tính năng từ cơ bản đến nâng cao: Quản lý lớp, giáo án, giáo trình số hóa, chấm bài audio chuyên sâu, và bảo mật dữ liệu.
        </p>
      </div>

      {/* Tabs điều hướng các phần hướng dẫn */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {sections.map(sec => (
          <button
            key={sec.id}
            type="button"
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
              Hệ thống TeachTool được thiết kế nhằm tối ưu hóa công tác giảng dạy, kết nối mượt mà giữa Giáo viên và Học sinh qua 4 bước cơ bản:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Bước 1: Giáo viên tạo lớp</span>
                <h5 className="font-bold text-gray-800 text-sm">Tạo lớp & Nhận Mã Lớp (Class Code)</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tại màn hình <b>"Danh sách lớp học"</b>, bấm <b>"+ Thêm Lớp Mới"</b>. Hệ thống tự động sinh 1 mã lớp gồm 6 ký tự ngẫu nhiên (ví dụ: <code className="bg-slate-100 text-blue-600 px-1 py-0.5 rounded font-mono font-bold">DJ4FHF</code>). Thầy/cô chỉ cần bấm nút <b>Copy</b> và gửi mã này cho học sinh qua Zalo/Facebook/Email.
                </p>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Bước 2: Học sinh nhập mã vào lớp</span>
                <h5 className="font-bold text-gray-800 text-sm">Học sinh tự ghi danh</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Học sinh đăng nhập (bằng Email hoặc Google 1-chạm), chọn vai trò <b>Học sinh</b>, sau đó bấm <b>"+ Vào Lớp Bằng Mã"</b> và nhập mã 6 ký tự. Học sinh sẽ ngay lập tức được kết nối vào lớp học mà không cần giáo viên phải gõ danh sách thủ công!
                </p>
              </div>

              <div className="p-4 bg-white border border-purple-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Bước 3: Soạn giáo án & Đính kèm sách</span>
                <h5 className="font-bold text-gray-800 text-sm">Lên lịch buổi học & Lập kế hoạch tích hợp</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Giáo viên tạo buổi học và phân chia từng học phần bài dạy: chỉ định số trang sách giáo khoa, chọn hoạt động tương tác từ <b>Kho hoạt động mẫu</b>, và ghi chú <b>"Học sinh cần chuẩn bị gì"</b> để học sinh đọc trước tài liệu.
                </p>
              </div>

              <div className="p-4 bg-white border border-amber-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Bước 4: Giao bài & Chấm Audio</span>
                <h5 className="font-bold text-gray-800 text-sm">Nộp bài đa phương thức & Chấm chuyên sâu</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Học sinh có thể nộp bài tự luận, tệp Word hoặc <b>thu âm trực tiếp bằng Micro</b>. Giáo viên sử dụng bàn chấm âm thanh để nghe, sửa lỗi phát âm tại từng mốc thời gian và ghép nối thành file âm thanh sửa mẫu hoàn chỉnh.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 2: QUẢN LÝ LỚP HỌC & ĐỒNG PHỤ TRÁCH */}
        {activeSection === 'classes' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              2. Quản Lý Lớp Học & Giáo Viên Đồng Phụ Trách
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Cơ chế Mã lớp tự động (Class Code)</h5>
                <p>
                  Mỗi lớp học khi được tạo đều được cấp một mã lớp duy nhất gồm 6 ký tự viết hoa và số. Mã lớp này là định danh bảo mật giúp học sinh tìm chính xác lớp của mình.
                </p>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                  Nút <b>Copy</b> mã lớp luôn có sẵn ngay cạnh tên lớp ở danh sách lớp và đầu thanh sidebar điều hướng.
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Mời Giáo viên đồng phụ trách (Co-Teacher)</h5>
                <p>
                  Đối với các lớp học có trợ giảng hoặc giáo viên bộ môn cùng tham gia giảng dạy:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Bấm vào biểu tượng <b>"Quản lý giáo viên phụ trách"</b> tại thanh tiêu đề lớp.</li>
                  <li>Nhập địa chỉ email của giáo viên cần mời (tài khoản đã đăng ký vai trò TEACHER).</li>
                  <li>Giáo viên đồng phụ trách sau khi được mời sẽ nhìn thấy lớp trong bảng điều khiển, có quyền xem thời khóa biểu, điểm danh, tạo buổi học và chấm bài tập của học sinh.</li>
                  <li>Chỉ giáo viên chủ nhiệm (người tạo lớp) mới có quyền xóa lớp hoặc gỡ bỏ giáo viên đồng phụ trách.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Nhân bản (Copy) Lớp học</h5>
                <p>
                  Khi bắt đầu một khóa mới với chương trình tương tự, thầy/cô bấm nút <b>Copy</b> trên lớp cũ. Lớp mới sẽ được tạo ngay với đầy đủ cấu hình mà không phải thiết lập lại từ đầu.
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
                  <li>Bấm vào bất kỳ buổi học nào trên bảng để mở hộp thoại thông tin chi tiết (nội dung, tài liệu dặn dò, bài tập).</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tính năng Báo vắng tự động dành cho Học sinh</h5>
                <p>
                  Khi học sinh xem thời khóa biểu và bấm vào buổi học sắp diễn ra:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li><b>Quy định thời gian:</b> Bắt buộc học sinh phải gửi yêu cầu báo vắng <b>trước giờ học ít nhất 2 tiếng</b>. Nếu dưới 2 tiếng trước giờ lên lớp, hệ thống sẽ tự động khóa nút báo vắng để đảm bảo tính kỷ luật.</li>
                  <li><b>Đồng bộ sổ điểm danh:</b> Khi học sinh nhập lý do và gửi, hệ thống tự động cập nhật trạng thái của học sinh thành <b>Vắng mặt (ABSENT)</b> trên bảng điểm danh của giáo viên, kèm lời giải thích mà học sinh đã ghi.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 4: BUỔI HỌC, GIÁO ÁN & KHO HOẠT ĐỘNG */}
        {activeSection === 'sessions' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              4. Buổi Học, Giáo Án Tích Hợp & Kho Hoạt Động Mẫu
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tạo buổi học & Phân chia học phần chi tiết</h5>
                <p>
                  Khi bấm <b>"+ Thêm Buổi Học Mới"</b>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Nhập chủ đề bài học, thời gian bắt đầu, thời lượng (chọn nhanh các mốc 45p, 60p, 90p, 120p).</li>
                  <li>Khung kế hoạch giảng dạy cho phép tạo nhiều học phần nối tiếp (ví dụ: Khởi động 10p, Nghe đọc 25p, Thực hành 30p, Tổng kết 15p).</li>
                  <li>Chỉ định cụ thể cuốn sách và trang cần dạy (hệ thống liên kết trực tiếp với thư viện sách của lớp để mở ngay khi dạy).</li>
                  <li>Nhập mục <b>"Học sinh cần chuẩn bị gì"</b>: Đây là dặn dò quan trọng hiển thị nổi bật trên giao diện của học sinh để chuẩn bị trước bài học.</li>
                  <li>Đính kèm tài liệu phát tay (Handout: tệp PDF/Docx hoặc nội dung văn bản).</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Kho Thư viện hoạt động mẫu (Activity Library)</h5>
                <p>
                  Ngay trong form Thêm/Chỉnh sửa học phần bài dạy, giáo viên bấm nút <b>"Chọn từ kho"</b> để mở thư viện hoạt động:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Thư viện tổng hợp sẵn các hoạt động sư phạm chuẩn: Khởi động (Warm-up), Vòng xoay may mắn, Thảo luận nhóm, Tranh luận, Đóng vai (Role-play), Ôn tập kiến thức.</li>
                  <li>Bấm <b>"Chọn hoạt động này"</b> để tự động điền tên hoạt động vào học phần một cách nhanh chóng.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Sao chép buổi học hàng loạt sang tuần tiếp theo (Batch Copy)</h5>
                <p>
                  Thay vì phải nhập lại từng buổi học cho tuần mới:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Tại danh sách buổi học, bấm nút <b>"Sao chép sang tuần tới (+7 ngày)"</b>.</li>
                  <li>Hệ thống tự động quét toàn bộ lịch học của tuần hiện tại và nhân bản sang đúng các ngày và khung giờ tương ứng của tuần tiếp theo, bảo toàn toàn bộ nội dung giáo án đã soạn.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 5: SÁCH GIÁO KHOA & THƯ VIỆN SỐ */}
        {activeSection === 'materials' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              5. Quản Lý Sách Giáo Khoa & Giáo Trình Số Hóa (PDF Canvas Viewer)
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tải lên & Lưu trữ vĩnh viễn sách giáo khoa lớp học</h5>
                <p>
                  Mỗi lớp học sở hữu một kho tài liệu và giáo trình riêng biệt tại tab <b>"Tài Liệu & Sách"</b>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Hỗ trợ tải lên các tệp giáo trình PDF dung lượng lớn (lên tới 100 MB).</li>
                  <li><b>Tự động nhận diện trang:</b> Thư viện pdf.js tự động đọc cấu trúc tệp PDF và nhận diện chính xác tổng số trang của cuốn sách ngay khi tải lên.</li>
                  <li><b>Lưu trữ cơ sở dữ liệu đám mây:</b> Dữ liệu sách và tệp tin được lưu trữ vĩnh viễn trong cơ sở dữ liệu PostgreSQL, đảm bảo sách không bao giờ bị mất khi khởi động lại máy chủ hoặc chuyển đổi thiết bị.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Trình đọc sách trực quan chuyên dụng (Canvas PDF Viewer)</h5>
                <p>
                  Khi bấm nút <b>"Mở Sách / Đọc"</b>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Trình đọc sách Canvas hiệu năng cao hiển thị trang sách sắc nét, mượt mà mà không phụ thuộc vào plugin ngoài của trình duyệt.</li>
                  <li>Tích hợp thanh công cụ: Chuyển trang nhanh bằng số trang, phóng to / thu nhỏ, vừa vặn khung hình và chế độ toàn màn hình tiện lợi khi trình chiếu trên lớp.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Mở sách 1 chạm từ Kế hoạch bài dạy</h5>
                <p>
                  Khi giáo viên đã chỉ định sách và số trang trong kế hoạch buổi học, tại danh sách buổi học hoặc thời khóa biểu chỉ cần bấm vào nhãn trang sách là hệ thống tự động mở đúng trang đó để giáo viên bắt đầu giảng dạy ngay lập tức.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 6: GIAO BÀI & CHẤM BÀI AUDIO NÂNG CAO */}
        {activeSection === 'assignments' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              6. Giao Bài Tập & Chấm Bài Nói Audio Nâng Cao (Audio Splicer Workbench)
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Giao bài tập đa dạng hình thức nộp</h5>
                <p>
                  Giáo viên có thể liên kết bài tập với buổi học, đặt hạn nộp (Deadline), đính kèm tệp đề bài hoặc audio mẫu, và lựa chọn các hình thức nộp cho phép:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">1. Văn bản tự luận</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">2. Tệp Word (.docx)</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">3. Tệp Audio (.mp3, .wav)</span>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded font-semibold border border-purple-200">4. Ghi âm trực tiếp qua micro</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Bàn chấm bài nói chuyên sâu (Audio Grading Workbench)</h5>
                <p>
                  Đối với các bài nộp dạng ghi âm phát âm/luyện nói của học sinh:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Điều chỉnh tốc độ nghe:</b> Nghe lại bài nói ở các tốc độ 0.8x, 1.0x, 1.2x, 1.5x để phát hiện chuẩn xác từng âm tiết bị lỗi.
                  </li>
                  <li>
                    <b>Sửa bằng Audio tại từng mốc giây:</b> Bấm <i>"Sửa bằng Audio"</i> tại thời điểm học sinh phát âm sai. Giáo viên nói vào micro để giải thích và phát âm mẫu đoạn đúng $\rightarrow$ bấm <i>"Xong & Chèn vào mốc"</i>.
                  </li>
                  <li>
                    <b>Sửa bằng Text theo mốc thời gian:</b> Bấm <i>"Sửa bằng Text"</i> để ghi chú văn bản chi tiết (ví dụ: "[00:15] Chú ý âm đuôi /s/, dùng thì quá khứ").
                  </li>
                  <li>
                    <b>Ghép nối âm thanh hoàn chỉnh (Audio Splicer):</b> Bấm <i>"Nghe thử bản ghép hoàn chỉnh"</i>. Thuật toán Web Audio API sẽ tự động ghép nối bài nói của học sinh xen kẽ với các đoạn sửa giọng của thầy/cô thành một tệp âm thanh hoàn chỉnh liền mạch để học sinh nghe lại và so sánh.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 7: CỔNG HỌC SINH & NỘP BÀI */}
        {activeSection === 'students' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              7. Hướng Dẫn Dành Cho Phía Học Sinh (Student Portal)
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Theo dõi tiến độ học tập & Thời khóa biểu</h5>
                <p>
                  Học sinh đăng nhập để theo dõi lịch học cá nhân của toàn bộ các lớp mình tham gia:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Xem phòng học, giờ học, tên sách và đặc biệt là mục <b>"Cần chuẩn bị trước khi tới lớp"</b>.</li>
                  <li>Bấm vào buổi học để tải tài liệu phát tay do giáo viên gửi.</li>
                  <li>Xem tình trạng nộp bài tập của từng buổi học (Chưa làm, Đã nộp, Đã chấm điểm).</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Quy trình ghi âm nộp bài trực tiếp bằng micro</h5>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
                  <li>Học sinh bấm vào bài tập $\rightarrow$ chọn <b>"Làm & Nộp Bài"</b>.</li>
                  <li>Chọn phương thức <b>"Thu âm ngay"</b>. Khi trình duyệt yêu cầu cấp quyền Micro, bấm <i>"Cho phép (Allow)"</i>.</li>
                  <li>Bấm <b>"Bắt đầu ghi âm"</b> và đọc bài làm. Khi đọc xong bấm <b>"Dừng ghi âm"</b>.</li>
                  <li>Học sinh có thể nghe lại bản thu của mình. Nếu hài lòng, bấm <b>"Xác nhận nộp file ghi âm này"</b> $\rightarrow$ <b>"Xác Nhận Nộp Bài"</b>.</li>
                  <li>Sau khi giáo viên chấm bài, học sinh có thể mở lại để xem điểm, đọc lời nhận xét chi tiết và nghe file audio sửa mẫu từ thầy cô.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 8: ĐIỂM DANH & CHUYÊN CẦN */}
        {activeSection === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              8. Điểm Danh & Bảng Ma Trận Chuyên Cần
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">2 chế độ theo dõi chuyên cần thông minh</h5>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Điểm danh theo từng buổi:</b> Chọn buổi học trong danh sách, đánh dấu trạng thái (Có mặt, Đi muộn, Vắng mặt) kèm ghi chú lý do. Có nút bấm nhanh <i>"Tất cả có mặt"</i> giúp giáo viên điểm danh cả lớp chỉ trong 1 giây.
                  </li>
                  <li>
                    <b>Tự động đồng bộ báo vắng:</b> Nếu học sinh đã xin phép báo vắng hợp lệ trên cổng học sinh, hệ thống sẽ tự động gán trạng thái Vắng và hiển thị sẵn lý do của học sinh đó.
                  </li>
                  <li>
                    <b>Ma trận chuyên cần toàn khóa:</b> Bảng tổng hợp đối chiếu tất cả các buổi học của toàn bộ học sinh trong lớp, tự động tính tổng số buổi có mặt và tỷ lệ chuyên cần (%) phục vụ đánh giá cuối khóa.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 9: TÀI KHOẢN & BẢO MẬT PHÂN QUYỀN */}
        {activeSection === 'account' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              9. Quản Lý Tài Khoản & Cơ Chế Bảo Mật Dữ Liệu
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Đăng nhập linh hoạt & Mã hóa mật khẩu chuẩn OWASP</h5>
                <p>
                  Hệ thống hỗ trợ đăng nhập bằng Email/Mật khẩu hoặc Đăng nhập nhanh 1-chạm bằng tài khoản Google. Mật khẩu được mã hóa bảo mật tuyệt đối bằng giải thuật chuẩn <b>PBKDF2WithHmacSHA256</b> với 65,536 vòng băm, ngăn ngừa hoàn toàn nguy cơ rò rỉ thông tin.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Cơ chế Tự xóa tài khoản & Xóa tài khoản học sinh an toàn</h5>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Học sinh tự xóa tài khoản:</b> Trong mục <b>"Cài đặt tài khoản"</b> (bấm vào tên tài khoản ở góc trên bên phải), học sinh có thể yêu cầu xóa tài khoản của chính mình. Toàn bộ thông tin cá nhân sẽ được dọn dẹp an toàn.
                  </li>
                  <li>
                    <b>Giáo viên quản lý danh sách học sinh:</b> Giáo viên có thể xem danh sách toàn bộ học sinh và xóa các tài khoản thử nghiệm hoặc học sinh không còn theo học tại trường (học sinh không còn ghi danh ở bất kỳ lớp nào).
                  </li>
                  <li>
                    <b>Bảo vệ toàn vẹn dữ liệu:</b> Để tránh trường hợp vô tình làm mất dữ liệu bài tập và điểm danh của lớp, hệ thống sẽ ngăn chặn việc xóa tài khoản của học sinh nếu em đó vẫn đang tham gia $\ge 1$ lớp học, và đưa ra hướng dẫn rõ ràng yêu cầu gỡ học sinh khỏi lớp trước khi xóa tài khoản.
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Bảo mật phân quyền kép (Dual RBAC Protection)</h5>
                <p>
                  Mọi thao tác quản lý lớp học, sửa kế hoạch, tạo bài tập và chấm điểm đều được kiểm tra phân quyền nghiêm ngặt ở cả giao diện lẫn API máy chủ. Học sinh bị chặn hoàn toàn khi cố gắng truy cập dữ liệu của giáo viên hoặc bài nộp của bạn học khác, đảm bảo tính riêng tư tuyệt đối cho môi trường giáo dục.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
