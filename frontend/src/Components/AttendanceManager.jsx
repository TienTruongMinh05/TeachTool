import { useState, useEffect } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import { sessionApi } from '../api/sessionApi';
import { studentApi } from '../api/studentApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { GlobeIcon } from './Icons';

export default function AttendanceManager({ classId, initialSessionId = null }) {
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();
  const [viewMode, setViewMode] = useState('session'); // 'session' | 'matrix'
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // studentId -> { status, note }
  const [allClassAttendances, setAllClassAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Tải dữ liệu ban đầu: danh sách buổi học và học sinh
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sessionsData, studentsData] = await Promise.all([
        sessionApi.getByClass(classId),
        studentApi.getByClass(classId)
      ]);

      sessionsData.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setSessions(sessionsData);
      setStudents(studentsData);

      if (sessionsData.length > 0) {
        const defaultSessionId = initialSessionId && sessionsData.some(s => s.id === initialSessionId)
          ? initialSessionId
          : sessionsData[0].id;
        setSelectedSessionId(defaultSessionId);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu điểm danh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [classId]);

  // Tải điểm danh khi đổi buổi học
  const fetchSessionAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      const records = await attendanceApi.getBySession(sessionId);
      const map = {};
      records.forEach(rec => {
        let recStatus = rec.status;
        const note = rec.note || '';
        if (recStatus === 'ONLINE' || (note.includes('[Xin học Online]') && recStatus !== 'PRESENT' && recStatus !== 'LATE')) {
          recStatus = 'ONLINE';
        }
        map[rec.studentId] = {
          status: recStatus,
          note: note
        };
      });
      setAttendanceRecords(map);
    } catch (error) {
      console.error('Lỗi tải điểm danh buổi học:', error);
    }
  };

  useEffect(() => {
    if (selectedSessionId && viewMode === 'session') {
      fetchSessionAttendance(selectedSessionId);
    }
  }, [selectedSessionId, viewMode]);

  // Tải toàn bộ điểm danh khi chuyển sang chế độ Ma trận
  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getByClass(classId);
      setAllClassAttendances(data);
    } catch (error) {
      console.error('Lỗi tải ma trận điểm danh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'matrix') {
      fetchMatrixData();
    }
  }, [viewMode]);

  // Đổi trạng thái của 1 học sinh trong state
  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: status
      }
    }));
  };

  // Đổi ghi chú
  const handleNoteChange = (studentId, note) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note: note
      }
    }));
  };

  // Nút nhanh: Tất cả có mặt
  const markAllPresent = () => {
    const updated = { ...attendanceRecords };
    students.forEach(st => {
      updated[st.studentId] = {
        ...updated[st.studentId],
        status: 'PRESENT'
      };
    });
    setAttendanceRecords(updated);
  };

  // Lưu điểm danh buổi học hiện tại
  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const items = students.map(st => {
        const rec = attendanceRecords[st.studentId];
        return {
          studentId: st.studentId,
          status: rec?.status || 'PRESENT',
          note: rec?.note || ''
        };
      });

      await attendanceApi.batchMark(selectedSessionId, items);
      const msg = lang === 'en' ? 'Attendance saved successfully!' : 'Đã lưu điểm danh thành công!';
      setSaveMessage(msg);
      toast.success(msg);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      toast.error((lang === 'en' ? 'Error saving attendance: ' : 'Lỗi lưu điểm danh: ') + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-6">{lang === 'en' ? 'Loading attendance data...' : 'Đang tải dữ liệu điểm danh...'}</div>;

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800">
        <h4 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-2">{lang === 'en' ? 'No sessions found' : 'Chưa có buổi học nào'}</h4>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{lang === 'en' ? 'You need to create a session before you can take student attendance.' : 'Bạn cần tạo buổi học trước khi có thể điểm danh học sinh.'}</p>
      </div>
    );
  }

  // Thống kê nhanh buổi đang chọn
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let onlineCount = 0;
  let unrecordedCount = 0;

  students.forEach(st => {
    const s = attendanceRecords[st.studentId]?.status;
    if (s === 'PRESENT') presentCount++;
    else if (s === 'ONLINE') onlineCount++;
    else if (s === 'ABSENT') absentCount++;
    else if (s === 'LATE') lateCount++;
    else unrecordedCount++;
  });

  return (
    <div>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('attendanceManagementTitle')}</h3>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setViewMode('session')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewMode === 'session' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}>
            {t('bySessionMode')}
          </button>
          <button 
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewMode === 'matrix' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}>
            {t('matrixMode')}
          </button>
        </div>
      </div>

      {viewMode === 'session' ? (
        /* CHẾ ĐỘ 1: ĐIỂM DANH THEO BUỔI */
        <div className="space-y-6">
          {/* Thanh chọn buổi học và thao tác nhanh */}
          <div className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">{t('selectSessionLabel')}</label>
              <select 
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-80">
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || (lang === 'en' ? 'Session' : 'Buổi học')} ({s.startTime ? new Date(s.startTime).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN') : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={markAllPresent}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer">
                {t('allPresentBtn')}
              </button>
              <button 
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition cursor-pointer shadow-xs">
                {saving ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : t('saveAttendanceBtn')}
              </button>
            </div>
          </div>

          {/* Thông báo đã lưu */}
          {saveMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-md animate-fade-in">
              {saveMessage}
            </div>
          )}

          {/* Thẻ thống kê nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase mt-0.5">{t('statusPresent')}</div>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">{onlineCount}</div>
              <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase mt-0.5">{t('statusOnline')}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{lateCount}</div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mt-0.5">{t('statusLate')}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{absentCount}</div>
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mt-0.5">{t('statusAbsent')}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-slate-200">{unrecordedCount}</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mt-0.5">{t('statusUnrecorded')}</div>
            </div>
          </div>

          {/* Bảng danh sách học sinh điểm danh */}
          <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-16 min-w-[60px]">{lang === 'en' ? 'ID' : 'Mã'}</th>
                  <th className="px-4 py-3.5 min-w-[180px] sticky left-0 bg-gray-50 dark:bg-slate-950 z-10 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">{t('studentCol')}</th>
                  <th className="px-4 py-3.5 text-center w-[340px] min-w-[340px] whitespace-nowrap">{t('attendanceStatusCol')}</th>
                  <th className="px-4 py-3.5 min-w-[200px]">{t('noteCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {students.map((st) => {
                  const currentRecord = attendanceRecords[st.studentId] || {};
                  const status = currentRecord.status;

                  return (
                    <tr key={st.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap text-xs">#{st.studentId}</td>
                      <td className="px-4 py-3.5 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-slate-100">{st.studentName}</span>
                          {status === 'ONLINE' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-0.5">
                              <GlobeIcon className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>{t('onlineRequest')}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[170px]">{st.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 w-[340px] min-w-[340px] whitespace-nowrap text-center">
                        <div className="flex justify-center items-center gap-1.5 whitespace-nowrap">
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'PRESENT')}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer border min-h-[32px] sm:min-h-[30px] ${status === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300'}`}>
                            {t('statusPresent')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'ONLINE')}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer border min-h-[32px] sm:min-h-[30px] ${status === 'ONLINE' ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300'}`}>
                            {t('statusOnline')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'LATE')}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer border min-h-[32px] sm:min-h-[30px] ${status === 'LATE' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300'}`}>
                            {t('statusLate')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'ABSENT')}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer border min-h-[32px] sm:min-h-[30px] ${status === 'ABSENT' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300'}`}>
                            {t('statusAbsent')}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 min-w-[200px]">
                        <input 
                          type="text"
                          value={currentRecord.note || ''}
                          onChange={(e) => handleNoteChange(st.studentId, e.target.value)}
                          placeholder={lang === 'en' ? "Enter note..." : "Nhập ghi chú..."}
                          className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-gray-500 dark:text-slate-400">
                      {lang === 'en' ? 'No students enrolled in this class to take attendance.' : 'Lớp học chưa có học sinh nào để điểm danh.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 2: MA TRẬN CHUYÊN CẦN */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 dark:text-slate-400 pb-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> {t('statusPresent')} (P)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> {t('statusOnline')} (O)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> {t('statusLate')} (L)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> {t('statusAbsent')} (A)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-slate-700 inline-block"></span> {t('statusUnrecorded')} (—)</span>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-slate-800 sticky left-0 bg-gray-50 dark:bg-slate-950 z-10 whitespace-nowrap">{t('studentCol')}</th>
                  {sessions.map((s, idx) => (
                    <th key={s.id} className="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-800 whitespace-nowrap min-w-[70px]" title={s.topic}>
                      {lang === 'en' ? `S${idx + 1}` : `B${idx + 1}`}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center border-r border-gray-200 dark:border-slate-800 whitespace-nowrap">{lang === 'en' ? 'Total Present' : 'Tổng có mặt'}</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">{lang === 'en' ? 'Rate (%)' : 'Tỉ lệ (%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {students.map((st) => {
                  let studentPresent = 0;
                  return (
                    <tr key={st.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 border-r border-gray-200 dark:border-slate-800 font-medium text-gray-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 whitespace-nowrap">
                        {st.studentName}
                      </td>
                      {sessions.map((s) => {
                        const rec = allClassAttendances.find(
                          a => a.studentId === st.studentId && a.sessionId === s.id
                        );
                        const status = rec?.status;
                        if (status === 'PRESENT' || status === 'ONLINE' || status === 'LATE') studentPresent++;

                        return (
                          <td key={s.id} className="px-2 py-2 text-center border-r border-gray-200 dark:border-slate-800">
                            {status === 'PRESENT' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold" title={t('statusPresent')}>
                                P
                              </span>
                            )}
                            {status === 'ONLINE' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-bold" title={`${t('statusOnline')}: ${rec?.note || ''}`}>
                                O
                              </span>
                            )}
                            {status === 'LATE' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold" title={`${t('statusLate')}: ${rec?.note || ''}`}>
                                L
                              </span>
                            )}
                            {status === 'ABSENT' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-bold" title={`${t('statusAbsent')}: ${rec?.note || ''}`}>
                                A
                              </span>
                            )}
                            {!status && (
                              <span className="text-gray-300 dark:text-slate-600 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold border-r border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                        {studentPresent} / {sessions.length}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {sessions.length > 0 ? (
                          (() => {
                            const rate = Math.round((studentPresent / sessions.length) * 100);
                            const color = rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                            return <span className={color}>{rate}%</span>;
                          })()
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
