// File: src/pages/ClassDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { classApi } from '../api/classApi';
import StudentList from '../Components/StudentList';
import SessionList from '../Components/SessionList';
import AttendanceManager from '../Components/AttendanceManager';
import AssignmentManager from '../Components/AssignmentManager';
import AllStudentsList from '../Components/AllStudentsList';
import UserGuide from '../Components/UserGuide';
import TimetableGrid from '../Components/TimetableGrid';
import ClassList from './ClassList';
import AccountSettingsModal from '../Components/AccountSettingsModal';
import TeacherManager from '../Components/TeacherManager';
import { useAuth } from '../context/AuthContext';

export default function ClassDashboard({ initialView }) {
  const { id } = useParams(); // Lấy ID lớp nếu có trong URL (/class/:id)
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // State quản lý view hiện tại:
  // 'classes' (Trang chủ danh sách lớp)
  // 'all_students' (Danh sách học sinh tất cả các lớp)
  // 'timetable' (Thời khóa biểu tất cả các lớp)
  // 'class_detail' (Đang trong 1 lớp cụ thể)
  // 'guide' (Hướng dẫn sử dụng)
  const determineView = () => {
    if (location.pathname === '/students') return 'all_students';
    if (location.pathname === '/timetable') return 'timetable';
    if (location.pathname === '/guide') return 'guide';
    if (id) return 'class_detail';
    if (initialView) return initialView;
    return 'classes';
  };

  const [currentView, setCurrentView] = useState(determineView());
  const [selectedClassId, setSelectedClassId] = useState(id || null);
  const [classInfo, setClassInfo] = useState(null);
  const [loadingClass, setLoadingClass] = useState(false);

  // Tab con khi đang trong 1 lớp: 'sessions' | 'timetable' | 'assignments' | 'students' | 'attendance'
  const [activeClassTab, setActiveClassTab] = useState('sessions');
  const [targetSessionId, setTargetSessionId] = useState(null);

  // Timetable data
  const [timetableSessions, setTimetableSessions] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Danh sách tất cả các lớp của giáo viên để chuyển nhanh
  const [classList, setClassList] = useState([]);
  const [isClassesSubmenuOpen, setIsClassesSubmenuOpen] = useState(true);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal Sửa thông tin lớp
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', startDate: '', endDate: '' });

  const fetchClassList = useCallback(async () => {
    try {
      const data = await classApi.getAll();
      setClassList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp:', err);
    }
  }, []);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  const fetchTimetable = useCallback(async (classId = null) => {
    try {
      setLoadingTimetable(true);
      const data = await classApi.getTimetable(classId);
      setTimetableSessions(data || []);
    } catch (error) {
      console.error('Lỗi khi tải thời khóa biểu:', error);
    } finally {
      setLoadingTimetable(false);
    }
  }, []);

  const fetchClassDetails = useCallback(async (classId) => {
    try {
      setLoadingClass(true);
      const data = await classApi.getById(classId);
      setClassInfo(data);
      setEditFormData({
        name: data.name || '',
        startDate: data.startDate || '',
        endDate: data.endDate || ''
      });
    } catch (error) {
      console.error('Lỗi khi tải thông tin lớp:', error);
    } finally {
      setLoadingClass(false);
    }
  }, []);

  // Đồng bộ view khi URL thay đổi
  useEffect(() => {
    if (id) {
      setSelectedClassId(id);
      setCurrentView('class_detail');
      fetchClassDetails(id);
    } else if (location.pathname === '/students') {
      setCurrentView('all_students');
    } else if (location.pathname === '/timetable') {
      setCurrentView('timetable');
      fetchTimetable(null);
    } else if (location.pathname === '/guide') {
      setCurrentView('guide');
    } else {
      setCurrentView('classes');
    }
  }, [id, location.pathname, fetchClassDetails, fetchTimetable]);

  // Load timetable when activeClassTab becomes timetable
  useEffect(() => {
    if (currentView === 'class_detail' && activeClassTab === 'timetable' && selectedClassId) {
      fetchTimetable(selectedClassId);
    }
  }, [currentView, activeClassTab, selectedClassId, fetchTimetable]);

  const handleEditClassSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;
    try {
      const updated = await classApi.update(selectedClassId, editFormData);
      setClassInfo(updated);
      setIsEditModalOpen(false);
    } catch (error) {
      alert('Lỗi cập nhật lớp học: ' + (error.response?.data?.message || error.message));
    }
  };

  // Chọn vào 1 lớp học
  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
    setCurrentView('class_detail');
    setActiveClassTab('sessions');
    setIsMobileMenuOpen(false);
    navigate(`/class/${classId}`);
  };

  // Chuyển sang lớp trước đó trong danh sách
  const handlePrevClass = () => {
    if (!classList || classList.length === 0 || !selectedClassId) return;
    const currentIndex = classList.findIndex(c => String(c.id) === String(selectedClassId));
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + classList.length) % classList.length;
    handleSelectClass(classList[prevIndex].id);
  };

  // Chuyển sang lớp tiếp theo trong danh sách
  const handleNextClass = () => {
    if (!classList || classList.length === 0 || !selectedClassId) return;
    const currentIndex = classList.findIndex(c => String(c.id) === String(selectedClassId));
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % classList.length;
    handleSelectClass(classList[nextIndex].id);
  };

  // Điều hướng menu chính
  const handleNavigateView = (viewName) => {
    setCurrentView(viewName);
    setIsMobileMenuOpen(false);
    if (viewName === 'classes') navigate('/');
    else if (viewName === 'all_students') navigate('/students');
    else if (viewName === 'timetable') {
      navigate('/timetable');
      fetchTimetable(null);
    }
    else if (viewName === 'guide') navigate('/guide');
  };

  // Chuyển sang tab điểm danh của buổi học cụ thể
  const handleSelectSessionForAttendance = (sessionId) => {
    setTargetSessionId(sessionId);
    setActiveClassTab('attendance');
    setIsMobileMenuOpen(false);
  };

  // Lấy tiêu đề hiển thị trên thanh Header Mobile
  const getMobileHeaderTitle = () => {
    if (currentView === 'all_students') return 'Học Sinh (Tất Cả Các Lớp)';
    if (currentView === 'timetable') return 'Thời Khóa Biểu';
    if (currentView === 'guide') return 'Hướng Dẫn Sử Dụng';
    if (currentView === 'classes') return 'Danh Sách Lớp Học';
    if (currentView === 'class_detail') return classInfo ? `${classInfo.name}` : `Lớp #${selectedClassId}`;
    return 'TeachTool';
  };

  // Render nội dung chính ở vùng trung tâm
  const renderMainContent = () => {
    if (currentView === 'all_students') {
      return <AllStudentsList onSelectClass={handleSelectClass} />;
    }

    if (currentView === 'guide') {
      return <UserGuide />;
    }

    if (currentView === 'timetable') {
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Thời Khóa Biểu Tất Cả Các Lớp</h2>
              <p className="text-xs text-slate-500">
                Tổng hợp lịch dạy của mọi lớp học theo khung giờ 07:00 - 22:00
              </p>
            </div>
            <button
              onClick={() => fetchTimetable(null)}
              className="self-start sm:self-auto text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer"
            >
              Làm mới
            </button>
          </div>

          {loadingTimetable ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Đang tải thời khóa biểu...
            </div>
          ) : (
            <TimetableGrid
              sessions={timetableSessions}
              isStudent={false}
            />
          )}
        </div>
      );
    }

    if (currentView === 'classes') {
      return <ClassList showTopBar={false} onSelectClass={handleSelectClass} />;
    }

    if (currentView === 'class_detail' && selectedClassId) {
      switch (activeClassTab) {
        case 'sessions':
          return (
            <SessionList
              classId={selectedClassId}
              classInfo={classInfo}
              onSelectSessionForAttendance={handleSelectSessionForAttendance}
            />
          );
        case 'timetable':
          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Thời Khóa Biểu Lớp {classInfo?.name}</h2>
                  <p className="text-xs text-slate-500">
                    Lịch học dạng bảng từ Thứ 2 đến Chủ nhật (07:00 - 22:00)
                  </p>
                </div>
                <button
                  onClick={() => fetchTimetable(selectedClassId)}
                  className="self-start sm:self-auto text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer"
                >
                  Làm mới
                </button>
              </div>

              {loadingTimetable ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Đang tải thời khóa biểu của lớp...
                </div>
              ) : (
                <TimetableGrid
                  sessions={timetableSessions}
                  isStudent={false}
                />
              )}
            </div>
          );
        case 'assignments':
          return <AssignmentManager classId={selectedClassId} />;
        case 'students':
          return <StudentList classId={selectedClassId} />;
        case 'attendance':
          return (
            <AttendanceManager
              classId={selectedClassId}
              initialSessionId={targetSessionId}
            />
          );
        case 'teachers':
          return (
            <TeacherManager
              classId={selectedClassId}
              classInfo={classInfo}
              onClassUpdated={() => fetchClassDetails(selectedClassId)}
            />
          );
        default:
          return (
            <SessionList
              classId={selectedClassId}
              classInfo={classInfo}
              onSelectSessionForAttendance={handleSelectSessionForAttendance}
            />
          );
      }
    }

    return <ClassList showTopBar={false} onSelectClass={handleSelectClass} />;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* MOBILE TOP BAR (Hiện trên Smartphone / Màn hình nhỏ) */}
      <div className="md:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between shadow-md z-30">
        <div className="flex items-center gap-2.5 truncate mr-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer">
            <span className="text-lg leading-none">☰</span>
          </button>
          <div className="truncate">
            <h2 className="font-bold text-sm truncate">{getMobileHeaderTitle()}</h2>
            {currentView === 'class_detail' && classInfo?.classCode && (
              <span className="text-[10px] font-mono text-blue-400">Mã: {classInfo.classCode}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => handleNavigateView('classes')}
          className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 whitespace-nowrap cursor-pointer">
          Trang chủ
        </button>
      </div>

      {/* BACKDROP OVERLAY TRÊN MOBILE KHI MỞ SIDEBAR */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-fade-in"
        />
      )}

      {/* SIDEBAR CHÍNH (Đồng nhất từ Trang chủ đến Lớp học chi tiết) */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-800 text-white flex flex-col shadow-2xl md:shadow-lg transform transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        {/* HEADER CỦA SIDEBAR */}
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
          <div
            onClick={() => handleNavigateView('classes')}
            className="cursor-pointer group">
            <div className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition">
              TeachTool
            </div>
            <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
              Dành cho Giáo Viên
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white text-lg font-bold p-1">
            ✕
          </button>
        </div>

        {/* THÂN SIDEBAR: DANH SÁCH MENU ĐIỀU HƯỚNG */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* ================= KHỐI 1: MENU NGOÀI CÙNG (HỌC SINH TẤT CẢ CÁC LỚP, DANH SÁCH LỚP HỌC, THỜI KHÓA BIỂU TỔNG) ================= */}
          <div className="px-3 space-y-1">
            {/* 1.1: DANH SÁCH HỌC SINH (CỦA TẤT CẢ CÁC LỚP) - NẰM TRÊN MỤC DANH SÁCH LỚP HỌC */}
            <button
              onClick={() => handleNavigateView('all_students')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                currentView === 'all_students'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-700/80'
              }`}>
              <span>Học sinh (Tất cả các lớp)</span>
            </button>

            {/* 1.2: DANH SÁCH LỚP HỌC (TRANG CHỦ) */}
            <div className="space-y-1">
              <div className="flex items-center">
                <button
                  onClick={() => handleNavigateView('classes')}
                  className={`flex-1 text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                    currentView === 'classes'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700/80'
                  }`}>
                  <span>Danh sách lớp học</span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                    {classList.length > 0 ? `${classList.length} lớp` : 'Trang chủ'}
                  </span>
                </button>
                {classList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClassesSubmenuOpen(!isClassesSubmenuOpen)}
                    className="p-2 text-slate-400 hover:text-white cursor-pointer"
                    title={isClassesSubmenuOpen ? 'Thu gọn danh sách lớp' : 'Mở rộng danh sách lớp'}>
                    <span className="text-xs">{isClassesSubmenuOpen ? '▲' : '▼'}</span>
                  </button>
                )}
              </div>

              {/* Danh sách các lớp học con để click chuyển nhanh */}
              {isClassesSubmenuOpen && classList.length > 0 && (
                <div className="pl-3 pr-1 space-y-0.5 border-l-2 border-slate-700 ml-4 py-1">
                  {classList.map(cls => {
                    const isSelected = currentView === 'class_detail' && String(selectedClassId) === String(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleSelectClass(cls.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center justify-between truncate ${
                          isSelected
                            ? 'bg-blue-600/40 text-blue-200 font-bold border border-blue-400/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        }`}
                        title={cls.name}>
                        <span className="truncate">{cls.name}</span>
                        {cls.classCode && (
                          <span className="text-[10px] font-mono opacity-70 ml-1">
                            {cls.classCode}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 1.3: THỜI KHÓA BIỂU (TẤT CẢ CÁC LỚP) */}
            <button
              onClick={() => handleNavigateView('timetable')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                currentView === 'timetable'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-700/80'
              }`}>
              <span>Thời khóa biểu</span>
            </button>
          </div>

          {/* ================= KHỐI 2: MENU LỚP ĐANG CHỌN (NẾU ĐANG TRONG 1 LỚP CỤ THỂ) ================= */}
          {currentView === 'class_detail' && selectedClassId && (
            <div className="pt-2 border-t border-slate-700/60 animate-fade-in">
              {/* Card thông tin lớp học */}
              <div className="mx-3 p-3.5 bg-slate-900/90 rounded-xl border border-slate-700 mb-3 space-y-2">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="truncate flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        Đang quản lý lớp:
                      </span>
                      {classList.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handlePrevClass}
                            title="Chuyển sang lớp trước"
                            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-bold border border-slate-700 cursor-pointer">
                            &lt;
                          </button>
                          <button
                            type="button"
                            onClick={handleNextClass}
                            title="Chuyển sang lớp tiếp theo"
                            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-bold border border-slate-700 cursor-pointer">
                            &gt;
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-white truncate" title={classInfo?.name}>
                      {classInfo ? classInfo.name : `Lớp #${selectedClassId}`}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {classInfo?.startDate ? `${classInfo.startDate} → ${classInfo.endDate || '...'}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    title="Chỉnh sửa thông tin lớp"
                    className="p-1 px-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition cursor-pointer text-xs border border-slate-700 self-start">
                    Sửa
                  </button>
                </div>

                {classInfo?.classCode && (
                  <div className="pt-1 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30 truncate">
                      MÃ: {classInfo.classCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(classInfo.classCode);
                        alert(`Đã sao chép mã lớp "${classInfo.classCode}" để gửi cho học sinh!`);
                      }}
                      title="Sao chép mã lớp"
                      className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded cursor-pointer transition whitespace-nowrap">
                      Copy
                    </button>
                  </div>
                )}
              </div>

              {/* Các Tab chức năng của Lớp */}
              <div className="px-3 space-y-3">
                {/* Nhóm 1: Lịch học & Bài tập */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                    1. Lịch học & Bài tập
                  </h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveClassTab('sessions');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                        activeClassTab === 'sessions'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      <span>Buổi học & Kế hoạch</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveClassTab('timetable');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeClassTab === 'timetable'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      Thời khóa biểu
                    </button>

                    <button
                      onClick={() => {
                        setActiveClassTab('assignments');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeClassTab === 'assignments'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      Giao bài tập & Chấm điểm
                    </button>
                  </div>
                </div>

                {/* Nhóm 2: Học sinh & Chuyên cần của Lớp */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                    2. Học sinh & Chuyên cần
                  </h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveClassTab('students');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeClassTab === 'students'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      Học sinh trong lớp này
                    </button>

                    <button
                      onClick={() => {
                        setActiveClassTab('attendance');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeClassTab === 'attendance'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      Điểm danh & Chuyên cần
                    </button>
                  </div>
                </div>

                {/* Nhóm 3: Đội ngũ Giáo viên */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                    3. Đội ngũ Giáo viên
                  </h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveClassTab('teachers');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                        activeClassTab === 'teachers'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/80'
                      }`}>
                      <span>Giáo viên phụ trách</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded font-mono">
                        Đồng dạy
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= KHỐI 3: HƯỚNG DẪN SỬ DỤNG (PHÍA DƯỚI) ================= */}
          <div className="pt-3 border-t border-slate-700/60 px-3">
            <button
              onClick={() => handleNavigateView('guide')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                currentView === 'guide'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-700/80'
              }`}>
              <span>Hướng dẫn sử dụng</span>
            </button>
          </div>
        </div>

        {/* FOOTER CỦA SIDEBAR: THÔNG TIN GIÁO VIÊN & CÀI ĐẶT / ĐĂNG XUẤT */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-700/80 space-y-2">
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{user?.fullName || 'Giáo viên'}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex-1 px-2 py-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer transition text-center">
              Cài đặt
            </button>
            <button
              onClick={logout}
              className="flex-1 px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer transition text-center">
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHÍNH (CARD TRẮNG TRÊN NỀN XÁM NHẸ) */}
      <div className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto w-full">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 sm:p-6 md:p-7 min-h-full">
          {renderMainContent()}
        </div>
      </div>

      {/* MODAL SỬA THÔNG TIN LỚP HỌC */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Cập nhật Lớp học</h3>
            <form onSubmit={handleEditClassSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên lớp học <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input 
                    type="date" 
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày kết thúc</label>
                  <input 
                    type="date" 
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer shadow-xs">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CÀI ĐẶT TÀI KHOẢN TOÀN DIỆN */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        onUserUpdated={(updated) => {
          if (updateUser) updateUser(updated);
        }}
        onLogout={logout}
      />
    </div>
  );
}
