import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RoleSelectionModal() {
  const { user, selectRole, logout } = useAuth();
  const [selected, setSelected] = useState(null); // 'TEACHER' | 'STUDENT'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role) return null; // Nếu đã có vai trò thì không hiện

  const handleConfirm = async () => {
    if (!selected) {
      setError('Vui lòng chọn 1 vai trò: Giáo viên hoặc Học sinh');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await selectRole(selected);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi lưu vai trò.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
        <div className="p-6 bg-slate-900 text-white text-center">
          <h2 className="text-xl font-bold">Chọn Vai Trò Của Bạn</h2>
          <p className="text-slate-300 text-xs mt-1">
            Chào mừng <b>{user.fullName || user.email}</b>! Hãy xác nhận vai trò tài khoản để bắt đầu.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Cảnh báo 1 lần duy nhất */}
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs leading-relaxed">
            <p className="font-bold text-amber-800 uppercase tracking-wide mb-0.5">Lưu ý quan trọng:</p>
            Bạn chỉ được chọn vai trò <b>1 lần duy nhất</b> cho tài khoản Gmail này. Sau khi xác nhận, bạn sẽ <b>không thể tự ý đổi vai trò</b> trừ khi xóa tài khoản.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 2 Lựa chọn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setSelected('TEACHER')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${selected === 'TEACHER' ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div>
                <div className="text-sm font-bold text-gray-900 mb-1">Tôi là Giáo Viên</div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tạo và quản lý lớp học, soạn kế hoạch giảng dạy, điểm danh, giao bài tập và chấm điểm cho học viên.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs font-semibold text-blue-600">
                {selected === 'TEACHER' ? 'Đã chọn' : 'Chọn vai trò này'}
              </div>
            </div>

            <div 
              onClick={() => setSelected('STUDENT')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${selected === 'STUDENT' ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div>
                <div className="text-sm font-bold text-gray-900 mb-1">Tôi là Học Sinh</div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Nhập mã lớp để tham gia, xem thời khóa biểu, xem dặn dò chuẩn bị bài, làm bài tập và nộp bài.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs font-semibold text-emerald-600">
                {selected === 'STUDENT' ? 'Đã chọn' : 'Chọn vai trò này'}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer">
              Đăng xuất
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm">
              {isSubmitting ? 'Đang lưu...' : 'Xác Nhận Vai Trò'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
