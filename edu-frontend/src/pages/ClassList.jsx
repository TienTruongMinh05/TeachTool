import { useEffect, useState } from 'react';
import { classApi } from '../api/classApi';
import { useNavigate } from 'react-router-dom';
import ActivityLibraryModal from '../Components/ActivityLibraryModal';
import { useAuth } from '../context/AuthContext';

function ClassList({ showTopBar = false, onSelectClass }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  const fetchClasses = async () => {
    try {
      const data = await classApi.getAll();
      setClasses(data);
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
    setFormData({ name: '', startDate: '', endDate: '' });
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
    setCopyFormData({
      name: `${cls.name || 'Lớp học'} (Bản sao)`,
      startDate: cls.startDate || '',
      endDate: cls.endDate || ''
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
      setDeletingClass(null);
      fetchClasses();
    } catch (error) {
      alert("Lỗi khi xóa lớp học: " + (error.response?.data?.message || error.message));
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
      setLeavingClass(null);
      fetchClasses();
    } catch (error) {
      alert("Lỗi khi rời lớp học: " + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await classApi.update(editingClass.id, formData);
      } else {
        await classApi.create(formData);
      }
      fetchClasses();
      setIsModalOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
      setEditingClass(null);
    } catch (error) {
      alert("Lỗi khi lưu thông tin lớp học. Hãy kiểm tra lại dữ liệu.");
    }
  };

  const handleCopySubmit = async (e) => {
    e.preventDefault();
    try {
      await classApi.create(copyFormData);
      fetchClasses();
      setCopyingClass(null);
    } catch (error) {
      alert("Lỗi khi nhân bản lớp học: " + (error.response?.data?.message || error.message));
    }
  };

  if (loading) return <div className="flex justify-center p-10 text-gray-600">Đang tải dữ liệu...</div>;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8 relative">
      {/* Top User Bar (chỉ hiện khi chạy độc lập) */}
      {showTopBar && (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 text-white px-4 sm:px-5 py-3 rounded-xl mb-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base tracking-tight">TeachTool</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
              Giáo Viên
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">| {user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700 whitespace-nowrap">
            Đăng xuất
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản Lý Lớp Học</h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách tất cả các lớp giảng dạy của bạn</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs text-center">
            Thư Viện Hoạt Động
          </button>
          <button 
            onClick={openCreateModal}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition duration-200 shadow-sm cursor-pointer text-center">
            + Thêm Lớp Mới
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto bg-white shadow-xs rounded-xl border border-gray-200">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 text-gray-600 text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Mã Lớp (Vào Lớp)</th>
              <th className="px-6 py-4">Tên lớp</th>
              <th className="px-6 py-4">Ngày bắt đầu</th>
              <th className="px-6 py-4">Ngày kết thúc</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((cls) => (
              <tr key={cls.id} 
                onClick={() => onSelectClass ? onSelectClass(cls.id) : navigate(`/class/${cls.id}`)}
                className="hover:bg-blue-50/60 transition duration-150 cursor-pointer">
                <td className="px-6 py-4 text-gray-900">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {cls.classCode || `#${cls.id}`}
                    </span>
                    {cls.classCode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(cls.classCode);
                          alert(`Đã sao chép mã lớp "${cls.classCode}"!`);
                        }}
                        title="Sao chép mã lớp để gửi học sinh"
                        className="text-xs text-gray-400 hover:text-blue-600 p-1 cursor-pointer">
                        Copy
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-semibold hover:underline">{cls.name}</span>
                    {cls.isCoTeacher && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2 py-0.5 rounded-full">
                        Đồng giảng dạy
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{cls.startDate || '—'}</td>
                <td className="px-6 py-4 text-gray-600">{cls.endDate || '—'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={(e) => openCopyModal(cls, e)}
                    title="Nhân bản lớp học này"
                    className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition cursor-pointer">
                    Copy
                  </button>
                  <button 
                    onClick={(e) => openEditModal(cls, e)}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer">
                    Sửa
                  </button>
                  {cls.isCoTeacher ? (
                    <button 
                      onClick={(e) => promptLeaveClass(cls, e)}
                      title="Rời khỏi lớp đồng giảng dạy này"
                      className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition cursor-pointer">
                      Rời lớp
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => promptDelete(cls, e)}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition cursor-pointer">
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  Chưa có dữ liệu lớp học nào. Hãy bấm <b>"Thêm Lớp Mới"</b> để bắt đầu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form Thêm / Sửa Lớp */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingClass ? 'Cập Nhật Lớp Học' : 'Tạo Lớp Học Mới'}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp học <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: IELTS Master 01"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer font-medium">
                  {editingClass ? 'Lưu thay đổi' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nhân Bản (Copy) Lớp */}
      {copyingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Nhân Bản Lớp Học</h3>
            <form onSubmit={handleCopySubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp mới <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={copyFormData.name}
                  onChange={(e) => setCopyFormData({...copyFormData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu mới</label>
                  <input 
                    type="date" 
                    value={copyFormData.startDate}
                    onChange={(e) => setCopyFormData({...copyFormData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc mới</label>
                  <input 
                    type="date" 
                    value={copyFormData.endDate}
                    onChange={(e) => setCopyFormData({...copyFormData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setCopyingClass(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 cursor-pointer font-medium">
                  Tạo bản sao lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {deletingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">Xác nhận xóa lớp học</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc chắn muốn xóa lớp <b>{deletingClass.name}</b>?
              <br />
              <span className="text-xs text-red-500 mt-1 block">
                Cảnh báo: Toàn bộ danh sách ghi danh, buổi học, điểm danh và kế hoạch giảng dạy của lớp này sẽ bị xóa đồng thời.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 font-medium cursor-pointer">
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Rời Lớp Đồng Giảng Dạy */}
      {leavingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-amber-700 mb-2">Xác nhận rời lớp học</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc muốn rời khỏi lớp đồng giảng dạy <b>{leavingClass.name}</b>?
              <br />
              <span className="text-xs text-slate-500 mt-1 block">
                Lớp học và dữ liệu bài giảng của giáo viên chủ nhiệm vẫn được giữ nguyên. Lớp này sẽ không còn xuất hiện trong danh sách của bạn.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setLeavingClass(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleLeaveClass}
                className="px-4 py-2 text-sm text-white bg-amber-600 rounded-md hover:bg-amber-700 font-medium cursor-pointer">
                Xác nhận rời lớp
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
    </div>
  );
}

export default ClassList;
