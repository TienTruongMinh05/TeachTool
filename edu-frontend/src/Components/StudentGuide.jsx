import { useState } from 'react';

export default function StudentGuide() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '1. Khởi đầu nhanh' },
    { id: 'join_class', title: '2. Vào lớp học' },
    { id: 'schedule', title: '3. Thời khóa biểu & Chuẩn bị bài' },
    { id: 'assignments', title: '4. Nộp bài (Văn bản, File, Thu âm, Ảnh)' },
    { id: 'audio_feedback', title: '5. Xem điểm & Nghe thầy cô sửa bài' },
    { id: 'delete_submission', title: '6. Xóa bài đã nộp để nộp lại' },
    { id: 'absence', title: '7. Báo vắng & Hủy báo vắng' },
    { id: 'account', title: '8. Tài khoản & Lưu trữ 1 tháng' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-bold text-gray-800">Cẩm Nang Hướng Dẫn Dành Cho Học Sinh</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tài liệu hướng dẫn chi tiết cách sử dụng TeachTool: Vào lớp bằng mã, xem lịch học, tải tài liệu phát tay, nộp bài tập (ghi âm, chụp ảnh, nộp file), nghe nhận xét âm thanh từ giáo viên, và báo vắng/hủy báo vắng.
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
        {/* PHẦN 1: KHỞI ĐẦU NHANH */}
        {activeSection === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              1. Quy Trình 4 Bước Dành Cho Học Sinh (Quickstart)
            </h4>
            <p className="text-xs text-gray-600">
              Chỉ với 4 bước đơn giản, bạn có thể dễ dàng quản lý lịch học và nộp bài tập hàng tuần:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Bước 1: Nhận mã & Vào lớp</span>
                <h5 className="font-bold text-gray-800 text-sm">Nhập Mã Lớp (Class Code)</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Nhận mã lớp gồm 6 ký tự do thầy/cô cung cấp (ví dụ: <code className="bg-slate-100 text-blue-600 px-1 py-0.5 rounded font-mono font-bold">DJ4FHF</code>). Bấm nút <b>"+ Vào Lớp Bằng Mã"</b> ở góc trên bên phải để vào lớp ngay tức thì.
                </p>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Bước 2: Theo dõi Thời khóa biểu</span>
                <h5 className="font-bold text-gray-800 text-sm">Xem lịch học & Dặn dò chuẩn bị bài</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Xem thời khóa biểu dạng lưới hàng tuần (từ 07:00 đến 22:00). Nhấp vào từng buổi học để xem: Tên sách cần mang, số trang cần học, dặn dò chuẩn bị của thầy cô và tải tài liệu phát tay (Handout).
                </p>
              </div>

              <div className="p-4 bg-white border border-purple-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Bước 3: Làm & Nộp bài tập</span>
                <h5 className="font-bold text-gray-800 text-sm">Nộp bài đa phương thức linh hoạt</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Mỗi buổi học có thể có nhiều bài tập được phân tách rõ ràng (Bài 1, Bài 2...). Bạn có thể nộp bằng <b>văn bản</b>, <b>file Word</b>, <b>file ghi âm</b>, <b>thu âm trực tiếp bằng micro</b>, hoặc <b>chụp ảnh bài làm</b> bằng camera điện thoại/webcam.
                </p>
              </div>

              <div className="p-4 bg-white border border-amber-200 rounded-xl shadow-xs space-y-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Bước 4: Xem điểm & Bản sửa Audio</span>
                <h5 className="font-bold text-gray-800 text-sm">Nhận điểm số & Lắng nghe nhận xét</h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Sau khi thầy/cô chấm điểm, bạn mở lại bài tập để xem điểm số, đọc nhận xét và bấm vào từng mốc thời gian (timestamp) để nghe thầy/cô sửa lỗi phát âm và hướng dẫn trực tiếp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 2: VÀO LỚP HỌC */}
        {activeSection === 'join_class' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              2. Cách Vào Lớp Học & Quản Lý Các Lớp Đã Tham Gia
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Vào lớp bằng mã (Class Code)</h5>
                <p>
                  Để tham gia một lớp học mới, bạn cần có <b>Mã lớp (6 ký tự)</b> do giáo viên chủ nhiệm hoặc trung tâm cung cấp:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                  <li>Bấm vào nút màu xanh <b>"+ Vào Lớp Bằng Mã"</b> ở thanh tiêu đề phía trên.</li>
                  <li>Nhập chính xác mã lớp gồm 6 ký tự (hệ thống tự động chuyển thành chữ hoa).</li>
                  <li>Bấm <b>"Xác Nhận Vào Lớp"</b>. Tên lớp học sẽ xuất hiện ngay trong danh sách lớp của bạn.</li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Xem danh sách lớp & Rời lớp khi cần</h5>
                <p>
                  Tại tab <b>"Lớp Của Tôi"</b>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Xem danh sách tất cả các lớp bạn đang theo học, kèm thông tin giáo viên phụ trách và ngày bắt đầu/kết thúc khóa học.</li>
                  <li>Nếu đăng ký nhầm lớp hoặc đã chuyển lớp khác, bạn có thể bấm nút <b>"Rời lớp"</b> để gỡ lớp đó khỏi tài khoản cá nhân.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 3: THỜI KHÓA BIỂU & KẾ HOẠCH HỌC TẬP */}
        {activeSection === 'schedule' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              3. Thời Khóa Biểu & Kế Hoạch Học Tập
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">2 chế độ xem Thời khóa biểu</h5>
                <p>
                  Bạn có thể linh hoạt chuyển đổi giữa 2 chế độ hiển thị:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li><b>Thời khóa biểu tuần (Bảng lưới 07:00 - 22:00):</b> Nhìn tổng quan lịch học cả tuần từ Thứ 2 đến Chủ nhật, các lớp học được phân biệt bằng màu sắc trực quan.</li>
                  <li><b>Danh sách chi tiết:</b> Hiển thị danh sách các buổi học sắp tới theo thứ tự thời gian gần nhất, giúp bạn không bao giờ bị bỏ lỡ buổi học nào.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Xem nội dung buổi học & Dặn dò của giáo viên</h5>
                <p>
                  Bấm vào bất kỳ buổi học nào trên lịch để mở hộp thoại chi tiết:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li><b>Chủ đề bài học:</b> Tên bài giảng và các phần kiến thức trọng tâm.</li>
                  <li><b>Sách & Trang sách:</b> Tên giáo trình và số trang sách cần mang/chuẩn bị.</li>
                  <li><b>Dặn dò chuẩn bị:</b> Các yêu cầu đặc biệt từ thầy cô (ví dụ: xem trước video, đọc trước từ vựng Unit 3...).</li>
                  <li><b>Tài liệu phát tay (Handout):</b> Nhấp vào liên kết để tải về máy các tệp PDF/Word bổ trợ.</li>
                  <li>
                    <b>Thông báo đột xuất & Huy hiệu "Tin tức" nhấp nháy:</b> Nếu buổi học có thông báo đột xuất (ví dụ: hôm nay mưa học online, dời phòng học, chuẩn bị thêm đồ dùng...) hoặc có dặn dò mà bạn chưa xem, bên ngoài buổi học sẽ xuất hiện ô <b>"Tin tức" nhấp nháy chậm</b>. Khi bạn bấm mở buổi học, khung thông báo đột xuất sẽ hiển thị nổi bật ở trên cùng với <b>viền đỏ nhấp nháy và nền vàng</b>. Ô "Tin tức" bên ngoài sẽ tự động tắt sau khi bạn đã bấm vào xem.
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Quy định Báo vắng, Hạn mức 2 buổi/tháng & Tùy chọn Xin học Online</h5>
                <p>
                  Hệ thống thiết lập cơ chế nghiêm túc nhằm đảm bảo tiến độ học tập và chuyên cần của bạn:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Thời hạn báo trước 4 tiếng:</b> Bạn chỉ có thể gửi đơn báo vắng hoặc xin học online trước giờ buổi học bắt đầu ít nhất 4 tiếng (240 phút). Nếu sát giờ, hệ thống sẽ khóa đơn và bạn cần liên hệ trực tiếp với thầy/cô.
                  </li>
                  <li>
                    <b>Hạn mức nghỉ có phép (Tối đa 2 buổi/tháng):</b> Mỗi học sinh chỉ được phép xin nghỉ tối đa 2 buổi trong một tháng dương lịch. Nếu đã đạt hạn mức 2/2 buổi, hệ thống sẽ chặn gửi đơn báo vắng.
                  </li>
                  <li>
                    <b>3 Cam kết bù bài bắt buộc:</b> Khi chọn xin nghỉ hẳn buổi học, bạn phải tích chọn xác nhận đủ 3 cam kết: (1) Xem lại tài liệu yêu cầu, (2) Nộp đầy đủ bài tập đúng hạn, và (3) Ý thức về việc vắng học có thể ảnh hưởng đến khả năng tiếng Anh của bản thân.
                  </li>
                  <li>
                    <b>Tùy chọn "Xin học Online" (Khuyên dùng):</b> Nếu không thể đến lớp trực tiếp do thời tiết xấu, đường xa... bạn hãy chọn <i>"Xin học Online"</i> thay vì nghỉ hẳn. Hình thức này <b>không bị tính vào hạn mức 2 buổi vắng</b> và <b>giữ nguyên 100% điểm chuyên cần</b>. Thầy/cô sẽ nhận được thông báo ngay và gửi link Google Meet / Zoom qua khung Thông báo buổi học để bạn tham gia.
                  </li>
                  <li>
                    <b>Hủy học online để đi học trực tiếp:</b> Nếu bạn sắp xếp đi học trực tiếp lại được, chỉ cần bấm nút <i>"Hủy học Online"</i> trên thẻ buổi học trước giờ học.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 4: NỘP BÀI TẬP ĐA PHƯƠNG THỨC */}
        {activeSection === 'assignments' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              4. Làm Bài Tập & 5 Phương Thức Nộp Bài Đa Dạng
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Làm riêng từng bài tập trong buổi học</h5>
                <p>
                  Nếu trong cùng 1 buổi học giáo viên giao nhiều bài tập (ví dụ: Bài 1 - Luyện đọc và Bài 2 - Viết đoạn văn), hệ thống sẽ hiển thị **nút làm bài riêng biệt** cho từng bài tập. Bạn có thể nộp Bài 1 trước và nộp Bài 2 sau, không bị gộp chung vào 1 lần nộp.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Nhận bài tập tự động theo lịch hẹn giờ (Auto-Push)</h5>
                <p>
                  Một số bài tập hoặc đề kiểm tra được thầy/cô lên lịch hẹn giờ phát hành:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Trước mốc thời gian hẹn, bài tập sẽ được giữ bảo mật và không xuất hiện trên Cổng học sinh.</li>
                  <li>Khi đến đúng thời gian định sẵn, hệ thống sẽ <b>tự động đẩy (push) bài tập</b> lên Cổng học sinh với cơ chế đồng bộ ngầm định kỳ mà bạn không cần phải tải lại trang.</li>
                  <li>Thời gian làm bài và hạn chót nộp bài (Deadline) sẽ được hiển thị rõ ràng ngay bên cạnh tiêu đề bài tập.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tải đề bài & Xem tệp đính kèm của giáo viên</h5>
                <p>
                  Giáo viên có thể đính kèm <b>tối đa 5 tệp tài liệu/đề bài khác nhau</b> cho mỗi bài tập. Trong modal làm bài, bạn có thể bấm vào từng tệp để tải về hoặc mở xem trực tiếp. Nếu đề bài quá dài, bạn bấm <i>"Xem thêm"</i> để đọc toàn bộ yêu cầu.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">5 Phương thức nộp bài linh hoạt</h5>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>1. Văn bản:</b> Gõ trực tiếp bài làm vào khung soạn thảo văn bản.
                  </li>
                  <li>
                    <b>2. Tệp Docx:</b> Tải lên tệp bài tập từ máy tính (.docx, .doc, .pdf).
                  </li>
                  <li>
                    <b>3. File Audio:</b> Tải lên tệp ghi âm sẵn từ điện thoại/máy tính (.mp3, .wav, .m4a).
                  </li>
                  <li>
                    <b>4. Thu âm ngay:</b> Bấm thu âm trực tiếp bằng micro trên trình duyệt. Bạn có thể bấm nghe lại, nếu chưa ưng ý có thể ghi âm lại trước khi nộp.
                  </li>
                  <li>
                    <b>5. Ảnh / Chụp ảnh:</b> 
                    <ul className="list-circle pl-5 pt-1 space-y-0.5">
                      <li><i>Tải ảnh từ máy:</i> Chọn hình ảnh bài làm có sẵn trong máy (.jpg, .png).</li>
                      <li><i>Chụp ảnh nộp bài:</i> Trên điện thoại, hệ thống sẽ mở camera để bạn chụp trang bài tập viết tay; Trên máy tính, hệ thống bật Webcam để bạn đưa trang vở lên và bấm <i>"Bấm chụp ảnh này"</i>.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Lưu bản nháp (Draft)</h5>
                <p>
                  Nếu chưa làm xong bài hoặc muốn xem lại trước khi gửi cho giáo viên, bạn bấm nút <b>"Lưu bản nháp (chưa nộp)"</b>. Nội dung bài làm sẽ được lưu giữ an toàn để bạn tiếp tục hoàn thiện sau.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 5: XEM ĐIỂM & BẢN SỬA AUDIO */}
        {activeSection === 'audio_feedback' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              5. Xem Điểm Số & Trình Phát Nhận Xét Âm Thanh Timestamped
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Xem kết quả đánh giá & Điểm số</h5>
                <p>
                  Khi giáo viên hoàn tất chấm bài:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Trạng thái bài tập chuyển thành nhãn màu xanh <b>"Đã chấm điểm"</b> kèm điểm số cụ thể (thang điểm 10).</li>
                  <li>Bấm vào bài tập để mở modal xem lại toàn bộ nội dung bạn đã nộp và lời nhận xét chi tiết của thầy cô.</li>
                  <li><b>Thời hạn lưu trữ:</b> Bài làm và lời phê của bạn được lưu trữ an toàn trong vòng <b>1 tháng</b> (30 ngày) kể từ lúc nộp. Các bạn hãy chủ động xem điểm và nghe lời sửa bài của thầy cô trong khoảng thời gian này nhé!</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Lắng nghe bản sửa âm thanh chuyên sâu</h5>
                <p>
                  Đối với các bài tập nói/phát âm tiếng Anh:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Nhận xét theo từng mốc giây (Timestamped Feedback):</b> Hệ thống hiển thị danh sách các mốc thời gian mà bạn phát âm chưa chuẩn (ví dụ: `00:14`, `00:32`). Bạn chỉ cần bấm vào mốc thời gian đó để nghe thầy/cô hướng dẫn và đọc mẫu chuẩn xác.
                  </li>
                  <li>
                    <b>Bản ghép hoàn chỉnh (Audio Splicer):</b> Bạn có thể nghe tệp âm thanh hoàn chỉnh được ghép nối liền mạch giữa giọng đọc của bạn và các đoạn sửa giọng của thầy cô, giúp bạn nhận ra ngay sự khác biệt để cải thiện phát âm.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 6: XÓA BÀI NỘP & SỬA BÀI */}
        {activeSection === 'delete_submission' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              6. Tính Năng Xóa Bài Đã Nộp Để Nộp Lại
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Khi nào được phép xóa bài nộp?</h5>
                <p>
                  Nếu bạn đã bấm nộp bài nhưng sau đó phát hiện nộp nhầm file, thiếu trang, hoặc muốn làm lại tốt hơn:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li><b>Điều kiện:</b> Bài tập của bạn <b>chưa được giáo viên chấm điểm</b>.</li>
                  <li>Khi bài chưa chấm, bên dưới khung bài đã nộp sẽ có dòng ghi chú và nút màu đỏ <b>"Xóa bài đã nộp"</b>.</li>
                  <li><b>Bảo vệ tính toàn vẹn:</b> Một khi thầy/cô đã chấm điểm và cho điểm số chính thức, bài nộp sẽ được khóa cố định để lưu giữ bằng chứng học tập.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Cách thực hiện xóa bài để nộp lại</h5>
                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                  <li>Mở bài tập cần chỉnh sửa.</li>
                  <li>Bấm vào nút <b>"Xóa bài đã nộp"</b>.</li>
                  <li>Hộp thoại In-App sẽ hỏi xác nhận: <i>"Bạn có chắc chắn muốn xóa bài đã nộp này không?"</i>.</li>
                  <li>Bấm <b>"Xác nhận xóa"</b>. Bài tập sẽ lập tức trở lại trạng thái Chưa nộp, đồng thời form nộp bài được mở ra để bạn tải lên bài làm mới hoàn chỉnh.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 7: BÁO VẮNG & HỦY BÁO VẮNG */}
        {activeSection === 'absence' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              7. Quy Trình Báo Vắng & Hủy Báo Vắng Tự Động
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Quy định về thời gian báo vắng</h5>
                <p>
                  Khi có việc bận đột xuất không thể tham gia buổi học:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Thời hạn báo trước:</b> Bạn bắt buộc phải gửi yêu cầu báo vắng <b>trước giờ học ít nhất 2 tiếng</b> theo giờ Việt Nam.
                  </li>
                  <li>
                    <b>Khóa tự động:</b> Nếu thời gian đến giờ học còn dưới 2 tiếng, hệ thống sẽ tự động khóa nút báo vắng. Bạn cần liên hệ trực tiếp với thầy cô phụ trách.
                  </li>
                  <li>
                    <b>Tự động đồng bộ sổ điểm danh:</b> Sau khi bạn gửi lý do vắng, hệ thống tự động đánh dấu trạng thái của bạn là <b>Vắng mặt</b> trên bảng điểm danh của giáo viên kèm lý do bạn đã nêu.
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Tính năng Hủy báo vắng (Khi đi học lại được)</h5>
                <p>
                  Trong trường hợp bạn đã báo vắng nhưng sau đó sắp xếp được thời gian và muốn đi học bình thường:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
                  <li>Mở lại buổi học đã báo vắng trên Thời khóa biểu hoặc danh sách buổi học.</li>
                  <li>Bấm vào nút <b>"Hủy báo vắng"</b>.</li>
                  <li>Hộp thoại xác nhận sẽ hiện lên hỏi: <i>"Bạn có chắc chắn muốn hủy báo vắng và đi học buổi này không?"</i>.</li>
                  <li>Bấm <b>"Xác nhận đi học"</b>. Trạng thái báo vắng sẽ lập tức được thu hồi, hệ thống hoàn trả lại trạng thái đi học bình thường trên sổ điểm danh của thầy cô!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* PHẦN 8: TÀI KHOẢN & LƯU TRỮ */}
        {activeSection === 'account' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-lg font-bold text-gray-800">
              8. Quản Lý Tài Khoản & Chính Sách Lưu Trữ Dữ Liệu
            </h4>
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Bảo mật tài khoản & Đổi mật khẩu</h5>
                <p>
                  Bạn có thể bấm vào nút <b>"Cài đặt"</b> ở góc trên bên phải để:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Xem thông tin tài khoản, cập nhật họ tên hiển thị với giáo viên.</li>
                  <li>Đổi mật khẩu bảo mật (mật khẩu được mã hóa an toàn bằng PBKDF2 chống rò rỉ).</li>
                  <li>Yêu cầu xóa tài khoản nếu không còn nhu cầu sử dụng hệ thống.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h5 className="font-bold text-gray-800 text-sm">Chính sách lưu trữ dữ liệu hệ thống</h5>
                <p>
                  Để tối ưu hóa không gian lưu trữ và đảm bảo hệ thống luôn hoạt động nhanh chóng, mượt mà:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                  <li>
                    <b>Dữ liệu bài nộp của học sinh:</b> Các bài làm đã nộp (file văn bản, tệp Word, file audio thu âm, ảnh chụp bài tập) được lưu giữ trong vòng <b>1 tháng</b> kể từ ngày nộp lên hệ thống. Khoảng thời gian này hoàn toàn đủ để giáo viên chấm điểm, nhận xét và học sinh xem lại kết quả.
                  </li>
                  <li>
                    <b>Dữ liệu lớp học:</b> Toàn bộ dữ liệu của lớp học bao gồm sách số, tài liệu phát tay, kế hoạch buổi học, giáo án, v.v. được lưu giữ trong vòng <b>6 tháng</b> hoặc cho đến khi giáo viên chủ động xóa khỏi hệ thống.
                  </li>
                  <li>
                    <b>Khuyến nghị:</b> Các tệp bài viết quan trọng bạn nên lưu giữ một bản sao lưu trên máy tính hoặc điện thoại cá nhân.
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