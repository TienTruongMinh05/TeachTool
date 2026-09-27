import { useState, useEffect } from 'react';
import { studentApi } from '../api/studentApi';
import { classApi } from '../api/classApi';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export default function AllStudentsList({ onSelectClass }) {
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Modal Thêm học sinh mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ fullName: '', email: '', classId: '' });
  const [addingStudent, setAddingStudent] = useState(false);

  // Modal Gán học sinh vào lớp khác
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes] = await Promise.allSettled([
        studentApi.getAll(),
        classApi.getAll()
      ]);

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
        setStudents(studentsRes.value);
      } else {
        setStudents([]);
      }

      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        setClasses(classesRes.value);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách học sinh toàn trường:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyInfo = (st) => {
    const text = `${st.studentName} - ${st.studentEmail}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép: "${text}" vào bộ nhớ tạm!`);
    }).catch(() => {
      showToast(`Học sinh: ${text}`);
    });
  };

  // Thêm học sinh mới vào hệ thống
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addFormData.fullName.trim() || !addFormData.email.trim()) return;

    try {
      setAddingStudent(true);
      const createdUser = await studentApi.create({
        fullName: addFormData.fullName.trim(),
        email: addFormData.email.trim()
      });

      // Nếu có chọn lớp, gán luôn vào lớp đó
      if (addFormData.classId) {
        await studentApi.enroll(addFormData.classId, createdUser.id);
      }

      toast.success(`Đã thêm học sinh "${createdUser.fullName}" thành công!`);
      setIsAddModalOpen(false);
      setAddFormData({ fullName: '', email: '', classId: '' });
      await loadData();
    } catch (err) {
      toast.error('Lỗi khi thêm học sinh: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddingStudent(false);
    }
  };

  // Gán học sinh vào lớp học
  const handleAssignToClass = async (e) => {
    e.preventDefault();
    if (!assigningStudent || !targetClassId) return;

    try {
      setAssigning(true);
      await studentApi.enroll(targetClassId, assigningStudent.studentId);
      const targetClass = classes.find(c => c.id === Number(targetClassId));
      toast.success(`Đã thêm ${assigningStudent.studentName} vào lớp ${targetClass?.name || ''}!`);
      setAssigningStudent(null);
      setTargetClassId('');
      await loadData();
    } catch (err) {
      toast.error('Lỗi khi gán học sinh vào lớp: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssigning(false);
    }
  };

  // Xóa tài khoản học sinh
  const handleDeleteStudent = async (st) => {
    const hasClasses = st.enrolledClasses && st.enrolledClasses.length > 0;
    const classNames = hasClasses ? st.enrolledClasses.map(c => c.className).join(', ') : '';

    const confirmMessage = hasClasses
      ? (lang === 'en'
          ? `Student "${st.studentName}" is currently enrolled in ${st.enrolledClasses.length} class(es): [${classNames}]. Deleting this account will automatically unenroll them from all classes and permanently remove all associated records (attendance, submissions, inquiries). Are you sure?`
          : `Học sinh "${st.studentName}" đang tham gia ${st.enrolledClasses.length} lớp học: [${classNames}]. Xóa tài khoản sẽ tự động hủy ghi danh khỏi tất cả các lớp này và xóa vĩnh viễn toàn bộ dữ liệu (điểm danh, bài nộp, thắc mắc). Bạn có chắc chắn muốn xóa không?`)
      : (lang === 'en'
          ? `Are you sure you want to permanently delete student account "${st.studentName}" (${st.studentEmail})? All associated data will be permanently removed.`
          : `Bạn có chắc muốn xóa vĩnh viễn tài khoản học sinh "${st.studentName}" (${st.studentEmail}) khỏi hệ thống? Toàn bộ dữ liệu tài khoản sẽ bị xóa hoàn toàn.`);

    const ok = await confirm({
      title: lang === 'en' ? 'Delete Student Account' : 'Xóa tài khoản học sinh',
      message: confirmMessage,
      confirmText: lang === 'en' ? 'Delete Permanently' : 'Xóa vĩnh viễn',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await studentApi.delete(st.studentId);
      toast.success(lang === 'en' ? `Deleted student "${st.studentName}" successfully!` : `Đã xóa tài khoản học sinh "${st.studentName}" thành công!`);
      await loadData();
    } catch (err) {
      toast.error(lang === 'en' ? 'Error deleting student: ' + (err.response?.data?.message || err.message) : 'Lỗi khi xóa học sinh: ' + (err.response?.data?.message || err.message));
    }
  };

  // Lọc danh sách học sinh
  const filteredStudents = students.filter(st => {
    const term = searchTerm.toLowerCase();
    const matchName = (st.studentName || '').toLowerCase().includes(term);
    const matchEmail = (st.studentEmail || '').toLowerCase().includes(term);
    const matchSearch = matchName || matchEmail;

    if (!matchSearch) return false;

    if (selectedClassFilter === 'ALL') return true;
    if (selectedClassFilter === 'NONE') {
      return !st.enrolledClasses || st.enrolledClasses.length === 0;
    }
    return st.enrolledClasses?.some(c => c.classId === Number(selectedClassFilter));
  });

  const totalEnrollments = students.reduce((sum, st) => sum + (st.enrolledClasses?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-fade-in border border-slate-700">
          {toastMessage}
        </div>
      )}

      {/* HEADER & THỐNG KÊ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('allStudentsTitleFull')}</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-800/60 rounded-full">
              {students.length} {t('studentsUnit')}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {t('allStudentsSubtitleDesc')}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs text-center">
          {t('addNewStudentBtn')}
        </button>
      </div>

      {/* THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{students.length}</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t('totalStudentsKpi')}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{classes.length}</div>
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">{t('totalClassesKpi')}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalEnrollments}</div>
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{t('totalEnrollmentsKpi')}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {students.filter(st => !st.enrolledClasses || st.enrolledClasses.length === 0).length}
          </div>
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">{t('notInAnyClassKpi')}</div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchStudentPlaceholder')}
            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="ALL">{`${t('allClassesFilterOption')} (${classes.length})`}</option>
            <option value="NONE">{t('studentsNotInAnyClassOption')}</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {t('classColLabel')}: {cls.name} ({t('code')}: {cls.classCode || `#${cls.id}`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BẢNG DANH SÁCH HỌC SINH (RESPONSIVE CHO CẢ PC & ĐIỆN THOẠI) */}
      {loading ? (
        <div className="text-gray-500 dark:text-slate-400 py-10 text-center text-xs">{t('loadingAllStudents')}</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 text-center shadow-xs">
          <h4 className="font-bold text-gray-700 dark:text-slate-200 text-sm mb-1">{t('noStudentsFoundTitle')}</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            {searchTerm || selectedClassFilter !== 'ALL'
              ? t('noStudentsFoundSubtitle')
              : t('noStudentsInSystemSubtitle')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">{t('studentCodeCol')}</th>
                <th className="px-5 py-3.5">{t('fullNameLabel')}</th>
                <th className="px-5 py-3.5">{t('emailLabel')}</th>
                <th className="px-5 py-3.5">{t('enrolledClassesCol')}</th>
                <th className="px-5 py-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
              {filteredStudents.map((st) => (
                <tr key={st.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                    #{st.studentId}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-800 dark:text-slate-100">
                    {st.studentName || t('unnamedStudent')}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">
                    {st.studentEmail}
                  </td>
                  <td className="px-5 py-3.5">
                    {st.enrolledClasses && st.enrolledClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {st.enrolledClasses.map(c => (
                          <button
                            key={c.classId}
                            onClick={() => {
                              if (onSelectClass) onSelectClass(c.classId);
                              else navigate(`/class/${c.classId}`);
                            }}
                            title={lang === 'en' ? `Navigate to class ${c.className}` : `Chuyển đến bảng điều khiển lớp ${c.className}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer">
                            <span>{c.className}</span>
                            {c.classCode && (
                              <span className="font-mono text-[10px] text-blue-500 dark:text-blue-400">({c.classCode})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                        {t('notInAnyClassBadge')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => handleCopyInfo(st)}
                      title={lang === 'en' ? 'Copy name and email' : 'Sao chép tên và email'}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded cursor-pointer transition">
                      {t('copy')}
                    </button>
                    <button
                      onClick={() => {
                        setAssigningStudent(st);
                        setTargetClassId(classes[0]?.id ? String(classes[0].id) : '');
                      }}
                      title={lang === 'en' ? 'Add this student to a class' : 'Thêm học sinh này vào một lớp học'}
                      className="px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 rounded cursor-pointer transition">
                      {t('addToClassBtn')}
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(st)}
                      title={lang === 'en' ? 'Delete student account' : 'Xóa tài khoản học sinh'}
                      className="px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 rounded cursor-pointer transition">
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL THÊM HỌC SINH MỚI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h4 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-1">{t('addStudentModalTitle')}</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {t('createStudentModalDesc')}
            </p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('studentFullNameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addFormData.fullName}
                  onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                  placeholder={lang === 'en' ? 'E.g. John Doe' : 'VD: Nguyễn Văn Nam'}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('emailGmailLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder={lang === 'en' ? 'E.g. student@gmail.com' : 'VD: hocsinh@gmail.com'}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('assignToClassImmediately')}
                </label>
                <select
                  value={addFormData.classId}
                  onChange={(e) => setAddFormData({ ...addFormData, classId: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('notAssignedYetOption')}</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({t('code')}: {cls.classCode || `#${cls.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {addingStudent ? t('addingStudentProgress') : t('confirmAddBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GÁN HỌC SINH VÀO LỚP */}
      {assigningStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h4 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-1">{t('assignStudentModalTitle')}</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {t('studentLabelPrefix')} <b className="text-slate-800 dark:text-slate-200">{assigningStudent.studentName}</b> ({assigningStudent.studentEmail})
            </p>

            <form onSubmit={handleAssignToClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('selectClassToAddLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('selectOneClassPrompt')}</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({t('code')}: {cls.classCode || `#${cls.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningStudent(null)}
                  className="px-4 py-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {assigning ? t('assigningToClass') : t('addToClassBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
