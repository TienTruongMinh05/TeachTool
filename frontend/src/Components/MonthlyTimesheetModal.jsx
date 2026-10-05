// File: src/Components/MonthlyTimesheetModal.jsx
import { useState, useEffect } from 'react';
import { timesheetApi } from '../api/timesheetApi';
import { classApi } from '../api/classApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { XIcon, DownloadIcon } from './Icons';

export default function MonthlyTimesheetModal({ isOpen, onClose, initialClassId = null }) {
  const { toast } = useToast();
  const { lang } = useThemeLanguage();

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState(initialClassId ? String(initialClassId) : 'ALL');
  const [classList, setClassList] = useState([]);

  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Cập nhật khi initialClassId thay đổi
  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(String(initialClassId));
    }
  }, [initialClassId]);

  // Nạp danh sách lớp của giáo viên
  useEffect(() => {
    if (!isOpen) return;
    classApi.getAll()
      .then(res => {
        setClassList(Array.isArray(res) ? res : (res?.data || []));
      })
      .catch(err => {
        console.error('Lỗi nạp danh sách lớp:', err);
      });
  }, [isOpen]);

  // Nạp preview mỗi khi tháng, năm hoặc lớp thay đổi
  useEffect(() => {
    if (!isOpen) return;
    loadPreview();
  }, [isOpen, month, year, selectedClassId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const cId = selectedClassId === 'ALL' ? null : Number(selectedClassId);
      const res = await timesheetApi.getPreview(month, year, cId);
      setPreviewData(res);
    } catch (err) {
      console.error('Lỗi tải dữ liệu chấm công:', err);
      toast.error(lang === 'en' ? 'Failed to load timesheet preview' : 'Không thể tải bản xem trước chấm công.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const cId = selectedClassId === 'ALL' ? null : Number(selectedClassId);
      const blob = await timesheetApi.exportExcel(month, year, cId);

      const url = window.URL.createObjectURL(new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));

      const link = document.createElement('a');
      link.href = url;
      const filename = cId
        ? `Cham_Cong_Lop_${cId}_Thang_${String(month).padStart(2, '0')}_${year}.xlsx`
        : `Cham_Cong_Tat_Ca_Lop_Thang_${String(month).padStart(2, '0')}_${year}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(lang === 'en' ? 'Timesheet exported successfully!' : 'Đã xuất bảng chấm công Excel thành công!');
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      toast.error(lang === 'en' ? 'Failed to export timesheet' : 'Xuất bảng chấm công thất bại.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shadow-2xs">
              📊
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{lang === 'en' ? 'Monthly Teaching Timesheet' : 'Xuất Chấm Công Giảng Dạy Tháng'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  .XLSX
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'en'
                  ? 'Generate monthly attendance & teaching hours summary in Excel format'
                  : 'Bảng tổng hợp buổi dạy, thời lượng và tổng số giờ công theo từng tháng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Bộ lọc tháng, năm & lớp học */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Chọn Tháng */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {lang === 'en' ? 'Month' : 'Tháng'}
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {monthOptions.map(m => (
                  <option key={m} value={m}>
                    {lang === 'en' ? `Month ${m}` : `Tháng ${m}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Năm */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {lang === 'en' ? 'Year' : 'Năm'}
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Chọn Lớp Học */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {lang === 'en' ? 'Scope / Class' : 'Phạm vi lớp học'}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden max-w-[240px]"
              >
                <option value="ALL">
                  {lang === 'en' ? '✨ All My Classes (Summary)' : '✨ Tất cả các lớp của tôi (Tổng hợp)'}
                </option>
                {classList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Lớp ${c.classCode}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick KPI stats */}
          {previewData && (
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-right">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {lang === 'en' ? 'Total Sessions' : 'Số buổi dạy'}
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                  {previewData.totalSessions} <span className="text-xs font-normal text-slate-500">{lang === 'en' ? 'sessions' : 'buổi'}</span>
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-right">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold block">
                  {lang === 'en' ? 'Total Hours' : 'Tổng số giờ'}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {Number(previewData.totalHours || 0).toFixed(2)} <span className="text-xs font-normal">{lang === 'en' ? 'hrs' : 'giờ'}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Nội dung bảng xem trước (Preview Table) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs sm:text-sm">{lang === 'en' ? 'Loading timesheet data...' : 'Đang tính toán bảng chấm công tháng...'}</p>
            </div>
          ) : !previewData || previewData.items.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="text-3xl mb-2">📅</div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'en' ? 'No sessions found in this month' : `Không có buổi học nào trong Tháng ${month}/${year}`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {lang === 'en'
                  ? 'Please select another month or verify that sessions have been scheduled with start times in this period.'
                  : 'Vui lòng chọn tháng khác hoặc kiểm tra lại lịch buổi học đã tạo trong thời gian này.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Header theo đúng format yêu cầu: no., class, time, duration, content, note */}
                <thead className="bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 border-r border-blue-500">No.</th>
                    <th className="py-2.5 px-3 border-r border-blue-500 w-36 sm:w-44">Class</th>
                    <th className="py-2.5 px-3 text-center border-r border-blue-500 w-48">Time</th>
                    <th className="py-2.5 px-3 text-right border-r border-blue-500 w-24">Duration</th>
                    <th className="py-2.5 px-3 border-r border-blue-500">Content</th>
                    <th className="py-2.5 px-3 w-40 sm:w-48">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                  {previewData.items.map((item) => (
                    <tr key={item.sessionId || item.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="py-2 px-3 text-center font-mono font-semibold text-slate-400 border-r border-slate-100 dark:border-slate-800">
                        {item.no}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                        {item.className}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {item.time}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800">
                        {Number(item.duration || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                        {item.content}
                      </td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {item.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Hàng Total Hours ở dưới cùng */}
                <tfoot className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right tracking-wider uppercase text-[11px] border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      TOTAL HOURS:
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-r border-slate-200 dark:border-slate-800">
                      {Number(previewData.totalHours || 0).toFixed(2)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-xs text-slate-400 font-normal italic">
                      {lang === 'en'
                        ? `(Calculated from ${previewData.totalSessions} sessions in Month ${month}/${year})`
                        : `(Tổng cộng từ ${previewData.totalSessions} buổi học trong Tháng ${month}/${year})`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'en'
              ? 'Excel formula =SUM(...) is embedded automatically in the Total Hours row.'
              : 'File Excel tự động tích hợp công thức =SUM(...) tại hàng Total Hours.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {lang === 'en' ? 'Close' : 'Đóng'}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading || !previewData || previewData.items.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {exporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{lang === 'en' ? 'Exporting...' : 'Đang xuất file...'}</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Download Excel (.xlsx)' : 'Tải File Chấm Công (.xlsx)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
