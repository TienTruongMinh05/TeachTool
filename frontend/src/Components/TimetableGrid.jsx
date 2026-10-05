import React, { useState, useMemo, useEffect } from 'react';
import { studentPortalApi } from '../api/studentPortalApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import CollapsibleDescription from './CollapsibleDescription';
import LinkifiedText from './LinkifiedText';
import { MegaphoneIcon, PaperclipIcon, GlobeIcon, XCircleIcon, XIcon, AlertTriangleIcon } from './Icons';

// Color palette for classes (accessible, modern pastel tones)
const CLASS_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-950/80', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200', sub: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-200 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950/80', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-200', sub: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200' },
  { bg: 'bg-purple-100 dark:bg-purple-950/80', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-200', sub: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200' },
  { bg: 'bg-amber-100 dark:bg-amber-950/80', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200', sub: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200' },
  { bg: 'bg-rose-100 dark:bg-rose-950/80', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-200', sub: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950/80', border: 'border-cyan-300 dark:border-cyan-800', text: 'text-cyan-900 dark:text-cyan-200', sub: 'text-cyan-700 dark:text-cyan-300', badge: 'bg-cyan-200 dark:bg-cyan-900/80 text-cyan-800 dark:text-cyan-200' },
  { bg: 'bg-indigo-100 dark:bg-indigo-950/80', border: 'border-indigo-300 dark:border-indigo-800', text: 'text-indigo-900 dark:text-indigo-200', sub: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-200 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200' },
  { bg: 'bg-teal-100 dark:bg-teal-950/80', border: 'border-teal-300 dark:border-teal-800', text: 'text-teal-900 dark:text-teal-200', sub: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-200 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200' },
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

const VI_DAY_NAMES = [
  { dayIndex: 1, label: 'Thứ 2', short: 'T2' },
  { dayIndex: 2, label: 'Thứ 3', short: 'T3' },
  { dayIndex: 3, label: 'Thứ 4', short: 'T4' },
  { dayIndex: 4, label: 'Thứ 5', short: 'T5' },
  { dayIndex: 5, label: 'Thứ 6', short: 'T6' },
  { dayIndex: 6, label: 'Thứ 7', short: 'T7' },
  { dayIndex: 0, label: 'Chủ nhật', short: 'CN' },
];

const EN_DAY_NAMES = [
  { dayIndex: 1, label: 'Mon', short: 'M' },
  { dayIndex: 2, label: 'Tue', short: 'T' },
  { dayIndex: 3, label: 'Wed', short: 'W' },
  { dayIndex: 4, label: 'Thu', short: 'T' },
  { dayIndex: 5, label: 'Fri', short: 'F' },
  { dayIndex: 6, label: 'Sat', short: 'S' },
  { dayIndex: 0, label: 'Sun', short: 'S' },
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
  const { t, lang } = useThemeLanguage();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const [absenceError, setAbsenceError] = useState('');

  // Theo dõi các buổi học đã được học sinh xem tin tức (thông báo đột xuất hoặc dặn dò)
  const [viewedNewsKeys, setViewedNewsKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('viewed_session_news_keys');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const getSessionNewsKey = (session) => {
    if (!session) return '';
    const sId = session.sessionId || session.id;
    const ann = session.announcement ? session.announcement.trim() : '';
    const annTime = session.announcementUpdatedAt ? new Date(session.announcementUpdatedAt).getTime() : '';
    const prep = session.hasPreparation ? 'prep' : '';
    return `${sId}_${ann}_${annTime}_${prep}`;
  };

  const markNewsAsViewed = (session) => {
    if (!session) return;
    const key = getSessionNewsKey(session);
    setViewedNewsKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('viewed_session_news_keys', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const isNewsUnviewed = (session) => {
    if (!isStudent) return false;
    const hasAnnouncement = Boolean(session.announcement && session.announcement.trim());
    const hasPrep = Boolean(session.hasPreparation);
    if (!hasAnnouncement && !hasPrep) return false;
    const key = getSessionNewsKey(session);
    return !viewedNewsKeys.has(key);
  };

  const dayNames = useMemo(() => {
    return lang === 'en' ? EN_DAY_NAMES : VI_DAY_NAMES;
  }, [lang]);

  // Calculate dates for Monday through Sunday of current week
  const weekDays = useMemo(() => {
    return dayNames.map((d, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return {
        ...d,
        date,
        dateStr: formatDateDM(date),
        fullDateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      };
    });
  }, [currentWeekStart, dayNames]);

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

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.parsedStart?.getTime() || 0) - (b.parsedStart?.getTime() || 0));
    });

    return map;
  }, [sessions, weekDays]);

  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 240; // 4 tiếng
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
    if (diffMinutes < 0) return lang === 'en' ? 'Session has already started or ended' : 'Buổi học đã diễn ra';
    if (diffMinutes < 240) {
      const hours = Math.floor(Math.max(0, diffMinutes) / 60);
      const mins = Math.max(0, diffMinutes) % 60;
      return lang === 'en'
        ? `${hours}h ${mins}m until class (past 4-hour advance deadline)`
        : `Còn ${hours} giờ ${mins} phút nữa là vào học (quá hạn báo trước 4 giờ)`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return lang === 'en'
      ? `${hours}h ${mins}m before class (eligible to submit request)`
      : `Còn ${hours} giờ ${mins} phút trước giờ học (hợp lệ để gửi yêu cầu)`;
  };

  const [absenceType, setAbsenceType] = useState('ONLINE'); // 'ONLINE' | 'ABSENT'
  const [commitments, setCommitments] = useState({
    docReviewed: false,
    homeworkCompleted: false,
    learningImpactUnderstood: false
  });

  const handleOpenAbsence = (e, session) => {
    e.stopPropagation();
    setSelectedSession(session);
    setAbsenceReason('');
    setAbsenceError('');
    setAbsenceType('ONLINE');
    setCommitments({
      docReviewed: false,
      homeworkCompleted: false,
      learningImpactUnderstood: false
    });
    setShowAbsenceModal(true);
  };

  // Tính số buổi đã báo vắng trong tháng của buổi học đang chọn (tối đa 2 buổi/tháng)
  const monthlyAbsenceCount = useMemo(() => {
    if (!selectedSession || !sessions) return 0;
    const sDate = new Date(selectedSession.startTime);
    const targetYear = sDate.getFullYear();
    const targetMonth = sDate.getMonth();
    const currentSessionId = selectedSession.sessionId || selectedSession.id;

    return sessions.filter(s => {
      const id = s.sessionId || s.id;
      if (id === currentSessionId) return false;
      if (s.attendanceStatus !== 'ABSENT') return false;
      if (!s.startTime) return false;
      const d = new Date(s.startTime);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    }).length;
  }, [selectedSession, sessions]);

  const [isCancellingAbsence, setIsCancellingAbsence] = useState(false);

  const handleCancelAbsence = async (e, session) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!studentId || !session) return;
    const isOnline = session.attendanceStatus === 'ONLINE';
    const ok = await confirm({
      title: lang === 'en' ? 'Cancel Request' : 'Hủy yêu cầu',
      message: isOnline
        ? (lang === 'en' ? 'Are you sure you want to cancel the online attendance request and attend class in person?' : 'Bạn có chắc chắn muốn hủy đăng ký học Online để đi học trực tiếp tại lớp không?')
        : (lang === 'en' ? 'Are you sure you want to cancel the reported absence and attend this class?' : 'Bạn có chắc chắn muốn hủy báo vắng để đi học lại buổi học này không?'),
      confirmText: lang === 'en' ? 'Confirm In-Person Attendance' : 'Xác nhận đi học trực tiếp',
      cancelText: lang === 'en' ? 'Keep Request' : 'Giữ nguyên',
      type: 'info'
    });
    if (!ok) return;

    try {
      setIsCancellingAbsence(true);
      await studentPortalApi.cancelAbsence(
        studentId,
        session.sessionId || session.id
      );

      toast.success(lang === 'en' ? 'Successfully updated! You can attend the session.' : 'Đã cập nhật thành công! Bạn có thể tham gia buổi học.');
      setSelectedSession(null);
      if (onReportAbsenceSuccess) {
        onReportAbsenceSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || (lang === 'en' ? 'An error occurred while cancelling.' : 'Có lỗi xảy ra khi hủy yêu cầu.'));
    } finally {
      setIsCancellingAbsence(false);
    }
  };

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!studentId || !selectedSession) return;
    if (!canReportAbsence(selectedSession)) {
      setAbsenceError(lang === 'en' ? 'Absence or online requests must be submitted at least 4 hours before session start!' : 'Chỉ được phép báo vắng hoặc xin học online trước giờ học ít nhất 4 tiếng!');
      return;
    }

    const isOnline = absenceType === 'ONLINE';
    const allCommitmentsConfirmed = commitments.docReviewed && commitments.homeworkCompleted && commitments.learningImpactUnderstood;

    if (!isOnline && !allCommitmentsConfirmed) {
      setAbsenceError(lang === 'en' ? 'Please check all 3 make-up commitments before submitting your absence!' : 'Vui lòng tick xác nhận đầy đủ 3 cam kết bù bài trước khi gửi báo vắng!');
      return;
    }

    if (!isOnline && monthlyAbsenceCount >= 2) {
      setAbsenceError(lang === 'en' ? 'You have reached the 2-absence monthly quota! Please contact your teacher directly.' : 'Bạn đã sử dụng hết hạn mức 2 buổi nghỉ có phép trong tháng này! Vui lòng liên hệ trực tiếp với Thầy/Cô để xin phép.');
      return;
    }

    setIsSubmittingAbsence(true);
    setAbsenceError('');

    try {
      const res = await studentPortalApi.reportAbsence(
        studentId,
        selectedSession.sessionId || selectedSession.id,
        {
          reason: absenceReason,
          isOnline: isOnline,
          status: isOnline ? 'ONLINE' : 'ABSENT',
          absenceType: absenceType,
          commitmentsConfirmed: allCommitmentsConfirmed
        }
      );

      toast.success(res.data?.message || (isOnline ? (lang === 'en' ? 'Online request sent successfully!' : 'Đã gửi yêu cầu học Online thành công!') : (lang === 'en' ? 'Absence reported successfully!' : 'Đã gửi báo vắng thành công!')));
      setShowAbsenceModal(false);
      setSelectedSession(null);
      if (onReportAbsenceSuccess) {
        onReportAbsenceSuccess();
      }
    } catch (err) {
      setAbsenceError(err.response?.data?.message || err.message || (lang === 'en' ? 'An error occurred while submitting request.' : 'Có lỗi xảy ra khi gửi yêu cầu.'));
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
    markNewsAsViewed(session);
    if (!isStudent && onNavigateToSession) {
      onNavigateToSession(session);
      return;
    }
    setSelectedSession(session);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Header & Navigation */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {lang === 'en' ? 'Week:' : 'Tuần:'}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-800/60 rounded-full">
            {weekRangeStr}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            {t('prevWeek')}
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs cursor-pointer"
          >
            {t('currentWeek')}
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            {t('nextWeek')}
          </button>
        </div>
      </div>

      {/* Chú thích viền trạng thái bài tập & Màu lớp */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Chú thích viền bài tập */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('assignmentStatusLegend')}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-red-500 bg-red-100 dark:bg-red-950/60"></span>
            <span className="text-slate-600 dark:text-slate-400">{t('notStarted')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-100 dark:bg-amber-950/60"></span>
            <span className="text-slate-600 dark:text-slate-400">{t('inProgressLegend')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60"></span>
            <span className="text-slate-600 dark:text-slate-400">{t('completedOrGraded')}</span>
          </div>
        </div>

        {/* Chú thích màu lớp */}
        {distinctClasses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-slate-600 dark:text-slate-400">{t('classLegend')}</span>
            {distinctClasses.map(c => (
              <div key={c.id} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${c.color.badge} border ${c.color.border}`}></span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MA TRẬN THỜI KHÓA BIỂU DẠNG DỌC (VERTICAL CALENDAR) */}
      <div className="overflow-x-auto">
        <div className="min-w-[850px] sm:min-w-[1000px]">
          {/* HÀNG TIÊU ĐỀ: 7 CỘT NGÀY TRONG TUẦN */}
          <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 sticky top-0 z-30 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Cột mốc giờ */}
            <div className="p-3 border-r-2 border-slate-300 dark:border-slate-700 text-center font-bold bg-slate-100 dark:bg-slate-950 sticky left-0 z-40 flex items-center justify-center shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
              {lang === 'en' ? 'Time / Day' : 'Giờ / Thứ'}
            </div>

            {/* 7 cột ngày trong tuần */}
            {weekDays.map(day => {
              const isToday = new Date().toDateString() === day.date.toDateString();
              return (
                <div
                  key={day.dayIndex}
                  className={`p-2.5 text-center border-r border-slate-200 dark:border-slate-800 transition ${
                    isToday ? 'bg-blue-100/70 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-bold border-b-2 border-b-blue-600' : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">{day.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{day.dateStr}</div>
                  {isToday && (
                    <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-bold text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-900/60 px-1 rounded">
                      {lang === 'en' ? 'Today' : 'Hôm nay'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* THÂN THỜI KHÓA BIỂU DỌC: CỘT GIỜ + 7 CỘT NGÀY */}
          <div className="grid grid-cols-8 relative" style={{ height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}>
            {/* CỘT MỐC THỜI GIAN (BÊN TRÁI - LUÔN NẰM TRÊN CÙNG KHI CUỘN HOẶC TRÀN VIỀN) */}
            <div className="border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 sticky left-0 z-20 select-none shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
              {TIME_SLOTS.map((time, idx) => (
                <div
                  key={time}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  className={`border-b border-slate-200 dark:border-slate-800 px-1 text-[11px] flex items-center justify-center font-mono ${
                    idx % 2 === 0 ? 'font-bold text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/80' : 'text-slate-400 dark:text-slate-500 text-[10px] bg-slate-50 dark:bg-slate-950'
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
                  className={`border-r border-slate-200 dark:border-slate-800 relative ${
                    isToday ? 'bg-blue-50/20 dark:bg-blue-950/20' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Đường kẻ ngang phân cách các slot 30 phút */}
                  {TIME_SLOTS.map((time, idx) => (
                    <div
                      key={time}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      className={`border-b border-slate-100 dark:border-slate-800/60 ${
                        idx % 2 === 1 ? 'border-dashed' : ''
                      }`}
                    />
                  ))}

                  {/* CÁC BUỔI HỌC TRONG NGÀY */}
                  {daySessions.map(session => {
                    const classId = session.classId || (session.classRoom && session.classRoom.id);
                    const color = getClassColor(classId);
                    const sId = session.sessionId || session.id;
                    const isOnlineReport = session.attendanceStatus === 'ONLINE' || (session.attendanceNote && session.attendanceNote.includes('[Xin học Online]'));
                    const hasAbsentReport = session.attendanceStatus === 'ABSENT' && !isOnlineReport;
                    const hasAnyReport = hasAbsentReport || isOnlineReport;
                    const unviewedNews = isNewsUnviewed(session);

                    // Xử lý viền theo trạng thái bài tập
                    let homeworkBorderClass = `${color.border} border`;
                    let homeworkStatusBadge = null;

                    const isOverdueSession = session.homeworkStatus === 'OVERDUE' || session.isOverdue;

                    if (isOverdueSession) {
                      homeworkBorderClass = 'border-2 border-black dark:border-white shadow-sm shadow-black/30 ring-1 ring-black dark:ring-white';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white shrink-0 inline-flex items-center gap-0.5">
                          <AlertTriangleIcon className="w-2.5 h-2.5 shrink-0" />
                          <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                        </span>
                      );
                    } else if (session.homeworkStatus === 'NOT_SUBMITTED') {
                      homeworkBorderClass = 'border-2 border-red-500 shadow-sm shadow-red-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-800 rounded border border-red-300">
                          {t('notSubmittedBadge')}
                        </span>
                      );
                    } else if (session.homeworkStatus === 'DRAFT') {
                      homeworkBorderClass = 'border-2 border-amber-500 shadow-sm shadow-amber-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                          {t('draftBadge')}
                        </span>
                      );
                    } else if (session.homeworkStatus === 'GRADED') {
                      homeworkBorderClass = 'border-2 border-emerald-500 shadow-sm shadow-emerald-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          {t('gradedBadge')}{session.homeworkScore ? `: ${session.homeworkScore}` : ''}
                        </span>
                      );
                    } else if (session.homeworkStatus === 'SUBMITTED') {
                      homeworkBorderClass = 'border-2 border-emerald-500 shadow-sm shadow-emerald-200/50';
                      homeworkStatusBadge = (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          {t('submittedBadge')}
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
                        title={`${lang === 'en' ? 'Click to view details:' : 'Bấm để xem chi tiết:'} ${session.className || ''} - ${session.topic || ''}`}
                      >
                        <div>
                          {/* Header: Class Name & Time */}
                          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate max-w-[65%]">
                              {session.className || (lang === 'en' ? 'Class' : 'Lớp học')}
                            </span>
                            <span className="text-[10px] font-semibold opacity-85 whitespace-nowrap font-mono">
                              {session.timeRangeStr}
                            </span>
                          </div>

                          {/* Topic / Content */}
                          <div className="text-xs font-semibold line-clamp-2 leading-tight mb-1" title={session.contentSummary || session.topic || ''}>
                            {session.contentSummary || session.topic || (lang === 'en' ? 'Session' : 'Buổi học')}
                          </div>
                        </div>

                        {/* Footer: Badges & Actions */}
                        <div className="pt-1 border-t border-black/5 mt-auto space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-medium opacity-90 truncate">
                              {lang === 'en' ? 'Students:' : 'Sĩ số:'} <b>{session.studentCount != null ? session.studentCount : '—'}</b>
                            </span>
                            {/* Ô Tin tức nhấp nháy chậm nếu có thông báo hoặc dặn dò chưa xem */}
                            {unviewedNews && (
                              <span className="text-[9px] font-bold px-1 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 animate-[pulse_2.5s_ease-in-out_infinite] shadow-2xs shrink-0">
                                {t('news')}
                              </span>
                            )}
                          </div>

                          {/* Nhóm badge trạng thái: Bài tập & Vắng/Online */}
                          <div className="flex flex-wrap items-center gap-1">
                            {homeworkStatusBadge}

                            {hasAbsentReport && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded">
                                {t('reportedAbsence')}
                              </span>
                            )}

                            {isOnlineReport && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 rounded flex items-center gap-0.5">
                                <GlobeIcon className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                <span>{t('onlineRequest')}</span>
                              </span>
                            )}
                          </div>

                          {/* Nút hành động: Canh xuống 1 hàng riêng để nút nằm gọn luôn, không nhảy hàng so lệch */}
                          {isStudent && canReportAbsence(session) && !hasAnyReport && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenAbsence(e, session)}
                              className="w-full text-center px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-300 transition cursor-pointer block"
                            >
                              {lang === 'en' ? 'Absence / Online' : 'Báo vắng / Online'}
                            </button>
                          )}

                          {isStudent && hasAnyReport && !isSessionEnded(session) && (
                            <button
                              type="button"
                              onClick={(e) => handleCancelAbsence(e, session)}
                              disabled={isCancellingAbsence}
                              className="w-full text-center px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 transition cursor-pointer block"
                            >
                              {isCancellingAbsence ? '...' : t('cancelRequest')}
                            </button>
                          )}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {selectedSession.className || (lang === 'en' ? 'Class' : 'Lớp học')}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                  {selectedSession.topic || selectedSession.contentSummary || t('sessionDrawerTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* THÔNG BÁO TỪ GIÁO VIÊN (NẾU CÓ) - VIỀN ĐỎ KHÁC BIỆT NHẤP NHÁY, NỀN VÀNG GIỐNG DẶN DÒ */}
            {selectedSession.announcement && (
              <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/50 border-2 border-red-500 rounded-xl shadow-xs space-y-1.5 animate-pulse">
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <MegaphoneIcon className="w-4 h-4 shrink-0" />
                  <span>{t('teacherAnnouncement')}</span>
                  {selectedSession.announcementUpdatedAt && (
                    <span className="text-[10px] font-normal text-amber-700 dark:text-amber-300 ml-auto">
                      {new Date(selectedSession.announcementUpdatedAt).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-amber-950 dark:text-amber-100 leading-relaxed">
                  <LinkifiedText text={selectedSession.announcement} />
                </div>
              </div>
            )}

            {/* Thông tin thời gian */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">{t('startsAt')}</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{selectedSession.timeRangeStr}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">{lang === 'en' ? 'Duration:' : 'Thời lượng:'}</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{selectedSession.durationMinutes || 90} {lang === 'en' ? 'mins' : 'phút'}</strong>
              </div>
            </div>

            {/* PHẦN 1: BÀI TẬP VỀ NHÀ CỦA BUỔI HỌC */}
            {selectedSession.assignments && selectedSession.assignments.length > 0 && (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    {t('homeworkThisSession')} ({selectedSession.assignments.length})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {selectedSession.assignments.map((asgn, aIdx) => {
                    let atts = [];
                    if (asgn.attachmentsJson) {
                      try { atts = JSON.parse(asgn.attachmentsJson); } catch {}
                    }
                    if ((!atts || atts.length === 0) && asgn.attachmentFileUrl) {
                      atts = [{ fileName: asgn.attachmentFileName || (lang === 'en' ? 'Download prompt file' : 'Tải file đề bài'), fileUrl: asgn.attachmentFileUrl }];
                    }

                    return (
                      <div key={asgn.id || aIdx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-slate-800 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs text-gray-800 dark:text-slate-100">
                            {aIdx + 1}. {asgn.title}
                          </div>
                          {asgn.submissionStatus === 'OVERDUE' && (
                            <span className="shrink-0 text-[10px] font-extrabold text-white dark:text-black bg-black dark:bg-white px-2 py-0.5 rounded border border-black dark:border-white inline-flex items-center gap-1">
                              <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                              <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                            </span>
                          )}
                          {asgn.submissionStatus === 'GRADED' && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              {t('gradedBadge')} {asgn.submissionScore != null ? asgn.submissionScore : '—'} {lang === 'en' ? 'pts' : 'đ'}
                            </span>
                          )}
                          {asgn.submissionStatus === 'SUBMITTED' && (
                            <span className="shrink-0 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800">
                              {t('submittedBadge')}
                            </span>
                          )}
                          {asgn.submissionStatus === 'DRAFT' && (
                            <span className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                              {t('draftBadge')}
                            </span>
                          )}
                          {(!asgn.submissionStatus || asgn.submissionStatus === 'NOT_SUBMITTED') && (
                            <span className="shrink-0 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-300 dark:border-red-800">
                              {t('notSubmittedBadge')}
                            </span>
                          )}
                        </div>

                        <CollapsibleDescription text={asgn.description} textClassName="text-xs text-gray-600 dark:text-slate-400" />

                        {atts && atts.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('teacherAttachments')} ({atts.length}):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {atts.map((att, attIdx) => (
                                <a
                                  key={attIdx}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded transition"
                                >
                                  <PaperclipIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-[180px]">{att.fileName || (lang === 'en' ? `File ${attIdx + 1}` : `Tệp ${attIdx + 1}`)}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-gray-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            {asgn.dueDate && (
                              <span>{lang === 'en' ? 'Due:' : 'Hạn nộp:'} <b className="text-slate-700 dark:text-slate-200">{new Date(asgn.dueDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}</b></span>
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
                                ? t('continueDraft')
                                : (asgn.submissionStatus === 'SUBMITTED' || asgn.submissionStatus === 'GRADED')
                                ? t('reviewSubmission')
                                : t('doThisAssignment')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PHẦN 2: KẾ HOẠCH GIẢNG DẠY & DẶN DÒ CHUẨN BÀI */}
            {selectedSession.sections && selectedSession.sections.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('sessionDetailsAndPrep')}
                </h4>
                <div className="space-y-2">
                  {selectedSession.sections.map((sec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {sec.title || sec.activity || t('classActivity')}
                        </span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {sec.timeAllocation || `${sec.durationMinutes || 15} ${lang === 'en' ? 'mins' : 'phút'}`}
                        </span>
                      </div>
                      {sec.content && <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{sec.content}</p>}
                      {sec.studentPreparation && (
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-900/60 mt-1">
                          <strong className="text-amber-800 dark:text-amber-300">{t('studentPrepRequired')}</strong> <LinkifiedText text={sec.studentPreparation} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                {t('noDetailedPlanYet')}
              </div>
            )}

            {/* Footer modal */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
              {isStudent && canReportAbsence(selectedSession) && selectedSession.attendanceStatus !== 'ABSENT' && selectedSession.attendanceStatus !== 'ONLINE' && (
                <button
                  type="button"
                  onClick={(e) => handleOpenAbsence(e, selectedSession)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-lg transition cursor-pointer"
                >
                  {lang === 'en' ? 'Absence / Online' : 'Xin nghỉ / Học Online'}
                </button>
              )}
              {isStudent && (selectedSession.attendanceStatus === 'ABSENT' || selectedSession.attendanceStatus === 'ONLINE') && !isSessionEnded(selectedSession) && (
                <button
                  type="button"
                  onClick={(e) => handleCancelAbsence(e, selectedSession)}
                  disabled={isCancellingAbsence}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/60 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  {isCancellingAbsence ? (lang === 'en' ? 'Processing...' : 'Đang xử lý...') : t('cancelRequest')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="ml-auto px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN BÁO VẮNG / XIN HỌC ONLINE */}
      {showAbsenceModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-1.5 ${absenceType === 'ONLINE' ? 'text-sky-900 dark:text-sky-200' : 'text-rose-800 dark:text-rose-200'}`}>
                  {absenceType === 'ONLINE' ? (
                    <>
                      <GlobeIcon className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{t('registerOnlineTitle')}</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{t('confirmAbsenceTitle')}</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {selectedSession.className} - {selectedSession.topic || selectedSession.contentSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="space-y-3.5">
              {/* Lựa chọn hình thức: Học Online vs Nghỉ hẳn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t('selectParticipationMode')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAbsenceType('ONLINE')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      absenceType === 'ONLINE'
                        ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-800'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800 dark:text-sky-300">
                      <GlobeIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{t('requestOnlineOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t('onlineOptionDesc')}
                    </span>
                    <span className="mt-2 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full self-start">
                      {t('recommendedBadge')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbsenceType('ABSENT')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      absenceType === 'ABSENT'
                        ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 ring-2 ring-rose-300 dark:ring-rose-800'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800 dark:text-rose-300">
                      <XCircleIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{t('fullAbsenceOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t('fullAbsenceDesc')}
                    </span>
                    <span className="mt-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full self-start">
                      {t('absenceQuotaBadge')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Thông tin quy định & Hạn mức */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{t('timePolicyLabel')}</span>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">{t('atLeast4HoursNotice')}</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">{getAbsenceTimeRemaining(selectedSession)}</p>

                {absenceType === 'ABSENT' && (
                  <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs">
                    <span>{t('monthlyQuotaLabel')}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      monthlyAbsenceCount >= 2 ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {lang === 'en' ? `Used ${monthlyAbsenceCount}/2 sessions` : `Đã dùng ${monthlyAbsenceCount}/2 buổi`}
                    </span>
                  </div>
                )}
              </div>

              {/* Hướng dẫn khi xin học Online */}
              {absenceType === 'ONLINE' && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-xl text-xs text-sky-800 dark:text-sky-200 space-y-1">
                  <p className="font-semibold">{t('howToGetLinkTitle')}</p>
                  <p className="text-[11px] text-sky-700 dark:text-sky-300">
                    {t('howToGetLinkDesc')}
                  </p>
                </div>
              )}

              {/* 3 Cam kết bù bài bắt buộc khi Nghỉ hẳn */}
              {absenceType === 'ABSENT' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('mandatoryCommitmentsTitle')} <span className="text-rose-500">*</span>:
                  </label>
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.docReviewed}
                        onChange={(e) => setCommitments(prev => ({ ...prev, docReviewed: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentDoc')}</span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.homeworkCompleted}
                        onChange={(e) => setCommitments(prev => ({ ...prev, homeworkCompleted: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentHomework')}</span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.learningImpactUnderstood}
                        onChange={(e) => setCommitments(prev => ({ ...prev, learningImpactUnderstood: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentImpact')}</span>
                    </label>
                  </div>
                </div>
              )}

              {absenceError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {absenceError}
                </div>
              )}

              {/* Lý do */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('reasonLabel')} {absenceType === 'ONLINE' ? (lang === 'en' ? 'for online request' : 'xin học Online') : (lang === 'en' ? 'for absence' : 'xin phép vắng')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder={
                    absenceType === 'ONLINE'
                      ? t('reasonOnlinePlaceholder')
                      : t('reasonAbsencePlaceholder')
                  }
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingAbsence ||
                    (absenceType === 'ABSENT' && (
                      !commitments.docReviewed ||
                      !commitments.homeworkCompleted ||
                      !commitments.learningImpactUnderstood ||
                      monthlyAbsenceCount >= 2
                    ))
                  }
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    absenceType === 'ONLINE'
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingAbsence
                    ? (lang === 'en' ? 'Submitting...' : 'Đang gửi...')
                    : absenceType === 'ONLINE'
                    ? t('confirmOnlineBtn')
                    : t('confirmAbsenceBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
