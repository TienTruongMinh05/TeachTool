import { useEffect, useState } from 'react';
import { classApi } from '../api/classApi';
import { useNavigate } from 'react-router-dom';
import ActivityLibraryModal from '../Components/ActivityLibraryModal';
import MonthlyTimesheetModal from '../Components/MonthlyTimesheetModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { InfoIcon, TableIcon } from '../Components/Icons';

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

function ClassList({ showTopBar = false, onSelectClass }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();
  
  // Instant load with Stale-While-Revalidate cache
  const [classes, setClasses] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teacher_classes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teacher_classes');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  
  // State quản lý Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });

  // State quản lý Modal Copy Lớp
  const [copyingClass, setCopyingClass] = useState(null);
  const [copyFormData, setCopyFormData] = useState({ name: '', startDate: '', endDate: '' });

  // State xác nhận xóa & rời lớp
  const [deletingClass, setDeletingClass] = useState(null);
  const [leavingClass, setLeavingClass] = useState(null);

  // State modal thư viện hoạt động
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);

  const fetchClasses = async () => {
    try {
      const data = await classApi.getAll();
      const safeData = Array.isArray(data) ? data : [];
      setClasses(safeData);
      try {
        localStorage.setItem('cached_teacher_classes', JSON.stringify(safeData));
      } catch {}
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openCreateModal = () => {
    setEditingClass(null);
    const today = getTodayStr();
    const sixMonthsLater = getOffsetMonthsStr(today, 6);
    setFormData({ name: '', startDate: today, endDate: sixMonthsLater });
    setIsModalOpen(true);
  };

  const openEditModal = (cls, e) => {
    e.stopPropagation();
    setEditingClass(cls);
    setFormData({
      name: cls.name || '',
      startDate: cls.startDate || '',
      endDate: cls.endDate || ''
    });
    setIsModalOpen(true);
  };

  const openCopyModal = (cls, e) => {
    e.stopPropagation();
    setCopyingClass(cls);
    const today = getTodayStr();
    const sixMonthsLater = getOffsetMonthsStr(today, 6);
    setCopyFormData({
      name: `${cls.name || (lang === 'en' ? 'Class' : 'Lớp học')} ${lang === 'en' ? '(Copy)' : '(Bản sao)'}`,
      startDate: today,
      endDate: sixMonthsLater
    });
  };

  const promptDelete = (cls, e) => {
    e.stopPropagation();
    setDeletingClass(cls);
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    try {
      await classApi.delete(deletingClass.id);
      toast.success(lang === 'en' ? `Deleted class "${deletingClass.name}"` : `Đã xóa lớp học "${deletingClass.name}"`);
      setDeletingClass(null);
      fetchClasses();
    } catch (error) {
      toast.error((lang === 'en' ? "Error deleting class: " : "Lỗi khi xóa lớp học: ") + (error.response?.data?.message || error.message));
    }
  };

  const promptLeaveClass = (cls, e) => {
    e.stopPropagation();
    setLeavingClass(cls);
  };

  const handleLeaveClass = async () => {
    if (!leavingClass || !user?.id) return;
    try {
      await classApi.removeTeacher(leavingClass.id, user.id);
      toast.success(lang === 'en' ? `Left class "${leavingClass.name}"` : `Đã rời khỏi lớp học "${leavingClass.name}"`);
      setLeavingClass(null);
      fetchClasses();
    } catch (error) {
      toast.error((lang === 'en' ? "Error leaving class: " : "Lỗi khi rời lớp học: ") + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await classApi.update(editingClass.id, formData);
        toast.success(lang === 'en' ? `Updated class "${formData.name}"` : `Đã cập nhật lớp học "${formData.name}"`);
      } else {
        await classApi.create(formData);
        toast.success(lang === 'en' ? `Created class "${formData.name}"` : `Đã tạo mới lớp học "${formData.name}"`);
      }
      fetchClasses();
      setIsModalOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
      setEditingClass(null);
    } catch (error) {
      toast.error(lang === 'en' ? "Error saving class. Please verify input data." : "Lỗi khi lưu thông tin lớp học. Hãy kiểm tra lại dữ liệu.");
    }
  };

  const handleCopySubmit = async (e) => {
    e.preventDefault();
    if (!copyingClass) return;
    try {
      await classApi.clone(copyingClass.id, copyFormData);
      toast.success(lang === 'en' ? `Duplicated class "${copyFormData.name}" successfully with full plans and materials.` : `Đã nhân bản lớp học "${copyFormData.name}" thành công với đầy đủ giáo án và sách.`);
      fetchClasses();
      setCopyingClass(null);
    } catch (error) {
      toast.error((lang === 'en' ? "Error duplicating class: " : "Lỗi khi nhân bản lớp học: ") + (error.response?.data?.message || error.message));
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8 animate-pulse space-y-6">
        <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 h-16 rounded-xl p-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-36"></div>
                <div className="h-5 bg-slate-100 dark:bg-slate-800/60 rounded w-16"></div>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-full"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-2/3"></div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
                <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8 relative">
      {/* Top User Bar (chỉ hiện khi chạy độc lập) */}
      {showTopBar && (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 dark:bg-slate-950 text-white px-4 sm:px-5 py-3 rounded-xl mb-6 shadow-xs border border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base tracking-tight">TeachTool</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
              {lang === 'en' ? 'Teacher' : 'Giáo Viên'}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">| {user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700 whitespace-nowrap">
            {t('logout')}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{t('classManagementTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('classListSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs text-center">
            {t('activityLibrary')}
          </button>
          <button 
            onClick={() => setIsTimesheetModalOpen(true)}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition duration-200 shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5">
            <TableIcon className="w-4 h-4 text-emerald-100" />
            <span>{lang === 'en' ? 'Monthly Timesheet' : 'Chấm Công Tháng'}</span>
            <span className="text-[10px] bg-emerald-700 px-1 py-0.5 rounded font-mono font-bold">.XLSX</span>
          </button>
          <button 
            onClick={openCreateModal}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition duration-200 shadow-sm cursor-pointer text-center">
            {t('addNewClass')}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto bg-white dark:bg-slate-900 shadow-xs rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b-2 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-slate-400 text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">{t('classCodeCol')}</th>
              <th className="px-6 py-4">{t('classNameCol')}</th>
              <th className="px-6 py-4">{t('startDateCol')}</th>
              <th className="px-6 py-4">{t('endDateCol')}</th>
              <th className="px-6 py-4 text-right">{t('actionsCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {classes.map((cls) => (
              <tr key={cls.id} 
                onClick={() => onSelectClass ? onSelectClass(cls.id) : navigate(`/class/${cls.id}`)}
                className="hover:bg-blue-50/60 dark:hover:bg-slate-800/40 transition duration-150 cursor-pointer">
                <td className="px-6 py-4 text-gray-900 dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50">
                      {cls.classCode || `#${cls.id}`}
                    </span>
                    {cls.classCode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(cls.classCode);
                          toast.success(lang === 'en' ? `Copied class code "${cls.classCode}"!` : `Đã sao chép mã lớp "${cls.classCode}"!`);
                        }}
                        title={lang === 'en' ? "Copy class code to share with students" : "Sao chép mã lớp để gửi học sinh"}
                        className="text-xs text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 cursor-pointer">
                        {t('copyClass')}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">{cls.name}</span>
                    {cls.isCoTeacher && (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-semibold px-2 py-0.5 rounded-full">
                        {t('coTeacherBadge')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-400">{cls.startDate || '—'}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-400">{cls.endDate || '—'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={(e) => openCopyModal(cls, e)}
                    title={lang === 'en' ? "Duplicate this class" : "Nhân bản lớp học này"}
                    className="px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition cursor-pointer">
                    {t('copyClass')}
                  </button>
                  <button 
                    onClick={(e) => openEditModal(cls, e)}
                    title={lang === 'en' ? "Edit class details" : "Chỉnh sửa thông tin lớp"}
                    className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer">
                    {t('edit')}
                  </button>
                  {cls.isCoTeacher ? (
                    <button 
                      onClick={(e) => promptLeaveClass(cls, e)}
                      title={lang === 'en' ? "Leave this co-taught class" : "Rời khỏi lớp đồng giảng dạy này"}
                      className="px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer">
                      {t('leaveClass')}
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => promptDelete(cls, e)}
                      title={lang === 'en' ? "Delete this class" : "Xóa lớp học này"}
                      className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer">
                      {t('delete')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                  {t('noClassesYetClickNew')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form Thêm / Sửa Lớp */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-slate-100">
              {editingClass ? t('updateClassModalTitle') : t('createClassModalTitle')}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('classNameLabel')} <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={lang === 'en' ? "Enter class name..." : "Nhập tên lớp học..."}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('startDateLabel')}</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate ? prev.endDate : getOffsetMonthsStr(newStart, 6)
                      }));
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('endDateLabel')}</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gợi ý chọn nhanh thời hạn */}
              <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{t('termLabel')}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 6) }))}
                  className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded border border-blue-200 dark:border-blue-800/50 transition cursor-pointer"
                >
                  {t('sixMonthsSemester')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 3) }))}
                  className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {t('threeMonths')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 12) }))}
                  className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {t('oneYear')}
                </button>
              </div>

              {/* Thông báo chính sách lưu trữ */}
              <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {t('storagePolicyNotice')}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer font-medium shadow-xs">
                  {editingClass ? t('saveChanges') : t('createClassBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nhân Bản (Copy) Lớp */}
      {copyingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-slate-100">{t('duplicateClassTitle')}</h3>
            <form onSubmit={handleCopySubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('newClassNameLabel')} <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={copyFormData.name}
                  onChange={(e) => setCopyFormData({...copyFormData, name: e.target.value})}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{lang === 'en' ? 'New Start Date' : 'Ngày bắt đầu mới'}</label>
                  <input 
                    type="date" 
                    value={copyFormData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setCopyFormData(prev => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate ? prev.endDate : getOffsetMonthsStr(newStart, 6)
                      }));
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{lang === 'en' ? 'New End Date' : 'Ngày kết thúc mới'}</label>
                  <input 
                    type="date" 
                    value={copyFormData.endDate}
                    onChange={(e) => setCopyFormData({...copyFormData, endDate: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gợi ý chọn nhanh thời hạn bản sao */}
              <div className="flex flex-wrap items-center gap-1.5 -mt-1">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{t('termLabel')}</span>
                <button
                  type="button"
                  onClick={() => setCopyFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 6) }))}
                  className="px-2 py-0.5 text-xs bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold rounded border border-purple-200 dark:border-purple-800/50 transition cursor-pointer"
                >
                  {t('sixMonthsSemester')}
                </button>
                <button
                  type="button"
                  onClick={() => setCopyFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 3) }))}
                  className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {t('threeMonths')}
                </button>
                <button
                  type="button"
                  onClick={() => setCopyFormData(prev => ({ ...prev, endDate: getOffsetMonthsStr(prev.startDate || getTodayStr(), 12) }))}
                  className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {t('oneYear')}
                </button>
              </div>

              {/* Thông báo quy tắc nhân bản & lưu trữ */}
              <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 rounded-lg text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">{lang === 'en' ? 'Duplication rules:' : 'Quy tắc nhân bản:'}</span> {lang === 'en' ? 'Copies all teaching plans, books, and assignments (plan schedules reset to default). Student enrollments and submissions will not be copied. Class data is retained for 6 months or until deleted.' : 'Sao chép toàn bộ giáo án, sách và bài tập (thời gian giáo án để mặc định). Danh sách học sinh và bài nộp sẽ không sao chép. Dữ liệu lớp học được lưu trữ trong 6 tháng hoặc đến khi bị xóa.'}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setCopyingClass(null)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 cursor-pointer font-medium shadow-xs">
                  {t('startCopyingBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {deletingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('confirmDeleteClassTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              {lang === 'en' ? (
                <>Are you sure you want to delete class <b>{deletingClass.name}</b>?</>
              ) : (
                <>Bạn có chắc chắn muốn xóa lớp <b>{deletingClass.name}</b>?</>
              )}
              <br />
              <span className="text-xs text-red-500 dark:text-red-400 mt-1 block">
                {lang === 'en'
                  ? 'Warning: All enrollments, sessions, attendance, and teaching plans for this class will also be permanently deleted.'
                  : 'Cảnh báo: Toàn bộ danh sách ghi danh, buổi học, điểm danh và kế hoạch giảng dạy của lớp này sẽ bị xóa đồng thời.'}
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 font-medium cursor-pointer shadow-xs">
                {lang === 'en' ? 'Confirm Delete' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Rời Lớp Đồng Giảng Dạy */}
      {leavingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-2">{t('confirmLeaveClassTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              {lang === 'en' ? (
                <>Are you sure you want to leave co-taught class <b>{leavingClass.name}</b>?</>
              ) : (
                <>Bạn có chắc muốn rời khỏi lớp đồng giảng dạy <b>{leavingClass.name}</b>?</>
              )}
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                {lang === 'en'
                  ? 'The class and curriculum data of the primary teacher will be preserved. This class will no longer appear in your list.'
                  : 'Lớp học và dữ liệu bài giảng của giáo viên chủ nhiệm vẫn được giữ nguyên. Lớp này sẽ không còn xuất hiện trong danh sách của bạn.'}
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setLeavingClass(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleLeaveClass}
                className="px-4 py-2 text-sm text-white bg-amber-600 rounded-md hover:bg-amber-700 font-medium cursor-pointer shadow-xs">
                {lang === 'en' ? 'Confirm Leave' : 'Xác nhận rời lớp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thư viện Hoạt động Toàn hệ thống */}
      <ActivityLibraryModal 
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />

      {/* Modal Xuất Chấm Công Giảng Dạy Tháng */}
      <MonthlyTimesheetModal
        isOpen={isTimesheetModalOpen}
        onClose={() => setIsTimesheetModalOpen(false)}
      />
    </div>
  );
}

export default ClassList;
