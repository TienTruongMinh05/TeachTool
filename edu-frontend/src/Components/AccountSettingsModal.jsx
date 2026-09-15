import React, { useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { enrollmentApi } from '../api/enrollmentApi';
import { useToast } from '../context/ToastContext';

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
      title: 'Rời khỏi lớp học',
      message: `Bạn có chắc chắn muốn rời khỏi lớp "${className}"?`,
      confirmText: 'Rời lớp',
      type: 'warning'
    });
    if (!ok) return;

    try {
      setLeavingClassId(classId);
      setClassMsg({ type: '', text: '' });
      await enrollmentApi.removeStudent(classId, user.id);
      setClassMsg({ type: 'success', text: `Đã rời lớp "${className}" thành công!` });
      toast.success(`Đã rời khỏi lớp "${className}" thành công!`);
      if (onLeaveClassSuccess) {
        await onLeaveClassSuccess(classId);
      }
    } catch (err) {
      const errTxt = err.response?.data?.message || err.message || 'Lỗi khi rời lớp học.';
      setClassMsg({ type: 'error', text: errTxt });
      toast.error(errTxt);
    } finally {
      setLeavingClassId(null);
    }
  };

  // Xóa tài khoản vĩnh viễn
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'XÓA TÀI KHOẢN') {
      setDeleteError('Vui lòng gõ chính xác cụm từ "XÓA TÀI KHOẢN" để xác nhận.');
      return;
    }
    try {
      setDeletingAccount(true);
      setDeleteError('');
      await authApi.deleteAccount(user.id);
      toast.success('Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.');
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Lỗi khi xóa tài khoản.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-base sm:text-lg font-bold">Cài Đặt Tài Khoản</h3>
            <p className="text-xs text-slate-300">
              {user?.fullName} &bull; <span className="font-semibold text-blue-300">{isStudent ? 'Học Viên' : 'Giáo Viên'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer transition">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            Thông tin cá nhân
          </button>

          {isStudent && (
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              Lớp học của tôi ({enrolledClasses.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            Đổi mật khẩu
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-red-700'
            }`}>
            Vùng nguy hiểm
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md mx-auto">
              {profileMsg.text && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Địa chỉ Email (Định danh đăng nhập):
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">Email được cố định để liên kết bài nộp và lớp học.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên hiển thị: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ của bạn..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vai trò hệ thống:
                </label>
                <span className="inline-block px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-md">
                  {isStudent ? 'Học Viên (STUDENT)' : 'Giáo Viên (TEACHER)'}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer">
                  {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LỚP HỌC CỦA TÔI (CHO HỌC SINH) */}
          {activeTab === 'classes' && isStudent && (
            <div className="space-y-4">
              {classMsg.text && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  classMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {classMsg.text}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Danh sách các lớp bạn đã tham gia. Bạn có thể tự rời khỏi lớp nếu không còn theo học.
              </p>

              {enrolledClasses.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-500">
                  Bạn hiện chưa tham gia lớp học nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-800">{cls.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Mã lớp: <b className="font-mono text-blue-600">{cls.classCode}</b></span>
                          <span>&bull;</span>
                          <span>GV: {cls.teacherName || 'Chưa cập nhật'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={leavingClassId === cls.id}
                        onClick={() => handleLeaveClass(cls.id, cls.name)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-50">
                        {leavingClassId === cls.id ? 'Đang rời...' : 'Rời lớp học'}
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
                  passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu hiện tại: <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu mới: <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xác nhận mật khẩu mới: <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer">
                  {savingPassword ? 'Đang đổi mật khẩu...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: VÙNG NGUY HIỂM */}
          {activeTab === 'danger' && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-4 max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Xóa Vĩnh Viễn Tài Khoản</h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Hành động này sẽ xóa vĩnh viễn tài khoản của bạn cùng mọi dữ liệu liên kết (bài nộp, lớp học, ghi danh). Thao tác này <b>không thể khôi phục</b>.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-100 text-rose-800 rounded-md text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Nhập chữ <b>XÓA TÀI KHOẢN</b> để xác nhận:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="XÓA TÀI KHOẢN"
                  className="w-full border border-rose-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white font-mono"
                />
                <button
                  type="button"
                  disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'XÓA TÀI KHOẢN'}
                  onClick={handleDeleteAccount}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer mt-2">
                  {deletingAccount ? 'Đang xóa...' : 'Tôi Hiểu Hậu Quả, Xóa Tài Khoản Vĩnh Viễn'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer">
            Đăng xuất
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition cursor-pointer">
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
