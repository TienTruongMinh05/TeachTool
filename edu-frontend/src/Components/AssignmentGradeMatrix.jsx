// File: src/Components/AssignmentGradeMatrix.jsx
import { useState, useEffect, useMemo } from 'react';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { studentApi } from '../api/studentApi';
import { useToast } from '../context/ToastContext';
import { PaperclipIcon, XIcon } from './Icons';

export default function AssignmentGradeMatrix({ classId, classInfo, onNavigateToGrading }) {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Phạm vi thời gian: '2_WEEKS' (Mặc định - Chu kỳ lưu trữ 14 ngày) | 'ALL'
  const [scopeMode, setScopeMode] = useState('2_WEEKS');

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'INCOMPLETE' | 'LOW_SCORE' | 'PERFECT'
  const [sortBy, setSortBy] = useState('NAME_ASC'); // 'NAME_ASC' | 'SCORE_DESC' | 'SCORE_ASC' | 'COMPLETION_DESC'

  // Modal xem chi tiết & chấm điểm bài nộp của ô được chọn
  const [selectedCell, setSelectedCell] = useState(null);

  // State cho chấm điểm nhanh trong modal
  const [quickScore, setQuickScore] = useState('');
  const [quickFeedback, setQuickFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    if (selectedCell?.submission) {
      setQuickScore(selectedCell.submission.score || '');
      setQuickFeedback(selectedCell.submission.feedback || '');
    } else {
      setQuickScore('');
      setQuickFeedback('');
    }
  }, [selectedCell]);

  useEffect(() => {
    loadMatrixData();
  }, [classId]);

  const loadMatrixData = async () => {
    try {
      setLoading(true);
      const [studRes, asgnRes] = await Promise.all([
        studentApi.getByClass(classId),
        assignmentApi.getByClass(classId)
      ]);

      const rawStudents = Array.isArray(studRes) ? studRes : [];
      const rawAssignments = Array.isArray(asgnRes) ? asgnRes : [];

      // Chuẩn hóa dữ liệu học sinh từ EnrollmentResponseDTO
      const normalizedStudents = rawStudents.map(st => ({
        ...st,
        id: st.studentId || st.id, // Đảm bảo .id là student user ID để map đúng với submissions
        studentId: st.studentId || st.id,
        enrollmentId: st.id,
        fullName: st.fullName || st.studentName || 'Học sinh',
        email: st.email || st.studentEmail || ''
      }));

      // Lấy danh sách bài nộp: Thử lấy theo lớp trước (1 request nhanh)
      let allSubmissions = [];
      try {
        const classSubs = await submissionApi.getByClass(classId);
        if (Array.isArray(classSubs) && classSubs.length > 0) {
          allSubmissions = classSubs;
        }
      } catch (err) {
        console.warn('getByClass không khả dụng hoặc lỗi 404, sẽ tự động fallback theo từng bài tập:', err);
      }

      // Fallback: Nếu getByClass không trả về bài nộp hoặc backend chưa hỗ trợ (404),
      // tự động gọi getByAssignment cho từng bài tập của lớp để đảm bảo 100% dữ liệu luôn hiển thị
      if (allSubmissions.length === 0 && rawAssignments.length > 0) {
        try {
          const perAsgnSubs = await Promise.all(
            rawAssignments.map(a => submissionApi.getByAssignment(a.id).catch(() => []))
          );
          allSubmissions = perAsgnSubs.flat().filter(Boolean);
        } catch (perAsgnErr) {
          console.error('Lỗi khi fallback tải bài nộp theo bài tập:', perAsgnErr);
        }
      }

      setStudents(normalizedStudents);
      setAssignments(rawAssignments);
      setSubmissions(allSubmissions);
    } catch (err) {
      console.error('Lỗi khi tải ma trận điểm số:', err);
      toast.error('Không thể tải dữ liệu ma trận điểm: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  };

  // Map submissions theo cả key `${studentId}_${assignmentId}` và `${email}_${assignmentId}` để tra cứu O(1) tuyệt đối chính xác
  const submissionMap = useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      const studentId = sub.studentId || sub.student?.id;
      const assignmentId = sub.assignmentId || sub.assignment?.id;
      const email = (sub.studentEmail || sub.student?.email || '').toLowerCase().trim();

      if (studentId && assignmentId) {
        map.set(`${studentId}_${assignmentId}`, sub);
      }
      if (email && assignmentId) {
        map.set(`${email}_${assignmentId}`, sub);
      }
    });
    return map;
  }, [submissions]);

  // Phân định bài tập theo phạm vi 2 tuần (14 ngày gần nhất)
  const activeAssignments = useMemo(() => {
    if (scopeMode === 'ALL') {
      return assignments;
    }
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recent = assignments.filter(asgn => {
      const d = asgn.dueDate
        ? new Date(asgn.dueDate)
        : (asgn.scheduledPublishAt ? new Date(asgn.scheduledPublishAt) : (asgn.createdAt ? new Date(asgn.createdAt) : null));
      if (!d) return true;
      return d >= cutoff;
    });
    return recent.length > 0 ? recent : assignments;
  }, [assignments, scopeMode]);

  // Tính toán số liệu thống kê cho từng học sinh dựa trên các bài tập trong phạm vi được chọn
  const studentStats = useMemo(() => {
    const now = new Date();
    const publishedAssignments = activeAssignments.filter(a => !(a.scheduledPublishAt && new Date(a.scheduledPublishAt) > now));
    const publishedCount = publishedAssignments.length;

    return students.map(student => {
      let submittedCount = 0;
      let gradedCount = 0;
      let totalScore = 0;
      const studentSubmissions = [];

      activeAssignments.forEach(asgn => {
        const studentKey = `${student.studentId || student.id}_${asgn.id}`;
        const emailKey = student.email ? `${student.email.toLowerCase().trim()}_${asgn.id}` : null;
        const sub = submissionMap.get(studentKey) || (emailKey ? submissionMap.get(emailKey) : null);
        if (sub) {
          submittedCount++;
          studentSubmissions.push(sub);
          const numScore = parseFloat(sub.score);
          if (!isNaN(numScore)) {
            gradedCount++;
            totalScore += numScore;
          }
        }
      });

      const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : null;
      const completionRate = publishedCount > 0 ? Math.round((submittedCount / publishedCount) * 100) : (activeAssignments.length === 0 ? 0 : 100);

      return {
        ...student,
        submittedCount,
        gradedCount,
        avgScore: avgScore !== null ? parseFloat(avgScore) : null,
        completionRate
      };
    });
  }, [students, activeAssignments, submissionMap]);

  // Lọc và sắp xếp danh sách học sinh
  const filteredStudents = useMemo(() => {
    let result = studentStats.filter(st => {
      const name = (st.fullName || st.studentName || '').toLowerCase();
      const mail = (st.email || st.studentEmail || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchSearch = name.includes(search) || mail.includes(search);
      if (!matchSearch) return false;

      if (filterStatus === 'INCOMPLETE') {
        return st.completionRate < 100;
      }
      if (filterStatus === 'LOW_SCORE') {
        return st.avgScore !== null && st.avgScore < 5.0;
      }
      if (filterStatus === 'PERFECT') {
        return st.completionRate === 100 && st.avgScore !== null && st.avgScore >= 8.0;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'NAME_ASC') {
        return (a.fullName || '').localeCompare(b.fullName || '', 'vi');
      }
      if (sortBy === 'SCORE_DESC') {
        return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      }
      if (sortBy === 'SCORE_ASC') {
        return (a.avgScore ?? 999) - (b.avgScore ?? 999);
      }
      if (sortBy === 'COMPLETION_DESC') {
        return b.completionRate - a.completionRate;
      }
      return 0;
    });

    return result;
  }, [studentStats, searchTerm, filterStatus, sortBy]);

  // Thống kê tổng quan cả lớp
  const classSummary = useMemo(() => {
    if (studentStats.length === 0) return { avg: null, completion: 0, totalStudents: 0, totalAssignments: 0 };
    const scores = studentStats.map(s => s.avgScore).filter(s => s !== null);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    const totalComp = studentStats.reduce((sum, s) => sum + s.completionRate, 0);
    const completion = Math.round(totalComp / studentStats.length);

    return {
      avg,
      completion,
      totalStudents: studentStats.length,
      totalAssignments: activeAssignments.length
    };
  }, [studentStats, activeAssignments]);

  // Xuất file CSV (Tương thích tốt với Excel tiếng Việt nhờ UTF-8 BOM)
  const handleExportCSV = () => {
    if (students.length === 0 || activeAssignments.length === 0) {
      toast.warning('Chưa có đủ dữ liệu học sinh hoặc bài tập để xuất bảng điểm.');
      return;
    }

    const scopeTitle = scopeMode === '2_WEEKS' ? '2 tuần gần nhất (Chu kỳ 14 ngày)' : 'Tất cả bài tập';
    const headers = [
      'STT',
      'Họ và tên',
      'Email',
      ...activeAssignments.map(a => `"${a.title.replace(/"/g, '""')}"`),
      'Số bài đã nộp',
      'Tỷ lệ hoàn thành (%)',
      'Điểm trung bình'
    ];

    const rows = filteredStudents.map((st, idx) => {
      const assignmentScores = activeAssignments.map(a => {
        const studentKey = `${st.studentId || st.id}_${a.id}`;
        const emailKey = st.email ? `${st.email.toLowerCase().trim()}_${a.id}` : null;
        const sub = submissionMap.get(studentKey) || (emailKey ? submissionMap.get(emailKey) : null);
        if (!sub) return '"Chưa nộp"';
        if (sub.score !== null && sub.score !== undefined && sub.score !== '') return `"${sub.score}"`;
        return '"Đã nộp (Chưa chấm)"';
      });

      return [
        idx + 1,
        `"${st.fullName || st.studentName || ''}"`,
        `"${st.email || st.studentEmail || ''}"`,
        ...assignmentScores,
        `"${st.submittedCount}/${activeAssignments.length}"`,
        `"${st.completionRate}%"`,
        st.avgScore !== null ? `"${st.avgScore}"` : '"N/A"'
      ];
    });

    const csvContent = '\uFEFF' + [
      `"BẢNG ĐIỂM BÀI TẬP LỚP: ${classInfo?.name || 'LỚP HỌC'}"`,
      `"Phạm vi: ${scopeTitle} (Quy tắc lưu trữ: Dữ liệu bài nộp học sinh lưu giữ trong 14 ngày)"`,
      `"Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_${(classInfo?.name || 'Lop').replace(/\s+/g, '_')}_${scopeMode === '2_WEEKS' ? '2Tuan' : 'TatCa'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất bảng điểm của ${rows.length} học sinh thành công ra tệp Excel/CSV!`);
  };

  const getScoreBadgeColor = (scoreStr) => {
    const num = parseFloat(scoreStr);
    if (isNaN(num)) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (num >= 8.5) return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    if (num >= 7.0) return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    if (num >= 5.0) return 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
    return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
  };

  const isPastDue = (dueDateStr) => {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">Đang khởi tạo ma trận điểm số bài tập...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in select-none">
      {/* HEADER & THẺ TỔNG QUAN */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            Ma Trận Theo Dõi Điểm Số Bài Tập
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Nút chọn phạm vi 2 tuần / tất cả */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setScopeMode('2_WEEKS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                scopeMode === '2_WEEKS'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2 tuần gần nhất (14 ngày)
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                scopeMode === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({assignments.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 md:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
          >
            <span>Xuất Bảng Điểm (Excel/CSV)</span>
          </button>
          <button
            type="button"
            onClick={loadMatrixData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Tải lại dữ liệu"
          >
            ↻
          </button>
        </div>
      </div>


      {/* 4 THẺ CHỈ SỐ KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Sĩ số lớp</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{classSummary.totalStudents} <span className="text-xs font-normal text-slate-500">học sinh</span></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tổng số bài tập</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{classSummary.totalAssignments} <span className="text-xs font-normal text-slate-500">bài</span></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tỷ lệ hoàn thành bài</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{classSummary.completion}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Điểm trung bình lớp</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {classSummary.avg !== null ? `${classSummary.avg} / 10` : 'Chưa có điểm'}
          </div>
        </div>
      </div>

      {/* BỘ LỌC VÀ TÌM KIẾM */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh, email..."
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc trạng thái */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả học sinh ({studentStats.length})</option>
            <option value="INCOMPLETE">Chưa nộp đủ bài ({studentStats.filter(s => s.completionRate < 100).length})</option>
            <option value="LOW_SCORE">Cần chú ý: Điểm &lt; 5.0 ({studentStats.filter(s => s.avgScore !== null && s.avgScore < 5.0).length})</option>
            <option value="PERFECT">Xuất sắc & Đầy đủ ({studentStats.filter(s => s.completionRate === 100 && s.avgScore >= 8.0).length})</option>
          </select>

          {/* Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="NAME_ASC">Sắp xếp: Tên A → Z</option>
            <option value="SCORE_DESC">Điểm trung bình (Cao → Thấp)</option>
            <option value="SCORE_ASC">Điểm trung bình (Thấp → Cao)</option>
            <option value="COMPLETION_DESC">Tỷ lệ hoàn thành (Cao → Thấp)</option>
          </select>
        </div>
      </div>

      {/* BẢNG MA TRẬN ĐIỂM SỐ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            {/* THEAD */}
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="py-3 px-3 w-12 text-center border-r border-slate-200 bg-slate-50 sticky left-0 z-20">
                  STT
                </th>
                <th className="py-3 px-3 min-w-[200px] border-r border-slate-200 bg-slate-50 sticky left-12 z-20 shadow-xs">
                  Học sinh
                </th>
                <th className="py-3 px-3 w-28 text-center border-r border-slate-200 bg-slate-50">
                  Đã nộp
                </th>
                <th className="py-3 px-3 w-24 text-center border-r border-slate-200 bg-slate-50">
                  ĐTB
                </th>

                {/* CÁC CỘT BÀI TẬP */}
                {activeAssignments.map((asgn, idx) => {
                  const isScheduled = asgn.scheduledPublishAt && new Date(asgn.scheduledPublishAt) > new Date();
                  return (
                    <th 
                      key={asgn.id} 
                      onClick={() => onNavigateToGrading && onNavigateToGrading(asgn.id)}
                      className="py-2.5 px-3 min-w-[140px] max-w-[170px] border-r border-slate-200 text-center cursor-pointer hover:bg-slate-100/90 transition group/th"
                      title={`Bấm để chuyển sang quản lý bài tập "${asgn.title}"`}
                    >
                      <div className="truncate font-bold text-slate-800 group-hover/th:text-blue-600 transition" title={asgn.title}>
                        B{idx + 1}. {asgn.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {isScheduled ? (
                          <span className="text-amber-600 font-semibold">Chờ mở</span>
                        ) : asgn.dueDate ? (
                          new Date(asgn.dueDate).toLocaleDateString('vi-VN')
                        ) : (
                          'Không hạn'
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* TBODY */}
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4 + activeAssignments.length} className="py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr key={st.studentId || st.id} className="hover:bg-slate-50/80 transition group">
                    {/* Cột STT cố định */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono border-r border-slate-100 bg-white group-hover:bg-slate-50/80 sticky left-0 z-10">
                      {idx + 1}
                    </td>

                    {/* Cột Học sinh cố định */}
                    <td className="py-3 px-3 border-r border-slate-100 bg-white group-hover:bg-slate-50/80 sticky left-12 z-10 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 truncate" title={st.fullName}>
                            {st.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate" title={st.email}>
                            {st.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tiến độ nộp */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        st.completionRate === 100
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : st.completionRate >= 50
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {st.submittedCount}/{activeAssignments.length} ({st.completionRate}%)
                      </span>
                    </td>

                    {/* Điểm trung bình */}
                    <td className="py-3 px-3 text-center border-r border-slate-100 font-mono">
                      {st.avgScore !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${getScoreBadgeColor(st.avgScore)}`}>
                          {st.avgScore}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>

                    {/* CÁC Ô ĐIỂM BÀI TẬP */}
                    {activeAssignments.map(asgn => {
                      const studentKey = `${st.studentId || st.id}_${asgn.id}`;
                      const emailKey = st.email ? `${st.email.toLowerCase().trim()}_${asgn.id}` : null;
                      const sub = submissionMap.get(studentKey) || (emailKey ? submissionMap.get(emailKey) : null);
                      const isScheduled = asgn.scheduledPublishAt && new Date(asgn.scheduledPublishAt) > new Date();
                      const overdue = !isScheduled && isPastDue(asgn.dueDate);

                      return (
                        <td
                          key={asgn.id}
                          onClick={() => onNavigateToGrading && onNavigateToGrading(asgn.id)}
                          className="py-2.5 px-2 text-center border-r border-slate-100 cursor-pointer hover:bg-blue-50/70 hover:scale-[1.02] transition"
                          title={`Bấm để chuyển đến phần quản lý bài tập "${asgn.title}"`}
                        >
                          {sub ? (
                            sub.score !== null && sub.score !== undefined && sub.score !== '' ? (
                              <span className={`inline-block px-2 py-1 rounded-md text-xs border ${getScoreBadgeColor(sub.score)} shadow-2xs`}>
                                {sub.score}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Đã nộp
                              </span>
                            )
                          ) : isScheduled ? (
                            <span className="text-slate-400 text-[11px] italic">
                              Chưa mở
                            </span>
                          ) : overdue ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                              Quá hạn
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[11px] hover:text-slate-500">
                              Chưa nộp
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* TFOOT DÒNG TỔNG KẾT ĐIỂM TRUNG BÌNH THEO BÀI TẬP */}
            {activeAssignments.length > 0 && (
              <tfoot className="bg-slate-100/90 font-semibold text-slate-700 border-t-2 border-slate-300 sticky bottom-0 z-20">
                <tr>
                  <td colSpan={2} className="py-3 px-3 text-right pr-4 uppercase text-[11px] tracking-wider text-slate-500 sticky left-0 z-20 bg-slate-100">
                    ĐTB từng bài tập:
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    {classSummary.completion}%
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-indigo-700 font-bold">
                    {classSummary.avg !== null ? classSummary.avg : '-'}
                  </td>

                  {activeAssignments.map(asgn => {
                    const subsForAsgn = submissions.filter(
                      s => (s.assignment?.id || s.assignmentId) === asgn.id
                    );
                    const scoredSubs = subsForAsgn.filter(s => s.score !== null && s.score !== undefined && !isNaN(parseFloat(s.score)));
                    const avgAsgnScore = scoredSubs.length > 0
                      ? (scoredSubs.reduce((acc, cur) => acc + parseFloat(cur.score), 0) / scoredSubs.length).toFixed(1)
                      : null;

                    return (
                      <td key={asgn.id} className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-xs">
                        {avgAsgnScore !== null ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">{avgAsgnScore}</span>
                            <div className="text-[10px] text-slate-400 font-normal">
                              ({subsForAsgn.length}/{students.length})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {subsForAsgn.length > 0 ? `(${subsForAsgn.length} nộp)` : '-'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT Ô ĐIỂM ĐƯỢC CHỌN */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Chi Tiết Bài Nộp & Điểm Số</h3>
                <span className="text-xs text-slate-400">{selectedCell.student?.fullName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Bài tập:</span>
                <div className="font-bold text-slate-800 text-sm">{selectedCell.assignment?.title}</div>
                {selectedCell.assignment?.dueDate && (
                  <div className="text-slate-500 text-[11px]">
                    Hạn nộp: {new Date(selectedCell.assignment.dueDate).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>

              {selectedCell.submission ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <span className="font-semibold text-blue-950">Điểm số hiện tại:</span>
                    <span className={`px-2.5 py-1 rounded-md text-sm font-bold border ${getScoreBadgeColor(selectedCell.submission.score)}`}>
                      {selectedCell.submission.score !== null ? selectedCell.submission.score : 'Chưa chấm điểm'}
                    </span>
                  </div>

                  {selectedCell.submission.submittedAt && (
                    <div className="text-slate-500 text-[11px]">
                      Thời gian nộp: {new Date(selectedCell.submission.submittedAt).toLocaleString('vi-VN')}
                    </div>
                  )}

                  {selectedCell.submission.textContent && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">Nội dung học sinh viết:</span>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedCell.submission.textContent}</p>
                    </div>
                  )}

                  {selectedCell.submission.fileUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-medium text-slate-700 truncate mr-2 flex items-center gap-1.5">
                        <PaperclipIcon className="w-4 h-4 shrink-0 text-slate-500" />
                        <span className="truncate">{selectedCell.submission.fileName || 'Tệp đính kèm'}</span>
                      </span>
                      <a
                        href={selectedCell.submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                      >
                        Mở tệp
                      </a>
                    </div>
                  )}

                  {selectedCell.submission.feedback && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <span className="text-[11px] font-semibold text-emerald-800 block mb-1">Nhận xét của giáo viên:</span>
                      <p className="text-emerald-900">{selectedCell.submission.feedback}</p>
                    </div>
                  )}

                  {/* FORM CHẤM ĐIỂM / CẬP NHẬT ĐIỂM TRỰC TIẾP TẠI MA TRẬN */}
                  <form onSubmit={handleQuickGrade} className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-bold text-amber-900 block">Chấm điểm / Cập nhật điểm:</span>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-600 font-medium text-[11px] whitespace-nowrap">Điểm số:</label>
                      <input
                        type="text"
                        value={quickScore}
                        onChange={(e) => setQuickScore(e.target.value)}
                        placeholder="Ví dụ: 8.5"
                        className="w-24 px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400">/ 10</span>
                    </div>
                    <div>
                      <label className="text-slate-600 font-medium text-[11px] block mb-1">Nhận xét:</label>
                      <textarea
                        rows={2}
                        value={quickFeedback}
                        onChange={(e) => setQuickFeedback(e.target.value)}
                        placeholder="Nhận xét cho học sinh..."
                        className="w-full p-2 text-xs bg-white border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingGrade}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded text-xs transition cursor-pointer shadow-xs"
                      >
                        {savingGrade ? 'Đang lưu...' : 'Lưu Điểm & Cập Nhật'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="font-semibold text-slate-600">Học sinh chưa nộp bài tập này.</p>
                  <p className="text-[11px] mt-1">
                    {isPastDue(selectedCell.assignment?.dueDate)
                      ? 'Bài tập đã quá hạn nộp.'
                      : 'Học sinh vẫn còn thời gian để hoàn thành bài.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-2">
              {onNavigateToGrading && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCell(null);
                    onNavigateToGrading();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                >
                  Chuyển sang trang Chấm bài (Ghi âm) →
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer ml-auto"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
