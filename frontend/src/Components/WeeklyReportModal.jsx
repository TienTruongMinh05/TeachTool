import { useState, useEffect, useMemo } from 'react';
import { reportApi } from '../api/reportApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export default function WeeklyReportModal({ isOpen, onClose, classId, classInfo }) {
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();

  // Tab view: 'FORM' | 'PREVIEW'
  const [activeTab, setActiveTab] = useState('FORM');

  // Tính số tuần động và tuần hiện tại theo startDate và endDate của lớp học
  const dynamicWeekInfo = useMemo(() => {
    let sDate = classInfo?.startDate ? new Date(classInfo.startDate) : null;
    let eDate = classInfo?.endDate ? new Date(classInfo.endDate) : null;

    if (!sDate || isNaN(sDate.getTime())) {
      sDate = new Date();
    }
    // Thứ Hai của tuần chứa ngày bắt đầu
    const day = sDate.getDay();
    const mondayDiff = sDate.getDate() - day + (day === 0 ? -6 : 1);
    const week1Monday = new Date(sDate);
    week1Monday.setDate(mondayDiff);
    week1Monday.setHours(0, 0, 0, 0);

    let lastSunday;
    if (eDate && !isNaN(eDate.getTime())) {
      const eDay = eDate.getDay();
      const sundayDiff = eDate.getDate() + (eDay === 0 ? 0 : 7 - eDay);
      lastSunday = new Date(eDate);
      lastSunday.setDate(sundayDiff);
      lastSunday.setHours(23, 59, 59, 999);
    } else {
      // Mặc định nếu chưa đặt endDate: 12 tuần
      lastSunday = new Date(week1Monday);
      lastSunday.setDate(week1Monday.getDate() + 12 * 7 - 1);
    }

    if (lastSunday < week1Monday) {
      lastSunday = new Date(week1Monday);
      lastSunday.setDate(week1Monday.getDate() + 6);
    }

    const diffDays = Math.ceil((lastSunday - week1Monday) / (1000 * 60 * 60 * 24));
    const calculatedTotalWeeks = Math.max(1, Math.ceil(diffDays / 7));

    // Tính tuần hiện tại theo ngày hôm nay
    const today = new Date();
    let calculatedCurrentWeek = 1;
    if (today < week1Monday) {
      calculatedCurrentWeek = 1;
    } else if (today > lastSunday) {
      calculatedCurrentWeek = calculatedTotalWeeks;
    } else {
      const daysFromStart = Math.floor((today - week1Monday) / (1000 * 60 * 60 * 24));
      calculatedCurrentWeek = Math.max(1, Math.min(calculatedTotalWeeks, Math.floor(daysFromStart / 7) + 1));
    }

    return {
      totalWeeks: calculatedTotalWeeks,
      currentWeek: calculatedCurrentWeek
    };
  }, [classInfo]);

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Form states
  const [progressStatus, setProgressStatus] = useState('ON_TIME'); // 'ON_TIME' | 'FASTER' | 'SLOWER'
  const [delayReason, setDelayReason] = useState('');
  const [challenges, setChallenges] = useState('');
  const [selfRating, setSelfRating] = useState(5);

  // Machine verified tasks (Cho phép giáo viên ghi đè nếu cần)
  const [attendanceDone, setAttendanceDone] = useState(true);
  const [announcementsDone, setAnnouncementsDone] = useState(true);
  const [homeworkAssigned, setHomeworkAssigned] = useState(true);
  const [homeworkGraded, setHomeworkGraded] = useState(true);

  // Preview data
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const initTotal = dynamicWeekInfo.totalWeeks || 12;
      const initCurrent = dynamicWeekInfo.currentWeek || 1;
      setTotalWeeks(initTotal);
      setSelectedWeek(initCurrent);
      setActiveTab('FORM');
    }
  }, [isOpen, dynamicWeekInfo]);

  useEffect(() => {
    if (isOpen && classId) {
      loadPreview(selectedWeek);
    }
  }, [isOpen, classId, selectedWeek]);

  const loadPreview = async (week) => {
    try {
      setLoadingPreview(true);
      const res = await reportApi.getPreview(classId, week);
      const data = res?.data || res;
      setPreviewData(data);
      if (data) {
        if (data.totalWeeks && data.totalWeeks > 0) {
          setTotalWeeks(prev => Math.max(prev, data.totalWeeks, week));
        }
        setAttendanceDone(Boolean(data.attendanceDone));
        setAnnouncementsDone(Boolean(data.announcementsDone));
        setHomeworkAssigned(Boolean(data.homeworkAssigned));
        setHomeworkGraded(Boolean(data.homeworkGraded));
      }
    } catch (err) {
      console.warn('Lỗi khi tải thông tin xem trước báo cáo:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const weekList = useMemo(() => {
    const maxWeeks = Math.max(totalWeeks, selectedWeek, dynamicWeekInfo.totalWeeks || 1);
    return Array.from({ length: maxWeeks }, (_, i) => i + 1);
  }, [totalWeeks, selectedWeek, dynamicWeekInfo]);

  const handleExport = async (e) => {
    if (e) e.preventDefault();
    if (!classId) return;

    try {
      setExporting(true);
      toast.info(lang === 'en' ? 'Generating customized Word report (.docx)...' : 'Đang kết xuất báo cáo Word tuần theo mẫu (.docx)...');

      const payload = {
        week: selectedWeek,
        progressStatus,
        delayReason: progressStatus === 'SLOWER' ? delayReason : '',
        challenges: challenges.trim(),
        selfRating,
        attendanceDone,
        announcementsDone,
        homeworkAssigned,
        homeworkGraded
      };

      const responseData = await reportApi.downloadWeeklyReport(classId, payload);
      const blob = responseData instanceof Blob ? responseData : new Blob([responseData]);

      // Kiểm tra nếu trả về JSON lỗi
      if (blob.type === 'application/json') {
        const text = await blob.text();
        let errMsg = 'Lỗi khi xuất báo cáo tuần';
        try {
          const json = JSON.parse(text);
          errMsg = json.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Kích hoạt trình duyệt tải tệp về
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeClassName = (classInfo?.name || `Lop_${classId}`).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
      link.setAttribute('download', `Bao_Cao_Tuan_${safeClassName}_Tuan_${selectedWeek}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(lang === 'en' ? 'Weekly report exported successfully!' : 'Đã xuất và tải xuống báo cáo tuần thành công!');
      onClose();
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo:', err);
      let errMsg = err.message || 'Lỗi khi xuất báo cáo tuần';
      if (err.response?.data instanceof Blob && err.response.data.type === 'application/json') {
        try {
          const errText = await err.response.data.text();
          const parsed = JSON.parse(errText);
          errMsg = parsed.message || errMsg;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      toast.error(errMsg);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl my-6 overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{lang === 'en' ? 'Weekly Report (.docx)' : 'Báo Cáo Tuần (.docx)'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-bold">
                TEC FORM
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {classInfo?.name} {previewData?.dateRange ? `• ${previewData.dateRange}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('FORM')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'FORM'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}>
            <span>📝</span>
            <span>{lang === 'en' ? 'Edit Form' : 'Chỉnh Sửa Biểu Mẫu'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PREVIEW')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'PREVIEW'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}>
            <span>👁️</span>
            <span>{lang === 'en' ? 'Full Document Preview' : 'Xem Trước Toàn Bộ Báo Cáo'}</span>
          </button>
        </div>

        {/* TAB 1: FORM CHỈNH SỬA */}
        {activeTab === 'FORM' && (
          <form onSubmit={handleExport} className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* 1. Chọn Tuần & Ngày */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-lg border border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'en' ? 'Select Week:' : 'Chọn Tuần Báo Cáo:'}
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-semibold text-slate-800 dark:text-slate-200">
                  {weekList.map(w => (
                    <option key={w} value={w}>
                      {lang === 'en' ? `Week ${w}` : `Tuần ${w}`} {w === dynamicWeekInfo.currentWeek ? (lang === 'en' ? '(Current)' : '(Hiện tại)') : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({lang === 'en' ? `Total ${weekList.length} weeks` : `Tổng ${weekList.length} tuần`})
                </span>
              </div>

              {loadingPreview ? (
                <span className="text-[11px] text-blue-600 dark:text-blue-400 animate-pulse">
                  {lang === 'en' ? 'Calculating metrics...' : 'Đang tính toán số liệu tự động...'}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {lang === 'en' ? 'Date range:' : 'Thời gian:'} <b className="text-blue-700 dark:text-blue-400 font-mono">{previewData?.dateRange || 'Tuần hiện tại'}</b>
                </span>
              )}
            </div>

            {/* 2. TIẾN ĐỘ GIẢNG DẠY */}
            <div className="space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                II. {lang === 'en' ? 'Teaching Progress:' : 'Tiến Độ Giảng Dạy:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                  progressStatus === 'ON_TIME'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="progressStatus"
                    value="ON_TIME"
                    checked={progressStatus === 'ON_TIME'}
                    onChange={() => setProgressStatus('ON_TIME')}
                    className="text-blue-600"
                  />
                  <span>{lang === 'en' ? 'On schedule' : 'Hoàn thành đúng tiến độ'}</span>
                </label>

                <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                  progressStatus === 'FASTER'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="progressStatus"
                    value="FASTER"
                    checked={progressStatus === 'FASTER'}
                    onChange={() => setProgressStatus('FASTER')}
                    className="text-emerald-600"
                  />
                  <span>{lang === 'en' ? 'Ahead of plan' : 'Nhanh hơn kế hoạch'}</span>
                </label>

                <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                  progressStatus === 'SLOWER'
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="progressStatus"
                    value="SLOWER"
                    checked={progressStatus === 'SLOWER'}
                    onChange={() => setProgressStatus('SLOWER')}
                    className="text-rose-600"
                  />
                  <span>{lang === 'en' ? 'Behind schedule' : 'Chậm hơn kế hoạch'}</span>
                </label>
              </div>

              {progressStatus === 'SLOWER' && (
                <div className="pt-1 animate-fade-in">
                  <input
                    type="text"
                    required={progressStatus === 'SLOWER'}
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder={lang === 'en' ? 'If behind schedule, state reason...' : 'Nếu chậm, nhập lý do (VD: Cần củng cố thêm phát âm Unit 5)...'}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-900/60 rounded-md text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* 3. CÔNG TÁC GIẢNG DẠY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  IV. {lang === 'en' ? 'Teaching Administration:' : 'Công Tác Giảng Dạy (Đối soát tiến độ):'}
                </label>
                <span className="text-[10px] text-slate-400">
                  {lang === 'en' ? 'Click to toggle if needed' : 'Có thể tick chọn thủ công'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={attendanceDone}
                    onChange={(e) => setAttendanceDone(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{lang === 'en' ? 'Full Attendance Taken' : 'Điểm danh đầy đủ'}</span>
                  {previewData?.attendanceDone && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">✓ {lang === 'en' ? 'Verified' : 'Đã đối soát'}</span>
                  )}
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={announcementsDone}
                    onChange={(e) => setAnnouncementsDone(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{lang === 'en' ? 'Announcements Sent' : 'Gửi thông báo nhóm đầy đủ'}</span>
                  {previewData?.announcementsDone && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">✓ {lang === 'en' ? 'Verified' : 'Đã đối soát'}</span>
                  )}
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={homeworkAssigned}
                    onChange={(e) => setHomeworkAssigned(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{lang === 'en' ? 'Homework Assigned' : 'Giao BTVN đầy đủ'}</span>
                  {previewData?.homeworkAssigned && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">✓ {lang === 'en' ? 'Verified' : 'Đã đối soát'}</span>
                  )}
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={homeworkGraded}
                    onChange={(e) => setHomeworkGraded(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{lang === 'en' ? 'Homework Graded / Reviewed' : 'Chữa BTVN đầy đủ'}</span>
                  {previewData?.homeworkGraded && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">✓ {lang === 'en' ? 'Verified' : 'Đã đối soát'}</span>
                  )}
                </label>
              </div>
            </div>

            {/* 4. KHÓ KHĂN / HỖ TRỢ CẦN THIẾT */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                V. {lang === 'en' ? 'Difficulties / Required Support:' : 'Khó Khăn / Hỗ Trợ Cần Thiết:'}
              </label>
              <textarea
                rows={2}
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder={lang === 'en' ? 'Describe any difficulties with recommendations (leave empty if none)...' : 'Kèm theo đề xuất nếu có (để trống nếu không có khó khăn gì)...'}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 resize-none"
              />
            </div>

            {/* 5. TỰ ĐÁNH GIÁ */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                VI. {lang === 'en' ? 'Self-Evaluation (1 = Poor | 5 = Excellent):' : 'Tự Đánh Giá (1 = Chưa tốt | 5 = Rất tốt):'}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const isSelected = selfRating === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setSelfRating(rating)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                      ★ {rating}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Tóm tắt thông tin tổng hợp */}
            {previewData && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Summary from class data:' : 'Dữ liệu tổng hợp từ lớp học:'}
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <b>{lang === 'en' ? 'Taught sessions:' : 'Bài đã dạy tuần này:'}</b>{' '}
                    {previewData.pastSessions?.length > 0 ? previewData.pastSessions.join('; ') : (lang === 'en' ? 'No session in this week' : 'Chưa có buổi học')}
                  </li>
                  <li>
                    <b>{lang === 'en' ? 'Next week plan:' : 'Kế hoạch tuần tới:'}</b>{' '}
                    {previewData.nextSessions?.length > 0 ? previewData.nextSessions.join('; ') : (lang === 'en' ? 'Follow syllabus' : 'Theo tiến độ phân phối chương trình')}
                  </li>
                  <li>
                    <b>{lang === 'en' ? 'At-risk students:' : 'Học sinh cần theo dõi:'}</b>{' '}
                    {previewData.atRiskCount > 0 ? `${previewData.atRiskCount} ${lang === 'en' ? 'students' : 'học sinh (vắng hoặc nợ bài)'}` : (lang === 'en' ? 'None (all on track)' : 'Cả lớp hoàn thành đầy đủ, không có vấn đề')}
                  </li>
                </ul>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition cursor-pointer flex items-center gap-1.5">
                <span>👁️</span>
                <span>{lang === 'en' ? 'Preview Full Report' : 'Xem Trước Toàn Văn'}</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition cursor-pointer">
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={exporting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5">
                  {exporting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{lang === 'en' ? 'Exporting...' : 'Đang xuất...'}</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>{lang === 'en' ? 'Export & Download (.docx)' : 'Xuất & Tải Báo Cáo (.docx)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: XEM TRƯỚC TOÀN BỘ VĂN BẢN (LIVE DOCUMENT PREVIEW) */}
        {activeTab === 'PREVIEW' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/90">
            {/* Thanh điều khiển tuần trên trang xem trước */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Viewing Report for:' : 'Xem báo cáo cho:'}
                </span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200">
                  {weekList.map(w => (
                    <option key={w} value={w}>
                      {lang === 'en' ? `Week ${w}` : `Tuần ${w}`} {w === dynamicWeekInfo.currentWeek ? (lang === 'en' ? '(Current)' : '(Hiện tại)') : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                  ({previewData?.dateRange || 'Tuần hiện tại'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('FORM')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer flex items-center gap-1">
                  <span>✏️</span>
                  <span>{lang === 'en' ? 'Edit Details' : 'Chỉnh sửa'}</span>
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={handleExport}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5">
                  {exporting ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{lang === 'en' ? 'Exporting...' : 'Đang xuất...'}</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>{lang === 'en' ? 'Export (.docx)' : 'Xuất File (.docx)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Khung Trang Word A4 Preview */}
            <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 space-y-4 max-w-2xl mx-auto text-xs leading-relaxed">
              {/* Tiêu đề Báo cáo */}
              <div className="text-center border-b-2 border-blue-900/40 dark:border-blue-500/40 pb-3">
                <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-blue-900 dark:text-blue-400 font-serif">
                  BÁO CÁO TUẦN (WEEKLY REPORT)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Biểu mẫu báo cáo tiến độ giảng dạy & tình hình học sinh
                </p>
              </div>

              {/* I. THÔNG TIN CHUNG */}
              <div className="space-y-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  I. THÔNG TIN CHUNG
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  <div><b>Giáo viên:</b> {previewData?.teacherName || 'Giáo viên phụ trách'}</div>
                  <div><b>Tuần:</b> {previewData?.dateRange || 'Tuần hiện tại'}</div>
                  <div><b>Lớp:</b> {classInfo?.name || previewData?.className}</div>
                </div>
              </div>

              {/* II. TIẾN ĐỘ GIẢNG DẠY */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  II. TIẾN ĐỘ GIẢNG DẠY
                </h4>
                <div className="flex flex-wrap gap-4 text-xs font-mono">
                  <span>{progressStatus === 'ON_TIME' ? '☑' : '☐'} Hoàn thành đúng tiến độ</span>
                  <span>{progressStatus === 'FASTER' ? '☑' : '☐'} Nhanh hơn kế hoạch</span>
                  <span>{progressStatus === 'SLOWER' ? '☑' : '☐'} Chậm hơn kế hoạch</span>
                </div>
                <div className="text-xs italic text-slate-600 dark:text-slate-400">
                  <b>Nếu chậm, lý do:</b> {progressStatus === 'SLOWER' && delayReason ? delayReason : 'Không có (Đảm bảo đúng tiến độ)'}
                </div>

                {/* Bài đã dạy */}
                <div className="space-y-0.5 pt-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Bài đã dạy:</div>
                  {previewData?.sessionDetails && previewData.sessionDetails.length > 0 ? (
                    previewData.sessionDetails.map((s, idx) => (
                      <div key={idx} className="pl-3 text-xs text-slate-700 dark:text-slate-300">
                        • <b>Buổi {s.sessionIndex}:</b> {s.formattedText}
                      </div>
                    ))
                  ) : previewData?.pastSessions?.length > 0 ? (
                    previewData.pastSessions.map((s, idx) => (
                      <div key={idx} className="pl-3 text-xs text-slate-700 dark:text-slate-300">
                        • <b>Buổi {idx + 1}:</b> {s}
                      </div>
                    ))
                  ) : (
                    <div className="pl-3 text-xs italic text-slate-400">Chưa có buổi học nào trong tuần này</div>
                  )}
                </div>

                {/* Kế hoạch tuần tới */}
                <div className="space-y-0.5 pt-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Kế hoạch tuần tới:</div>
                  {previewData?.nextSessions && previewData.nextSessions.length > 0 ? (
                    previewData.nextSessions.map((s, idx) => (
                      <div key={idx} className="pl-3 text-xs text-slate-700 dark:text-slate-300">
                        • <b>Buổi {idx + 1}:</b> {s}
                      </div>
                    ))
                  ) : (
                    <div className="pl-3 text-xs italic text-slate-400">Theo tiến độ phân phối chương trình</div>
                  )}
                </div>
              </div>

              {/* III. TÌNH HÌNH HỌC SINH */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  III. TÌNH HÌNH HỌC SINH
                </h4>
                <div className="space-y-1">
                  {previewData?.sessionDetails && previewData.sessionDetails.length > 0 ? (
                    previewData.sessionDetails.map((s, idx) => (
                      <div key={idx} className="text-xs bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                        <b>Buổi {s.sessionIndex} ({s.topic}):</b> Tổng số HS: <b className="text-blue-600 dark:text-blue-400">{s.totalStudents}</b> | Có mặt: <b className="text-emerald-600 dark:text-emerald-400">{s.presentCount}</b> | Vắng: <b className={s.absentCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>{s.absentCount}</b>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs italic text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                      Tổng số HS: {previewData?.totalStudents || dynamicWeekInfo.totalStudents || 0} | Có mặt: {previewData?.totalStudents || 0} | Vắng: 0
                    </div>
                  )}
                </div>

                {/* Bảng Học sinh cần theo dõi */}
                <div className="pt-2">
                  <div className="font-bold text-xs mb-1 text-slate-800 dark:text-slate-200">Học sinh cần theo dõi:</div>
                  <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-left w-1/4">Học sinh</th>
                        <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-left w-1/2">Vấn đề cần lưu ý</th>
                        <th className="border border-slate-300 dark:border-slate-700 p-1.5 text-left w-1/4">Đề xuất hỗ trợ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData?.atRiskStudents && previewData.atRiskStudents.length > 0 ? (
                        previewData.atRiskStudents.map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
                            <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-semibold text-slate-900 dark:text-slate-100">{st.name}</td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-rose-700 dark:text-rose-400">{st.issue}</td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-slate-700 dark:text-slate-300">{st.recommendation}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 font-semibold text-emerald-700 dark:text-emerald-400">Cả lớp</td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-400">Đi học và hoàn thành bài đầy đủ trong tuần, không có vấn đề phát sinh.</td>
                          <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-400">Tiếp tục phát huy</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IV. CÔNG TÁC GIẢNG DẠY */}
              <div className="space-y-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  IV. CÔNG TÁC GIẢNG DẠY
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  <span>{attendanceDone ? '☑' : '☐'} Điểm danh đầy đủ</span>
                  <span>{announcementsDone ? '☑' : '☐'} Gửi thông báo nhóm đầy đủ</span>
                  <span>{homeworkAssigned ? '☑' : '☐'} Giao BTVN đầy đủ</span>
                  <span>{homeworkGraded ? '☑' : '☐'} Chữa BTVN đầy đủ</span>
                </div>
              </div>

              {/* V. KHÓ KHĂN / HỖ TRỢ CẦN THIẾT */}
              <div className="space-y-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  V. KHÓ KHĂN / HỖ TRỢ CẦN THIẾT
                </h4>
                <div className="text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {challenges && challenges.trim() ? challenges.trim() : 'Không có khó khăn hay đề xuất phát sinh trong tuần này.'}
                </div>
              </div>

              {/* VI. TỰ ĐÁNH GIÁ */}
              <div className="space-y-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 uppercase text-xs">
                  VI. TỰ ĐÁNH GIÁ
                </h4>
                <div className="text-xs font-mono">
                  Đánh giá tuần này: <b className="text-blue-700 dark:text-blue-400">☑ {selfRating} / 5 ({['Chưa tốt', 'Cần cố gắng', 'Đạt yêu cầu', 'Tốt', 'Rất tốt'][selfRating - 1]})</b>
                </div>
              </div>

              {/* Ngày nộp & Chữ ký */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs italic text-slate-500 dark:text-slate-400">
                <div>Ngày nộp: {new Date().toLocaleDateString('vi-VN')}</div>
                <div className="text-right">
                  <div className="font-bold not-italic text-slate-800 dark:text-slate-200">Giáo viên phụ trách</div>
                  <div className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{previewData?.teacherName || 'Giáo viên phụ trách'}</div>
                </div>
              </div>
            </div>

            {/* Actions dưới Preview */}
            <div className="flex justify-between items-center pt-4 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab('FORM')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1.5">
                <span>←</span>
                <span>{lang === 'en' ? 'Back to Edit' : 'Quay Lại Chỉnh Sửa'}</span>
              </button>

              <button
                type="button"
                disabled={exporting}
                onClick={handleExport}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5">
                {exporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>{lang === 'en' ? 'Exporting...' : 'Đang xuất...'}</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>{lang === 'en' ? 'Export & Download (.docx)' : 'Xuất & Tải Báo Cáo (.docx)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
