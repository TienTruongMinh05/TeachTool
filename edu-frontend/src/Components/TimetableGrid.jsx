import React, { useState, useMemo } from 'react';

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

// 30-minute intervals from 07:00 to 22:00
// 07:00, 07:30, 08:00, ..., 21:30 (30 intervals total: 15 hours * 2 = 30)
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 30 slots

const TIME_SLOTS = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
// Also include 22:00 mark
const TIME_HEADERS = [...TIME_SLOTS, `${String(END_HOUR).padStart(2, '0')}:00`];

const DAY_NAMES = [
  { dayIndex: 1, label: 'Thứ 2', short: 'T2' },
  { dayIndex: 2, label: 'Thứ 3', short: 'T3' },
  { dayIndex: 3, label: 'Thứ 4', short: 'T4' },
  { dayIndex: 4, label: 'Thứ 5', short: 'T5' },
  { dayIndex: 5, label: 'Thứ 6', short: 'T6' },
  { dayIndex: 6, label: 'Thứ 7', short: 'T7' },
  { dayIndex: 0, label: 'Chủ nhật', short: 'CN' },
];

// Helper to get Monday of the current week
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
  sessions = [], // Array of sessions (either TimetableSessionDTO or StudentScheduleDTO)
  isStudent = false,
  studentId = null,
  onGoToAssignment = null,
  onReportAbsenceSuccess = null,
  classes = [], // Optional list of classes for color legend
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const [absenceError, setAbsenceError] = useState('');

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

  // Map sessions into week days and calculate slot positions
  const sessionsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach(wd => { map[wd.dayIndex] = []; });

    sessions.forEach(session => {
      if (!session.startTime) return;
      const start = new Date(session.startTime);
      const sessionDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      
      // Match with day in current week
      const matchedDay = weekDays.find(wd => wd.fullDateStr === sessionDateStr);
      if (!matchedDay) return; // Session not in current week

      // Calculate time bounds in minutes from 07:00
      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const startTotalMinutes = startHour * 60 + startMinute;
      const baseMinutes = START_HOUR * 60; // 07:00 = 420 mins

      const durationMinutes = session.durationMinutes || 90;
      const endTotalMinutes = startTotalMinutes + durationMinutes;

      // Slot start (each slot is 30 mins, 0 to 29)
      const slotStart = Math.max(0, (startTotalMinutes - baseMinutes) / 30);
      const slotEnd = Math.min(TOTAL_SLOTS, (endTotalMinutes - baseMinutes) / 30);
      const slotSpan = Math.max(1, slotEnd - slotStart);

      // Percentage positioning within the 07:00-22:00 bar
      const leftPercent = (slotStart / TOTAL_SLOTS) * 100;
      const widthPercent = (slotSpan / TOTAL_SLOTS) * 100;

      // Format start and end times
      const startStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMinute = endTotalMinutes % 60;
      const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      map[matchedDay.dayIndex].push({
        ...session,
        parsedStart: start,
        timeRangeStr: `${startStr} - ${endStr}`,
        slotStart,
        slotSpan,
        leftPercent,
        widthPercent,
      });
    });

    return map;
  }, [sessions, weekDays]);

  // Check 2-hour condition for absence
  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 120;
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

  const handleOpenAbsenceModal = (session) => {
    setSelectedSession(session);
    setAbsenceReason('');
    setAbsenceError('');
    setShowAbsenceModal(true);
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
      const res = await fetch(`http://localhost:8081/api/students/${studentId}/report-absence/${selectedSession.sessionId || selectedSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: absenceReason.trim() || 'Học sinh xin phép vắng' })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Báo vắng không thành công.');
      }

      alert('Đã gửi báo vắng thành công!');
      setShowAbsenceModal(false);
      setSelectedSession(null);
      if (onReportAbsenceSuccess) {
        onReportAbsenceSuccess();
      }
    } catch (err) {
      setAbsenceError(err.message || 'Có lỗi xảy ra khi gửi báo vắng.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  // Distinct classes represented in sessions
  const distinctClasses = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      const cId = s.classId || (s.classRoom && s.classRoom.id);
      const cName = s.className || (s.classRoom && s.classRoom.name);
      if (cId && !map.has(cId)) {
        map.set(cId, { id: cId, name: cName, color: getClassColor(cId) });
      }
    });
    return Array.from(map.values());
  }, [sessions]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Bar: Navigation & Week Selector */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Thời khóa biểu tuần</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
            {weekRangeStr}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Tuần trước
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Tuần sau
          </button>
        </div>
      </div>

      {/* Class Legend (Color codes) */}
      {distinctClasses.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-600">Chú thích lớp:</span>
          {distinctClasses.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${c.color.badge} border ${c.color.border}`}></span>
              <span className="font-medium text-slate-700">{c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable Matrix Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[1500px]">
          {/* Header Row: Time intervals 07:00 to 22:00 */}
          <div className="flex border-b border-slate-200 bg-slate-100/80 sticky top-0 z-10 text-xs font-semibold text-slate-600">
            {/* Sticky Day Column Header */}
            <div className="w-28 flex-shrink-0 p-3 bg-slate-100 border-r border-slate-300 sticky left-0 z-20 text-center font-bold">
              Thứ / Ngày
            </div>

            {/* Time slot headers (every 30 mins) */}
            <div className="flex-1 grid relative" style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}>
              {TIME_SLOTS.map((time, idx) => (
                <div
                  key={time}
                  className={`py-2.5 text-center border-r border-slate-200 ${idx % 2 === 0 ? 'bg-slate-100 font-bold text-slate-700' : 'bg-slate-50/50 text-slate-500 text-[11px]'}`}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* 7 Day Rows: Thứ 2 to Chủ nhật */}
          <div className="divide-y divide-slate-200">
            {weekDays.map(day => {
              const daySessions = sessionsByDay[day.dayIndex] || [];
              const isToday = new Date().toDateString() === day.date.toDateString();

              return (
                <div key={day.dayIndex} className={`flex relative transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                  {/* Sticky Day Column */}
                  <div className={`w-28 flex-shrink-0 p-3 border-r border-slate-300 sticky left-0 z-10 flex flex-col justify-center items-center ${isToday ? 'bg-blue-50 text-blue-900 font-bold' : 'bg-white text-slate-700 font-medium'}`}>
                    <span className="text-sm">{day.label}</span>
                    <span className="text-xs text-slate-500 font-normal">{day.dateStr}</span>
                    {isToday && (
                      <span className="mt-1 text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* 30-slot Grid Area for the day */}
                  <div className="flex-1 relative h-28 grid" style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}>
                    {/* Background slot grid lines */}
                    {TIME_SLOTS.map((time, idx) => (
                      <div
                        key={time}
                        className={`h-full border-r border-slate-100 ${idx % 2 === 1 ? 'border-dashed border-slate-100' : ''}`}
                      />
                    ))}

                    {/* Render Sessions for this day */}
                    {daySessions.map(session => {
                      const classId = session.classId || (session.classRoom && session.classRoom.id);
                      const color = getClassColor(classId);
                      const sId = session.sessionId || session.id;
                      const hasAbsentReport = session.attendanceStatus === 'ABSENT';

                      return (
                        <div
                          key={sId}
                          onClick={() => setSelectedSession(session)}
                          style={{
                            left: `${session.leftPercent}%`,
                            width: `${session.widthPercent}%`,
                          }}
                          className={`absolute top-1.5 bottom-1.5 p-2 rounded-lg border cursor-pointer shadow-sm transition-all hover:shadow-md hover:scale-[1.01] overflow-hidden flex flex-col justify-between ${color.bg} ${color.border} ${color.text} z-10`}
                          title={`Bấm để xem chi tiết buổi học: ${session.className || ''} - ${session.topic || ''}`}
                        >
                          <div>
                            {/* Class Name & Time */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs truncate max-w-[70%]">
                                {session.className || 'Lớp học'}
                              </span>
                              <span className="text-[10px] font-semibold opacity-80 whitespace-nowrap">
                                {session.timeRangeStr}
                              </span>
                            </div>

                            {/* What is taught (Topic / Content summary) */}
                            <div className="text-xs font-semibold truncate leading-tight mb-1" title={session.contentSummary || session.topic || ''}>
                              {session.contentSummary || session.topic || 'Buổi học'}
                            </div>
                          </div>

                          {/* Footer: Sĩ số & Attendance status */}
                          <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-black/5 mt-auto">
                            <span className="font-medium opacity-90">
                              Sĩ số: <strong className="font-bold">{session.studentCount != null ? session.studentCount : '—'}</strong>
                            </span>

                            {hasAbsentReport && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded">
                                Báo vắng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && !showAbsenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  Chi tiết buổi học
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  {selectedSession.className} - {selectedSession.topic}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Thời gian:</span>
                  <span className="font-semibold text-slate-800">{selectedSession.timeRangeStr || selectedSession.startTime}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thời lượng:</span>
                  <span className="font-semibold text-slate-800">{selectedSession.durationMinutes || 90} phút</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sĩ số lớp:</span>
                  <span className="font-semibold text-slate-800">{selectedSession.studentCount != null ? selectedSession.studentCount : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mã lớp:</span>
                  <span className="font-semibold text-slate-800">{selectedSession.classCode || '—'}</span>
                </div>
              </div>

              {/* Content / Plan details */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Nội dung bài học:</h4>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-slate-700">
                  {selectedSession.contentSummary || selectedSession.topic || 'Chưa cập nhật nội dung'}
                </div>
              </div>

              {/* Student specific section: Preparation & Attendance status */}
              {isStudent && (
                <>
                  {selectedSession.attendanceStatus && (
                    <div className="p-3 rounded-lg border flex items-center justify-between text-xs bg-slate-50">
                      <span className="text-slate-600">Trạng thái điểm danh:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${selectedSession.attendanceStatus === 'ABSENT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {selectedSession.attendanceStatus === 'ABSENT' ? 'Vắng mặt' : selectedSession.attendanceStatus}
                      </span>
                    </div>
                  )}

                  {selectedSession.attendanceNote && (
                    <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                      <strong>Ghi chú:</strong> {selectedSession.attendanceNote}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Đóng
              </button>

              {/* Student Actions */}
              {isStudent && (
                <>
                  {onGoToAssignment && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedSession;
                        setSelectedSession(null);
                        onGoToAssignment(s);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Làm bài tập
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!canReportAbsence(selectedSession)}
                    onClick={() => handleOpenAbsenceModal(selectedSession)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                      canReportAbsence(selectedSession)
                        ? 'text-white bg-rose-600 hover:bg-rose-700'
                        : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                    }`}
                    title={getAbsenceTimeRemaining(selectedSession)}
                  >
                    Báo vắng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Absence Report Confirmation Modal */}
      {showAbsenceModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-rose-800">Xác nhận báo vắng buổi học</h3>
                <p className="text-xs text-rose-600 mt-0.5">
                  {selectedSession.className} - {selectedSession.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold mb-1">Quy định báo vắng:</p>
                <p>Học sinh phải báo vắng trước giờ bắt đầu buổi học ít nhất 2 tiếng. Lý do báo vắng sẽ được tự động chuyển đến giáo viên phụ trách.</p>
                <p className="mt-1 font-medium text-amber-900">{getAbsenceTimeRemaining(selectedSession)}</p>
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
                  placeholder="Ví dụ: Em bị sốt, gia đình có việc bận đột xuất..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
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
    </div>
  );
}
