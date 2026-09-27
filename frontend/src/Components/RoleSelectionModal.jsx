import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useThemeLanguage, ThemeLanguageToggle } from '../context/ThemeLanguageContext';

export default function RoleSelectionModal() {
  const { user, selectRole, logout } = useAuth();
  const { t, lang } = useThemeLanguage();
  const [selected, setSelected] = useState(null); // 'TEACHER' | 'STUDENT'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role) return null; // Nếu đã có vai trò thì không hiện

  const handleConfirm = async () => {
    if (!selected) {
      setError(lang === 'en' ? 'Please select a role: Teacher or Student' : 'Vui lòng chọn 1 vai trò: Giáo viên hoặc Học sinh');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await selectRole(selected);
    } catch (err) {
      setError(err.response?.data?.message || err.message || (lang === 'en' ? 'Error saving role.' : 'Lỗi khi lưu vai trò.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 relative">
          <div className="absolute right-4 top-4">
            <ThemeLanguageToggle />
          </div>
          <div className="text-center pr-8 sm:pr-0">
            <h2 className="text-xl font-bold">{lang === 'en' ? 'Select Your Role' : 'Chọn Vai Trò Của Bạn'}</h2>
            <p className="text-slate-300 text-xs mt-1">
              {lang === 'en' ? 'Welcome' : 'Chào mừng'} <b>{user.fullName || user.email}</b>{lang === 'en' ? '! Please confirm your account role to get started.' : '! Hãy xác nhận vai trò tài khoản để bắt đầu.'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Cảnh báo 1 lần duy nhất */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 rounded-xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <p className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-0.5">
              {lang === 'en' ? 'Important Notice:' : 'Lưu ý quan trọng:'}
            </p>
            {lang === 'en' ? (
              <>You can only select your role <b>ONCE</b> for this account. Once confirmed, you <b>cannot change roles</b> unless your account is deleted.</>
            ) : (
              <>Bạn chỉ được chọn vai trò <b>1 lần duy nhất</b> cho tài khoản Gmail này. Sau khi xác nhận, bạn sẽ <b>không thể tự ý đổi vai trò</b> trừ khi xóa tài khoản.</>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 2 Lựa chọn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setSelected('TEACHER')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${selected === 'TEACHER' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'}`}>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {lang === 'en' ? 'I am a Teacher' : 'Tôi là Giáo Viên'}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  {lang === 'en'
                    ? 'Create and manage classes, prepare lesson plans, track attendance, assign homework, and grade student submissions.'
                    : 'Tạo và quản lý lớp học, soạn kế hoạch giảng dạy, điểm danh, giao bài tập và chấm điểm cho học viên.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                {selected === 'TEACHER'
                  ? (lang === 'en' ? 'Selected' : 'Đã chọn')
                  : (lang === 'en' ? 'Select this role' : 'Chọn vai trò này')}
              </div>
            </div>

            <div 
              onClick={() => setSelected('STUDENT')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${selected === 'STUDENT' ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20' : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'}`}>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {lang === 'en' ? 'I am a Student' : 'Tôi là Học Sinh'}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  {lang === 'en'
                    ? 'Enter class code to join, view timetable, check preparation instructions, and submit assignments.'
                    : 'Nhập mã lớp để tham gia, xem thời khóa biểu, xem dặn dò chuẩn bị bài, làm bài tập và nộp bài.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {selected === 'STUDENT'
                  ? (lang === 'en' ? 'Selected' : 'Đã chọn')
                  : (lang === 'en' ? 'Select this role' : 'Chọn vai trò này')}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={logout}
              className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium cursor-pointer">
              {t('logout')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm">
              {isSubmitting
                ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                : (lang === 'en' ? 'Confirm Role' : 'Xác Nhận Vai Trò')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
