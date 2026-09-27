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
import ClassMaterialsManager from '../Components/ClassMaterialsManager';
import AssignmentGradeMatrix from '../Components/AssignmentGradeMatrix';
import LearningAnalyticsHeatmap from '../Components/LearningAnalyticsHeatmap';
import StudentInquiriesManager from '../Components/StudentInquiriesManager';
import ClassAnnouncementBoard from '../Components/ClassAnnouncementBoard';
import WeeklyReportModal from '../Components/WeeklyReportModal';
import { reportApi } from '../api/reportApi';
import { ThemeLanguageToggle, useThemeLanguage } from '../context/ThemeLanguageContext';
import { sessionApi } from '../api/sessionApi';
import { attendanceApi } from '../api/attendanceApi';
import { inquiryApi } from '../api/inquiryApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  InfoIcon,
  MenuIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SidebarIcon,
  UsersIcon,
  AcademicCapIcon,
  CalendarIcon,
  ChatIcon,
  MegaphoneIcon,
  ClipboardCheckIcon,
  CogIcon
} from '../Components/Icons';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getOffsetMonthsStr = (baseDateStr, months) => {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HUB_CONFIG = {
  schedule_hub: {
    key: 'hubSchedule',
    defaultTab: 'announcements',
    tabs: [
      { id: 'announcements', labelKey: 'tabAnnouncements' },
      { id: 'sessions', labelKey: 'tabSessions', showBadge: true },
      { id: 'timetable', labelKey: 'tabTimetable' }
    ]
  },
  assessment_hub: {
    key: 'hubAssessment',
    defaultTab: 'assignments',
    tabs: [
      { id: 'assignments', labelKey: 'tabAssignments' },
      { id: 'grade_matrix', labelKey: 'tabGradeMatrix' },
      { id: 'analytics_heatmap', labelKey: 'tabAnalytics' }
    ]
  },
  management_hub: {
    key: 'hubManagement',
    defaultTab: 'students',
    tabs: [
      { id: 'students', labelKey: 'tabStudents' },
      { id: 'attendance', labelKey: 'tabAttendance' },
      { id: 'materials', labelKey: 'tabMaterials' },
      { id: 'teachers', labelKey: 'tabTeachers' }
    ]
  }
};

const getActiveHub = (tab) => {
  if (['announcements', 'sessions', 'timetable'].includes(tab)) return 'schedule_hub';
  if (['assignments', 'grade_matrix', 'analytics_heatmap'].includes(tab)) return 'assessment_hub';
  if (['students', 'attendance', 'materials', 'teachers'].includes(tab)) return 'management_hub';
  return 'schedule_hub';
};

export default function ClassDashboard({ initialView }) {
  const { id } = useParams(); // Lấy ID lớp nếu có trong URL (/class/:id)
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);

  const handleExportWeeklyReport = () => {
    if (!selectedClassId) return;
    setIsWeeklyReportModalOpen(true);
  };
  
  // State quản lý view hiện tại:
  // 'classes' (Trang chủ danh sách lớp)
  // 'all_students' (Danh sách học sinh tất cả các lớp)
  // 'timetable' (Thời khóa biểu tất cả các lớp)
  // 'student_inquiries' (Câu hỏi từ học viên)
  // 'class_detail' (Đang trong 1 lớp cụ thể)
  // 'guide' (Hướng dẫn sử dụng)
  const determineView = () => {
    if (location.pathname === '/students') return 'all_students';
    if (location.pathname === '/timetable') return 'timetable';
    if (location.pathname === '/inquiries') return 'student_inquiries';
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
  const activeHub = getActiveHub(activeClassTab);
  const [targetSessionId, setTargetSessionId] = useState(null);
  const [targetAssignmentId, setTargetAssignmentId] = useState(null);

  // Timetable data
  const [timetableSessions, setTimetableSessions] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Danh sách tất cả các lớp của giáo viên để chuyển nhanh (đọc từ cache để hiện tức thì 0ms)
  const [classList, setClassList] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teacher_classes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isClassesSubmenuOpen, setIsClassesSubmenuOpen] = useState(true);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Desktop sidebar collapsed state (persist in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('teachtool_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('teachtool_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modal Sửa thông tin lớp
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', startDate: '', endDate: '' });

  const fetchClassList = useCallback(async () => {
    try {
      const data = await classApi.getAll();
      const safeData = Array.isArray(data) ? data : [];
      setClassList(safeData);
      try {
        localStorage.setItem('cached_teacher_classes', JSON.stringify(safeData));
      } catch {}
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

  // Đếm số lượng thắc mắc chưa trả lời của học viên
  const [unansweredInquiriesCount, setUnansweredInquiriesCount] = useState(0);

  const fetchUnansweredInquiriesCount = useCallback(async () => {
    try {
      const threads = await inquiryApi.getTeacherThreads();
      if (Array.isArray(threads)) {
        const count = threads.filter((t) => t.status === 'UNANSWERED').length;
        setUnansweredInquiriesCount(count);
      }
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  useEffect(() => {
    fetchUnansweredInquiriesCount();
    const interval = setInterval(fetchUnansweredInquiriesCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnansweredInquiriesCount]);

  // Đếm số lượng học viên xin học Online trong lớp đang chọn
  const [onlineRequestsCount, setOnlineRequestsCount] = useState(0);

  const fetchOnlineRequestsCount = useCallback(async (classId) => {
    if (!classId) {
      setOnlineRequestsCount(0);
      return;
    }
    try {
      const [sessionsRes, attendanceRes] = await Promise.allSettled([
        sessionApi.getByClass(classId),
        attendanceApi.getByClass(classId)
      ]);

      const sessions = (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) ? sessionsRes.value : [];
      const attendances = (attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value)) ? attendanceRes.value : [];

      const now = Date.now() - 30 * 60 * 1000;
      const upcomingSessionIds = new Set(
        sessions
          .filter((s) => {
            const time = new Date(s.endTime || s.startTime).getTime();
            const hasLink = Boolean(s.announcement && s.announcement.trim());
            return !isNaN(time) && time >= now && !hasLink;
          })
          .map((s) => s.id)
      );

      const count = attendances.filter((a) => {
        const sId = a.sessionId || (a.session && a.session.id);
        return upcomingSessionIds.has(sId) && a.status === 'ONLINE';
      }).length;

      setOnlineRequestsCount(count);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchOnlineRequestsCount(selectedClassId);
      const interval = setInterval(() => fetchOnlineRequestsCount(selectedClassId), 30000);
      return () => clearInterval(interval);
    } else {
      setOnlineRequestsCount(0);
    }
  }, [selectedClassId, fetchOnlineRequestsCount]);

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
    } else if (location.pathname === '/inquiries') {
      setCurrentView('student_inquiries');
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
      toast.success(`Đã cập nhật thông tin lớp "${updated.name}"`);
    } catch (error) {
      toast.error('Lỗi cập nhật lớp học: ' + (error.response?.data?.message || error.message));
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
    else if (viewName === 'student_inquiries') navigate('/inquiries');
    else if (viewName === 'guide') navigate('/guide');
  };

  // Chuyển sang tab điểm danh của buổi học cụ thể
  const handleSelectSessionForAttendance = (sessionId) => {
    setTargetSessionId(sessionId);
    setActiveClassTab('attendance');
    setIsMobileMenuOpen(false);
  };

  // Khi giáo viên bấm vào một buổi học trên Thời khóa biểu -> Chuyển thẳng đến buổi học đó trong lớp
  const handleTeacherNavigateToSession = (session) => {
    if (!session) return;
    const targetCId = session.classId || (session.classRoom && session.classRoom.id);
    const targetSId = session.sessionId || session.id;
    if (targetCId) {
      setSelectedClassId(targetCId);
      setTargetSessionId(targetSId);
      setActiveClassTab('sessions');
      setCurrentView('class_detail');
      setIsMobileMenuOpen(false);
      navigate(`/class/${targetCId}`);
    }
  };

  // Lấy tiêu đề hiển thị trên thanh Header Mobile
  const getMobileHeaderTitle = () => {
    if (currentView === 'all_students') return t('allStudents');
    if (currentView === 'timetable') return t('timetable');
    if (currentView === 'student_inquiries') return t('inquiries');
    if (currentView === 'guide') return t('guide');
    if (currentView === 'classes') return t('classes');
    if (currentView === 'class_detail') return classInfo ? `${classInfo.name}` : `Lớp #${selectedClassId}`;
    return 'TeachTool';
  };

  // Render nội dung chính ở vùng trung tâm
  const renderMainContent = () => {
    if (currentView === 'all_students') {
      return <AllStudentsList onSelectClass={handleSelectClass} />;
    }

    if (currentView === 'student_inquiries') {
      return <StudentInquiriesManager onNavigateToClass={handleSelectClass} />;
    }

    if (currentView === 'guide') {
      return <UserGuide />;
    }

    if (currentView === 'timetable') {
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('allClassesTimetable')}</h2>
            </div>
            <button
              onClick={() => fetchTimetable(null)}
              className="self-start sm:self-auto text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm font-medium transition cursor-pointer"
            >
              {t('refresh')}
            </button>
          </div>

          {loadingTimetable ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('loadingTimetableMsg')}
            </div>
          ) : (
            <TimetableGrid
              sessions={timetableSessions}
              isStudent={false}
              onNavigateToSession={handleTeacherNavigateToSession}
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
        case 'announcements':
          return (
            <ClassAnnouncementBoard
              classId={selectedClassId}
              isTeacher={true}
              classInfo={classInfo}
            />
          );
        case 'sessions':
          return (
            <SessionList
              classId={selectedClassId}
              classInfo={classInfo}
              targetSessionId={targetSessionId}
              onSelectSessionForAttendance={handleSelectSessionForAttendance}
              onOnlineRequestsChange={setOnlineRequestsCount}
            />
          );
        case 'timetable':
          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('classTimetableTitle')} {classInfo?.name}</h2>
                </div>
                <button
                  onClick={() => fetchTimetable(selectedClassId)}
                  className="self-start sm:self-auto text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm font-medium transition cursor-pointer"
                >
                  {t('refresh')}
                </button>
              </div>

              {loadingTimetable ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('loadingTimetableMsg')}
                </div>
              ) : (
                <TimetableGrid
                  sessions={timetableSessions}
                  isStudent={false}
                  onNavigateToSession={handleTeacherNavigateToSession}
                />
              )}
            </div>
          );
        case 'assignments':
          return (
            <AssignmentManager
              classId={selectedClassId}
              initialAssignmentId={targetAssignmentId}
            />
          );
        case 'students':
          return <StudentList classId={selectedClassId} />;
        case 'attendance':
          return (
            <AttendanceManager
              classId={selectedClassId}
              initialSessionId={targetSessionId}
            />
          );
        case 'grade_matrix':
          return (
            <AssignmentGradeMatrix
              classId={selectedClassId}
              classInfo={classInfo}
              onNavigateToGrading={(asgnId) => {
                setTargetAssignmentId(asgnId);
                setActiveClassTab('assignments');
              }}
            />
          );
        case 'analytics_heatmap':
          return (
            <LearningAnalyticsHeatmap
              classId={selectedClassId}
              classInfo={classInfo}
            />
          );
        case 'materials':
          return (
            <ClassMaterialsManager
              classId={selectedClassId}
              classInfo={classInfo}
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
              targetSessionId={targetSessionId}
              onSelectSessionForAttendance={handleSelectSessionForAttendance}
              onOnlineRequestsChange={setOnlineRequestsCount}
            />
          );
      }
    }

    return <ClassList showTopBar={false} onSelectClass={handleSelectClass} />;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* MOBILE TOP BAR (Hiện trên Smartphone / Màn hình nhỏ) */}
      <div className="md:hidden bg-slate-900 dark:bg-slate-950 text-white p-3 flex items-center justify-between border-b border-slate-800 shadow-md z-30">
        <div className="flex items-center gap-2.5 truncate mr-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-sm border border-slate-700 cursor-pointer">
            <MenuIcon className="w-5 h-5 text-slate-300" />
          </button>
          <div className="truncate">
            <h2 className="font-bold text-sm truncate">{getMobileHeaderTitle()}</h2>
            {currentView === 'class_detail' && classInfo?.classCode && (
              <span className="text-[10px] font-mono text-blue-400">{t('classCode')}: {classInfo.classCode}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeLanguageToggle />
          <button
            onClick={() => handleNavigateView('classes')}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm border border-slate-700 whitespace-nowrap cursor-pointer">
            {t('home')}
          </button>
        </div>
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
        className={`fixed md:static inset-y-0 left-0 z-50 bg-slate-900 dark:bg-slate-950 text-white flex flex-col border-r border-slate-800 shadow-2xl md:shadow-none transition-all duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-16' : 'md:w-72'}`}>
        
        {/* ================= PHIÊN BẢN 1: SLIM SIDEBAR (PC MODE THU GỌN - TIẾT KIỆM TỐI ĐA CHIỀU NGANG) ================= */}
        {isSidebarCollapsed ? (
          <div className="hidden md:flex flex-col h-full justify-between items-center py-3 select-none">
            {/* Top: Expand Toggle */}
            <div className="space-y-3.5 flex flex-col items-center w-full">
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm cursor-pointer transition"
                title={lang === 'en' ? 'Expand sidebar (Ctrl+B)' : 'Mở rộng thanh bên (Ctrl+B)'}>
                <ChevronRightIcon className="w-5 h-5 text-blue-400" />
              </button>

              <div className="w-8 border-t border-slate-800" />

              {/* Core Nav Icons */}
              <div className="space-y-2 flex flex-col items-center w-full px-2">
                <button
                  type="button"
                  onClick={() => handleNavigateView('all_students')}
                  title={t('allStudents')}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer ${
                    currentView === 'all_students'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <UsersIcon className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateView('classes')}
                  title={`${t('classes')} (${classList.length})`}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer relative ${
                    currentView === 'classes'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <AcademicCapIcon className="w-5 h-5" />
                  {classList.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-slate-800 border border-slate-700 text-slate-300 px-1 rounded-full font-mono">
                      {classList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateView('timetable')}
                  title={t('timetable')}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer ${
                    currentView === 'timetable'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <CalendarIcon className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateView('student_inquiries')}
                  title={t('inquiries')}
                  className={`w-10 h-10 rounded-sm relative flex items-center justify-center transition cursor-pointer ${
                    currentView === 'student_inquiries'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <ChatIcon className="w-5 h-5" />
                  {unansweredInquiriesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-slate-900" />
                  )}
                </button>

                {/* If inside a class, show the 3 hubs */}
                {currentView === 'class_detail' && selectedClassId && (
                  <>
                    <div className="w-8 border-t border-slate-800 my-1" />

                    <div
                      className="w-10 h-8 rounded-sm bg-slate-950 border border-blue-500/40 text-blue-300 font-bold text-[10px] flex items-center justify-center truncate uppercase cursor-pointer"
                      onClick={() => setIsClassesSubmenuOpen(true)}
                      title={`${t('managingClass')}: ${classInfo?.name || selectedClassId}`}>
                      {classInfo?.name ? classInfo.name.slice(0, 3) : 'LOP'}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveClassTab(HUB_CONFIG.schedule_hub.defaultTab)}
                      title={`1. ${t('hubSchedule')}`}
                      className={`w-10 h-10 rounded-sm relative flex items-center justify-center transition cursor-pointer ${
                        activeHub === 'schedule_hub'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}>
                      <MegaphoneIcon className="w-5 h-5" />
                      {onlineRequestsCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-slate-900" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveClassTab(HUB_CONFIG.assessment_hub.defaultTab)}
                      title={`2. ${t('hubAssessment')}`}
                      className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer ${
                        activeHub === 'assessment_hub'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}>
                      <ClipboardCheckIcon className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveClassTab(HUB_CONFIG.management_hub.defaultTab)}
                      title={`3. ${t('hubManagement')}`}
                      className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer ${
                        activeHub === 'management_hub'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}>
                      <CogIcon className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="w-8 border-t border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => handleNavigateView('guide')}
                  title={t('guide')}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center transition cursor-pointer ${
                    currentView === 'guide'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <InfoIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bottom: Settings button in slim mode */}
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-800 w-full px-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                title={`${t('accountSettings')} (${user?.fullName || user?.email})`}
                className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 cursor-pointer transition">
                <span className="text-xs font-bold uppercase">{user?.fullName ? user.fullName[0] : 'U'}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* ================= PHIÊN BẢN 2: FULL SIDEBAR (BÌNH THƯỜNG / EXPANDED) ================= */}
        <div className={`flex flex-col h-full ${isSidebarCollapsed ? 'md:hidden' : 'flex'}`}>
          {/* HEADER CỦA SIDEBAR */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <div
              onClick={() => handleNavigateView('classes')}
              className="cursor-pointer group">
              <div className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition">
                TeachTool
              </div>
              <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                {t('teacherSubtitle')}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm cursor-pointer transition"
                title={lang === 'en' ? 'Collapse sidebar (Ctrl+B)' : 'Thu gọn thanh bên (Ctrl+B)'}>
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* THÂN SIDEBAR: DANH SÁCH MENU ĐIỀU HƯỚNG */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {/* ================= KHỐI 1: MENU NGOÀI CÙNG (HỌC SINH TẤT CẢ CÁC LỚP, DANH SÁCH LỚP HỌC, THỜI KHÓA BIỂU TỔNG) ================= */}
            <div className="px-3 space-y-1">
              {/* 1.1: DANH SÁCH HỌC SINH (CỦA TẤT CẢ CÁC LỚP) - NẰM TRÊN MỤC DANH SÁCH LỚP HỌC */}
              <button
                onClick={() => handleNavigateView('all_students')}
                className={`w-full text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  currentView === 'all_students'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}>
                <span>{t('allStudents')}</span>
              </button>

              {/* 1.2: DANH SÁCH LỚP HỌC (TRANG CHỦ) */}
              <div className="space-y-1">
                <div className="flex items-center">
                  <button
                    onClick={() => handleNavigateView('classes')}
                    className={`flex-1 text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                      currentView === 'classes'
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}>
                    <span>{t('classes')}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                      {classList.length > 0 ? `${classList.length} ${t('classesCount')}` : t('home')}
                    </span>
                  </button>
                  {classList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsClassesSubmenuOpen(!isClassesSubmenuOpen)}
                      className="p-2 text-slate-400 hover:text-white cursor-pointer"
                      title={isClassesSubmenuOpen ? (lang === 'en' ? 'Collapse class list' : 'Thu gọn danh sách lớp') : (lang === 'en' ? 'Expand class list' : 'Mở rộng danh sách lớp')}>
                      <span className="text-xs">{isClassesSubmenuOpen ? '▲' : '▼'}</span>
                    </button>
                  )}
                </div>

                {/* Danh sách các lớp học con để click chuyển nhanh */}
                {isClassesSubmenuOpen && classList.length > 0 && (
                  <div className="pl-3 pr-1 space-y-0.5 border-l-2 border-slate-800 ml-4 py-1">
                    {classList.map(cls => {
                      const isSelected = currentView === 'class_detail' && String(selectedClassId) === String(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleSelectClass(cls.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xs text-xs transition cursor-pointer flex items-center justify-between truncate ${
                            isSelected
                              ? 'bg-blue-600/40 text-blue-200 font-bold border border-blue-400/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
                className={`w-full text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  currentView === 'timetable'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}>
                <span>{t('timetable')}</span>
              </button>

              {/* 1.4: CÂU HỎI TỪ HỌC VIÊN */}
              <button
                onClick={() => handleNavigateView('student_inquiries')}
                className={`w-full text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  currentView === 'student_inquiries'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}>
                <span>{t('inquiries')}</span>
                {unansweredInquiriesCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse shadow-xs">
                    {unansweredInquiriesCount}
                  </span>
                )}
              </button>
            </div>

            {/* ================= KHỐI 2: MENU LỚP ĐANG CHỌN (NẾU ĐANG TRONG 1 LỚP CỤ THỂ) ================= */}
            {currentView === 'class_detail' && selectedClassId && (
              <div className="pt-2 border-t border-slate-800 animate-fade-in">
                {/* Card thông tin lớp học */}
                <div className="mx-3 p-3.5 bg-slate-950/80 rounded-sm border border-slate-800 mb-3 space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="truncate flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                          {t('managingClass')}
                        </span>
                        {classList.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handlePrevClass}
                              title={t('previousClass')}
                              className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-bold border border-slate-700 cursor-pointer">
                              &lt;
                            </button>
                            <button
                              type="button"
                              onClick={handleNextClass}
                              title={t('nextClass')}
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
                      title={t('edit')}
                      className="p-1 px-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition cursor-pointer text-xs border border-slate-700 self-start">
                      {t('edit')}
                    </button>
                  </div>

                  {classInfo?.classCode && (
                    <div className="pt-1 flex items-center justify-between gap-1">
                      <span className="text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30 truncate">
                        {t('classCode')}: {classInfo.classCode}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(classInfo.classCode);
                          toast.success(`${t('copyCodeSuccess')} ("${classInfo.classCode}")`);
                        }}
                        title={t('copy')}
                        className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded cursor-pointer transition whitespace-nowrap">
                        {t('copy')}
                      </button>
                    </div>
                  )}

                  {/* Nút Xuất Báo Cáo Tuần (Word Docx Chuẩn) */}
                  <button
                    type="button"
                    onClick={handleExportWeeklyReport}
                    title="Xuất Báo Cáo Tuần theo định dạng mẫu Word (.docx)"
                    className="w-full mt-2 text-left px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between cursor-pointer transition">
                    <span>{t('exportWeeklyReport') || 'Xuất Báo Cáo Tuần (Word)'}</span>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">.DOCX</span>
                  </button>
                </div>

                {/* 3 CORE HUBS (Bảng tin & Lịch học | Bài tập & Đánh giá | Quản trị lớp học) */}
                <div className="px-3 space-y-1.5">
                  {Object.entries(HUB_CONFIG).map(([hubId, hub], idx) => {
                    const isHubActive = activeHub === hubId;
                    return (
                      <button
                        key={hubId}
                        type="button"
                        onClick={() => {
                          if (!isHubActive) {
                            setActiveClassTab(hub.defaultTab);
                          }
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-sm text-xs font-semibold transition cursor-pointer flex items-center justify-between border ${
                          isHubActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-transparent'
                        }`}>
                        <span className="truncate">{`${idx + 1}. ${t(hub.key)}`}</span>
                        {hubId === 'schedule_hub' && onlineRequestsCount > 0 && (
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse ml-1"
                            title={`${onlineRequestsCount} ${t('onlineRequestsTooltip')}`}>
                            {onlineRequestsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= KHỐI 3: HƯỚNG DẪN SỬ DỤNG (PHÍA DƯỚI) ================= */}
            <div className="pt-3 border-t border-slate-800 px-3">
              <button
                onClick={() => handleNavigateView('guide')}
                className={`w-full text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  currentView === 'guide'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}>
                <span>{t('guide')}</span>
              </button>
            </div>
          </div>

          {/* FOOTER CỦA SIDEBAR: THÔNG TIN GIÁO VIÊN, GIAO DIỆN & CÀI ĐẶT */}
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-white truncate">{user?.fullName || t('teacherSubtitle')}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <ThemeLanguageToggle />
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm border border-slate-700 cursor-pointer transition text-center shadow-2xs">
              {t('accountSettings')}
            </button>
          </div>
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHÍNH (CARD TRẮNG TRÊN NỀN XÁM NHẸ HOẶC CARD TỐI) */}
      <div className={`flex-1 min-w-0 overflow-y-auto w-full ${
        currentView === 'student_inquiries' ? 'p-2 sm:p-3 md:p-4' : 'p-2 sm:p-3 md:p-4 lg:p-5'
      }`}>
        <div className={`min-h-full ${
          currentView === 'student_inquiries'
            ? 'p-0 border-0 bg-transparent shadow-none'
            : 'bg-white dark:bg-slate-900 rounded-sm shadow-xs border border-slate-200 dark:border-slate-800 p-3 sm:p-4 md:p-5 text-slate-900 dark:text-slate-100'
        }`}>
          {/* TOP CONTROLS & BREADCRUMB BAR (COLLAPSIBLE SIDEBAR TOGGLE & QUICK EXPORT) */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-sm cursor-pointer transition border border-slate-200 dark:border-slate-700 shrink-0"
                title={isSidebarCollapsed ? (lang === 'en' ? 'Expand sidebar (Ctrl+B)' : 'Mở rộng thanh bên (Ctrl+B)') : (lang === 'en' ? 'Collapse sidebar (Ctrl+B)' : 'Thu gọn thanh bên (Ctrl+B)')}>
                <SidebarIcon className="w-4 h-4" />
                <span className="font-semibold text-[11px]">
                  {isSidebarCollapsed ? (lang === 'en' ? 'Expand' : 'Mở rộng') : (lang === 'en' ? 'Collapse' : 'Thu gọn')}
                </span>
              </button>

              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                {currentView === 'class_detail' && classInfo ? (
                  <>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{classInfo.name}</span>
                    {classInfo.classCode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                        {classInfo.classCode}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{getMobileHeaderTitle()}</span>
                )}
              </div>
            </div>

            {currentView === 'class_detail' && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportWeeklyReport}
                  title="Xuất Báo Cáo Tuần (.docx)"
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-sm transition cursor-pointer shadow-2xs flex items-center gap-1">
                  <span>{t('exportWeeklyReport') || 'Báo Cáo Tuần'}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">.DOCX</span>
                </button>
              </div>
            )}
          </div>

          {/* SEGMENTED SUB-NAVIGATION BAR FOR ACTIVE CORE HUB */}
          {currentView === 'class_detail' && selectedClassId && (
            <div className="overflow-x-auto flex items-center gap-1.5 p-1 mb-4 bg-slate-100 dark:bg-slate-800/80 rounded-sm border border-slate-200 dark:border-slate-700 no-scrollbar">
              {HUB_CONFIG[activeHub]?.tabs.map((subTab) => {
                const isSubActive = activeClassTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    type="button"
                    onClick={() => setActiveClassTab(subTab.id)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isSubActive
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-slate-200 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}>
                    <span>{t(subTab.labelKey)}</span>
                    {subTab.showBadge && onlineRequestsCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                        {onlineRequestsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {renderMainContent()}
        </div>
      </div>

      {/* MODAL SỬA THÔNG TIN LỚP HỌC */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-sm shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 dark:border-slate-800 animate-fade-in">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">{t('updateClass') || 'Cập nhật Lớp học'}</h3>
            <form onSubmit={handleEditClassSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('className') || 'Tên lớp học'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('startDate') || 'Ngày bắt đầu'}</label>
                  <input 
                    type="date" 
                    value={editFormData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setEditFormData(prev => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate ? prev.endDate : getOffsetMonthsStr(newStart, 6)
                      }));
                    }}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('endDate') || 'Ngày kết thúc'}</label>
                  <input 
                    type="date" 
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gợi ý chọn nhanh thời hạn */}
              <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{lang === 'en' ? 'Duration:' : 'Thời hạn:'}</span>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 6) }))}
                  className="px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold rounded-xs border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                >
                  {lang === 'en' ? '+6 months (Semester)' : '+6 tháng (Chuẩn học kỳ)'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 3) }))}
                  className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xs border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                >
                  {lang === 'en' ? '+3 months' : '+3 tháng'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 12) }))}
                  className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xs border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                >
                  {lang === 'en' ? '+1 year' : '+1 năm'}
                </button>
              </div>

              {/* Thông báo chính sách lưu trữ */}
              <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 rounded-sm text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {lang === 'en' ? (
                    <span><span className="font-semibold">Storage Policy:</span> Teacher data (classes, schedule, books, sessions, plans) is stored for <b>6 months</b> or until deleted. Student submissions are stored for <b>1 month</b> from submission date.</span>
                  ) : (
                    <span><span className="font-semibold">Chính sách lưu trữ:</span> Dữ liệu giáo viên (lớp, lịch học, sách, buổi học, giáo án) được lưu trữ trong <b>6 tháng</b> hoặc đến khi bị xóa. Bài nộp của học viên lưu giữ <b>1 tháng</b> từ ngày nộp lên hệ thống.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-sm text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                  {t('cancel') || 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-sm text-sm hover:bg-blue-700 transition cursor-pointer shadow-xs">
                  {t('save') || 'Lưu thay đổi'}
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

      {/* MODAL XUẤT BÁO CÁO TUẦN (.DOCX) THEO MẪU MỚI */}
      <WeeklyReportModal
        isOpen={isWeeklyReportModalOpen}
        onClose={() => setIsWeeklyReportModalOpen(false)}
        classId={selectedClassId}
        classInfo={classInfo}
      />
    </div>
  );
}
