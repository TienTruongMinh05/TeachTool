import React, { useState, useMemo, useEffect } from 'react';
import { studentPortalApi } from '../api/studentPortalApi';
import { useToast } from '../context/ToastContext';
import CollapsibleDescription from './CollapsibleDescription';

// Color palette for classes (accessible, modern pastel tones)
const CLASS_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', sub: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', sub: 'text-emerald-700', badge: 'bg-emerald-200 text-emerald-800' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', sub: 'text-purple-700', badge: 'bg-purple-200 text-purple-800' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-900', sub: 'text-amber-700', badge: 'bg-amber-200 text-amber-800' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-900', sub: 'text-rose-700', badge: 'bg-rose-200 text-rose-800' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900', sub: 'text-cyan-700', badge: 'bg-cyan-200 text-cyan-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-900', sub: 'text-indigo-700', badge: 'bg-indigo-200 text-indigo-800' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-900', sub: 'text-teal-700', badge: 'bg-teal-200 text-teal-800' },
];

export const getClassColor = (classId) => {
  const idNum = typeof classId === 'number' ? classId : parseInt(classId, 10) || 0;
  return CLASS_COLORS[idNum % CLASS_COLORS.length];
};

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 30 slots (07:00 - 22:00)
const SLOT_HEIGHT = 44; // 44px per 30 mins

const TIME_SLOTS = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const DAY_NAMES = [
  { dayIndex: 1, label: 'Thứ 2', short: 'T2' },
  { dayIndex: 2, label: 'Thứ 3', short: 'T3' },
  { dayIndex: 3, label: 'Thứ 4', short: 'T4' },
  { dayIndex: 4, label: 'Thứ 5', short: 'T5' },
  { dayIndex: 5, label: 'Thứ 6', short: 'T6' },
  { dayIndex: 6, label: 'Thứ 7', short: 'T7' },
  { dayIndex: 0, label: 'Chủ nhật', short: 'CN' },
];

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateDM = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
};

export default function TimetableGrid({
  sessions = [],
  isStudent = false,
  studentId = null,
  onGoToAssignment = null,
  onReportAbsenceSuccess = null,
  classes = [],
  onNavigateToSession = null,
}) {
  const { toast, confirm } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const [absenceError, setAbsenceError] = useState('');

  // Theo dõi các buổi học đã được học sinh xem dặn dò chuẩn bị bài
  const [viewedPrepIds, setViewedPrepIds] = useState(() => {
    try {
      const saved = localStorage.getItem('viewed_prep_session_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markPrepAsViewed = (sessionId) => {
    if (!sessionId) return;
    setViewedPrepIds(prev => {
      const next = new Set(prev);
      next.add(sessionId);
      try {
        localStorage.setItem('viewed_prep_session_ids', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  // Calculate dates for Monday through Sunday of current week
  const weekDays = useMemo(() => {
    return DAY_NAMES.map((d, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return {
        ...d,
        date,
        dateStr: formatDateDM(date),
        fullDateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      };
    });
  }, [currentWeekStart]);

  const weekRangeStr = useMemo(() => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    return `${formatDateDM(start)}/${start.getFullYear()} - ${formatDateDM(end)}/${end.getFullYear()}`;
  }, [weekDays]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Map sessions into week days and calculate vertical position
  const sessionsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach(wd => { map[wd.dayIndex] = []; });

    sessions.forEach(session => {
      if (!session.startTime) return;
      const start = new Date(session.startTime);
      const sessionDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      
      const matchedDay = weekDays.find(wd => wd.fullDateStr === sessionDateStr);
      if (!matchedDay) return;

      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const startTotalMinutes = startHour * 60 + startMinute;
      const baseMinutes = START_HOUR * 60; // 07:00 = 420 mins

      const durationMinutes = session.durationMinutes || 90;
      const endTotalMinutes = startTotalMinutes + durationMinutes;

      const slotStart = Math.max(0, (startTotalMinutes - baseMinutes) / 30);
      const slotEnd = Math.min(TOTAL_SLOTS, (endTotalMinutes - baseMinutes) / 30);
      const slotSpan = Math.max(1, slotEnd - slotStart);

      const topPx = slotStart * SLOT_HEIGHT;
      const heightPx = Math.max(SLOT_HEIGHT, slotSpan * SLOT_HEIGHT - 4);

      const startStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMinute = endTotalMinutes % 60;
      const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      // Kiểm tra xem buổi học có phần dặn dò / học phần chuẩn bị bài hay không
      const hasPreparation = (session.sections && session.sections.length > 0) || 
                             Boolean(session.teachingPlanTitle) || 
                             (session.sections && session.sections.some(s => s.studentPreparation));

      map[matchedDay.dayIndex].push({
        ...session,
        parsedStart: start,
        timeRangeStr: `${startStr} - ${endStr}`,
        slotStart,
        slotSpan,
        topPx,
        heightPx,
        hasPreparation
      });
    });

    return map;
  }, [sessions, weekDays]);

  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 120;
  };

  const isSessionEnded = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const duration = session.durationMinutes || 90;
    const end = session.endTime ? new Date(session.endTime) : new Date(start.getTime() + duration * 60000);
    return new Date() > end;
  };

  const getAbsenceTimeRemaining = (session) => {
    if (!session || !session.startTime) return '';
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return 'Buổi học đã diễn ra';
    if (diffMinutes < 120) return `Còn ${diffMinutes} phút nữa là vào học (quá hạn báo trước 2 giờ)`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `Còn ${hours} giờ ${mins} phút trước giờ học (hợp lệ để báo vắng)`;
  };

  const handleOpenAbsence = (e, session) => {
    e.stopPropagation();
    setSelectedSession(session);
    setAbsenceReason('');
    setAbsenceError('');
    setShowAbsenceModal(true);
  };

  const [isCancellingAbsence, setIsCancellingAbsence] = useState(false);

  const handleCancelAbsence = async (e, session) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!studentId || !session) return;
    const ok = await confirm({
      title: 'Hủy báo vắng',
      message: 'Bạn có chắc chắn muốn hủy báo vắng để đi học lại buổi học này không?',
      confirmText: 'Xác nhận đi học',
      cancelText: 'Giữ báo vắng',
      type: 'info'
    });
    if (!ok) return;

    try {
      setIsCancellingAbsence(true);
      await studentPortalApi.cancelAbsence(
        studentId,
        session.sessionId || session.id
      );

      toast.success('Đã hủy báo vắng thành công! Bạn có thể tham gia buổi học.');
      setSelectedSession(null);
      if (onReportAbsenceSuccess) {
        onReportAbsenceSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi hủy báo vắng.');
    } finally {
      setIsCancellingAbsence(false);
    }
  };

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!studentId || !selectedSession) return;
    if (!canReportAbsence(selectedSession)) {
      setAbsenceError('Chỉ được phép báo vắng trước giờ học ít nhất 2 tiếng!');
      return;
    }

    setIsSubmittingAbsence(true);
    setAbsenceError('');

    try {
      await studentPortalApi.reportAbsence(
        studentId,
        selectedSession.sessionId || selectedSession.id,
        absenceReason.trim() || 'Học sinh xin phép vắng'
      );

      toast.success('Đã gửi báo vắng thành công!');
      setShowAbsenceModal(false);
      setSelectedSession(null);
      if (onReportAbsenceSuccess) {
        onReportAbsenceSuccess();
      }
    } catch (err) {
      setAbsenceError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi báo vắng.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  const distinctClasses = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      const classId = s.classId || (s.classRoom && s.classRoom.id);
      const className = s.className || (s.classRoom && s.classRoom.name);
      if (classId && className && !map.has(classId)) {
        map.set(classId, { id: classId, name: className, color: getClassColor(classId) });
      }
    });
    if (classes && classes.length > 0) {
      classes.forEach(c => {
        if (!map.has(c.id)) {
          map.set(c.id, { id: c.id, name: c.name, color: getClassColor(c.id) });
        }
      });
    }
    return Array.from(map.values());
  }, [sessions, classes]);

  const handleSelectSession = (session) => {
    const sId = session.sessionId || session.id;
    markPrepAsViewed(sId);
    if (!isStudent && onNavigateToSession) {
      onNavigateToSession(session);
      return;
    }
    setSelectedSession(session);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header & Navigation */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Thời khóa biểu tuần</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
            {weekRangeStr}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Tuần trước
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs cursor-pointer"
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Tuần sau
          </button>
        </div>
      </div>

      {/* Chú thích viền trạng thái bài tập & Màu lớp */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Chú thích viền bài tập */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Trạng thái bài tập:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-red-500 bg-red-100"></span>
            <span className="text-slate-600">Chưa làm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-100"></span>
            <span className="text-slate-600">Đang làm dở</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-100"></span>
            <span className="text-slate-600">Đã làm / Đã chấm</span>
          </div>
        </div>

        {/* Chú thích màu lớp */}
        {distinctClasses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-slate-600">Lớp:</span>
            {distinctClasses.map(c => (
              <div key={c.id} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${c.color.badge} border ${c.color.border}`}></span>
                <span className="font-medium text-slate-700">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MA TRẬN THỜI KHÓA BIỂU DẠNG DỌC (VERTICAL CALENDAR) */}
      <div className="overflow-x-auto">
        <div className="min-w-[850px] sm:min-w-[1000px]">
          {/* HÀNG TIÊU ĐỀ: 7 CỘT NGÀY TRONG TUẦN */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-100 sticky top-0 z-30 text-xs font-semibold text-slate-700">
            {/* Cột mốc giờ */}
            <div className="p-3 border-r-2 border-slate-300 text-center font-bold bg-slate-100 sticky left-0 z-40 flex items-center justify-center shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
              Giờ / Thứ
            </div>

            {/* 7 cột ngày trong tuần */}
            {weekDays.map(day => {
              const isToday = new Date().toDateString() === day.date.toDateString();
              return (
                <div
                  key={day.dayIndex}
                  className={`p-2.5 text-center border-r border-slate-200 transition ${
                    isToday ? 'bg-blue-100/70 text-blue-900 font-bold border-b-2 border-b-blue-600' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">{day.label}</div>
                  <div className="text-[11px] text-slate-500 font-normal">{day.dateStr}</div>
                  {isToday && (
                    <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-bold text-blue-700 bg-blue-200 px-1 rounded">
                      Hôm nay
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* THÂN THỜI KHÓA BIỂU DỌC: CỘT GIỜ + 7 CỘT NGÀY */}
          <div className="grid grid-cols-8 relative" style={{ height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}>
            {/* CỘT MỐC THỜI GIAN (BÊN TRÁI - LUÔN NẰM TRÊN CÙNG KHI CUỘN HOẶC TRÀN VIỀN) */}
            <div className="border-r-2 border-slate-300 bg-slate-50 sticky left-0 z-20 select-none shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
              {TIME_SLOTS.map((time, idx) => (
                <div
                  key={time}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  className={`border-b border-slate-200 px-1 text-[11px] flex items-center justify-center font-mono ${
                    idx % 2 === 0 ? 'font-bold text-slate-700 bg-slate-100/80' : 'text-slate-400 text-[10px] bg-slate-50'
                  }`}
                >
                  {time}
                </div>
              ))}
            </div>

            {/* 7 CỘT THEO NGÀY (THỨ 2 ĐẾN CHỦ NHẬT) */}
            {weekDays.map(day => {
              const daySessions = sessionsByDay[day.dayIndex] || [];
              const isToday = new Date().toDateString() === day.date.toDateString();

              return (
                <div
                  key={day.dayIndex}
                  className={`border-r border-slate-200 relative ${
                    isToday ? 'bg-blue-50/20' : 'bg-white'
                  }`}
                >
                  {/* Đường kẻ ngang phân cách các slot 30 phút */}
                  {TIME_SLOTS.map((time, idx) => (
                    <div
                      key={time}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      className={`border-b border-slate-100 ${
                        idx % 2 === 1 ? 'border-dashed' : ''
                      }`}
                    />
                  ))}

                  {/* CÁC BUỔI HỌC TRONG NGÀY */}
                  {daySessions.map(session => {
                    const classId = session.classId || (session.classRoom && session.classRoom.id);
                    const color = getClassColor(classId);
                    const sId = session.sessionId || session.id;
                    const hasAbsentReport = session.attendanceStatus === 'ABSENT';
                    const isPrepUnviewed = session.hasPreparation && !viewedPrepIds.has(sId);

                    // Xử lý viền theo trạng thái bài tập
                    let homeworkBorderClass = `${color.border} border`;
                    let homeworkStatusBadge = null;

                    if (session.homeworkStatus === 'NOT_SUBMITTED') {
                      homeworkBorderClass = 'border-2 border-red-500 shadow-sm shadow-red-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-800 rounded border border-red-300">
                          Chưa làm bài
                        </span>
                      );
                    } else if (session.homeworkStatus === 'DRAFT') {
                      homeworkBorderClass = 'border-2 border-amber-500 shadow-sm shadow-amber-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                          Đang làm dở
                        </span>
                      );
                    } else if (session.homeworkStatus === 'GRADED') {
                      homeworkBorderClass = 'border-2 border-emerald-500 shadow-sm shadow-emerald-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          Đã chấm{session.homeworkScore ? `: ${session.homeworkScore}` : ''}
                        </span>
                      );
                    } else if (session.homeworkStatus === 'SUBMITTED') {
                      homeworkBorderClass = 'border-2 border-emerald-500 shadow-sm shadow-emerald-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          Đã làm bài
                        </span>
                      );
                    }

                    return (
                      <div
                        key={sId}
                        onClick={() => handleSelectSession(session)}
                        style={{
                          top: `${session.topPx}px`,
                          height: `${session.heightPx}px`,
                          left: '4px',
                          right: '4px',
                        }}
                        className={`absolute p-2 rounded-xl cursor-pointer transition-all hover:shadow-md overflow-hidden flex flex-col justify-between ${color.bg} ${homeworkBorderClass} ${color.text} z-1 hover:z-10`}
                        title={`Bấm để xem chi tiết: ${session.className || ''} - ${session.topic || ''}`}
                      >
                        <div>
                          {/* Header: Class Name & Time */}
                          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate max-w-[65%]">
                              {session.className || 'Lớp học'}
                            </span>
                            <span className="text-[10px] font-semibold opacity-85 whitespace-nowrap font-mono">
                              {session.timeRangeStr}
                            </span>
                          </div>

                          {/* Topic / Content */}
                          <div className="text-xs font-semibold line-clamp-2 leading-tight mb-1" title={session.contentSummary || session.topic || ''}>
                            {session.contentSummary || session.topic || 'Buổi học'}
                          </div>
                        </div>

                        {/* Footer: Badges */}
                        <div className="pt-1 border-t border-black/5 mt-auto space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-medium opacity-90 truncate">
                              Sĩ số: <b>{session.studentCount != null ? session.studentCount : '—'}</b>
                            </span>

                            {isStudent && canReportAbsence(session) && !hasAbsentReport && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAbsence(e, session)}
                                className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-300 transition cursor-pointer"
                              >
                                Báo vắng
                              </button>
                            )}

                            {isStudent && hasAbsentReport && !isSessionEnded(session) && (
                              <button
                                type="button"
                                onClick={(e) => handleCancelAbsence(e, session)}
                                disabled={isCancellingAbsence}
                                className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 transition cursor-pointer"
                              >
                                {isCancellingAbsence ? '...' : 'Hủy vắng'}
                              </button>
                            )}
                          </div>

                          {/* Nhóm badge trạng thái: Bài tập & Dặn dò chuẩn bị */}
                          <div className="flex flex-wrap items-center gap-1">
                            {homeworkStatusBadge}

                            {/* Thông báo dặn dò chuẩn bị bài (tự mất khi bấm xem) */}
                            {isPrepUnviewed && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-300 animate-pulse">
                                Có dặn dò
                              </span>
                            )}

                            {hasAbsentReport && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded">
                                Đã báo vắng
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT BUỔI HỌC (TÍCH HỢP BÀI TẬP, KẾ HOẠCH & DẶN DÒ) */}
      {selectedSession && !showAbsenceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {selectedSession.className || 'Lớp học'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                  {selectedSession.topic || selectedSession.contentSummary || 'Chi tiết buổi học'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin thời gian */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 block">Thời gian:</span>
                <strong className="text-slate-800 font-semibold">{selectedSession.timeRangeStr}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Thời lượng:</span>
                <strong className="text-slate-800 font-semibold">{selectedSession.durationMinutes || 90} phút</strong>
              </div>
            </div>

            {/* PHẦN 1: BÀI TẬP VỀ NHÀ CỦA BUỔI HỌC */}
            {selectedSession.assignments && selectedSession.assignments.length > 0 && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Bài tập về nhà buổi này ({selectedSession.assignments.length})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {selectedSession.assignments.map((asgn, aIdx) => {
                    let atts = [];
                    if (asgn.attachmentsJson) {
                      try { atts = JSON.parse(asgn.attachmentsJson); } catch {}
                    }
                    if ((!atts || atts.length === 0) && asgn.attachmentFileUrl) {
                      atts = [{ fileName: asgn.attachmentFileName || 'Tải file đề bài', fileUrl: asgn.attachmentFileUrl }];
                    }

                    return (
                      <div key={asgn.id || aIdx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs text-gray-800">
                            {aIdx + 1}. {asgn.title}
                          </div>
                          {asgn.submissionStatus === 'GRADED' && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              Đã chấm: {asgn.submissionScore != null ? asgn.submissionScore : '—'} đ
                            </span>
                          )}
                          {asgn.submissionStatus === 'SUBMITTED' && (
                            <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                              Đã nộp bài
                            </span>
                          )}
                          {asgn.submissionStatus === 'DRAFT' && (
                            <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                              Bản nháp
                            </span>
                          )}
                          {(!asgn.submissionStatus || asgn.submissionStatus === 'NOT_SUBMITTED') && (
                            <span className="shrink-0 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                              Chưa nộp
                            </span>
                          )}
                        </div>

                        <CollapsibleDescription text={asgn.description} textClassName="text-xs text-gray-600" />

                        {atts && atts.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <span className="text-[11px] text-slate-500 font-medium">Tệp đính kèm ({atts.length}):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {atts.map((att, attIdx) => (
                                <a
                                  key={attIdx}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition"
                                >
                                  <span>📎</span>
                                  <span className="truncate max-w-[180px]">{att.fileName || `Tệp ${attIdx + 1}`}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div>
                            {asgn.dueDate && (
                              <span>Hạn nộp: <b>{new Date(asgn.dueDate).toLocaleDateString('vi-VN')}</b></span>
                            )}
                          </div>
                          {isStudent && onGoToAssignment && (
                            <button
                              type="button"
                              onClick={() => {
                                const s = selectedSession;
                                setSelectedSession(null);
                                onGoToAssignment(s, asgn);
                              }}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition shadow-2xs cursor-pointer ${
                                asgn.submissionStatus === 'DRAFT'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : (asgn.submissionStatus === 'SUBMITTED' || asgn.submissionStatus === 'GRADED')
                                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {asgn.submissionStatus === 'DRAFT'
                                ? 'Tiếp tục làm bài (Nháp)'
                                : (asgn.submissionStatus === 'SUBMITTED' || asgn.submissionStatus === 'GRADED')
                                ? 'Xem lại bài nộp'
                                : 'Làm bài tập này'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PHẦN 2: KẾ HOẠCH GIẢNG DẠY & DẶN DÒ CHUẨN BỊ BÀI */}
            {selectedSession.sections && selectedSession.sections.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Kế hoạch bài học & Dặn dò chuẩn bị
                </h4>
                <div className="space-y-2">
                  {selectedSession.sections.map((sec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {sec.title || sec.activity || 'Nội dung học'}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {sec.timeAllocation || `${sec.durationMinutes || 15} phút`}
                        </span>
                      </div>
                      {sec.content && <p className="text-slate-600 leading-relaxed">{sec.content}</p>}
                      {sec.studentPreparation && (
                        <div className="p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 mt-1">
                          <strong className="text-amber-800">Dặn dò chuẩn bị:</strong> {sec.studentPreparation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Chưa có nội dung dặn dò chi tiết cho buổi học này.
              </div>
            )}

            {/* Footer modal */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {isStudent && canReportAbsence(selectedSession) && selectedSession.attendanceStatus !== 'ABSENT' && (
                <button
                  type="button"
                  onClick={(e) => handleOpenAbsence(e, selectedSession)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                >
                  Báo vắng buổi này
                </button>
              )}
              {isStudent && selectedSession.attendanceStatus === 'ABSENT' && !isSessionEnded(selectedSession) && (
                <button
                  type="button"
                  onClick={(e) => handleCancelAbsence(e, selectedSession)}
                  disabled={isCancellingAbsence}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isCancellingAbsence ? 'Đang hủy...' : 'Hủy báo vắng (Đi học lại)'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="ml-auto px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN BÁO VẮNG */}
      {showAbsenceModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-rose-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-rose-800">Xác nhận báo vắng buổi học</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedSession.className} - {selectedSession.topic || selectedSession.contentSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold mb-1">Quy định báo vắng:</p>
              <p>Học sinh phải báo vắng trước giờ bắt đầu buổi học ít nhất 2 tiếng. Lý do báo vắng sẽ được tự động chuyển đến giáo viên phụ trách.</p>
              <p className="font-bold text-amber-800 pt-1">{getAbsenceTimeRemaining(selectedSession)}</p>
            </div>

            {absenceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {absenceError}
              </div>
            )}

            <form onSubmit={handleSubmitAbsence} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lý do xin phép vắng <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ví dụ: Em bị sốt / gia đình có việc đột xuất..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                >
                  {isSubmittingAbsence ? 'Đang gửi...' : 'Xác nhận báo vắng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
