import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentPortalApi } from '../api/studentPortalApi';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { fileApi } from '../api/fileApi';
import AudioRecorder from '../Components/AudioRecorder';
import TimetableGrid from '../Components/TimetableGrid';
import ChangePasswordModal from '../Components/ChangePasswordModal';

export default function StudentPortal() {
  const { user, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // State các tab chính: 'schedule' (Thời khóa biểu), 'assignments' (Bài tập & Điểm số), 'classes' (Lớp học)
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleViewMode, setScheduleViewMode] = useState('grid'); // 'grid' | 'list'

  const [schedule, setSchedule] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Báo vắng states
  const [selectedSessionForAbsence, setSelectedSessionForAbsence] = useState(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceError, setAbsenceError] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  // Modal tham gia lớp học bằng mã
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Modal nộp bài tập
  const [activeAssignmentToSubmit, setActiveAssignmentToSubmit] = useState(null);
  const [selectedSubmissionMode, setSelectedSubmissionMode] = useState('TEXT'); // 'TEXT' | 'DOCX' | 'AUDIO' | 'DIRECT_RECORD'
  const [submissionText, setSubmissionText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileData, setUploadedFileData] = useState({ fileUrl: '', fileName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState('');

  // Modal xem nội dung Handout Text
  const [viewingHandoutText, setViewingHandoutText] = useState(null);

  const loadData = async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      const [schedRes, assignRes, subsRes, classesRes] = await Promise.allSettled([
        studentPortalApi.getSchedule(user.id),
        assignmentApi.getForStudent(user.id),
        submissionApi.getByStudent(user.id),
        studentPortalApi.getClasses(user.id)
      ]);

      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value || []);
      if (assignRes.status === 'fulfilled') setAssignments(assignRes.value || []);
      if (subsRes.status === 'fulfilled') setSubmissions(subsRes.value || []);
      if (classesRes.status === 'fulfilled') setEnrolledClasses(classesRes.value || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCodeInput.trim()) return;
    try {
      setJoining(true);
      setJoinError('');
      await studentPortalApi.joinClass(classCodeInput.trim(), user.id);
      setIsJoinModalOpen(false);
      setClassCodeInput('');
      await loadData();
    } catch (err) {
      setJoinError(err.response?.data?.message || err.message || 'Mã lớp không hợp lệ hoặc lớp không tồn tại.');
    } finally {
      setJoining(false);
    }
  };

  const openSubmitModal = (assignment) => {
    setActiveAssignmentToSubmit(assignment);
    setSubmissionSuccessMsg('');
    const existing = submissions.find(s => s.assignmentId === assignment.id);
    if (existing) {
      setSelectedSubmissionMode(existing.submissionType || 'TEXT');
      setSubmissionText(existing.textContent || '');
      setUploadedFileData({
        fileUrl: existing.fileUrl || '',
        fileName: existing.fileName || ''
      });
    } else {
      const allowed = (assignment.allowedSubmissionTypes || '').split(',');
      if (allowed.includes('TEXT')) setSelectedSubmissionMode('TEXT');
      else if (allowed.includes('DOCX')) setSelectedSubmissionMode('DOCX');
      else if (allowed.includes('AUDIO')) setSelectedSubmissionMode('AUDIO');
      else if (allowed.includes('DIRECT_RECORD')) setSelectedSubmissionMode('DIRECT_RECORD');
      else setSelectedSubmissionMode('TEXT');

      setSubmissionText('');
      setUploadedFileData({ fileUrl: '', fileName: '' });
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const res = await fileApi.upload(file);
      setUploadedFileData({
        fileUrl: res.fileUrl,
        fileName: res.fileName || file.name
      });
    } catch (err) {
      alert('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignmentToSubmit) return;

    try {
      setSubmitting(true);
      const payload = {
        submissionType: selectedSubmissionMode,
        textContent: selectedSubmissionMode === 'TEXT' ? submissionText : null,
        fileUrl: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileUrl : null,
        fileName: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileName : null
      };

      if (selectedSubmissionMode === 'TEXT' && !submissionText.trim()) {
        alert('Vui lòng nhập nội dung văn bản bài làm!');
        return;
      }
      if (selectedSubmissionMode !== 'TEXT' && !uploadedFileData.fileUrl) {
        alert('Vui lòng tải lên hoặc ghi âm tệp bài làm trước khi nộp!');
        return;
      }

      await submissionApi.submit(activeAssignmentToSubmit.id, user.id, payload);
      setSubmissionSuccessMsg('Đã nộp bài tập thành công!');
      await loadData();
      setTimeout(() => {
        setActiveAssignmentToSubmit(null);
        setSubmissionSuccessMsg('');
      }, 1200);
    } catch (err) {
      alert('Lỗi khi nộp bài tập: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 120;
  };

  const getAbsenceRemainingNotice = (session) => {
    if (!session || !session.startTime) return '';
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return 'Buổi học đã qua';
    if (diffMinutes < 120) return `Còn ${diffMinutes} phút nữa là vào học (quá hạn báo trước 2 giờ)`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `Còn ${hours} giờ ${mins} phút trước giờ học (hợp lệ để báo vắng)`;
  };

  const handleOpenAbsenceModal = (session) => {
    setSelectedSessionForAbsence(session);
    setAbsenceReason('');
    setAbsenceError('');
  };

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!selectedSessionForAbsence || !user?.id) return;
    if (!canReportAbsence(selectedSessionForAbsence)) {
      setAbsenceError('Chỉ được phép báo vắng trước giờ học ít nhất 2 tiếng!');
      return;
    }
    try {
      setIsSubmittingAbsence(true);
      setAbsenceError('');
      await studentPortalApi.reportAbsence(user.id, selectedSessionForAbsence.sessionId || selectedSessionForAbsence.id, absenceReason);
      alert('Đã gửi báo vắng thành công!');
      setSelectedSessionForAbsence(null);
      setAbsenceReason('');
      await loadData();
    } catch (err) {
      setAbsenceError(err.response?.data?.message || err.message || 'Lỗi khi gửi báo vắng.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  const handleGoToAssignment = (session) => {
    setActiveTab('assignments');
    if (session?.assignments && session.assignments.length > 0) {
      const assId = session.assignments[0].id;
      const fullAss = assignments.find(a => a.id === assId) || session.assignments[0];
      openSubmitModal(fullAss);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-12">
      {/* HEADER BAR (RESPONSIVE CHO CẢ PC & ĐIỆN THOẠI) */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-blue-400">TeachTool</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
              Học Sinh
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-100">{user?.fullName || 'Học sinh'}</div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs whitespace-nowrap">
              + Vào Lớp Bằng Mã
            </button>
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700 whitespace-nowrap">
              Đổi mật khẩu
            </button>
            <button
              onClick={logout}
              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700 whitespace-nowrap">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-7">
        {/* THANH ĐIỀU HƯỚNG TAB (RESPONSIVE CHẠY MƯỢT TRÊN MOBILE & PC) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl max-w-lg mb-6 shadow-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Thời Khóa Biểu ({schedule.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Bài Tập & Điểm ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'classes' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Lớp Của Tôi ({enrolledClasses.length})
          </button>
        </div>

        {loading && (
          <div className="text-gray-500 py-12 text-center text-sm">
            Đang tải dữ liệu học tập của bạn...
          </div>
        )}

        {/* TAB 1: THỜI KHÓA BIỂU & KẾ HOẠCH HỌC TẬP */}
        {!loading && activeTab === 'schedule' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Thời Khóa Biểu & Kế Hoạch Học</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Xem lịch học tuần (07:00 - 22:00), nội dung bài học, dặn dò chuẩn bị, làm bài tập và báo vắng
                </p>
              </div>

              {/* Toggle dạng hiển thị: Bảng tuần vs Danh sách chi tiết */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thời khóa biểu tuần (07:00 - 22:00)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('list')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Danh sách bài học & Chuẩn bị
                </button>
              </div>
            </div>

            {schedule.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 text-sm mb-1">Chưa có lịch học nào</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                  Bạn chưa tham gia lớp nào hoặc giáo viên chưa lên lịch học. Bấm nút bên dưới để nhập mã vào lớp.
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  Tham Gia Lớp Bằng Mã
                </button>
              </div>
            ) : scheduleViewMode === 'grid' ? (
              /* DẠNG BẢNG THỜI KHÓA BIỂU TUẦN (07:00 - 22:00) */
              <TimetableGrid
                sessions={schedule}
                isStudent={true}
                studentId={user?.id}
                onReportAbsenceSuccess={loadData}
                onGoToAssignment={handleGoToAssignment}
              />
            ) : (
              /* DẠNG DANH SÁCH CHI TIẾT TỪNG BUỔI HỌC */
              <div className="space-y-4">
                {schedule.map((item, idx) => {
                  const isAbsent = item.attendanceStatus === 'ABSENT';
                  const canAbsent = canReportAbsence(item);

                  return (
                    <div key={item.sessionId || idx} className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                      {/* Header của Buổi học */}
                      <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                              {item.className}
                            </span>
                            {item.classCode && (
                              <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Mã: {item.classCode}
                              </span>
                            )}
                            <h3 className="font-bold text-gray-800 text-base">
                              Buổi {idx + 1}: {item.topic || 'Buổi học'}
                            </h3>
                            {isAbsent && (
                              <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded">
                                Đã báo vắng
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Bắt đầu: <b className="text-gray-700">{formatDateTime(item.startTime)}</b></span>
                            <span>Thời lượng: <b className="text-gray-700">{item.durationMinutes ? `${item.durationMinutes} phút` : '90 phút'}</b></span>
                          </div>
                          {item.attendanceNote && (
                            <div className="text-xs text-rose-600 mt-1">
                              Lý do: {item.attendanceNote}
                            </div>
                          )}
                        </div>

                        {/* Nút thao tác nhanh của buổi học: Làm bài tập & Báo vắng */}
                        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                          <button
                            type="button"
                            onClick={() => handleGoToAssignment(item)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs">
                            Làm bài tập
                          </button>

                          {isAbsent ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                              Đã vắng
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAbsent}
                              onClick={() => handleOpenAbsenceModal(item)}
                              title={getAbsenceRemainingNotice(item)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs ${
                                canAbsent
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                                  : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'
                              }`}>
                              Báo vắng
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chi tiết học phần (Nội dung, Sách, Chuẩn bị gì) */}
                      <div className="p-4 space-y-4">
                        {item.sections && item.sections.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Nội dung chi tiết & Dặn dò chuẩn bị
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {item.sections.map((sec, sIdx) => (
                                <div key={sec.id || sIdx} className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg space-y-2">
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                                    <div className="font-bold text-gray-800 text-sm">
                                      Phần {sIdx + 1}: {sec.content}
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">
                                      Thời gian: {sec.timeAllocation || `${sec.durationMinutes || 15} phút`}
                                    </div>
                                  </div>

                                  {sec.activity && (
                                    <div className="text-xs text-purple-700 font-medium">
                                      Hoạt động trên lớp: <span className="font-semibold">{sec.activity}</span>
                                    </div>
                                  )}

                                  {/* DẶN DÒ HỌC SINH CẦN CHUẨN BỊ GÌ */}
                                  {sec.studentPreparation ? (
                                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed">
                                      <span className="font-bold text-amber-800 block mb-0.5">Học sinh cần chuẩn bị:</span>
                                      {sec.studentPreparation}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400 italic">
                                      (Không có yêu cầu chuẩn bị đặc biệt)
                                    </div>
                                  )}

                                  {/* Tài liệu Handout */}
                                  {sec.handoutType === 'TEXT' && sec.handoutText && (
                                    <div>
                                      <button
                                        onClick={() => setViewingHandoutText(sec.handoutText)}
                                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                                        Xem văn bản bài học đã dán
                                      </button>
                                    </div>
                                  )}
                                  {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                                    <div>
                                      <a
                                        href={sec.handoutFilePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded hover:bg-emerald-100">
                                        Tải tài liệu: {sec.handoutFileName || 'Tệp đính kèm'}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic py-2">
                            Chưa có kế hoạch chi tiết cho buổi học này.
                          </div>
                        )}

                        {/* BÀI TẬP CỦA BUỔI HỌC */}
                        {item.assignments && item.assignments.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Bài tập liên kết với buổi học này
                            </h4>
                            <div className="space-y-2">
                              {item.assignments.map((ass) => {
                                const sub = submissions.find(s => s.assignmentId === ass.id);
                                return (
                                  <div key={ass.id} className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div>
                                      <div className="font-bold text-sm text-gray-800">{ass.title}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Hạn nộp: <b>{formatDateTime(ass.dueDate)}</b>
                                      </div>
                                      {sub?.score && (
                                        <div className="text-xs font-bold text-emerald-700 mt-1">
                                          Điểm của bạn: {sub.score} / 10
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => openSubmitModal(ass)}
                                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto">
                                      {sub ? 'Xem lại bài đã nộp' : 'Làm & Nộp Bài'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TOÀN BỘ BÀI TẬP & KẾT QUẢ CHẤM ĐIỂM (TÍCH HỢP TẤT CẢ TRONG 1 DANH SÁCH DUY NHẤT) */}
        {!loading && activeTab === 'assignments' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Bài Tập & Kết Quả Chấm Điểm</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem toàn bộ bài tập được giao, hạn nộp, trạng thái nộp bài, điểm số và nhận xét từ giáo viên
              </p>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 text-sm mb-1">Hiện không có bài tập nào</h4>
                <p className="text-xs text-gray-500">Giáo viên chưa giao bài tập nào cho các lớp của bạn.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((ass) => {
                  const sub = submissions.find(s => s.assignmentId === ass.id);
                  const isSubmitted = !!sub;
                  const isGraded = !!sub?.score;

                  return (
                    <div key={ass.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded truncate max-w-[200px]">
                            {ass.sessionTopic ? `Buổi: ${ass.sessionTopic}` : 'Bài tập'}
                          </span>
                          {isGraded ? (
                            <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded border border-purple-200 whitespace-nowrap">
                              Điểm: {sub.score} / 10
                            </span>
                          ) : isSubmitted ? (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200 whitespace-nowrap">
                              Đã nộp bài
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded border border-amber-200 whitespace-nowrap">
                              Chưa nộp
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-800 text-base">{ass.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                          {ass.description || 'Không có mô tả chi tiết'}
                        </p>

                        <div className="text-xs text-gray-500 pt-1">
                          Hạn chót: <b className="text-gray-700">{formatDateTime(ass.dueDate)}</b>
                        </div>

                        {/* Nhận xét của giáo viên nếu đã chấm */}
                        {sub?.feedback && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-purple-800 block">Lời nhận xét từ Giáo Viên:</span>
                            <p className="text-purple-900 whitespace-pre-wrap">{sub.feedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => openSubmitModal(ass)}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs text-center">
                          {isSubmitted ? 'Xem lại bài đã nộp / Nộp lại' : 'Làm & Nộp Bài'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DANH SÁCH LỚP HỌC CỦA TÔI */}
        {!loading && activeTab === 'classes' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Lớp Học Đã Tham Gia</h2>
                <p className="text-xs text-gray-500 mt-0.5">Danh sách các lớp bạn đã ghi danh qua mã lớp</p>
              </div>
              <button
                onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs text-center">
                + Tham Gia Thêm Lớp Mới
              </button>
            </div>

            {enrolledClasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 text-sm mb-1">Bạn chưa tham gia lớp học nào</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                  Hãy hỏi giáo viên Mã Lớp (Class Code) và bấm nút bên dưới để tham gia.
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  Nhập Mã Lớp Học
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enrolledClasses.map((cls) => (
                  <div key={cls.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        Mã: {cls.classCode || `#${cls.id}`}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold">Đang học</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">{cls.name}</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        Thời gian: {cls.startDate || '—'} → {cls.endDate || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL THAM GIA LỚP BẰNG MÃ */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tham Gia Lớp Học</h3>
            <p className="text-xs text-gray-500 mb-4">
              Nhập mã lớp học (6 ký tự viết hoa/số) do giáo viên cung cấp để tham gia vào lớp.
            </p>

            {joinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium mb-4">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã lớp học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: DJ4FHF"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest font-mono font-bold text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {joining ? 'Đang kiểm tra mã...' : 'Vào Lớp Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NỘP BÀI TẬP (VĂN BẢN, DOCX, AUDIO, GHI ÂM TRỰC TIẾP) */}
      {activeAssignmentToSubmit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <h4 className="text-base font-bold truncate max-w-sm">
                  {activeAssignmentToSubmit.title}
                </h4>
                <div className="text-xs text-slate-300 mt-1">
                  Hạn nộp: {formatDateTime(activeAssignmentToSubmit.dueDate)}
                </div>
              </div>
              <button
                onClick={() => setActiveAssignmentToSubmit(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {submissionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
                  {submissionSuccessMsg}
                </div>
              )}

              {/* Mô tả đề bài */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block">Yêu cầu bài tập:</span>
                <p className="text-slate-600 whitespace-pre-wrap">{activeAssignmentToSubmit.description || 'Không có mô tả chi tiết'}</p>
                {activeAssignmentToSubmit.attachmentFileUrl && (
                  <div className="pt-1.5">
                    <a
                      href={activeAssignmentToSubmit.attachmentFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline">
                      Tải tệp đính kèm của giáo viên: {activeAssignmentToSubmit.attachmentFileName || 'Tệp bài giảng'}
                    </a>
                  </div>
                )}
              </div>

              {/* Chọn phương thức nộp bài */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Chọn định dạng nộp bài:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionMode('TEXT')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                      selectedSubmissionMode === 'TEXT' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    Văn bản
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionMode('DOCX')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                      selectedSubmissionMode === 'DOCX' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    Tệp Docx
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionMode('AUDIO')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                      selectedSubmissionMode === 'AUDIO' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    File Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionMode('DIRECT_RECORD')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                      selectedSubmissionMode === 'DIRECT_RECORD' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    Thu âm ngay
                  </button>
                </div>
              </div>

              {/* PHƯƠNG THỨC 1: VĂN BẢN TRỰC TIẾP */}
              {selectedSubmissionMode === 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nhập nội dung bài làm của bạn:
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Nhập nội dung trả lời câu hỏi tại đây..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* PHƯƠNG THỨC 2: TẢI TỆP WORD (DOCX) */}
              {selectedSubmissionMode === 'DOCX' && (
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tải tệp Word bài làm (.docx, .doc):
                  </label>
                  <input
                    type="file"
                    accept=".docx,.doc"
                    onChange={(e) => handleFileUpload(e, 'DOCX')}
                    className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                  />
                  {uploadingFile && <div className="text-xs text-blue-600">Đang tải file lên...</div>}
                  {uploadedFileData.fileName && (
                    <div className="text-xs text-emerald-700 font-semibold mt-1">
                      ✓ Đã đính kèm: {uploadedFileData.fileName}
                    </div>
                  )}
                </div>
              )}

              {/* PHƯƠNG THỨC 3: TẢI FILE ÂM THANH (AUDIO) */}
              {selectedSubmissionMode === 'AUDIO' && (
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tải tệp âm thanh (.mp3, .wav, .m4a):
                  </label>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm"
                    onChange={(e) => handleFileUpload(e, 'AUDIO')}
                    className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                  />
                  {uploadingFile && <div className="text-xs text-blue-600">Đang tải file âm thanh lên...</div>}
                  {uploadedFileData.fileUrl && (
                    <div className="pt-2 space-y-1">
                      <span className="text-xs text-emerald-700 font-semibold block">
                        ✓ Đã đính kèm: {uploadedFileData.fileName}
                      </span>
                      <audio controls src={uploadedFileData.fileUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              )}

              {/* PHƯƠNG THỨC 4: THU ÂM TRỰC TIẾP TRÊN TRÌNH DUYỆT */}
              {selectedSubmissionMode === 'DIRECT_RECORD' && (
                <AudioRecorder
                  onRecordingUploaded={({ fileUrl, fileName }) => {
                    setUploadedFileData({ fileUrl, fileName });
                  }}
                />
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveAssignmentToSubmit(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {submitting ? 'Đang nộp bài...' : 'Xác Nhận Nộp Bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM HANDOUT TEXT */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Nội Dung Văn Bản Bài Học</h4>
            <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-800 leading-relaxed">
              {viewingHandoutText}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setViewingHandoutText(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO VẮNG */}
      {selectedSessionForAbsence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-rose-800">Xác nhận báo vắng buổi học</h3>
                <p className="text-xs text-rose-600 mt-0.5">
                  {selectedSessionForAbsence.className} - {selectedSessionForAbsence.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForAbsence(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold mb-1">Quy định báo vắng:</p>
                <p>Học sinh phải báo vắng trước giờ bắt đầu buổi học ít nhất 2 tiếng. Lý do xin phép vắng sẽ được tự động chuyển đến giáo viên phụ trách.</p>
                <p className="mt-1.5 font-bold text-amber-900">{getAbsenceRemainingNotice(selectedSessionForAbsence)}</p>
              </div>

              {absenceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {absenceError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do xin phép vắng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ví dụ: Em bị ốm, gia đình có việc bận đột xuất..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForAbsence(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmittingAbsence ? 'Đang gửi...' : 'Xác nhận báo vắng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
