// File: src/Components/LearningAnalyticsHeatmap.jsx
import { useState, useEffect, useMemo } from 'react';
import { studentApi } from '../api/studentApi';
import { sessionApi } from '../api/sessionApi';
import { attendanceApi } from '../api/attendanceApi';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { AlertTriangleIcon, StarIcon, XIcon } from './Icons';

export default function LearningAnalyticsHeatmap({ classId, classInfo }) {
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Phạm vi thời gian
  const [scopeMode, setScopeMode] = useState('2_WEEKS'); // '2_WEEKS' (Mặc định) | 'ALL'
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'WARNING' | 'EXCELLENT'
  const [onlyAtRisk, setOnlyAtRisk] = useState(false); // Lọc chỉ học sinh cần quan tâm (Báo động + Lưu ý)
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [classId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [studRes, sessRes, attRes, asgnRes] = await Promise.all([
        studentApi.getByClass(classId),
        sessionApi.getByClass(classId),
        attendanceApi.getByClass(classId).catch(() => []),
        assignmentApi.getByClass(classId).catch(() => [])
      ]);

      const rawStudents = Array.isArray(studRes) ? studRes : [];
      const rawAssignments = Array.isArray(asgnRes) ? asgnRes : [];

      // Chuẩn hóa dữ liệu học sinh từ EnrollmentResponseDTO
      const normalizedStudents = rawStudents.map(st => ({
        ...st,
        id: st.studentId || st.id, // Đảm bảo .id là student user ID
        studentId: st.studentId || st.id,
        enrollmentId: st.id,
        fullName: st.fullName || st.studentName || (lang === 'en' ? 'Student' : 'Học sinh'),
        email: st.email || st.studentEmail || ''
      }));

      // Lấy danh sách bài nộp: Thử lấy theo lớp trước
      let allSubmissions = [];
      try {
        const classSubs = await submissionApi.getByClass(classId);
        if (Array.isArray(classSubs) && classSubs.length > 0) {
          allSubmissions = classSubs;
        }
      } catch (err) {
        console.warn('getByClass không khả dụng trong heatmap, fallback theo từng bài tập:', err);
      }

      // Fallback: Nếu getByClass không có bài nộp hoặc lỗi 404, lấy theo từng bài tập
      if (allSubmissions.length === 0 && rawAssignments.length > 0) {
        try {
          const perAsgnSubs = await Promise.all(
            rawAssignments.map(a => submissionApi.getByAssignment(a.id).catch(() => []))
          );
          allSubmissions = perAsgnSubs.flat().filter(Boolean);
        } catch (perAsgnErr) {
          console.error('Lỗi khi fallback tải bài nộp trong heatmap:', perAsgnErr);
        }
      }

      setStudents(normalizedStudents);
      // Sắp xếp buổi học theo thời gian tăng dần
      const sortedSessions = (Array.isArray(sessRes) ? sessRes : []).sort(
        (a, b) => new Date(a.startTime) - new Date(b.startTime)
      );
      setSessions(sortedSessions);
      setAttendances(Array.isArray(attRes) ? attRes : []);
      setAssignments(rawAssignments);
      setSubmissions(allSubmissions);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phân tích học tập:', err);
      toast.error(lang === 'en' ? ('Unable to load analytics data: ' + (err.message || 'Network error')) : ('Không thể tải dữ liệu phân tích: ' + (err.message || 'Lỗi mạng')));
    } finally {
      setLoading(false);
    }
  };

  // Chia toàn bộ buổi học và bài tập thành các Tuần học (Weeks)
  const allWeeks = useMemo(() => {
    if (sessions.length === 0) {
      return [{ weekNum: 1, title: lang === 'en' ? 'Week 1' : 'Tuần 1', sessions: [], assignments: [] }];
    }

    const firstDate = new Date(sessions[0].startTime);
    firstDate.setHours(0, 0, 0, 0);

    const weekMap = new Map();

    sessions.forEach(sess => {
      const sessDate = new Date(sess.startTime);
      const diffDays = Math.floor((sessDate - firstDate) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.max(1, Math.floor(diffDays / 7) + 1);

      if (!weekMap.has(weekIndex)) {
        weekMap.set(weekIndex, {
          weekNum: weekIndex,
          title: lang === 'en' ? `Week ${weekIndex}` : `Tuần ${weekIndex}`,
          sessions: [],
          assignments: []
        });
      }
      weekMap.get(weekIndex).sessions.push(sess);
    });

    // Phân bổ bài tập vào từng tuần theo sessionId hoặc dueDate/createdAt
    assignments.forEach(asgn => {
      let targetWeek = null;
      const sId = asgn.session?.id || asgn.sessionId;
      if (sId) {
        for (const [wIdx, wData] of weekMap.entries()) {
          if (wData.sessions.some(s => String(s.id) === String(sId))) {
            targetWeek = wIdx;
            break;
          }
        }
      }
      if (!targetWeek && asgn.dueDate) {
        const dDate = new Date(asgn.dueDate);
        const diffDays = Math.floor((dDate - firstDate) / (1000 * 60 * 60 * 24));
        targetWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
      }
      if (!targetWeek && asgn.createdAt) {
        const cDate = new Date(asgn.createdAt);
        const diffDays = Math.floor((cDate - firstDate) / (1000 * 60 * 60 * 24));
        targetWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
      }
      if (!targetWeek) {
        targetWeek = 1;
      }

      if (!weekMap.has(targetWeek)) {
        weekMap.set(targetWeek, {
          weekNum: targetWeek,
          title: lang === 'en' ? `Week ${targetWeek}` : `Tuần ${targetWeek}`,
          sessions: [],
          assignments: []
        });
      }
      weekMap.get(targetWeek).assignments.push(asgn);
    });

    const result = Array.from(weekMap.values()).sort((a, b) => a.weekNum - b.weekNum);
    return result.length > 0 ? result : [{ weekNum: 1, title: lang === 'en' ? 'Week 1' : 'Tuần 1', sessions: [], assignments: [] }];
  }, [sessions, assignments, lang]);

  // Lọc các tuần hiển thị theo phạm vi 2 tuần gần nhất (14 ngày thực tế)
  const weeks = useMemo(() => {
    if (scopeMode === 'ALL' || allWeeks.length <= 2) {
      return allWeeks;
    }
    const now = new Date();
    // 1. Tìm tuần chứa buổi học hoặc bài tập gần ngày hôm nay nhất (trong vòng 7 ngày)
    let currentWeekIdx = allWeeks.findIndex(w =>
      w.sessions.some(s => {
        const d = new Date(s.startTime);
        return Math.abs(now - d) <= 7 * 24 * 60 * 60 * 1000;
      }) ||
      w.assignments.some(a => {
        const d = new Date(a.dueDate || a.createdAt);
        return Math.abs(now - d) <= 7 * 24 * 60 * 60 * 1000;
      })
    );

    // 2. Nếu không tìm thấy tuần gần hôm nay, tìm tuần gần nhất trong quá khứ (<= now)
    if (currentWeekIdx === -1) {
      for (let i = allWeeks.length - 1; i >= 0; i--) {
        const w = allWeeks[i];
        if (w.sessions.some(s => new Date(s.startTime) <= now) ||
            w.assignments.some(a => new Date(a.dueDate || a.createdAt) <= now)) {
          currentWeekIdx = i;
          break;
        }
      }
    }

    // 3. Nếu toàn bộ tuần đều trong tương lai, lấy 2 tuần đầu tiên
    if (currentWeekIdx === -1) {
      return allWeeks.slice(0, 2);
    }

    // Lấy tuần hiện tại và tuần trước đó (đúng 2 tuần gần nhất có dữ liệu thực tế)
    const startIdx = Math.max(0, currentWeekIdx - 1);
    const candidateWeeks = allWeeks.slice(startIdx, startIdx + 2);
    return candidateWeeks.length > 0 ? candidateWeeks : allWeeks.slice(-2);
  }, [allWeeks, scopeMode]);

  // Tính toán chỉ số sức khỏe học tập (Health Index) cho từng học sinh theo từng tuần
  const studentWeeklyAnalytics = useMemo(() => {
    // Map nhanh attendance theo `${studentId}_${sessionId}`
    const attMap = new Map();
    attendances.forEach(att => {
      const sId = att.studentId || att.student?.id;
      const sessId = att.sessionId || att.session?.id;
      if (sId && sessId) {
        attMap.set(`${sId}_${sessId}`, att);
      }
    });

    // Map nhanh submission theo cả `${studentId}_${assignmentId}` và `${email}_${assignmentId}`
    const subMap = new Map();
    submissions.forEach(sub => {
      const sId = sub.studentId || sub.student?.id;
      const asgnId = sub.assignmentId || sub.assignment?.id;
      const email = (sub.studentEmail || sub.student?.email || '').toLowerCase().trim();

      if (sId && asgnId) {
        subMap.set(`${sId}_${asgnId}`, sub);
      }
      if (email && asgnId) {
        subMap.set(`${email}_${asgnId}`, sub);
      }
    });

    return students.map(st => {
      const weeklyData = [];
      let totalAbsents = 0;
      let totalPresents = 0;
      let consecutiveAbsents = 0;
      let maxConsecutiveAbsents = 0;
      let missingAssignmentsCount = 0;
      const recentScores = [];

      weeks.forEach(week => {
        // 1. Điểm chuyên cần trong tuần
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let evaluatedSessionsCount = 0;

        week.sessions.forEach(sess => {
          const isPast = sess.startTime && new Date(sess.startTime) <= new Date();
          const hasAttendanceRecords = attendances.some(a => (a.sessionId || a.session?.id) === sess.id);

          // Nếu buổi học trong tương lai hoặc chưa từng được giáo viên điểm danh -> không tính vắng
          if (!isPast || !hasAttendanceRecords) {
            return;
          }

          evaluatedSessionsCount++;
          const studentKey = `${st.studentId || st.id}_${sess.id}`;
          const emailKey = st.email ? `${st.email.toLowerCase().trim()}_${sess.id}` : null;
          const rec = attMap.get(studentKey) || (emailKey ? attMap.get(emailKey) : null);
          if (rec) {
            if (rec.status === 'PRESENT' || rec.status === 'ONLINE') {
              presentCount++;
              totalPresents++;
              consecutiveAbsents = 0;
            } else if (rec.status === 'LATE') {
              lateCount++;
              consecutiveAbsents = 0;
            } else if (rec.status === 'ABSENT') {
              absentCount++;
              totalAbsents++;
              consecutiveAbsents++;
              if (consecutiveAbsents > maxConsecutiveAbsents) {
                maxConsecutiveAbsents = consecutiveAbsents;
              }
            }
          } else {
            absentCount++;
            totalAbsents++;
            consecutiveAbsents++;
            if (consecutiveAbsents > maxConsecutiveAbsents) {
              maxConsecutiveAbsents = consecutiveAbsents;
            }
          }
        });

        const weekAttScore = evaluatedSessionsCount > 0
          ? Math.round(((presentCount * 1.0 + lateCount * 0.6) / evaluatedSessionsCount) * 100)
          : null;

        // 2. Điểm bài tập trong tuần (chỉ tính các bài đã mở/phát hành)
        const now = new Date();
        const activeAsgns = week.assignments.filter(a => !(a.scheduledPublishAt && new Date(a.scheduledPublishAt) > now));
        let weekAsgnScore = null;
        let asgnSubmitted = 0;
        let asgnTotal = activeAsgns.length;
        const weekScores = [];

        activeAsgns.forEach(asgn => {
          const studentKey = `${st.studentId || st.id}_${asgn.id}`;
          const emailKey = st.email ? `${st.email.toLowerCase().trim()}_${asgn.id}` : null;
          const sub = subMap.get(studentKey) || (emailKey ? subMap.get(emailKey) : null);
          if (sub) {
            asgnSubmitted++;
            const numScore = parseFloat(sub.score);
            if (!isNaN(numScore)) {
              weekScores.push(numScore * 10); // scale 0-100
              recentScores.push(numScore);
            }
          } else {
            missingAssignmentsCount++;
          }
        });

        if (asgnTotal > 0) {
          if (weekScores.length > 0) {
            weekAsgnScore = Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length);
          } else if (asgnSubmitted > 0) {
            weekAsgnScore = 75; // Đã nộp đang chờ chấm
          } else {
            weekAsgnScore = 0; // Chưa làm
          }
        }

        // 3. Chỉ số tổng hợp (Composite Health Index: 0 - 100)
        let composite = null;
        if (weekAttScore !== null && weekAsgnScore !== null) {
          composite = Math.round(weekAttScore * 0.5 + weekAsgnScore * 0.5);
        } else if (weekAttScore !== null) {
          composite = weekAttScore;
        } else if (weekAsgnScore !== null) {
          composite = weekAsgnScore;
        }

        weeklyData.push({
          weekNum: week.weekNum,
          composite,
          weekAttScore,
          weekAsgnScore,
          presentCount,
          absentCount,
          lateCount,
          asgnSubmitted,
          asgnTotal
        });
      });

      // Đánh giá mức độ cảnh báo (Early Warning System)
      let alertLevel = 'NORMAL'; // 'CRITICAL' | 'WARNING' | 'EXCELLENT' | 'NORMAL'
      const alertReasons = [];

      // Điều kiện Cảnh báo Đỏ (Critical)
      if (maxConsecutiveAbsents >= 2) {
        alertLevel = 'CRITICAL';
        alertReasons.push(lang === 'en' ? `Absent for ${maxConsecutiveAbsents} consecutive sessions` : `Vắng liên tiếp ${maxConsecutiveAbsents} buổi học`);
      }
      if (missingAssignmentsCount >= 2) {
        alertLevel = 'CRITICAL';
        alertReasons.push(lang === 'en' ? `Incomplete ${missingAssignmentsCount} assignments` : `Chưa hoàn thành ${missingAssignmentsCount} bài tập`);
      }

      // Điều kiện Cảnh báo Vàng (Warning)
      if (alertLevel !== 'CRITICAL') {
        if (totalAbsents >= 1) {
          alertLevel = 'WARNING';
          alertReasons.push(lang === 'en' ? `${totalAbsents} absent session(s) needing makeup` : `Có ${totalAbsents} buổi vắng cần bù bài`);
        }
        if (missingAssignmentsCount === 1) {
          alertLevel = 'WARNING';
          alertReasons.push(lang === 'en' ? `Missing 1 assignment` : `Còn thiếu 1 bài tập chưa nộp`);
        }
        if (recentScores.length >= 2) {
          const lastScore = recentScores[recentScores.length - 1];
          const prevScore = recentScores[recentScores.length - 2];
          if (lastScore < 5.0 || lastScore - prevScore <= -2.5) {
            alertLevel = 'WARNING';
            alertReasons.push(lang === 'en' ? `Assignment scores show drop (${lastScore}/10)` : `Điểm bài tập có dấu hiệu giảm sút (${lastScore}/10)`);
          }
        }
      }

      // Điều kiện Tuyên dương (Excellent)
      if (alertLevel === 'NORMAL' && (totalPresents > 0 || recentScores.length > 0)) {
        const avgScore =
          recentScores.length > 0
            ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
            : null;
        if (totalAbsents === 0 && missingAssignmentsCount === 0 && (avgScore === null || avgScore >= 8.0)) {
          alertLevel = 'EXCELLENT';
          alertReasons.push(lang === 'en' ? `Great attendance & excellent assignment score (${avgScore ? avgScore.toFixed(1) : '10'}/10)` : `Chuyên cần tốt & Điểm bài tập xuất sắc (${avgScore ? avgScore.toFixed(1) : '10'}/10)`);
        }
      }

      return {
        ...st,
        weeklyData,
        alertLevel,
        alertReasons,
        totalAbsents,
        totalPresents,
        missingAssignmentsCount,
        maxConsecutiveAbsents
      };
    });
  }, [students, weeks, attendances, submissions, lang]);

  // Phân loại học sinh theo mức độ cảnh báo
  const criticalStudents = studentWeeklyAnalytics.filter(s => s.alertLevel === 'CRITICAL');
  const warningStudents = studentWeeklyAnalytics.filter(s => s.alertLevel === 'WARNING');
  const excellentStudents = studentWeeklyAnalytics.filter(s => s.alertLevel === 'EXCELLENT');

  // Lọc học sinh theo Tab & Tùy chọn học sinh cần quan tâm
  const displayStudents = useMemo(() => {
    let list = studentWeeklyAnalytics;
    if (activeFilterTab === 'CRITICAL') list = criticalStudents;
    else if (activeFilterTab === 'WARNING') list = warningStudents;
    else if (activeFilterTab === 'EXCELLENT') list = excellentStudents;

    if (onlyAtRisk) {
      list = list.filter(s => s.alertLevel === 'CRITICAL' || s.alertLevel === 'WARNING');
    }
    return list;
  }, [studentWeeklyAnalytics, activeFilterTab, criticalStudents, warningStudents, excellentStudents, onlyAtRisk]);

  // Tạo màu Heatmap theo chỉ số phần trăm
  const getHeatmapColor = (score) => {
    if (score === null || score === undefined) return 'bg-slate-100 text-slate-400 border-slate-200';
    if (score >= 85) return 'bg-emerald-500 text-white font-bold shadow-2xs';
    if (score >= 70) return 'bg-emerald-300 text-emerald-950 font-semibold';
    if (score >= 50) return 'bg-amber-300 text-amber-950 font-medium';
    return 'bg-rose-500 text-white font-bold animate-pulse-short';
  };

  // Sao chép tin nhắn nhắc nhở tự động gửi cho học sinh / phụ huynh
  const handleCopyReminderMessage = (student) => {
    const className = classInfo?.name || (lang === 'en' ? 'TeachTool Class' : 'Lớp học TeachTool');
    const studentName = student.fullName || student.studentName || (lang === 'en' ? 'student' : 'em');
    const reasonsText = student.alertReasons.join(lang === 'en' ? ' and ' : ' và ');
    const msg = lang === 'en'
      ? `Dear ${studentName}, this is your instructor from ${className}: We noticed that recently ${reasonsText.toLowerCase()}. Are you experiencing any difficulties or busy schedule? Please reach back to us soon so we can assist you! Wishing you all the best in your studies!`
      : `Chào em ${studentName}, thầy/cô phụ trách ${className} nhắn em: Thầy/cô ghi nhận gần đây em ${reasonsText.toLowerCase()}. Em có đang gặp khó khăn hay bận việc gì không? Hãy nhắn lại thầy/cô sớm để được hỗ trợ nhé! Chúc em luôn học tốt!`;

    navigator.clipboard.writeText(msg);
    toast.success(lang === 'en' ? `Copied reminder message for student "${studentName}"!` : `Đã sao chép tin nhắn nhắc nhở dành riêng cho học sinh "${studentName}"! Thầy/cô có thể dán gửi Zalo ngay.`);
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">{lang === 'en' ? 'Calculating learning analytics heatmap matrix...' : 'Đang tính toán ma trận Heatmap phân tích học tập...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in select-none w-full">
      {/* HEADER BẢNG PHÂN TÍCH */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            {lang === 'en' ? 'Learning Trend Analytics & Early Warning' : 'Phân Tích Xu Hướng Học Tập & Cảnh Báo Sớm'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Nút chọn phạm vi 2 tuần / tất cả */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setScopeMode('2_WEEKS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                scopeMode === '2_WEEKS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'en' ? 'Past 2 weeks (14 days)' : '2 tuần gần nhất (14 ngày)'}
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                scopeMode === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'en' ? `All weeks (${allWeeks.length})` : `Tất cả các tuần (${allWeeks.length})`}
            </button>
          </div>

          {/* Tùy chọn lọc chỉ học sinh cần quan tâm */}
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={onlyAtRisk}
              onChange={(e) => setOnlyAtRisk(e.target.checked)}
              className="rounded-xs border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{lang === 'en' ? 'Only show students needing attention' : 'Chỉ hiện học sinh cần quan tâm'}</span>
          </label>

          <button
            type="button"
            onClick={loadAnalyticsData}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={lang === 'en' ? 'Reload data' : 'Tải lại dữ liệu'}
          >
            ↻
          </button>
        </div>
      </div>

      {/* 4 THẺ CẢNH BÁO TỔNG QUAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveFilterTab('CRITICAL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeFilterTab === 'CRITICAL'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 ring-2 ring-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">{lang === 'en' ? 'Red Alert (At Risk)' : 'Cảnh báo Đỏ (Nguy cơ)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {criticalStudents.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{lang === 'en' ? 'students' : 'học sinh'}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveFilterTab('WARNING')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeFilterTab === 'WARNING'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 ring-2 ring-amber-400'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{lang === 'en' ? 'Need Attention' : 'Cần chú ý & Động viên'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {warningStudents.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{lang === 'en' ? 'students' : 'học sinh'}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveFilterTab('EXCELLENT')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeFilterTab === 'EXCELLENT'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-400'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{lang === 'en' ? 'Exemplary & Active' : 'Tiêu biểu & Tích cực'}</span>
            <StarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {excellentStudents.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{lang === 'en' ? 'students' : 'học sinh'}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveFilterTab('ALL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeFilterTab === 'ALL'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 ring-2 ring-blue-400'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
          }`}
        >
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">{lang === 'en' ? 'All Students' : 'Toàn bộ danh sách'}</span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {studentWeeklyAnalytics.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{lang === 'en' ? 'students' : 'học sinh'}</span>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÁC THẺ CẢNH BÁO CẦN CAN THIỆP (ACTIONABLE ALERT CARDS) */}
      {(criticalStudents.length > 0 || warningStudents.length > 0) && activeFilterTab !== 'EXCELLENT' && (
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 inline" />
              <span>{lang === 'en' ? 'Early Warning List Requiring Instructor Support' : 'Danh Sách Cảnh Báo Sớm Cần Giáo Viên Hỗ Trợ'}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...criticalStudents, ...warningStudents].map(st => (
              <div
                key={st.studentId || st.id}
                className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 shadow-2xs ${
                  st.alertLevel === 'CRITICAL' ? 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-100 dark:ring-rose-950' : 'border-amber-300 dark:border-amber-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate" title={st.fullName}>
                      {st.fullName}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      st.alertLevel === 'CRITICAL' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                    }`}>
                      {st.alertLevel === 'CRITICAL' ? (lang === 'en' ? 'Critical' : 'Báo động') : (lang === 'en' ? 'Warning' : 'Lưu ý')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{st.email}</div>

                  <div className="mt-2 space-y-1">
                    {st.alertReasons.map((reason, rIdx) => (
                      <div key={rIdx} className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/50 px-2 py-1 rounded border border-rose-200/60 dark:border-rose-900/50 font-medium">
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyReminderMessage(st)}
                  className="w-full mt-1 px-3 py-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>{lang === 'en' ? 'Copy reminder message' : 'Sao chép tin nhắn gửi học sinh'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BẢNG BIỂU ĐỒ NHIỆT (HEATMAP TABLE) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
            {lang === 'en' ? 'Weekly Active Engagement Heatmap Index' : 'Biểu đồ mức độ tích cực qua từng tuần (Heatmap Index)'}
          </div>

          {/* Chú thích màu sắc */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Level:' : 'Mức độ:'}</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-slate-300">85-100% ({lang === 'en' ? 'Very Good' : 'Rất tốt'})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-300"></span>
              <span className="text-slate-600 dark:text-slate-300">70-84% ({lang === 'en' ? 'Good' : 'Tốt'})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-amber-300"></span>
              <span className="text-slate-600 dark:text-slate-300">50-69% ({lang === 'en' ? 'Need Attention' : 'Cần chú ý'})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-rose-500"></span>
              <span className="text-slate-600 dark:text-slate-300">&lt;50% ({lang === 'en' ? 'High Risk' : 'Nguy cơ cao'})</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
              <tr>
                <th className="py-3 px-3 w-10 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 sticky left-0 z-20">
                  {lang === 'en' ? 'No.' : 'STT'}
                </th>
                <th className="py-3 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 sticky left-10 z-20 shadow-xs">
                  {lang === 'en' ? 'Student' : 'Học sinh'}
                </th>
                <th className="py-3 px-3 w-28 text-center border-r border-slate-200 dark:border-slate-800">
                  {lang === 'en' ? 'Status' : 'Tình trạng'}
                </th>

                {/* CÁC CỘT TUẦN HỌC */}
                {weeks.map(w => (
                  <th key={w.weekNum} className="py-2.5 px-3 min-w-[90px] text-center border-r border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{w.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {w.sessions.length} {lang === 'en' ? 'sess' : 'buổi'} • {w.assignments.length} {lang === 'en' ? 'asgn' : 'bài'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan={3 + weeks.length} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    {lang === 'en' ? 'No students found in this category.' : 'Không có học sinh nào trong nhóm phân loại này.'}
                  </td>
                </tr>
              ) : (
                displayStudents.map((st, idx) => (
                  <tr key={st.studentId || st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition group">
                    <td className="py-3 px-3 text-center text-slate-400 dark:text-slate-500 font-mono border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50 sticky left-0 z-10">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50 sticky left-10 z-10 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                          st.alertLevel === 'CRITICAL' ? 'bg-rose-600' : st.alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-blue-600'
                        }`}>
                          {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={st.fullName}>
                            {st.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={st.email}>
                            {st.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Huy hiệu tình trạng */}
                    <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                      {st.alertLevel === 'CRITICAL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {lang === 'en' ? 'At Risk' : 'Nguy cơ'}
                        </span>
                      )}
                      {st.alertLevel === 'WARNING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {lang === 'en' ? 'Warning' : 'Cần chú ý'}
                        </span>
                      )}
                      {st.alertLevel === 'EXCELLENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          <StarIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          {lang === 'en' ? 'Excellent' : 'Xuất sắc'}
                        </span>
                      )}
                      {st.alertLevel === 'NORMAL' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {lang === 'en' ? 'Stable' : 'Ổn định'}
                        </span>
                      )}
                    </td>

                    {/* CÁC Ô HEATMAP CHO TỪNG TUẦN */}
                    {st.weeklyData.map(wData => (
                      <td
                        key={wData.weekNum}
                        onClick={() => setSelectedCellInfo({ student: st, weekData: wData })}
                        className="py-2 px-2 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer"
                      >
                        <div className={`w-12 h-9 mx-auto rounded-lg flex flex-col items-center justify-center transition-transform hover:scale-110 border border-black/5 dark:border-white/10 ${getHeatmapColor(wData.composite)}`}>
                          <span className="text-xs">
                            {wData.composite !== null ? `${wData.composite}%` : '-'}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT TUẦN HỌC ĐƯỢC CHỌN */}
      {selectedCellInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">{lang === 'en' ? `Week ${selectedCellInfo.weekData.weekNum} Details` : `Chi Tiết Tuần ${selectedCellInfo.weekData.weekNum}`}</h3>
                <span className="text-xs text-slate-400">{selectedCellInfo.student?.fullName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellInfo(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{lang === 'en' ? 'Weekly Engagement Index:' : 'Chỉ số tích cực tuần:'}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs ${getHeatmapColor(selectedCellInfo.weekData.composite)}`}>
                  {selectedCellInfo.weekData.composite !== null ? `${selectedCellInfo.weekData.composite}%` : (lang === 'en' ? 'No data' : 'Chưa có dữ liệu')}
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1">
                <span className="font-bold text-blue-950 dark:text-blue-200 block">{lang === 'en' ? 'Attendance this week:' : 'Chuyên cần tuần này:'}</span>
                <div className="text-slate-700 dark:text-slate-300">
                  • {lang === 'en' ? 'Present:' : 'Có mặt:'} <b>{selectedCellInfo.weekData.presentCount}</b> {lang === 'en' ? 'sessions' : 'buổi'}
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  • {lang === 'en' ? 'Absent:' : 'Vắng:'} <b className={selectedCellInfo.weekData.absentCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>{selectedCellInfo.weekData.absentCount}</b> {lang === 'en' ? 'sessions' : 'buổi'}
                </div>
                {selectedCellInfo.weekData.lateCount > 0 && (
                  <div className="text-amber-700 dark:text-amber-400">
                    • {lang === 'en' ? 'Late:' : 'Đến trễ:'} <b>{selectedCellInfo.weekData.lateCount}</b> {lang === 'en' ? 'sessions' : 'buổi'}
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1">
                <span className="font-bold text-emerald-950 dark:text-emerald-200 block">{lang === 'en' ? 'Assignments this week:' : 'Bài tập tuần này:'}</span>
                <div className="text-slate-700 dark:text-slate-300">
                  • {lang === 'en' ? 'Submitted:' : 'Đã nộp:'} <b>{selectedCellInfo.weekData.asgnSubmitted} / {selectedCellInfo.weekData.asgnTotal}</b> {lang === 'en' ? 'tasks' : 'bài'}
                </div>
                {selectedCellInfo.weekData.weekAsgnScore !== null && (
                  <div className="text-slate-700 dark:text-slate-300">
                    • {lang === 'en' ? 'Converted score:' : 'Điểm quy đổi:'} <b>{selectedCellInfo.weekData.weekAsgnScore}%</b>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCellInfo(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                {t('close') || (lang === 'en' ? 'Close' : 'Đóng')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
