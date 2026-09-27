import React, { useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { enrollmentApi } from '../api/enrollmentApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { XIcon } from './Icons';

export default function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  enrolledClasses = [],
  onLeaveClassSuccess,
  onLogout
}) {
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState('profile'); // profile, classes, security, danger

  // Form Thông tin cá nhân
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Form Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Rời lớp (học sinh)
  const [leavingClassId, setLeavingClassId] = useState(null);
  const [classMsg, setClassMsg] = useState({ type: '', text: '' });

  // Xóa tài khoản
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isStudent = user?.role === 'STUDENT';

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
    }
    setProfileMsg({ type: '', text: '' });
    setPasswordMsg({ type: '', text: '' });
    setClassMsg({ type: '', text: '' });
    setDeleteError('');
    setDeleteConfirmText('');
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Họ và tên không được để trống.' });
      return;
    }
    try {
      setSavingProfile(true);
      setProfileMsg({ type: '', text: '' });
      const updated = await userApi.update(user.id, { fullName: fullName.trim() });
      setProfileMsg({ type: 'success', text: 'Cập nhật họ và tên thành công!' });
      if (onUserUpdated) {
        onUserUpdated(updated);
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Lỗi cập nhật thông tin.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin mật khẩu.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordMsg({ type: '', text: '' });
      await authApi.changePassword(user.id, currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Mật khẩu hiện tại không đúng.' });
    } finally {
      setSavingPassword(false);
    }
  };

  // Học sinh tự rời lớp học
  const handleLeaveClass = async (classId, className) => {
    const ok = await confirm({
      title: t('leaveClassButton'),
      message: lang === 'en' ? `Are you sure you want to leave class "${className}"?` : `Bạn có chắc chắn muốn rời khỏi lớp "${className}"?`,
      confirmText: t('leaveClassButton'),
      type: 'warning'
    });
    if (!ok) return;

    try {
      setLeavingClassId(classId);
      setClassMsg({ type: '', text: '' });
      await enrollmentApi.removeStudent(classId, user.id);
      const successTxt = lang === 'en' ? `Successfully left class "${className}"!` : `Đã rời lớp "${className}" thành công!`;
      setClassMsg({ type: 'success', text: successTxt });
      toast.success(successTxt);
      if (onLeaveClassSuccess) {
        await onLeaveClassSuccess(classId);
      }
    } catch (err) {
      const errTxt = err.response?.data?.message || err.message || (lang === 'en' ? 'Error leaving class.' : 'Lỗi khi rời lớp học.');
      setClassMsg({ type: 'error', text: errTxt });
      toast.error(errTxt);
    } finally {
      setLeavingClassId(null);
    }
  };

  // Xóa tài khoản vĩnh viễn
  const handleDeleteAccount = async () => {
    const norm = deleteConfirmText.trim().toUpperCase();
    if (norm !== 'XÓA TÀI KHOẢN' && norm !== 'DELETE ACCOUNT') {
      setDeleteError(lang === 'en' ? 'Please type "DELETE ACCOUNT" to confirm.' : 'Vui lòng gõ chính xác cụm từ "XÓA TÀI KHOẢN" để xác nhận.');
      return;
    }
    try {
      setDeletingAccount(true);
      setDeleteError('');
      await authApi.deleteAccount(user.id);
      toast.success(lang === 'en' ? 'Your account has been permanently deleted from the system.' : 'Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.');
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || (lang === 'en' ? 'Error deleting account.' : 'Lỗi khi xóa tài khoản.'));
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('logoutAccountBtn'),
      message: lang === 'en' ? 'Are you sure you want to log out of TeachTool?' : 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống TeachTool không?',
      confirmText: t('logout'),
      cancelText: lang === 'en' ? 'Stay' : 'Ở lại',
      type: 'warning'
    });
    if (ok && onLogout) {
      onClose();
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center border-b border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold">{t('accountSettingsTitle')}</h3>
            <p className="text-xs text-slate-300">
              {user?.fullName} &bull; <span className="font-semibold text-blue-300">{isStudent ? (lang === 'en' ? 'Student' : 'Học Viên') : (lang === 'en' ? 'Teacher' : 'Giáo Viên')}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer transition">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}>
            {t('personalInfoTab')}
          </button>

          {isStudent && (
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}>
              {lang === 'en' ? `My Classes (${enrolledClasses.length})` : `Lớp học của tôi (${enrolledClasses.length})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}>
            {t('changePasswordTab')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400'
            }`}>
            {t('dangerZoneTab')}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md mx-auto">
              {profileMsg.text && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  profileMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('emailLoginLabel')}
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-gray-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{t('emailFixedNote')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('fullNameDisplayLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('systemRoleLabel')}
                </label>
                <span className="inline-block px-2.5 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-md">
                  {isStudent ? t('studentRoleBadge') : t('teacherRoleBadge')}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer">
                  {savingProfile ? t('updatingProfile') : t('saveProfileChangesBtn')}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LỚP HỌC CỦA TÔI (CHO HỌC SINH) */}
          {activeTab === 'classes' && isStudent && (
            <div className="space-y-4">
              {classMsg.text && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  classMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                }`}>
                  {classMsg.text}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-slate-400">
                {t('myClassesDesc')}
              </p>

              {enrolledClasses.length === 0 ? (
                <div className="p-8 bg-slate-50 dark:bg-slate-950 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-center text-xs text-gray-500 dark:text-slate-400">
                  {t('noEnrolledClassesMsg')}
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-3.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-slate-100">{cls.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{t('classCodePrefix')} <b className="font-mono text-blue-600 dark:text-blue-400">{cls.classCode}</b></span>
                          <span>&bull;</span>
                          <span>{t('teacherPrefix')} {cls.teacherName || (lang === 'en' ? 'Not assigned' : 'Chưa cập nhật')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={leavingClassId === cls.id}
                        onClick={() => handleLeaveClass(cls.id, cls.name)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-lg transition cursor-pointer disabled:opacity-50">
                        {leavingClassId === cls.id ? t('leavingClassProgress') : t('leaveClassButton')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ĐỔI MẬT KHẨU */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md mx-auto">
              {passwordMsg.text && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  passwordMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                }`}>
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('currentPasswordInputLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('currentPasswordInputPlaceholder')}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('newPasswordInputLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('newPasswordInputPlaceholder')}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('confirmNewPasswordInputLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmNewPasswordInputPlaceholder')}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer">
                  {savingPassword ? t('updatingPasswordProgress') : t('updatePasswordSubmitBtn')}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: VÙNG NGUY HIỂM */}
          {activeTab === 'danger' && (
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl space-y-4 max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div>
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">{t('dangerZoneDeleteTitle')}</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                    {t('dangerZoneDeleteDesc')}
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {t('dangerConfirmTextLabel')}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('dangerConfirmPlaceholder')}
                  className="w-full border border-rose-300 dark:border-rose-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  disabled={deletingAccount || (!['XÓA TÀI KHOẢN', 'DELETE ACCOUNT'].includes(deleteConfirmText.trim().toUpperCase()))}
                  onClick={handleDeleteAccount}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 dark:disabled:bg-rose-900/50 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer mt-2">
                  {deletingAccount ? t('deletingAccountProgress') : t('dangerDeleteAccountBtn')}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center">
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/50 rounded-lg transition cursor-pointer shadow-2xs">
            {t('logoutAccountBtn')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer shadow-2xs">
            {t('close')}
          </button>
        </div>

      </div>
    </div>
  );
}
