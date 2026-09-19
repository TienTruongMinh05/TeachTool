// File: src/Components/TeacherManager.jsx
import { useState, useEffect, useCallback } from 'react';
import { classApi } from '../api/classApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function TeacherManager({ classId, classInfo, onClassUpdated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    teacher: null,
    isSelf: false
  });

  const fetchTeachers = useCallback(async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await classApi.getTeachers(classId);
      setTeachers(data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách giáo viên.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const isPrimaryTeacher = classInfo?.teacherId && user?.id && Number(classInfo.teacherId) === Number(user.id);

  const handleOpenInvite = () => {
    setInviteEmail('');
    setActionError('');
    setActionSuccess('');
    setIsInviteModalOpen(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setActionError('Vui lòng nhập địa chỉ Gmail của giáo viên.');
      return;
    }

    try {
      setInviting(true);
      setActionError('');
      setActionSuccess('');

      const res = await classApi.inviteTeacher(classId, inviteEmail.trim());
      setActionSuccess(res.message || 'Mời giáo viên thành công!');
      toast.success(res.message || 'Đã thêm giáo viên vào lớp thành công!');
      setInviteEmail('');
      await fetchTeachers();
      if (onClassUpdated) onClassUpdated();
      setTimeout(() => {
        setIsInviteModalOpen(false);
      }, 1500);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi mời giáo viên.');
    } finally {
      setInviting(false);
    }
  };

  const handleOpenRemoveModal = (teacher, isSelf = false) => {
    const isSelfFlag = isSelf || (user?.id && Number(teacher.teacherId) === Number(user.id));
    setConfirmModal({
      isOpen: true,
      teacher,
      isSelf: isSelfFlag
    });
  };

  const handleConfirmRemove = async () => {
    if (!confirmModal.teacher) return;
    try {
      await classApi.removeTeacher(classId, confirmModal.teacher.teacherId);
      setConfirmModal({ isOpen: false, teacher: null, isSelf: false });
      fetchTeachers();
      if (confirmModal.isSelf) {
        toast.success('Bạn đã rời khỏi lớp học thành công.');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        toast.success(`Đã xóa giáo viên "${confirmModal.teacher.fullName || confirmModal.teacher.email}" khỏi lớp.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xóa giáo viên.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Đội Ngũ Giáo Viên Phụ Trách</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {teachers.length} giáo viên
            </span>
          </h2>
        </div>
        <button
          onClick={handleOpenInvite}
          className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer">
          + Mời Giáo Viên Đồng Giảng Dạy
        </button>
      </div>

      {/* Notice info */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="leading-relaxed space-y-1">
          <p className="font-semibold">Cơ chế Đồng phụ trách (Co-Teaching):</p>
          <p>
            Giáo viên đồng phụ trách có <strong>toàn quyền</strong> xem thời khóa biểu, chỉnh sửa buổi học, soạn giáo án TESOL, giao bài tập, chấm điểm và điểm danh học sinh ngang với giáo viên chủ nhiệm.
          </p>
          <p className="text-amber-800">
            * Nhằm bảo vệ dữ liệu lớp học, <strong>chỉ Giáo viên chủ nhiệm</strong> mới có quyền xóa vĩnh viễn toàn bộ lớp học. Giáo viên đồng phụ trách có thể bấm "Rời lớp" bất kỳ lúc nào.
          </p>
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Đang tải danh sách giáo viên...</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Chưa có thông tin giáo viên phụ trách.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {teachers.map((teacher, idx) => {
              const isPrimary = teacher.roleInClass === 'PRIMARY';
              const isMe = user?.id && Number(teacher.teacherId) === Number(user.id);

              return (
                <div key={teacher.teacherId || idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {teacher.fullName ? teacher.fullName.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">{teacher.fullName || 'Giáo viên'}</span>
                        {isMe && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                            Bạn
                          </span>
                        )}
                        {isPrimary ? (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            👑 Giáo Viên Chủ Nhiệm
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-0.5 rounded-full">
                            🤝 Đồng Phụ Trách
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{teacher.email}</span>
                        {teacher.joinedAt && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">
                              Tham gia: {new Date(teacher.joinedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPrimary ? (
                      <span className="text-xs text-slate-400 italic px-3 py-1.5">Người tạo lớp</span>
                    ) : (
                      <>
                        {isPrimaryTeacher && !isMe && (
                          <button
                            onClick={() => promptRemove(teacher)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition cursor-pointer">
                            Xóa khỏi lớp
                          </button>
                        )}
                        {isMe && !isPrimaryTeacher && (
                          <button
                            onClick={() => promptRemove(teacher)}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition cursor-pointer">
                            Rời lớp
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Mời Giáo Viên */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Mời Giáo Viên Đồng Giảng Dạy</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Giáo Viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="abc@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  * Giáo viên được mời phải có sẵn tài khoản vai trò <b>Giáo viên (TEACHER)</b> trên TeachTool.
                </p>
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {actionError}
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">
                  {actionSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition cursor-pointer">
                  {inviting ? 'Đang thêm...' : 'Xác Nhận Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">
              {confirmModal.isSelf ? 'Xác nhận rời lớp?' : 'Xóa giáo viên khỏi lớp?'}
            </h4>
            <p className="text-xs text-slate-500 mb-5">
              {confirmModal.isSelf
                ? 'Bạn sẽ không còn quyền truy cập và quản lý lớp học này nữa.'
                : `Bạn có chắc muốn gỡ giáo viên "${confirmModal.teacher?.fullName || confirmModal.teacher?.email}" khỏi danh sách đồng giảng dạy?`}
            </p>
            <div className="flex justify-center gap-2.5">
              <button
                onClick={() => setConfirmModal({ isOpen: false, teacher: null, isSelf: false })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                Hủy
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer">
                {confirmModal.isSelf ? 'Rời lớp' : 'Xóa ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
